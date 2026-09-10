import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const auth = vi.hoisted(
  (): { user: { id: string } | null; isAuthenticated: boolean; isLoading: boolean } => ({
    user: { id: 'user-a' },
    isAuthenticated: true,
    isLoading: false,
  }),
);
const api = vi.hoisted(() => ({
  fetchImageApiKeyStatus: vi.fn(),
  saveImageApiKey: vi.fn(),
  deleteImageApiKey: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}));
vi.mock('@/services/api/imageApiKeyApi', () => api);

import { resetImageApiKeyForTests, useImageApiKey } from '@/hooks/useImageApiKey';
import { ImageApiError } from '@/services/api/httpClient';

beforeEach(() => {
  vi.clearAllMocks();
  resetImageApiKeyForTests();
  auth.user = { id: 'user-a' };
  auth.isAuthenticated = true;
  auth.isLoading = false;
  api.fetchImageApiKeyStatus.mockResolvedValue({ configured: true, keySuffix: '1111' });
  api.saveImageApiKey.mockResolvedValue({ configured: true, keySuffix: '2222' });
  api.deleteImageApiKey.mockResolvedValue({ configured: false });
});

it('loads the current user status and updates the shared state after saving', async () => {
  const { result } = renderHook(() => useImageApiKey());

  await waitFor(() =>
    expect(result.current.status).toEqual({ configured: true, keySuffix: '1111' }),
  );
  await act(async () => {
    await result.current.save('sk-updated-2222');
  });

  expect(api.saveImageApiKey).toHaveBeenCalledWith('sk-updated-2222');
  expect(result.current.status).toEqual({ configured: true, keySuffix: '2222' });
});

it('does not expose one user status while a different account is loading', async () => {
  const { result, rerender } = renderHook(() => useImageApiKey());
  await waitFor(() => expect(result.current.status?.keySuffix).toBe('1111'));

  let resolveSecond!: (value: { configured: boolean; keySuffix: string }) => void;
  api.fetchImageApiKeyStatus.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
  );
  auth.user = { id: 'user-b' };
  rerender();

  await waitFor(() => expect(result.current.status).toBeNull());
  act(() => {
    resolveSecond({ configured: true, keySuffix: '9999' });
  });
  await waitFor(() => expect(result.current.status?.keySuffix).toBe('9999'));
});

it('maps provider validation failures to a stable Chinese message', async () => {
  api.saveImageApiKey.mockRejectedValue(
    new ImageApiError(400, 'PROVIDER_KEY_INVALID', 'raw provider error', 'request-id'),
  );
  const { result } = renderHook(() => useImageApiKey());
  await waitFor(() => expect(result.current.status).not.toBeNull());

  await expect(result.current.save('bad-key')).rejects.toThrow(
    '这个 API Key 未通过 sub2api 鉴权。',
  );
  expect(result.current.error?.message).toBe('这个 API Key 未通过 sub2api 鉴权。');
});
