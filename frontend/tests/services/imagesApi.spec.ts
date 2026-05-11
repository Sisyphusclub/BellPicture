import { describe, expect, it, vi } from 'vitest';

import { generateImage, uploadReferenceImage } from '@/services/api/imagesApi';
import type { ImageApiError } from '@/services/api/imagesApi';

describe('imagesApi', () => {
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
            id: 'out.png',
            outputUrl: '/api/outputs/out.png',
            filename: 'out.png',
            mime: 'image/png',
            width: 1024,
            height: 1024,
            generationMode: 'text-to-image',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const result = await generateImage({ prompt: 'warm cream canvas' });

    expect(result.outputUrl).toBe('/api/outputs/out.png');
    expect(result.generationMode).toBe('text-to-image');
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
});
