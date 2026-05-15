import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { user } from '../../src/db/schema.js';
import { AppError } from '../../src/errors/AppError.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveOutput } from '../../src/storage/localStorage.js';
import type { GenerateInput, GenerateOutput } from '../../src/types/image.js';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeProvider(): ImageGenerationProvider {
  return {
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
}

function ensureUser(userId: string): void {
  const now = new Date();
  db.insert(user)
    .values({
      id: userId,
      name: `Test ${userId}`,
      email: `${userId}@test.local`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function stubAuth(userId: string): RequestHandler {
  ensureUser(userId);
  return (req, _res, next) => {
    req.user = { id: userId, email: `${userId}@test.local` };
    next();
  };
}

describe('GET /api/history', () => {
  it('returns 401 when unauthenticated', async () => {
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const app = createApp({ provider: fakeProvider(), authMiddleware: denyAuth });
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the user records sorted newest-first', async () => {
    const userId = `hist-list-${randomUUID()}`;
    const provider = fakeProvider();
    const app = createApp({ provider, authMiddleware: stubAuth(userId) });

    await request(app).post('/api/images/generate').send({ prompt: 'first', count: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await request(app).post('/api/images/generate').send({ prompt: 'second', count: 2 });

    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records).toHaveLength(3);
    expect(res.body.records[0].prompt).toBe('second');
    expect(res.body.records[2].prompt).toBe('first');
    for (const record of res.body.records) {
      expect(record.id).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(record.batchId).toMatch(/^[0-9a-f-]{36}$/);
      expect(record.filename).toBe(record.id);
      expect(record.isPublic).toBe(false);
      expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('persists public gallery visibility on generated records', async () => {
    const userId = `hist-public-${randomUUID()}`;
    const provider = fakeProvider();
    const app = createApp({ provider, authMiddleware: stubAuth(userId) });

    await request(app).post('/api/images/generate').send({ prompt: 'private image', count: 1 });
    await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'public image', count: 1, isPublic: true });

    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(
      res.body.records.find((r: { prompt: string }) => r.prompt === 'public image')?.isPublic,
    ).toBe(true);
    expect(
      res.body.records.find((r: { prompt: string }) => r.prompt === 'private image')?.isPublic,
    ).toBe(false);
  });

  it('isolates history between users', async () => {
    const userA = `hist-iso-a-${randomUUID()}`;
    const userB = `hist-iso-b-${randomUUID()}`;
    const provider = fakeProvider();
    const appA = createApp({ provider, authMiddleware: stubAuth(userA) });
    const appB = createApp({ provider, authMiddleware: stubAuth(userB) });

    await request(appA).post('/api/images/generate').send({ prompt: 'A only', count: 1 });

    const aHistory = await request(appA).get('/api/history');
    const bHistory = await request(appB).get('/api/history');

    expect(aHistory.body.records.length).toBeGreaterThanOrEqual(1);
    expect(aHistory.body.records.some((r: { prompt: string }) => r.prompt === 'A only')).toBe(true);
    expect(bHistory.body.records.some((r: { prompt: string }) => r.prompt === 'A only')).toBe(
      false,
    );
  });
});

describe('DELETE /api/history/batch/:batchId', () => {
  it('deletes the batch only for the owning user', async () => {
    const userA = `hist-del-a-${randomUUID()}`;
    const userB = `hist-del-b-${randomUUID()}`;
    const provider = fakeProvider();
    const appA = createApp({ provider, authMiddleware: stubAuth(userA) });
    const appB = createApp({ provider, authMiddleware: stubAuth(userB) });

    const genRes = await request(appA)
      .post('/api/images/generate')
      .send({ prompt: 'to-be-deleted', count: 2 });
    expect(genRes.status).toBe(200);
    const batchId = genRes.body.batchId as string;

    // Other user can't touch it.
    const bDel = await request(appB).delete(`/api/history/batch/${batchId}`);
    expect(bDel.status).toBe(404);

    // Owner deletes it.
    const aDel = await request(appA).delete(`/api/history/batch/${batchId}`);
    expect(aDel.status).toBe(204);

    const aHistory = await request(appA).get('/api/history');
    expect(aHistory.body.records.some((r: { batchId: string }) => r.batchId === batchId)).toBe(
      false,
    );
  });
});

describe('DELETE /api/history/:id', () => {
  it('deletes one record owned by the user', async () => {
    const userId = `hist-del-one-${randomUUID()}`;
    const provider = fakeProvider();
    const app = createApp({ provider, authMiddleware: stubAuth(userId) });

    const genRes = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'one record', count: 1 });
    const id = genRes.body.images[0].id as string;

    const del = await request(app).delete(`/api/history/${id}`);
    expect(del.status).toBe(204);

    const history = await request(app).get('/api/history');
    expect(history.body.records.some((r: { id: string }) => r.id === id)).toBe(false);
  });

  it('returns 404 when deleting a record that does not exist for this user', async () => {
    const userId = `hist-404-${randomUUID()}`;
    const provider = fakeProvider();
    const app = createApp({ provider, authMiddleware: stubAuth(userId) });

    const res = await request(app).delete('/api/history/nope-not-real.png');
    expect(res.status).toBe(404);
  });
});
