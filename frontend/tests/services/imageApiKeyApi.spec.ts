import { describe, expect, it, vi } from 'vitest';

import {
  deleteImageApiKey,
  fetchImageApiKeyStatus,
  saveImageApiKey,
} from '@/services/api/imageApiKeyApi';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('imageApiKeyApi', () => {
  it('reads a masked image API Key status', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ configured: true, keySuffix: '4321' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchImageApiKeyStatus()).resolves.toEqual({
      configured: true,
      keySuffix: '4321',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/settings/image-api-key',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('sends a key only in the authenticated save request body', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ configured: true, keySuffix: '9876' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await saveImageApiKey('sk-private-9876');

    expect(result).toEqual({ configured: true, keySuffix: '9876' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/settings/image-api-key',
      expect.objectContaining({
        credentials: 'include',
        method: 'PUT',
        body: JSON.stringify({ apiKey: 'sk-private-9876' }),
      }),
    );
  });

  it('deletes a saved key and rejects malformed public status payloads', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ configured: false }))
      .mockResolvedValueOnce(
        jsonResponse({ configured: true, keySuffix: '4321', apiKey: 'leaked' }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteImageApiKey()).resolves.toEqual({ configured: false });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/settings/image-api-key',
      expect.objectContaining({ credentials: 'include', method: 'DELETE' }),
    );
    await expect(fetchImageApiKeyStatus()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
