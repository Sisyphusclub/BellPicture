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
  it('writes the generated image and returns the output path (text-to-image)', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ created: 1, data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    const out = await provider.generate({ prompt: 'a red cube' });

    expect(out.width).toBe(1024);
    expect(out.height).toBe(1024);
    expect(out.outputPath).toMatch(/\.png$/);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.example.com/v1/images/generations');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body['model']).toBe('gpt-image-2');
    expect(body['prompt']).toBe('a red cube');
    expect(body['response_format']).toBe('b64_json');
    expect(body['n']).toBe(1);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer sk-test');
  });

  it('calls /v1/images/edits with multipart FormData when referencePath is set (image-to-image)', async () => {
    const refBytes = Buffer.from(TINY_PNG_B64, 'base64');
    const refPath = await seedUpload('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png', refBytes);

    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    const out = await provider.generate({ prompt: 'reshape it', referencePath: refPath });

    expect(out.outputPath).toMatch(/\.png$/);

    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.example.com/v1/images/edits');
    const form = (init as RequestInit).body;
    expect(form).toBeInstanceOf(FormData);
    const fd = form as FormData;
    expect(fd.get('prompt')).toBe('reshape it');
    expect(fd.get('model')).toBe('gpt-image-2');
    expect(fd.get('n')).toBe('1');
    expect(fd.get('size')).toBe('1024x1024');
    expect(fd.get('response_format')).toBe('b64_json');
    const image = fd.get('image');
    expect(image).toBeInstanceOf(Blob);
    expect((image as Blob).size).toBe(refBytes.length);

    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer sk-test');
    // We must NOT set content-type manually for FormData — let undici set
    // the multipart boundary.
    expect(headers['content-type']).toBeUndefined();
  });

  it('maps 4xx upstream to PROVIDER_ERROR 502', async () => {
    const provider = new TwoApiImageProvider(
      baseConfig,
      vi.fn(async () => errorResponse(401, 'unauthorized')),
    );

    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      status: 502,
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
