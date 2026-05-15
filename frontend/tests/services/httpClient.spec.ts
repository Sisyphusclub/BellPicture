import { describe, expect, it, vi } from 'vitest';

import { ImageApiError, authedFetch } from '@/services/api/httpClient';

describe('authedFetch', () => {
  it('wraps native fetch failures in a Simplified-Chinese ImageApiError', async () => {
    const nativeError = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(nativeError));

    await expect(authedFetch('http://localhost:3000/api/history')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: '无法连接到服务器，请检查网络或稍后重试。',
    } satisfies Partial<ImageApiError>);
  });

  it('passes successful responses through unchanged', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await authedFetch('http://localhost:3000/api/history');

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/history',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('rethrows network errors as ImageApiError instances (not raw TypeError)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    let caught: unknown = null;
    try {
      await authedFetch('http://localhost:3000/api/history');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ImageApiError);
  });
});
