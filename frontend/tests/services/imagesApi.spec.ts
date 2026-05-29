import { describe, expect, it, vi } from 'vitest';

import {
  fetchImageQuota,
  generateImage,
  registerUnauthorizedHandler,
  uploadReferenceImage,
} from '@/services/api/imagesApi';
import type { ImageApiError } from '@/services/api/imagesApi';

describe('imagesApi', () => {
  it('reads GPT pool quota through the backend quota endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ total: 100, remaining: 98 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchImageQuota();

    expect(result.remaining).toBe(98);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/images/quota',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('uploads a reference image through the backend multipart endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'ref.png', filename: 'ref.png', mime: 'image/png', size: 12 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadReferenceImage(
      new File(['pixels'], 'ref.png', { type: 'image/png' }),
    );

    expect(result.id).toBe('ref.png');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/images/upload',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('narrows generate responses before returning typed data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            batchId: 'b-1',
            aspectRatio: '1:1',
            generationMode: 'text-to-image',
            images: [
              {
                id: 'out.png',
                outputUrl: '/api/outputs/out.png',
                filename: 'out.png',
                mime: 'image/png',
                width: 1024,
                height: 1024,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = await generateImage({ prompt: 'warm cream canvas' });

    expect(result.batchId).toBe('b-1');
    expect(result.aspectRatio).toBe('1:1');
    expect(result.generationMode).toBe('text-to-image');
    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.outputUrl).toBe('/api/outputs/out.png');
  });

  it('sends public visibility in generate requests', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          batchId: 'b-1',
          aspectRatio: '1:1',
          generationMode: 'text-to-image',
          images: [
            {
              id: 'out.png',
              outputUrl: '/api/outputs/out.png',
              filename: 'out.png',
              mime: 'image/png',
              width: 1024,
              height: 1024,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateImage({ prompt: 'publish me', isPublic: true });

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      prompt: 'publish me',
      isPublic: true,
    });
  });

  it('sends demo preset id in generate requests', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          batchId: 'b-demo',
          aspectRatio: '1:1',
          generationMode: 'text-to-image',
          images: [
            {
              id: 'demo.png',
              outputUrl: '/api/outputs/demo.png',
              filename: 'demo.png',
              mime: 'image/png',
              width: 1024,
              height: 1024,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateImage({ prompt: '演示提示词', demoPresetId: 'studio-showcase' });

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      prompt: '演示提示词',
      demoPresetId: 'studio-showcase',
    });
  });

  it('throws the backend error envelope with request context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'File is too large',
              requestId: 'req-1',
            },
          }),
          { status: 413, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      uploadReferenceImage(new File(['x'], 'large.png', { type: 'image/png' })),
    ).rejects.toMatchObject({
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      requestId: 'req-1',
    } satisfies Partial<ImageApiError>);
  });

  it('invokes the registered unauthorized handler on 401 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required', requestId: 'r' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);

    await expect(fetchImageQuota()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);

    // Clean up so subsequent tests don't see the spy.
    registerUnauthorizedHandler(() => undefined);
  });
});
