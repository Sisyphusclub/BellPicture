import { describe, expect, it, vi } from 'vitest';

import {
  claimDailyCheckIn,
  fetchImageQuota,
  generateImage,
  registerUnauthorizedHandler,
  uploadReferenceImage,
} from '@/services/api/imagesApi';
import type { ImageApiError } from '@/services/api/imagesApi';

describe('imagesApi', () => {
  it('reads GPT pool quota through the backend quota endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 100,
          remaining: 98,
          checkedInToday: false,
          dailyCheckInReward: 5,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchImageQuota();

    expect(result.remaining).toBe(98);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/images/quota',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('claims daily check-in credits through the authenticated endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          total: 105,
          remaining: 103,
          checkedInToday: true,
          dailyCheckInReward: 5,
          claimed: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await claimDailyCheckIn();

    expect(result).toMatchObject({ claimed: true, remaining: 103, checkedInToday: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/images/quota/check-in',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
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
      '/api/images/upload',
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

  it('routes high-resolution generate requests to the dedicated endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          batchId: 'b-high',
          aspectRatio: '16:9',
          generationMode: 'text-to-image',
          images: [
            {
              id: 'out-4k.png',
              outputUrl: '/api/outputs/out-4k.png',
              filename: 'out-4k.png',
              mime: 'image/png',
              width: 3840,
              height: 2160,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateImage({
      prompt: '管理员 4K 海报',
      aspectRatio: '16:9',
      resolution: '4k',
    });

    expect(result.images[0]?.width).toBe(3840);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/images/generate/high-res',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      prompt: '管理员 4K 海报',
      aspectRatio: '16:9',
      resolution: '4k',
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
