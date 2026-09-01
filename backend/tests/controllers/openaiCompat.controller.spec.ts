import { Buffer } from 'node:buffer';

import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveOutput } from '../../src/storage/localStorage.js';
import { ASPECT_SIZE_MAP, type GenerateInput, type GenerateOutput } from '../../src/types/image.js';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const AUTH_HEADER = `Bearer ${env.OPENAI_COMPAT_API_KEY}`;

function pngBytes(seed = 0): Buffer {
  return Buffer.concat([PNG_PREFIX, Buffer.alloc(32, seed)]);
}

function fakeProvider(): {
  provider: ImageGenerationProvider;
  generate: ReturnType<typeof vi.fn>;
} {
  const generate = vi.fn(async (input: GenerateInput): Promise<GenerateOutput> => {
    const count = input.count ?? 1;
    const aspectRatio = input.aspectRatio ?? '1:1';
    const size = ASPECT_SIZE_MAP[aspectRatio];
    const images: GenerateOutput['images'] = [];

    for (let index = 0; index < count; index += 1) {
      const saved = await saveOutput(pngBytes(index), 'png');
      images.push({ outputPath: saved.absolutePath, width: size.width, height: size.height });
    }

    return { images, aspectRatio };
  });

  return { provider: { generate }, generate };
}

function buildApp(provider: ImageGenerationProvider): Express {
  return createApp({ provider });
}

function expectUnauthorized(res: request.Response): void {
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('UNAUTHORIZED');
}

function expectBadRequest(res: request.Response): void {
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('BAD_REQUEST');
}

function expectBase64Png(value: unknown): void {
  expect(typeof value).toBe('string');
  const decoded = Buffer.from(value as string, 'base64');
  expect(decoded.subarray(0, PNG_PREFIX.length).equals(PNG_PREFIX)).toBe(true);
}

function dataImageUrl(): string {
  return `data:image/png;base64,${pngBytes(0xab).toString('base64')}`;
}

const authScenarios: Array<{ name: string; makeRequest: (app: Express) => request.Test }> = [
  {
    name: 'GET /v1/models',
    makeRequest: (app) => request(app).get('/v1/models'),
  },
  {
    name: 'POST /v1/images/generations',
    makeRequest: (app) =>
      request(app).post('/v1/images/generations').send({ prompt: 'auth smoke' }),
  },
  {
    name: 'POST /v1/images/edits',
    makeRequest: (app) =>
      request(app)
        .post('/v1/images/edits')
        .field('prompt', 'auth smoke')
        .attach('image', pngBytes(1), { filename: 'ref.png', contentType: 'image/png' }),
  },
  {
    name: 'POST /v1/chat/completions',
    makeRequest: (app) =>
      request(app)
        .post('/v1/chat/completions')
        .send({ messages: [{ role: 'user', content: 'auth smoke' }] }),
  },
  {
    name: 'POST /v1/responses',
    makeRequest: (app) =>
      request(app)
        .post('/v1/responses')
        .send({ input: 'auth smoke', tools: [{ type: 'image_generation' }] }),
  },
];

describe('OpenAI-compatible /v1 bearer auth', () => {
  for (const scenario of authScenarios) {
    it(`${scenario.name} rejects missing Authorization`, async () => {
      const harness = fakeProvider();
      const res = await scenario.makeRequest(buildApp(harness.provider));

      expectUnauthorized(res);
      expect(harness.generate).not.toHaveBeenCalled();
    });

    it(`${scenario.name} rejects non-Bearer Authorization`, async () => {
      const harness = fakeProvider();
      const res = await scenario
        .makeRequest(buildApp(harness.provider))
        .set('Authorization', 'Basic not-a-bearer-token');

      expectUnauthorized(res);
      expect(harness.generate).not.toHaveBeenCalled();
    });

    it(`${scenario.name} rejects wrong bearer token`, async () => {
      const harness = fakeProvider();
      const res = await scenario
        .makeRequest(buildApp(harness.provider))
        .set('Authorization', 'Bearer wrong-token');

      expectUnauthorized(res);
      expect(harness.generate).not.toHaveBeenCalled();
    });
  }
});

describe('GET /v1/models', () => {
  it('returns the required OpenAI-compatible model list with valid bearer auth', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app).get('/v1/models').set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.object).toBe('list');
    expect(res.body.data.map((model: { id: string }) => model.id)).toEqual([
      'gpt-image-2',
      'codex-gpt-image-2',
      'auto',
      'gpt-5',
      'gpt-5-1',
      'gpt-5-2',
      'gpt-5-3',
      'gpt-5-3-mini',
      'gpt-5-mini',
    ]);
    expect(res.body.data[0]).toMatchObject({
      id: 'gpt-image-2',
      object: 'model',
      created: 1_710_000_000,
      owned_by: 'nebulens',
    });
    expect(harness.generate).not.toHaveBeenCalled();
  });
});

describe('POST /v1/images/generations', () => {
  it('generates four b64_json images with one provider call', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ prompt: 'cream canvas', model: 'gpt-5-mini', n: 4, size: '1536x1024' });

    expect(res.status).toBe(200);
    expect(typeof res.body.created).toBe('number');
    expect(res.body.data).toHaveLength(4);
    expectBase64Png(res.body.data[0].b64_json);
    expectBase64Png(res.body.data[3].b64_json);
    expect(res.body.data[0].url).toBeUndefined();
    expect(harness.generate).toHaveBeenCalledOnce();
    const call = harness.generate.mock.calls[0]?.[0] as GenerateInput | undefined;
    expect(call).toMatchObject({
      prompt: 'cream canvas',
      model: 'gpt-5-mini',
      count: 4,
      aspectRatio: '3:2',
    });
  });

  it('supports url response_format with absolute output URLs', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .set('Host', 'compat.test')
      .set('x-forwarded-proto', 'https')
      .send({ prompt: 'absolute links', response_format: 'url' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].url).toMatch(
      /^https:\/\/compat\.test\/api\/outputs\/[0-9a-f-]{36}\.png\?expires=\d{10}&signature=[0-9a-f]{64}$/u,
    );
    expect(res.body.data[0].b64_json).toBeUndefined();
  });

  it('rejects missing prompt with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ n: 1 });

    expectBadRequest(res);
    expect(Array.isArray(res.body.error.details.issues)).toBe(true);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects blank prompt with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ prompt: '   ' });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects unsupported size with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ prompt: 'bad size', size: '512x512' });

    expectBadRequest(res);
    expect(res.body.error.details.size).toBe('512x512');
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects n greater than MAX_COUNT with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ prompt: 'too many', n: 5 });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects stream and partial image requests with typed 400 errors', async () => {
    const streamHarness = fakeProvider();
    const streamRes = await request(buildApp(streamHarness.provider))
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ prompt: 'stream', stream: true });

    expectBadRequest(streamRes);
    expect(streamHarness.generate).not.toHaveBeenCalled();

    const partialHarness = fakeProvider();
    const partialRes = await request(buildApp(partialHarness.provider))
      .post('/v1/images/generations')
      .set('Authorization', AUTH_HEADER)
      .send({ prompt: 'partial', partial_images: 1 });

    expectBadRequest(partialRes);
    expect(partialHarness.generate).not.toHaveBeenCalled();
  });
});

describe('POST /v1/images/edits', () => {
  it('accepts one image file and generates an OpenAI ImagesResponse', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'edit the reference')
      .field('model', 'codex-gpt-image-2')
      .field('n', '2')
      .field('size', '1024x1536')
      .attach('image', pngBytes(2), { filename: 'ref.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expectBase64Png(res.body.data[0].b64_json);
    expect(harness.generate).toHaveBeenCalledOnce();
    const call = harness.generate.mock.calls[0]?.[0] as GenerateInput | undefined;
    expect(call).toMatchObject({
      prompt: 'edit the reference',
      model: 'codex-gpt-image-2',
      count: 2,
      aspectRatio: '2:3',
    });
    expect(call?.referencePaths?.[0]).toMatch(/[0-9a-f-]{36}\.png$/u);
  });

  it('rejects missing image with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'missing image');

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects blank prompt before generation', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', '   ')
      .attach('image', pngBytes(3), { filename: 'ref.png', contentType: 'image/png' });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects masks with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'mask unsupported')
      .field('mask', 'not supported')
      .attach('image', pngBytes(3), { filename: 'ref.png', contentType: 'image/png' });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects multiple image files with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'too many refs')
      .attach('image', pngBytes(4), { filename: 'ref-a.png', contentType: 'image/png' })
      .attach('image', pngBytes(5), { filename: 'ref-b.png', contentType: 'image/png' });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects unsupported upload bytes with UNSUPPORTED_MEDIA_TYPE', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'bad bytes')
      .attach('image', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects unsupported size and invalid n before generation', async () => {
    const sizeHarness = fakeProvider();
    const sizeRes = await request(buildApp(sizeHarness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'bad size')
      .field('size', '2048x2048')
      .attach('image', pngBytes(6), { filename: 'ref.png', contentType: 'image/png' });

    expectBadRequest(sizeRes);
    expect(sizeHarness.generate).not.toHaveBeenCalled();

    const nHarness = fakeProvider();
    const nRes = await request(buildApp(nHarness.provider))
      .post('/v1/images/edits')
      .set('Authorization', AUTH_HEADER)
      .field('prompt', 'bad count')
      .field('n', '5')
      .attach('image', pngBytes(7), { filename: 'ref.png', contentType: 'image/png' });

    expectBadRequest(nRes);
    expect(nHarness.generate).not.toHaveBeenCalled();
  });
});

describe('POST /v1/chat/completions', () => {
  it('extracts the latest user prompt and returns Markdown image links', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', AUTH_HEADER)
      .set('Host', 'chat.test')
      .send({
        model: 'gpt-5',
        n: 2,
        size: '1792x1024',
        messages: [
          { role: 'user', content: 'old prompt' },
          { role: 'assistant', content: 'ok' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'latest prompt' },
              { type: 'text', text: 'cinematic lighting' },
            ],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.object).toBe('chat.completion');
    expect(res.body.model).toBe('gpt-5');
    expect(res.body.choices[0].message.content).toContain('Generated 2 images');
    expect(res.body.choices[0].message.content).toContain(
      '![image 1](http://chat.test/api/outputs/',
    );
    expect(res.body.usage).toEqual({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    expect(harness.generate).toHaveBeenCalledOnce();
    const call = harness.generate.mock.calls[0]?.[0] as GenerateInput | undefined;
    expect(call).toMatchObject({
      prompt: 'latest prompt\ncinematic lighting',
      model: 'gpt-5',
      count: 2,
      aspectRatio: '16:9',
    });
  });

  it('accepts a data image URL as a local reference', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', AUTH_HEADER)
      .send({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'use this reference' },
              { type: 'image_url', image_url: { url: dataImageUrl() } },
            ],
          },
        ],
      });

    expect(res.status).toBe(200);
    const call = harness.generate.mock.calls[0]?.[0] as GenerateInput | undefined;
    expect(call?.referencePaths?.[0]).toMatch(/[0-9a-f-]{36}\.png$/u);
  });

  it('rejects remote image URLs even after a data reference', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/chat/completions')
      .set('Authorization', AUTH_HEADER)
      .send({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'do not fetch later refs' },
              { type: 'image_url', image_url: { url: dataImageUrl() } },
              { type: 'image_url', image_url: { url: 'https://example.test/ref.png' } },
            ],
          },
        ],
      });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects remote image URLs and streaming requests with typed 400 errors', async () => {
    const remoteHarness = fakeProvider();
    const remoteRes = await request(buildApp(remoteHarness.provider))
      .post('/v1/chat/completions')
      .set('Authorization', AUTH_HEADER)
      .send({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'do not fetch' },
              { type: 'image_url', image_url: { url: 'https://example.test/ref.png' } },
            ],
          },
        ],
      });

    expectBadRequest(remoteRes);
    expect(remoteHarness.generate).not.toHaveBeenCalled();

    const streamHarness = fakeProvider();
    const streamRes = await request(buildApp(streamHarness.provider))
      .post('/v1/chat/completions')
      .set('Authorization', AUTH_HEADER)
      .send({ stream: true, messages: [{ role: 'user', content: 'stream' }] });

    expectBadRequest(streamRes);
    expect(streamHarness.generate).not.toHaveBeenCalled();
  });
});

describe('POST /v1/responses', () => {
  it('returns image_generation_call base64 outputs and a discoverability message', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/responses')
      .set('Authorization', AUTH_HEADER)
      .set('Host', 'responses.test')
      .send({
        model: 'gpt-image-2',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'response prompt' },
              { type: 'input_text', text: 'soft shadows' },
            ],
          },
        ],
        n: 2,
        size: '1024x1024',
        tools: [{ type: 'image_generation', model: 'gpt-5-mini', size: '1024x1792' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.object).toBe('response');
    expect(res.body.status).toBe('completed');
    expect(res.body.model).toBe('gpt-5-mini');
    expect(res.body.output_text).toContain('Generated 2 images');
    expect(res.body.output_text).toContain('http://responses.test/api/outputs/');
    expect(res.body.output).toHaveLength(3);
    expect(res.body.output[0].type).toBe('image_generation_call');
    expect(res.body.output[1].type).toBe('image_generation_call');
    expectBase64Png(res.body.output[0].result);
    expectBase64Png(res.body.output[1].result);
    expect(res.body.output[2]).toMatchObject({
      type: 'message',
      role: 'assistant',
      status: 'completed',
    });
    expect(res.body.usage).toEqual({ input_tokens: 0, output_tokens: 0, total_tokens: 0 });
    expect(harness.generate).toHaveBeenCalledOnce();
    const call = harness.generate.mock.calls[0]?.[0] as GenerateInput | undefined;
    expect(call).toMatchObject({
      prompt: 'response prompt\nsoft shadows',
      model: 'gpt-5-mini',
      count: 2,
      aspectRatio: '9:16',
    });
  });

  it('accepts a data input_image URL as a local reference', async () => {
    const harness = fakeProvider();
    const app = buildApp(harness.provider);

    const res = await request(app)
      .post('/v1/responses')
      .set('Authorization', AUTH_HEADER)
      .send({
        input: [
          { type: 'input_text', text: 'response with ref' },
          { type: 'input_image', image_url: dataImageUrl() },
        ],
        tools: [{ type: 'image_generation' }],
      });

    expect(res.status).toBe(200);
    const call = harness.generate.mock.calls[0]?.[0] as GenerateInput | undefined;
    expect(call?.referencePaths?.[0]).toMatch(/[0-9a-f-]{36}\.png$/u);
  });

  it('rejects remote input_image URLs even after a data reference', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/responses')
      .set('Authorization', AUTH_HEADER)
      .send({
        input: [
          { type: 'input_text', text: 'do not fetch later refs' },
          { type: 'input_image', image_url: dataImageUrl() },
          { type: 'input_image', image_url: 'https://example.test/ref.png' },
        ],
        tools: [{ type: 'image_generation' }],
      });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });

  it('rejects tool lists without image_generation and remote image URLs', async () => {
    const toolHarness = fakeProvider();
    const toolRes = await request(buildApp(toolHarness.provider))
      .post('/v1/responses')
      .set('Authorization', AUTH_HEADER)
      .send({ input: 'prompt', tools: [{ type: 'web_search_preview' }] });

    expectBadRequest(toolRes);
    expect(toolHarness.generate).not.toHaveBeenCalled();

    const remoteHarness = fakeProvider();
    const remoteRes = await request(buildApp(remoteHarness.provider))
      .post('/v1/responses')
      .set('Authorization', AUTH_HEADER)
      .send({
        input: [
          { type: 'input_text', text: 'prompt' },
          { type: 'input_image', image_url: 'https://example.test/ref.png' },
        ],
        tools: [{ type: 'image_generation' }],
      });

    expectBadRequest(remoteRes);
    expect(remoteHarness.generate).not.toHaveBeenCalled();
  });

  it('rejects streaming response requests with a typed 400 error', async () => {
    const harness = fakeProvider();
    const res = await request(buildApp(harness.provider))
      .post('/v1/responses')
      .set('Authorization', AUTH_HEADER)
      .send({ input: 'stream', stream: true, tools: [{ type: 'image_generation' }] });

    expectBadRequest(res);
    expect(harness.generate).not.toHaveBeenCalled();
  });
});
