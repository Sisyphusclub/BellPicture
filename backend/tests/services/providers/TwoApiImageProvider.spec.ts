import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { env } from '../../../src/config/env.js';
import { AppError } from '../../../src/errors/AppError.js';
import { TwoApiImageProvider } from '../../../src/services/providers/TwoApiImageProvider.js';

const baseConfig = {
  baseUrl: 'https://api.example.com',
  apiKey: 'sk-test',
  defaultModel: 'gpt-image-2',
  timeoutMs: 5000,
};

// 1x1 transparent PNG.
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(status: number, body = 'error'): Response {
  return new Response(body, { status });
}

async function seedUpload(filename: string, bytes: Buffer): Promise<string> {
  const root = path.resolve(env.UPLOAD_DIR);
  await mkdir(root, { recursive: true });
  const abs = path.join(root, filename);
  await writeFile(abs, bytes);
  return abs;
}

describe('TwoApiImageProvider', () => {
  it('writes one image per data entry and returns the array (text-to-image)', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({
        created: 1,
        data: [{ b64_json: TINY_PNG_B64 }, { b64_json: TINY_PNG_B64 }],
      }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    const out = await provider.generate({ prompt: 'a red cube', count: 2, aspectRatio: '1:1' });

    expect(out.aspectRatio).toBe('1:1');
    expect(out.images).toHaveLength(2);
    for (const image of out.images) {
      expect(image.width).toBe(1024);
      expect(image.height).toBe(1024);
      expect(image.outputPath).toMatch(/\.png$/);
    }

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.example.com/v1/images/generations');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body['model']).toBe('gpt-image-2');
    expect(body['prompt']).toBe('a red cube');
    expect(body['response_format']).toBe('b64_json');
    expect(body['n']).toBe(2);
    expect(body['size']).toBe('1024x1024');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test');
  });

  it('maps aspectRatio to provider size payload', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);
    await provider.generate({ prompt: 'wide', count: 1, aspectRatio: '16:9' });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['size']).toBe('1792x1024');
  });

  it('maps 2k resolution to provider size payload', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    const out = await provider.generate({
      prompt: '2k portrait',
      count: 1,
      aspectRatio: '2:3',
      resolution: '2k',
    });

    expect(out.images[0]).toMatchObject({ width: 1360, height: 2048 });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['size']).toBe('1360x2048');
  });

  it('routes high-resolution text-to-image calls to the configured high-res base URL', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      { ...baseConfig, highResBaseUrl: 'https://codex.example.com' },
      fetchMock,
    );

    await provider.generate({
      prompt: '2k square',
      aspectRatio: '1:1',
      resolution: '2k',
    });

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://codex.example.com/v1/images/generations');
  });

  it('uses the base API key for standard requests even when a high-res key is configured', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      { ...baseConfig, highResApiKey: 'sk-high-res' },
      fetchMock,
    );

    await provider.generate({
      prompt: 'standard square',
      aspectRatio: '1:1',
      resolution: 'standard',
    });

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test');
  });

  it('uses the configured high-res API key for high-resolution requests', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      {
        ...baseConfig,
        highResBaseUrl: 'https://codex.example.com',
        highResApiKey: 'sk-high-res',
      },
      fetchMock,
    );

    await provider.generate({
      prompt: '2k square',
      aspectRatio: '1:1',
      resolution: '2k',
    });

    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://codex.example.com/v1/images/generations');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-high-res');
  });

  it('uses the configured high-res model when the app sends the default model', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      { ...baseConfig, highResModel: 'codex-gpt-image-2' },
      fetchMock,
    );

    await provider.generate({
      prompt: '4k wide',
      model: 'gpt-image-2',
      aspectRatio: '16:9',
      resolution: '4k',
    });

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['model']).toBe('codex-gpt-image-2');
  });

  it('maps 4k resolution to provider size payload', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      { ...baseConfig, highResBaseUrl: 'https://codex.example.com///' },
      fetchMock,
    );

    const out = await provider.generate({
      prompt: '4k wide',
      count: 1,
      aspectRatio: '16:9',
      resolution: '4k',
    });

    expect(out.images[0]).toMatchObject({ width: 3840, height: 2160 });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['size']).toBe('3840x2160');
  });

  it('rejects 4k requests for unsupported aspect ratios before provider IO', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    await expect(
      provider.generate({
        prompt: '4k square',
        aspectRatio: '1:1',
        resolution: '4k',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
      details: { aspectRatio: '1:1', resolution: '4k' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls /v1/images/edits with multipart FormData when referencePath is set (image-to-image)', async () => {
    const refBytes = Buffer.from(TINY_PNG_B64, 'base64');
    const refPath = await seedUpload('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png', refBytes);

    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }, { b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    const out = await provider.generate({
      prompt: 'reshape it',
      referencePath: refPath,
      count: 2,
      aspectRatio: '1:1',
    });

    expect(out.images).toHaveLength(2);
    for (const image of out.images) {
      expect(image.outputPath).toMatch(/\.png$/);
    }

    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.example.com/v1/images/edits');
    const form = (init as RequestInit).body;
    expect(form).toBeInstanceOf(FormData);
    const fd = form as FormData;
    expect(fd.get('prompt')).toBe('reshape it');
    expect(fd.get('model')).toBe('gpt-image-2');
    expect(fd.get('n')).toBe('2');
    expect(fd.get('size')).toBe('1024x1024');
    expect(fd.get('response_format')).toBe('b64_json');
    const image = fd.get('image');
    expect(image).toBeInstanceOf(Blob);
    expect((image as Blob).size).toBe(refBytes.length);

    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test');
    // We must NOT set content-type manually for FormData — let undici set
    // the multipart boundary.
    expect(headers['content-type']).toBeUndefined();
  });

  it('maps high-resolution image-to-image requests to multipart size payload', async () => {
    const refBytes = Buffer.from(TINY_PNG_B64, 'base64');
    const refPath = await seedUpload('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png', refBytes);

    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      { ...baseConfig, highResBaseUrl: 'https://codex.example.com' },
      fetchMock,
    );

    const out = await provider.generate({
      prompt: 'upscale edit',
      referencePath: refPath,
      count: 1,
      aspectRatio: '9:16',
      resolution: '4k',
    });

    expect(out.images[0]).toMatchObject({ width: 2160, height: 3840 });
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://codex.example.com/v1/images/edits');
    const form = (init as RequestInit).body as FormData;
    expect(form.get('size')).toBe('2160x3840');
  });

  it('maps prompt rejection upstream statuses to PROVIDER_PROMPT_REJECTED 422', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => errorResponse(400, 'content rejected')),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_PROMPT_REJECTED',
      status: 422,
      details: { upstreamStatus: 400, reason: 'prompt_rejected' },
    });
  });

  it('maps auth-like upstream 4xx to PROVIDER_ERROR 502', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => errorResponse(401, 'unauthorized')),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      status: 502,
      details: { upstreamStatus: 401, reason: 'provider_http_error' },
    });
  });

  it('maps 5xx upstream to PROVIDER_ERROR 502', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => errorResponse(500, 'oops')),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      status: 502,
      details: { upstreamStatus: 500, reason: 'provider_http_error' },
    });
  });

  it('maps empty successful provider payloads to PROVIDER_EMPTY_RESULT 502', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => jsonResponse({ data: [] })),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_EMPTY_RESULT',
      status: 502,
      details: { reason: 'empty_result' },
    });
  });

  it('maps 429 upstream to PROVIDER_RATE_LIMITED 429', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => errorResponse(429, 'slow down')),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toBeInstanceOf(AppError);
    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
      status: 429,
    });
  });

  it('maps fetch AbortError to PROVIDER_TIMEOUT 504', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toBeInstanceOf(AppError);
    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_TIMEOUT',
      status: 504,
    });
  });

  it('tolerates trailing slashes in baseUrl', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(
      { ...baseConfig, baseUrl: 'https://api.example.com///' },
      fetchMock,
    );

    await provider.generate({ prompt: 'p' });

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.example.com/v1/images/generations');
  });
});
