import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted((): { userId: string | null } => ({ userId: 'user-a' }));
const api = vi.hoisted(() => ({
  generateImage: vi.fn(),
  uploadReferenceImages: vi.fn(),
}));
const history = vi.hoisted(() => ({ addImageRecord: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: auth.userId === null ? null : { id: auth.userId },
    isAuthenticated: auth.userId !== null,
  }),
}));
vi.mock('@/hooks/useImageHistory', () => history);
vi.mock('@/services/api/imagesApi', () => ({
  ImageApiError: class ImageApiError extends Error {},
  createGenerateRequest: (input: unknown) => input,
  generateImage: api.generateImage,
  uploadReferenceImages: api.uploadReferenceImages,
}));

import { useImageGeneration } from '@/hooks/useImageGeneration';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  auth.userId = 'user-a';
  api.generateImage.mockReset();
  api.uploadReferenceImages.mockReset();
  history.addImageRecord.mockReset();
});

describe('useImageGeneration', () => {
  it('discards a generation response after the authenticated account changes', async () => {
    const response = deferred<{
      batchId: string;
      aspectRatio: '1:1';
      generationMode: 'text-to-image';
      images: Array<{
        id: string;
        outputUrl: string;
        filename: string;
        mime: string;
        width: number;
        height: number;
      }>;
    }>();
    api.generateImage.mockReturnValueOnce(response.promise);
    const { result, rerender } = renderHook(() => useImageGeneration());

    let pending!: Promise<Awaited<ReturnType<typeof result.current.generate>>>;
    act(() => {
      pending = result.current.generate({ prompt: 'belongs to A', isPublic: true });
    });
    await waitFor(() => expect(api.generateImage).toHaveBeenCalledOnce());

    auth.userId = 'user-b';
    rerender();
    await act(async () => {
      response.resolve({
        batchId: 'batch-a',
        aspectRatio: '1:1',
        generationMode: 'text-to-image',
        images: [
          {
            id: 'a.png',
            outputUrl: '/api/outputs/a.png',
            filename: 'a.png',
            mime: 'image/png',
            width: 1024,
            height: 1024,
          },
        ],
      });
      await expect(pending).rejects.toThrow('生成已停止。');
    });

    expect(history.addImageRecord).not.toHaveBeenCalled();
    expect(result.current.lastBatch).toBeNull();
  });
});
