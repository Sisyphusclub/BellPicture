import { Buffer } from 'node:buffer';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveOutput } from '../../src/storage/localStorage.js';

const fakeProvider: ImageGenerationProvider = {
  generate: vi.fn(async () => ({
    images: [{ outputPath: '/dev/null/never.png', width: 1024, height: 1024 }],
    aspectRatio: '1:1' as const,
  })),
};

describe('GET /api/outputs/:filename', () => {
  it('streams an existing PNG with the correct Content-Type', async () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xaa, 0xbb]);
    const saved = await saveOutput(PNG, 'png');

    const app = createApp({ provider: fakeProvider });
    const res = await request(app)
      .get(`/api/outputs/${saved.filename}`)
      .buffer()
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect((res.body as Buffer).equals(PNG)).toBe(true);
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
});

function binaryParser(res: request.Response, cb: (err: Error | null, body: Buffer) => void): void {
  const data: Buffer[] = [];
  res.on('data', (chunk: Buffer) => data.push(chunk));
  res.on('end', () => cb(null, Buffer.concat(data)));
  res.on('error', cb);
}
