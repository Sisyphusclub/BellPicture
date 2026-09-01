import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { db } from '../../src/db/drizzle.js';
import { user } from '../../src/db/schema.js';
import { insertImageRecords } from '../../src/services/history.service.js';
import { createSignedOutputPath } from '../../src/services/outputAccess.service.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveOutput } from '../../src/storage/localStorage.js';

const fakeProvider: ImageGenerationProvider = {
  generate: vi.fn(async () => ({
    images: [{ outputPath: '/dev/null/never.png', width: 1024, height: 1024 }],
    aspectRatio: '1:1' as const,
  })),
};

function ensureUser(userId: string, isAdmin = false): void {
  const now = new Date();
  db.insert(user)
    .values({
      id: userId,
      name: `Test ${userId}`,
      email: `${userId}@test.local`,
      emailVerified: false,
      isAdmin,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function stubAuth(userId: string, isAdmin = false): RequestHandler {
  ensureUser(userId, isAdmin);
  return (req, _res, next) => {
    req.user = { id: userId, email: `${userId}@test.local`, isAdmin };
    next();
  };
}

function recordOutput(filename: string, userId: string, isPublic: boolean): void {
  ensureUser(userId);
  insertImageRecords([
    {
      id: filename,
      batchId: randomUUID(),
      userId,
      prompt: 'output access test',
      model: 'test-model',
      filename,
      mime: 'image/png',
      width: 1,
      height: 1,
      count: 1,
      resolution: 'standard',
      isPublic,
      createdAt: new Date(),
    },
  ]);
}

describe('GET /api/outputs/:filename', () => {
  it('streams a public PNG anonymously with the correct Content-Type', async () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xaa, 0xbb]);
    const saved = await saveOutput(PNG, 'png');
    recordOutput(saved.filename, `output-public-${randomUUID()}`, true);

    const app = createApp({ provider: fakeProvider });
    const res = await request(app)
      .get(`/api/outputs/${saved.filename}`)
      .buffer()
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toBe('private, max-age=31536000, immutable');
    expect((res.body as Buffer).equals(PNG)).toBe(true);
  });

  it('hides a private output from anonymous and other users', async () => {
    const saved = await saveOutput(
      Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n'), Buffer.alloc(8)]),
      'png',
    );
    const ownerId = `output-owner-${randomUUID()}`;
    recordOutput(saved.filename, ownerId, false);

    const anonymous = await request(createApp({ provider: fakeProvider })).get(
      `/api/outputs/${saved.filename}`,
    );
    const other = await request(
      createApp({
        provider: fakeProvider,
        authMiddleware: stubAuth(`output-other-${randomUUID()}`),
      }),
    ).get(`/api/outputs/${saved.filename}`);

    expect(anonymous.status).toBe(404);
    expect(other.status).toBe(404);
  });

  it('allows the owner and an administrator to read a private output', async () => {
    const png = Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n'), Buffer.alloc(8)]);
    const saved = await saveOutput(png, 'png');
    const ownerId = `output-owner-${randomUUID()}`;
    recordOutput(saved.filename, ownerId, false);

    const owner = await request(
      createApp({ provider: fakeProvider, authMiddleware: stubAuth(ownerId) }),
    ).get(`/api/outputs/${saved.filename}`);
    const admin = await request(
      createApp({
        provider: fakeProvider,
        authMiddleware: stubAuth(`output-admin-${randomUUID()}`, true),
      }),
    ).get(`/api/outputs/${saved.filename}`);

    expect(owner.status).toBe(200);
    expect(admin.status).toBe(200);
  });

  it('allows an unrecorded compatibility output only with a valid unexpired signature', async () => {
    const saved = await saveOutput(
      Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n'), Buffer.alloc(8)]),
      'png',
    );
    const signedPath = createSignedOutputPath(saved.filename);
    const expiredPath = createSignedOutputPath(saved.filename, Date.now() - 3_600_000, 1);
    const app = createApp({ provider: fakeProvider });

    expect((await request(app).get(signedPath)).status).toBe(200);
    expect((await request(app).get(expiredPath)).status).toBe(404);
  });

  it('rejects path-traversal filenames with 400', async () => {
    const app = createApp({ provider: fakeProvider });
    const res = await request(app).get('/api/outputs/..%2Fescape.png');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects filenames that are not `<uuid>.<ext>` with 400', async () => {
    const app = createApp({ provider: fakeProvider });
    const res = await request(app).get('/api/outputs/totally-bogus.png');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 404 when the file does not exist', async () => {
    const app = createApp({ provider: fakeProvider });
    const res = await request(app).get('/api/outputs/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('keeps non-ENOENT storage failures as 500', async () => {
    const filename = `${randomUUID()}.png`;
    await mkdir(path.join(path.resolve(env.OUTPUT_DIR), filename), { recursive: true });
    recordOutput(filename, `output-storage-${randomUUID()}`, true);
    const app = createApp({ provider: fakeProvider });

    const res = await request(app).get(`/api/outputs/${filename}`);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('STORAGE_ERROR');
  });
});

function binaryParser(res: request.Response, cb: (err: Error | null, body: Buffer) => void): void {
  const data: Buffer[] = [];
  res.on('data', (chunk: Buffer) => data.push(chunk));
  res.on('end', () => cb(null, Buffer.concat(data)));
  res.on('error', cb);
}
