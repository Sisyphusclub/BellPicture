import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { user, userQuota } from '../../src/db/schema.js';
import { AppError } from '../../src/errors/AppError.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveOutput } from '../../src/storage/localStorage.js';
import type { GenerateInput, GenerateOutput } from '../../src/types/image.js';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeProvider(): { provider: ImageGenerationProvider } {
  const provider: ImageGenerationProvider = {
    generate: vi.fn(async (input: GenerateInput): Promise<GenerateOutput> => {
      const count = input.count ?? 1;
      const aspectRatio = input.aspectRatio ?? '1:1';
      const images = [] as GenerateOutput['images'];
      for (let index = 0; index < count; index += 1) {
        const saved = await saveOutput(Buffer.concat([PNG_PREFIX, Buffer.alloc(32, index)]), 'png');
        images.push({ outputPath: saved.absolutePath, width: 1024, height: 1024 });
      }
      return { images, aspectRatio };
    }),
  };
  return { provider };
}

function createDbUser(input: { userId?: string; isAdmin?: boolean } = {}): string {
  const userId = input.userId ?? `test-${randomUUID()}`;
  const now = new Date();
  db.insert(user)
    .values({
      id: userId,
      name: `Test ${userId}`,
      email: `${userId}@test.local`,
      emailVerified: false,
      isAdmin: input.isAdmin ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: user.id,
      set: { isAdmin: input.isAdmin ?? false, updatedAt: now },
    })
    .run();
  return userId;
}

function stubAuth(userId = `test-${randomUUID()}`, isAdmin = false): RequestHandler {
  createDbUser({ userId, isAdmin });
  return (req, _res, next) => {
    req.user = { id: userId, email: `${userId}@test.local`, isAdmin };
    next();
  };
}

function buildApp(provider: ImageGenerationProvider, authMiddleware: RequestHandler = stubAuth()) {
  return createApp({ provider, authMiddleware, demoGenerationDelayMs: 0 });
}

describe('POST /api/images/upload', () => {
  it('accepts a PNG and returns id, filename, mime, size', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);
    const png = Buffer.concat([PNG_PREFIX, Buffer.alloc(64, 0xab)]);

    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', png, { filename: 'in.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(res.body.filename).toBe(res.body.id);
    expect(res.body.mime).toBe('image/png');
    expect(res.body.size).toBe(png.length);
  });

  it('rejects forged Content-Type with 415 (magic-bytes wins)', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);
    const txt = Buffer.from('this is not really an image');

    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', txt, { filename: 'fake.png', contentType: 'image/png' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 400 when no file is attached', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app).post('/api/images/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects unauthenticated requests with 401', async () => {
    // Override auth to deny — simulates "no session cookie".
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const { provider } = fakeProvider();
    const app = buildApp(provider, denyAuth);

    const png = Buffer.concat([PNG_PREFIX, Buffer.alloc(64, 0xab)]);
    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', png, { filename: 'in.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/images/generate', () => {
  it('text-to-image happy path: returns 200 with batch + images array', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'red cube on a blue floor' });

    expect(res.status).toBe(200);
    expect(res.body.batchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.generationMode).toBe('text-to-image');
    expect(res.body.aspectRatio).toBe('1:1');
    expect(Array.isArray(res.body.images)).toBe(true);
    expect(res.body.images).toHaveLength(1);
    for (const image of res.body.images) {
      expect(image.id).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(image.outputUrl).toBe(`/api/outputs/${image.id as string}`);
      expect(image.filename).toBe(image.id);
      expect(image.mime).toBe('image/png');
      expect(image.width).toBe(1024);
      expect(image.height).toBe(1024);
    }
    expect(provider.generate).toHaveBeenCalledOnce();
  });

  it('persists public visibility for generated image records', async () => {
    const { provider } = fakeProvider();
    const userId = `public-user-${randomUUID()}`;
    const app = buildApp(provider, stubAuth(userId));

    await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'publish to gallery', isPublic: true });

    const history = await request(app).get('/api/history');
    expect(history.status).toBe(200);
    expect(history.body.records[0]).toMatchObject({ prompt: 'publish to gallery', isPublic: true });
  });

  it('respects explicit count + aspectRatio', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'p', count: 2, aspectRatio: '16:9' });

    expect(res.status).toBe(200);
    expect(res.body.images).toHaveLength(2);
    expect(res.body.aspectRatio).toBe('16:9');
    const call = (provider.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as GenerateInput;
    expect(call.count).toBe(2);
    expect(call.aspectRatio).toBe('16:9');
  });

  it('returns per-user daily quota and decrements after successful generation', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider, stubAuth(`quota-user-${randomUUID()}`));

    const before = await request(app).get('/api/images/quota');
    expect(before.status).toBe(200);
    expect(before.body.total).toBe(20);
    expect(before.body.remaining).toBe(20);

    await request(app).post('/api/images/generate').send({ prompt: 'quota smoke', count: 2 });

    const after = await request(app).get('/api/images/quota');
    expect(after.status).toBe(200);
    expect(after.body.total).toBe(20);
    expect(after.body.remaining).toBe(18);
  });

  it('lets admins run demo generation without calling provider or consuming quota', async () => {
    const { provider } = fakeProvider();
    const userId = `demo-admin-${randomUUID()}`;
    const app = buildApp(provider, stubAuth(userId, true));

    const before = await request(app).get('/api/images/quota');
    expect(before.status).toBe(200);
    expect(before.body.remaining).toBe(20);

    const res = await request(app).post('/api/images/generate').send({
      prompt: '管理员演示提示词',
      demoPresetId: 'studio-showcase',
      isPublic: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.generationMode).toBe('text-to-image');
    expect(res.body.aspectRatio).toBe('1:1');
    expect(res.body.images).toHaveLength(1);
    expect(res.body.images[0]).toMatchObject({
      mime: 'image/png',
      width: 1024,
      height: 1024,
    });
    expect(provider.generate).not.toHaveBeenCalled();

    const after = await request(app).get('/api/images/quota');
    expect(after.status).toBe(200);
    expect(after.body.remaining).toBe(20);

    const history = await request(app).get('/api/history');
    expect(history.status).toBe(200);
    expect(history.body.records[0]).toMatchObject({
      prompt: '管理员演示提示词',
      isPublic: true,
    });

    const output = await request(app).get(res.body.images[0].outputUrl as string);
    expect(output.status).toBe(200);
    expect(output.headers['content-type']).toContain('image/png');
  });

  it('rejects demo generation for non-admin users before provider or quota work', async () => {
    const { provider } = fakeProvider();
    const userId = `demo-user-${randomUUID()}`;
    const app = buildApp(provider, stubAuth(userId, false));

    const res = await request(app).post('/api/images/generate').send({
      prompt: '普通用户尝试演示',
      demoPresetId: 'studio-showcase',
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(provider.generate).not.toHaveBeenCalled();

    const quota = await request(app).get('/api/images/quota');
    expect(quota.body.remaining).toBe(20);
  });

  it('isolates quota across users (A consuming does not affect B)', async () => {
    const { provider } = fakeProvider();
    const userA = `user-a-${randomUUID()}`;
    const userB = `user-b-${randomUUID()}`;

    const appA = buildApp(provider, stubAuth(userA));
    const appB = buildApp(provider, stubAuth(userB));

    await request(appA).post('/api/images/generate').send({ prompt: 'a', count: 2 });

    const afterA = await request(appA).get('/api/images/quota');
    const afterB = await request(appB).get('/api/images/quota');
    expect(afterA.body.remaining).toBe(18);
    expect(afterB.body.remaining).toBe(20);
  });

  it('resets stale daily quota rows on the next server-local day', async () => {
    const { provider } = fakeProvider();
    const userId = `quota-reset-${randomUUID()}`;
    const app = buildApp(provider, stubAuth(userId));

    db.insert(userQuota)
      .values({ userId, usedToday: 19, quotaDate: '2000-01-01' })
      .onConflictDoUpdate({
        target: userQuota.userId,
        set: { usedToday: 19, quotaDate: '2000-01-01' },
      })
      .run();

    const before = await request(app).get('/api/images/quota');
    expect(before.status).toBe(200);
    expect(before.body.remaining).toBe(20);

    const generated = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'quota reset smoke', count: 2 });
    expect(generated.status).toBe(200);

    const after = await request(app).get('/api/images/quota');
    expect(after.body.remaining).toBe(18);
  });

  it('image-to-image happy path: uses an existing referenceId and reports image-to-image mode', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    // First upload a real reference image.
    const refBytes = Buffer.concat([PNG_PREFIX, Buffer.alloc(64, 0xc3)]);
    const uploadRes = await request(app)
      .post('/api/images/upload')
      .attach('image', refBytes, { filename: 'ref.png', contentType: 'image/png' });
    expect(uploadRes.status).toBe(200);

    const referenceId = uploadRes.body.id as string;
    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'reuse the ref', referenceId });

    expect(res.status).toBe(200);
    expect(res.body.generationMode).toBe('image-to-image');
    const call = (harness.provider.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      referencePaths?: string[];
    };
    expect(call.referencePaths).toHaveLength(1);
    expect(call.referencePaths?.[0]).toContain(referenceId);
  });

  it('returns 400 when prompt is empty', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app).post('/api/images/generate').send({ prompt: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.error.details?.issues)).toBe(true);
  });

  it('returns 400 when count is out of range', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app).post('/api/images/generate').send({ prompt: 'p', count: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when aspectRatio is not in the supported set', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'p', aspectRatio: '4:3' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when referenceId does not match a stored file', async () => {
    const { provider } = fakeProvider();
    const app = buildApp(provider);

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'p', referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('propagates PROVIDER_RATE_LIMITED 429 from the provider', async () => {
    const provider: ImageGenerationProvider = {
      generate: vi.fn(async () => {
        throw new AppError('PROVIDER_RATE_LIMITED', 'slow down', 429, undefined, {
          upstreamStatus: 429,
        });
      }),
    };
    const app = buildApp(provider);
    const res = await request(app).post('/api/images/generate').send({ prompt: 'x' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('PROVIDER_RATE_LIMITED');
  });

  it('propagates PROVIDER_TIMEOUT 504 from the provider', async () => {
    const provider: ImageGenerationProvider = {
      generate: vi.fn(async () => {
        throw new AppError('PROVIDER_TIMEOUT', 'timed out', 504);
      }),
    };
    const app = buildApp(provider);
    const res = await request(app).post('/api/images/generate').send({ prompt: 'x' });
    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('PROVIDER_TIMEOUT');
  });

  it('returns 401 when no auth session is present', async () => {
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const { provider } = fakeProvider();
    const app = buildApp(provider, denyAuth);

    const res = await request(app).post('/api/images/generate').send({ prompt: 'p' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 429 QUOTA_EXHAUSTED when daily quota is fully consumed', async () => {
    const { provider } = fakeProvider();
    const userId = `cap-${randomUUID()}`;
    const app = buildApp(provider, stubAuth(userId));

    // DAILY_USER_QUOTA defaults to 20, MAX_COUNT=2 per request → 10 generate calls to drain.
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/api/images/generate').send({ prompt: 'p', count: 2 });
      expect(res.status).toBe(200);
    }

    const overflow = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'p', count: 1 });
    expect(overflow.status).toBe(429);
    expect(overflow.body.error.code).toBe('QUOTA_EXHAUSTED');
  });
});
