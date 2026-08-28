import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  fetchPublicHistory: vi.fn(),
  deletePublicGalleryRecordAsAdmin: vi.fn(),
}));

vi.mock('@/services/api/historyApi', () => api);

import { resetPublicGalleryForTests, usePublicGallery } from '@/hooks/usePublicGallery';

const record = (id: string) => ({
  id,
  createdAt: '2026-08-28T00:00:00.000Z',
  prompt: id,
  model: 'gpt-image-2',
  width: 1024,
  height: 1024,
  isPublic: true,
});

beforeEach(() => {
  resetPublicGalleryForTests();
  api.fetchPublicHistory.mockReset();
});

describe('usePublicGallery', () => {
  it('loads one page at a time and ignores a stale load-more response after refresh', async () => {
    let resolveLoadMore!: (value: { records: ReturnType<typeof record>[] }) => void;
    const loadMore = new Promise<{ records: ReturnType<typeof record>[] }>((resolve) => {
      resolveLoadMore = resolve;
    });
    api.fetchPublicHistory
      .mockResolvedValueOnce({ records: [record('first.png')], nextCursor: 'page-2' })
      .mockImplementationOnce(() => loadMore)
      .mockResolvedValueOnce({ records: [record('fresh.png')] });
    const { result } = renderHook(() => usePublicGallery());
    await waitFor(() => expect(result.current.entries[0]?.record.id).toBe('first.png'));

    let staleRequest!: Promise<void>;
    act(() => {
      staleRequest = result.current.loadMore();
    });
    await waitFor(() => expect(api.fetchPublicHistory).toHaveBeenCalledTimes(2));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.entries.map((entry) => entry.record.id)).toEqual(['fresh.png']);

    await act(async () => {
      resolveLoadMore({ records: [record('stale.png')] });
      await staleRequest;
    });
    expect(result.current.entries.map((entry) => entry.record.id)).toEqual(['fresh.png']);
  });
});
