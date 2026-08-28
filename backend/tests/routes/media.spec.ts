import { ReadableStream } from 'node:stream/web';

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { requestLogger } from '../../src/middlewares/requestLogger.js';
import { buildMediaRouter } from '../../src/routes/media.js';

function hangingFetch(capture: (signal: AbortSignal) => void): typeof fetch {
  return vi.fn(async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const signal = init?.signal;
    if (!signal) throw new Error('missing signal');
    capture(signal);
    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
        once: true,
      });
    });
  });
}

function testApp(fetchImpl: typeof fetch, timeoutMs: number) {
  const app = express();
  app.use(requestLogger);
  app.use('/api/media', buildMediaRouter(fetchImpl, timeoutMs));
  app.use(errorHandler);
  return app;
}

describe('media proxy', () => {
  it('returns 504 and aborts an upstream that exceeds the timeout', async () => {
    let upstreamSignal!: AbortSignal;
    const response = await request(
      testApp(
        hangingFetch((signal) => {
          upstreamSignal = signal;
        }),
        5,
      ),
    ).get('/api/media/liquid-glass.mp4');

    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe('PROVIDER_TIMEOUT');
    expect(upstreamSignal.aborted).toBe(true);
  });

  it('aborts the upstream when the downstream client disconnects', async () => {
    let upstreamSignal!: AbortSignal;
    const pending = request(
      testApp(
        hangingFetch((signal) => {
          upstreamSignal = signal;
        }),
        5_000,
      ),
    ).get('/api/media/liquid-glass.mp4');
    const settled = pending.then(
      () => undefined,
      () => undefined,
    );
    await vi.waitFor(() => expect(upstreamSignal).toBeDefined());

    pending.abort();
    await settled;

    await vi.waitFor(() => expect(upstreamSignal.aborted).toBe(true));
  });

  it('closes the downstream connection when the upstream body fails after headers', async () => {
    const fetchImpl = vi.fn(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.error(new Error('upstream stream failed'));
        },
      });
      return new Response(body as unknown as globalThis.ReadableStream<Uint8Array>, {
        status: 200,
        headers: { 'content-type': 'video/mp4' },
      });
    }) as typeof fetch;

    await expect(
      request(testApp(fetchImpl, 5_000)).get('/api/media/liquid-glass.mp4'),
    ).rejects.toThrow();
  });
});
