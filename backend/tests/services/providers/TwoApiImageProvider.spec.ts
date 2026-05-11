import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

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

describe('TwoApiImageProvider', () => {
  it('writes the generated image and returns the output path', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(async () =>
      jsonResponse({ created: 1, data: [{ b64_json: TINY_PNG_B64 }] }),
    );
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    const out = await provider.generate({ prompt: 'a red cube' });

    expect(out.width).toBe(1024);
    expect(out.height).toBe(1024);
    expect(out.outputPath).toMatch(/\.png$/);

    const written = await fs.readFile(out.outputPath);
    expect(written.length).toBeGreaterThan(0);
    expect(written.equals(Buffer.from(TINY_PNG_B64, 'base64'))).toBe(true);

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0]!;
    const [calledUrl, init] = call;
    expect(calledUrl).toBe('https://api.example.com/v1/images/generations');
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body['model']).toBe('gpt-image-2');
    expect(body['prompt']).toBe('a red cube');
    expect(body['response_format']).toBe('b64_json');
    expect(body['n']).toBe(1);
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer sk-test');
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

  it('rejects when referencePath is provided (deferred feature)', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>();
    const provider = new TwoApiImageProvider(baseConfig, fetchMock);

    await expect(
      provider.generate({ prompt: 'x', referencePath: 'foo.png' }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
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
