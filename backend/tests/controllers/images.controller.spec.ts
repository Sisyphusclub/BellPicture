import { Buffer } from 'node:buffer';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
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

describe('POST /api/images/upload', () => {
  it('accepts a PNG and returns id, filename, mime, size', async () => {
    const { provider } = fakeProvider();
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
    const { provider } = fakeProvider();
    const app = createApp({ provider });
    const txt = Buffer.from('this is not really an image');

    const res = await request(app)
      .post('/api/images/upload')
      .attach('image', txt, { filename: 'fake.png', contentType: 'image/png' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 400 when no file is attached', async () => {
    const { provider } = fakeProvider();
    const app = createApp({ provider });

    const res = await request(app).post('/api/images/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /api/images/generate', () => {
  it('text-to-image happy path: returns 200 with batch + images array', async () => {
    const { provider } = fakeProvider();
    const app = createApp({ provider });

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'red cube on a blue floor' });

    expect(res.status).toBe(200);
    expect(res.body.batchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.generationMode).toBe('text-to-image');
    expect(res.body.aspectRatio).toBe('1:1');
    expect(Array.isArray(res.body.images)).toBe(true);
    // Default count is 2.
    expect(res.body.images).toHaveLength(2);
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

  it('respects explicit count + aspectRatio', async () => {
    const { provider } = fakeProvider();
    const app = createApp({ provider });

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'p', count: 3, aspectRatio: '16:9' });

    expect(res.status).toBe(200);
    expect(res.body.images).toHaveLength(3);
    expect(res.body.aspectRatio).toBe('16:9');
    const call = (provider.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as GenerateInput;
    expect(call.count).toBe(3);
    expect(call.aspectRatio).toBe('16:9');
  });

  it('image-to-image happy path: uses an existing referenceId and reports image-to-image mode', async () => {
    const harness = fakeProvider();
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
    const { provider } = fakeProvider();
    const app = createApp({ provider });

    const res = await request(app).post('/api/images/generate').send({ prompt: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.error.details?.issues)).toBe(true);
  });

  it('returns 400 when count is out of range', async () => {
    const { provider } = fakeProvider();
    const app = createApp({ provider });

    const res = await request(app).post('/api/images/generate').send({ prompt: 'p', count: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when aspectRatio is not in the supported set', async () => {
    const { provider } = fakeProvider();
    const app = createApp({ provider });

    const res = await request(app)
      .post('/api/images/generate')
      .send({ prompt: 'p', aspectRatio: '4:3' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when referenceId does not match a stored file', async () => {
    const { provider } = fakeProvider();
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
