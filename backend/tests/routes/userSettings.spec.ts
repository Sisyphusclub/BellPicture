import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import type { RequestHandler } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { user, userImageApiKeys } from '../../src/db/schema.js';
import { AppError } from '../../src/errors/AppError.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { createUserImageApiKeyService } from '../../src/services/userImageApiKey.service.js';

const createdUserIds: string[] = [];

function createUser(): string {
  const id = `settings-${randomUUID()}`;
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

function authFor(userId: string): RequestHandler {
  return (req, _res, next) => {
    req.user = { id: userId, email: `${userId}@test.local` };
    next();
  };
}

function providerWithValidation(
  validateCredential: NonNullable<ImageGenerationProvider['validateCredential']> = vi.fn(
    async () => {},
  ),
): ImageGenerationProvider {
  return {
    generate: vi.fn(async () => ({ images: [], aspectRatio: '1:1' as const })),
    validateCredential,
  };
}

afterEach(() => {
  for (const id of createdUserIds.splice(0)) {
    db.delete(user).where(eq(user.id, id)).run();
  }
});

describe('/api/settings/image-api-key', () => {
  it('validates, saves, reads a masked status, and deletes the current user key', async () => {
    const userId = createUser();
    const validateCredential = vi.fn(async () => {});
    const provider = providerWithValidation(validateCredential);
    const app = createApp({ provider, authMiddleware: authFor(userId) });

    expect((await request(app).get('/api/settings/image-api-key')).body).toEqual({
      configured: false,
    });

    const saved = await request(app)
      .put('/api/settings/image-api-key')
      .send({ apiKey: '  sk-user-private-8765  ' });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ configured: true, keySuffix: '8765' });
    expect(validateCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: 'sk-user-private-8765',
        credentialGroup: 'standard',
        model: 'gpt-image-2',
      }),
    );
    expect(JSON.stringify(saved.body)).not.toContain('sk-user-private');

    const stored = db
      .select()
      .from(userImageApiKeys)
      .where(eq(userImageApiKeys.userId, userId))
      .get();
    expect(stored?.encryptedKey).not.toContain('sk-user-private-8765');
    expect((await request(app).get('/api/settings/image-api-key')).body).toEqual({
      configured: true,
      keySuffix: '8765',
    });

    const removed = await request(app).delete('/api/settings/image-api-key');
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ configured: false });
  });

  it('does not replace an existing key when provider validation fails', async () => {
    const userId = createUser();
    const keyService = createUserImageApiKeyService();
    keyService.save(userId, 'sk-existing-1111');
    const provider = providerWithValidation(
      vi.fn(async () => {
        throw new AppError('PROVIDER_KEY_INVALID', 'rejected', 400);
      }),
    );
    const app = createApp({
      provider,
      authMiddleware: authFor(userId),
      userImageApiKeys: keyService,
    });

    const response = await request(app)
      .put('/api/settings/image-api-key')
      .send({ apiKey: 'sk-invalid-2222' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PROVIDER_KEY_INVALID');
    expect(keyService.getProviderCredential(userId)).toBe('sk-existing-1111');
  });

  it('saves and removes the 2K/4K key independently', async () => {
    const userId = createUser();
    const keyService = createUserImageApiKeyService();
    const validateCredential = vi.fn(async () => {});
    const app = createApp({
      provider: providerWithValidation(validateCredential),
      authMiddleware: authFor(userId),
      userImageApiKeys: keyService,
    });

    const saved = await request(app)
      .put('/api/settings/image-api-key')
      .send({ apiKey: 'sk-high-res-4444', group: 'high-res' });

    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({
      configured: false,
      highResConfigured: true,
      highResKeySuffix: '4444',
    });
    expect(keyService.getProviderCredentialForGroup(userId, 'standard')).toBeUndefined();
    expect(keyService.getProviderCredentialForGroup(userId, 'high-res')).toBe('sk-high-res-4444');
    expect(validateCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: 'sk-high-res-4444',
        credentialGroup: 'high-res',
      }),
    );

    expect((await request(app).delete('/api/settings/image-api-key?group=high-res')).body).toEqual({
      configured: false,
    });
  });

  it('isolates saved statuses by authenticated user', async () => {
    const firstUserId = createUser();
    const secondUserId = createUser();
    const provider = providerWithValidation();
    const firstApp = createApp({ provider, authMiddleware: authFor(firstUserId) });
    const secondApp = createApp({ provider, authMiddleware: authFor(secondUserId) });

    await request(firstApp)
      .put('/api/settings/image-api-key')
      .send({ apiKey: 'sk-first-user-4444' });

    expect((await request(firstApp).get('/api/settings/image-api-key')).body).toEqual({
      configured: true,
      keySuffix: '4444',
    });
    expect((await request(secondApp).get('/api/settings/image-api-key')).body).toEqual({
      configured: false,
    });
  });

  it('requires authentication', async () => {
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const app = createApp({ provider: providerWithValidation(), authMiddleware: denyAuth });

    expect((await request(app).get('/api/settings/image-api-key')).status).toBe(401);
    expect(
      (await request(app).put('/api/settings/image-api-key').send({ apiKey: 'sk-test' })).status,
    ).toBe(401);
    expect((await request(app).delete('/api/settings/image-api-key')).status).toBe(401);
  });
});
