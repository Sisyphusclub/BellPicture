import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { db } from '../../src/db/drizzle.js';
import { user, userImageApiKeys } from '../../src/db/schema.js';
import { createUserImageApiKeyService } from '../../src/services/userImageApiKey.service.js';

const createdUserIds: string[] = [];

function createUser(): string {
  const id = `key-service-${randomUUID()}`;
  const now = new Date();
  db.insert(user)
    .values({
      id,
      name: id,
      email: `${id}@test.local`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  createdUserIds.push(id);
  return id;
}

afterEach(() => {
  for (const id of createdUserIds.splice(0)) {
    db.delete(user).where(eq(user.id, id)).run();
  }
});

describe('userImageApiKey service', () => {
  it('encrypts keys at rest and exposes only status plus suffix', () => {
    const service = createUserImageApiKeyService();
    const userId = createUser();
    const apiKey = 'sk-user-secret-12345678';

    expect(service.save(userId, apiKey)).toEqual({ configured: true, keySuffix: '5678' });

    const stored = db
      .select()
      .from(userImageApiKeys)
      .where(eq(userImageApiKeys.userId, userId))
      .get();
    expect(stored?.encryptedKey).toMatch(/^v1\./u);
    expect(stored?.encryptedKey).not.toContain(apiKey);
    expect(service.getStatus(userId)).toEqual({ configured: true, keySuffix: '5678' });
    expect(service.getProviderCredential(userId)).toBe(apiKey);

    service.save(userId, apiKey);
    const replaced = db
      .select()
      .from(userImageApiKeys)
      .where(eq(userImageApiKeys.userId, userId))
      .get();
    expect(replaced?.encryptedKey).not.toBe(stored?.encryptedKey);
    expect(service.getProviderCredential(userId)).toBe(apiKey);
  });

  it('authenticates ciphertext against its owning user and rejects tampering', () => {
    const service = createUserImageApiKeyService();
    const firstUserId = createUser();
    const secondUserId = createUser();
    service.save(firstUserId, 'sk-owner-only');
    const first = db
      .select()
      .from(userImageApiKeys)
      .where(eq(userImageApiKeys.userId, firstUserId))
      .get();
    expect(first).toBeDefined();
    db.insert(userImageApiKeys)
      .values({
        userId: secondUserId,
        encryptedKey: first!.encryptedKey,
        keySuffix: first!.keySuffix,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    expect(() => service.getProviderCredential(secondUserId)).toThrowError(
      expect.objectContaining({ code: 'INTERNAL' }),
    );
  });

  it('removes the saved key and cascades records when a user is deleted', () => {
    const service = createUserImageApiKeyService();
    const removedUserId = createUser();
    service.save(removedUserId, 'sk-remove-me');
    expect(service.remove(removedUserId)).toEqual({ configured: false });
    expect(service.getProviderCredential(removedUserId)).toBeUndefined();

    const deletedUserId = createUser();
    service.save(deletedUserId, 'sk-cascade-me');
    db.delete(user).where(eq(user.id, deletedUserId)).run();
    expect(
      db.select().from(userImageApiKeys).where(eq(userImageApiKeys.userId, deletedUserId)).all(),
    ).toHaveLength(0);
  });
});
