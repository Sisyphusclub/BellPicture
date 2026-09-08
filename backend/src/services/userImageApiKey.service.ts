import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { userImageApiKeys } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';

const ENCRYPTION_VERSION = 'v1';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export interface UserImageApiKeyStatus {
  configured: boolean;
  keySuffix?: string;
}

export interface UserImageApiKeyService {
  getStatus: (userId: string) => UserImageApiKeyStatus;
  getProviderCredential: (userId: string) => string | undefined;
  save: (userId: string, apiKey: string) => UserImageApiKeyStatus;
  remove: (userId: string) => UserImageApiKeyStatus;
}

export function createUserImageApiKeyService(
  encodedEncryptionKey = env.USER_API_KEY_ENCRYPTION_KEY,
): UserImageApiKeyService {
  const encryptionKey = Buffer.from(encodedEncryptionKey, 'base64');
  if (encryptionKey.byteLength !== 32) {
    throw new AppError('INTERNAL', 'User API key encryption is misconfigured', 500);
  }

  function getStatus(userId: string): UserImageApiKeyStatus {
    const row = selectKeyRow(userId);
    return row === undefined ? { configured: false } : statusFromSuffix(row.keySuffix);
  }

  function getProviderCredential(userId: string): string | undefined {
    const row = selectKeyRow(userId);
    if (row === undefined) return undefined;
    return decryptKey(row.encryptedKey, userId, encryptionKey);
  }

  function save(userId: string, apiKey: string): UserImageApiKeyStatus {
    const normalized = apiKey.trim();
    if (normalized.length === 0) {
      throw new AppError('BAD_REQUEST', 'API Key 不能为空。', 400);
    }
    const now = new Date();
    const keySuffix = normalized.slice(-4);
    const encryptedKey = encryptKey(normalized, userId, encryptionKey);
    db.insert(userImageApiKeys)
      .values({ userId, encryptedKey, keySuffix, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: userImageApiKeys.userId,
        set: { encryptedKey, keySuffix, updatedAt: now },
      })
      .run();
    return statusFromSuffix(keySuffix);
  }

  function remove(userId: string): UserImageApiKeyStatus {
    db.delete(userImageApiKeys).where(eq(userImageApiKeys.userId, userId)).run();
    return { configured: false };
  }

  return { getStatus, getProviderCredential, save, remove };
}

function selectKeyRow(userId: string): { encryptedKey: string; keySuffix: string } | undefined {
  return db
    .select({
      encryptedKey: userImageApiKeys.encryptedKey,
      keySuffix: userImageApiKeys.keySuffix,
    })
    .from(userImageApiKeys)
    .where(eq(userImageApiKeys.userId, userId))
    .get();
}

function statusFromSuffix(keySuffix: string): UserImageApiKeyStatus {
  return { configured: true, keySuffix };
}

function encryptKey(plaintext: string, userId: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_BYTES });
  cipher.setAAD(Buffer.from(userId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTION_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

function decryptKey(payload: string, userId: string, key: Buffer): string {
  const [version, encodedIv, encodedTag, encodedCiphertext, extra] = payload.split('.');
  if (
    version !== ENCRYPTION_VERSION ||
    encodedIv === undefined ||
    encodedTag === undefined ||
    encodedCiphertext === undefined ||
    extra !== undefined
  ) {
    throw invalidCiphertextError();
  }

  try {
    const iv = Buffer.from(encodedIv, 'base64url');
    const tag = Buffer.from(encodedTag, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
    if (iv.byteLength !== IV_BYTES || tag.byteLength !== AUTH_TAG_BYTES) {
      throw new Error('Invalid encrypted API key dimensions');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: AUTH_TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(userId, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (cause) {
    throw invalidCiphertextError(cause);
  }
}

function invalidCiphertextError(cause?: unknown): AppError {
  return new AppError('INTERNAL', 'Saved user API key could not be decrypted', 500, cause);
}
