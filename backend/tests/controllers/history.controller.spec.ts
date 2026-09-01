import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { db } from '../../src/db/drizzle.js';
import { user } from '../../src/db/schema.js';
import { sqlite } from '../../src/db/sqlite.js';
import { AppError } from '../../src/errors/AppError.js';
import { insertImageRecords } from '../../src/services/history.service.js';
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

function allowAdmin(): RequestHandler {
  return (req, _res, next) => {
    req.user = { ...req.user!, isAdmin: true };
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
      expect(record.isFavorite).toBe(false);
      expect(record.resolution).toBe('standard');
      expect(record.count).toBeGreaterThanOrEqual(1);
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

describe('history asset metadata', () => {
  it('updates one owned record and persists favorite, collection, and visibility', async () => {
    const userId = `hist-meta-${randomUUID()}`;
    const app = createApp({ provider: fakeProvider(), authMiddleware: stubAuth(userId) });
    const generated = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'metadata target', count: 2 });
    const id = generated.body.images[0].id as string;

    const updated = await request(app).patch(`/api/history/${id}`).send({
      isFavorite: true,
      collection: '客户项目',
      isPublic: true,
    });

    expect(updated.status).toBe(200);
    expect(updated.body.record).toMatchObject({
      id,
      count: 2,
      resolution: 'standard',
      isFavorite: true,
      collection: '客户项目',
      isPublic: true,
    });

    const history = await request(app).get('/api/history');
    expect(history.body.records.find((record: { id: string }) => record.id === id)).toMatchObject({
      isFavorite: true,
      collection: '客户项目',
      isPublic: true,
    });
  });

  it('bulk-updates and bulk-deletes only the current user records', async () => {
    const userA = `hist-bulk-a-${randomUUID()}`;
    const userB = `hist-bulk-b-${randomUUID()}`;
    const provider = fakeProvider();
    const appA = createApp({ provider, authMiddleware: stubAuth(userA) });
    const appB = createApp({ provider, authMiddleware: stubAuth(userB) });
    const generatedA = await request(appA)
      .post('/api/images/generate')
      .send({ prompt: 'bulk owned', count: 2 });
    const generatedB = await request(appB)
      .post('/api/images/generate')
      .send({ prompt: 'bulk foreign', count: 1 });
    const ownedIds = generatedA.body.images.map((image: { id: string }) => image.id) as string[];
    const foreignId = generatedB.body.images[0].id as string;

    const updated = await request(appA)
      .patch('/api/history')
      .send({ ids: [...ownedIds, foreignId], updates: { collection: '灵感库' } });
    expect(updated.status).toBe(200);
    expect(updated.body.records.map((record: { id: string }) => record.id)).toEqual(
      expect.arrayContaining(ownedIds),
    );
    expect(updated.body.records.some((record: { id: string }) => record.id === foreignId)).toBe(
      false,
    );

    const removed = await request(appA)
      .post('/api/history/bulk-delete')
      .send({ ids: [...ownedIds, foreignId] });
    expect(removed.status).toBe(200);
    expect(removed.body.removed).toBe(ownedIds.length);

    const foreignHistory = await request(appB).get('/api/history');
    expect(
      foreignHistory.body.records.some((record: { id: string }) => record.id === foreignId),
    ).toBe(true);
  });
});

describe('GET /api/history/public', () => {
  it('returns public records from every user without requiring authentication', async () => {
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const userA = `hist-public-a-${randomUUID()}`;
    const userB = `hist-public-b-${randomUUID()}`;
    const provider = fakeProvider();
    const appA = createApp({ provider, authMiddleware: stubAuth(userA) });
    const appB = createApp({ provider, authMiddleware: stubAuth(userB) });
    const publicApp = createApp({ provider, authMiddleware: denyAuth });

    await request(appA).post('/api/images/generate').send({ prompt: 'A private', count: 1 });
    await request(appA)
      .post('/api/images/generate')
      .send({ prompt: 'A public', count: 1, isPublic: true });
    await request(appB)
      .post('/api/images/generate')
      .send({ prompt: 'B public', count: 1, isPublic: true });

    const res = await request(publicApp).get('/api/history/public');

    expect(res.status).toBe(200);
    expect(res.body.records.map((r: { prompt: string }) => r.prompt)).toEqual(
      expect.arrayContaining(['A public', 'B public']),
    );
    expect(res.body.records.some((r: { prompt: string }) => r.prompt === 'A private')).toBe(false);
    expect(res.body.records.every((r: { isPublic: boolean }) => r.isPublic)).toBe(true);
  });

  it('paginates a shared timestamp without duplicates and strips reference identifiers', async () => {
    const userId = `hist-page-${randomUUID()}`;
    ensureUser(userId);
    const createdAt = new Date(Date.now() + 60_000);
    const ids = [`${randomUUID()}.png`, `${randomUUID()}.png`, `${randomUUID()}.png`].sort(
      (left, right) => right.localeCompare(left),
    );
    insertImageRecords(
      ids.map((id) => ({
        id,
        batchId: randomUUID(),
        userId,
        prompt: `page ${id}`,
        model: 'gpt-image-2',
        referenceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png',
        referenceIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png'],
        filename: id,
        mime: 'image/png',
        width: 1024,
        height: 1024,
        count: 1,
        resolution: 'standard',
        isPublic: true,
        createdAt,
      })),
    );
    const app = createApp({ provider: fakeProvider(), authMiddleware: stubAuth(userId) });

    const first = await request(app).get('/api/history/public?limit=2');
    expect(first.status).toBe(200);
    expect(first.body.records.map((record: { id: string }) => record.id)).toEqual(ids.slice(0, 2));
    expect(first.body.nextCursor).toEqual(expect.any(String));
    expect(
      first.body.records.every(
        (record: Record<string, unknown>) =>
          record['referenceId'] === undefined && record['referenceIds'] === undefined,
      ),
    ).toBe(true);

    const second = await request(app).get(
      `/api/history/public?limit=2&cursor=${encodeURIComponent(first.body.nextCursor as string)}`,
    );
    expect(second.status).toBe(200);
    expect(second.body.records[0].id).toBe(ids[2]);
    expect(
      new Set([
        ...first.body.records.map((record: { id: string }) => record.id),
        ...second.body.records.map((record: { id: string }) => record.id),
      ]).size,
    ).toBe(first.body.records.length + second.body.records.length);
  });

  it('rejects oversized pages and invalid cursors', async () => {
    const app = createApp({ provider: fakeProvider() });

    expect((await request(app).get('/api/history/public?limit=51')).status).toBe(400);
    expect((await request(app).get('/api/history/public?cursor=not-a-cursor')).status).toBe(400);
  });

  it('uses the public created-at/id composite index', () => {
    const plan = sqlite
      .prepare(
        'EXPLAIN QUERY PLAN SELECT * FROM image_records WHERE is_public = 1 ORDER BY created_at DESC, id DESC LIMIT 24',
      )
      .all() as Array<{ detail: string }>;

    expect(plan.some((row) => row.detail.includes('image_records_public_created_id_idx'))).toBe(
      true,
    );
  });
});

describe('DELETE /api/history/public/:id', () => {
  it('lets an admin remove another user public image from the gallery without deleting owner history', async () => {
    const ownerId = `hist-public-owner-${randomUUID()}`;
    const adminId = `hist-public-admin-${randomUUID()}`;
    const provider = fakeProvider();
    const ownerApp = createApp({ provider, authMiddleware: stubAuth(ownerId) });
    const adminApp = createApp({
      provider,
      authMiddleware: stubAuth(adminId),
      adminMiddleware: allowAdmin(),
    });

    const generated = await request(ownerApp)
      .post('/api/images/generate')
      .send({ prompt: 'public moderation target', count: 1, isPublic: true });
    expect(generated.status).toBe(200);
    const id = generated.body.images[0].id as string;

    const deleted = await request(adminApp).delete(`/api/history/public/${id}`);
    expect(deleted.status).toBe(204);

    const publicGallery = await request(adminApp).get('/api/history/public');
    expect(publicGallery.body.records.some((r: { id: string }) => r.id === id)).toBe(false);

    const ownerHistory = await request(ownerApp).get('/api/history');
    const ownerRecord = ownerHistory.body.records.find((r: { id: string }) => r.id === id);
    expect(ownerRecord).toMatchObject({ id, isPublic: false });
  });

  it('also accepts the output UUID without its image extension', async () => {
    const ownerId = `hist-public-owner-short-${randomUUID()}`;
    const adminId = `hist-public-admin-short-${randomUUID()}`;
    const provider = fakeProvider();
    const ownerApp = createApp({ provider, authMiddleware: stubAuth(ownerId) });
    const adminApp = createApp({
      provider,
      authMiddleware: stubAuth(adminId),
      adminMiddleware: allowAdmin(),
    });

    const generated = await request(ownerApp)
      .post('/api/images/generate')
      .send({ prompt: 'public moderation short id target', count: 1, isPublic: true });
    const id = generated.body.images[0].id as string;
    const uuidWithoutExt = id.replace(/\.[^.]+$/u, '');

    const deleted = await request(adminApp).delete(`/api/history/public/${uuidWithoutExt}`);
    expect(deleted.status).toBe(204);

    const publicGallery = await request(adminApp).get('/api/history/public');
    expect(publicGallery.body.records.some((r: { id: string }) => r.id === id)).toBe(false);
  });

  it('returns 403 for ordinary users removing public gallery images directly', async () => {
    const ownerId = `hist-public-owner-${randomUUID()}`;
    const ordinaryId = `hist-public-ordinary-${randomUUID()}`;
    const provider = fakeProvider();
    const ownerApp = createApp({ provider, authMiddleware: stubAuth(ownerId) });
    const ordinaryApp = createApp({ provider, authMiddleware: stubAuth(ordinaryId) });

    const generated = await request(ownerApp)
      .post('/api/images/generate')
      .send({ prompt: 'protected public image', count: 1, isPublic: true });
    const id = generated.body.images[0].id as string;

    const res = await request(ordinaryApp).delete(`/api/history/public/${id}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 for anonymous public gallery delete attempts', async () => {
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const app = createApp({ provider: fakeProvider(), authMiddleware: denyAuth });

    const res = await request(app).delete('/api/history/public/nope.png');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
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
    await expect(stat(path.resolve(env.OUTPUT_DIR, id))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns 404 when deleting a record that does not exist for this user', async () => {
    const userId = `hist-404-${randomUUID()}`;
    const provider = fakeProvider();
    const app = createApp({ provider, authMiddleware: stubAuth(userId) });

    const res = await request(app).delete('/api/history/nope-not-real.png');
    expect(res.status).toBe(404);
  });
});
