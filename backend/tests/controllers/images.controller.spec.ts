import { Buffer } from 'node:buffer';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { AppError } from '../../src/errors/AppError.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveOutput } from '../../src/storage/localStorage.js';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeOutput(): { provider: ImageGenerationProvider; outputPath: string } {
  // Each test gets a fresh output file on disk so different tests don't
  // share state.
  let outputPath = '';
  const provider: ImageGenerationProvider = {
    generate: vi.fn(async (_input) => {
      const saved = await saveOutput(Buffer.concat([PNG_PREFIX, Buffer.alloc(32, 0)]), 'png');
      outputPath = saved.absolutePath;
      return { outputPath, width: 1024, height: 1024 };
    }),
  };
  return {
    provider,
    get outputPath() {
      return outputPath;
    },
  };
}

describe('POST /api/images/upload', () => {
  it('accepts a PNG and returns id, filename, mime, size', async () => {
    const { provider } = fakeOutput();
    const app = createApp({ provider });
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
    const { provider } = fakeOutput();
    const app = createApp({ provider });
    const txt = Buffer.from('this is not really an image');

    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', txt, { filename: 'fake.png', contentType: 'image/png' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 400 when no file is attached', async () => {
    const { provider } = fakeOutput();
    const app = createApp({ provider });

    const res = await request(app).post('/api/images/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /api/images/generate', () => {
  it('text-to-image happy path: returns 200 with outputUrl + generationMode', async () => {
    const { provider } = fakeOutput();
    const app = createApp({ provider });

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'red cube on a blue floor' });

    expect(res.status).toBe(200);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(res.body.outputUrl).toBe(`/api/outputs/${res.body.id as string}`);
    expect(res.body.filename).toBe(res.body.id);
    expect(res.body.mime).toBe('image/png');
    expect(res.body.width).toBe(1024);
    expect(res.body.height).toBe(1024);
    expect(res.body.generationMode).toBe('text-to-image');
    expect(provider.generate).toHaveBeenCalledOnce();
  });

  it('image-to-image happy path: uses an existing referenceId and reports image-to-image mode', async () => {
    const harness = fakeOutput();
    const app = createApp({ provider: harness.provider });

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
      referencePath?: string;
    };
    expect(call.referencePath).toBeDefined();
    expect(call.referencePath as string).toContain(referenceId);
  });

  it('returns 400 when prompt is empty', async () => {
    const { provider } = fakeOutput();
    const app = createApp({ provider });

    const res = await request(app).post('/api/images/generate').send({ prompt: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.error.details?.issues)).toBe(true);
  });

  it('returns 400 when referenceId does not match a stored file', async () => {
    const { provider } = fakeOutput();
    const app = createApp({ provider });

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
    const app = createApp({ provider });
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
    const app = createApp({ provider });
    const res = await request(app).post('/api/images/generate').send({ prompt: 'x' });
    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('PROVIDER_TIMEOUT');
  });
});
