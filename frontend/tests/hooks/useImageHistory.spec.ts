import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted((): { userId: string | null } => ({ userId: 'user-a' }));
const api = vi.hoisted(() => ({
  fetchHistory: vi.fn(),
  deleteHistoryBatch: vi.fn(),
  deleteHistoryRecord: vi.fn(),
  deleteHistoryRecords: vi.fn(),
  updateHistoryRecord: vi.fn(),
  updateHistoryRecords: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: auth.userId === null ? null : { id: auth.userId },
    isAuthenticated: auth.userId !== null,
    isLoading: false,
  }),
}));
vi.mock('@/services/api/historyApi', () => api);

import { resetImageHistoryForTests, useImageHistory } from '@/hooks/useImageHistory';

const record = (id: string) => ({
  id,
  createdAt: '2026-08-28T00:00:00.000Z',
  prompt: id,
  model: 'gpt-image-2',
  width: 1024,
  height: 1024,
  isPublic: false,
});

beforeEach(() => {
  auth.userId = 'user-a';
  resetImageHistoryForTests();
  api.fetchHistory.mockReset();
});

describe('useImageHistory', () => {
  it('discards a previous account response that arrives after the next account', async () => {
    let resolveA!: (value: ReturnType<typeof record>[]) => void;
    let resolveB!: (value: ReturnType<typeof record>[]) => void;
    api.fetchHistory
      .mockImplementationOnce(
        () => new Promise<ReturnType<typeof record>[]>((resolve) => (resolveA = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise<ReturnType<typeof record>[]>((resolve) => (resolveB = resolve)),
      );
    const { result, rerender } = renderHook(() => useImageHistory());
    await waitFor(() => expect(api.fetchHistory).toHaveBeenCalledTimes(1));

    auth.userId = 'user-b';
    rerender();
    await waitFor(() => expect(api.fetchHistory).toHaveBeenCalledTimes(2));
    act(() => resolveB([record('b.png')]));
    await waitFor(() => expect(result.current.records[0]?.id).toBe('b.png'));

    act(() => resolveA([record('a.png')]));
    expect(result.current.records.map((item) => item.id)).toEqual(['b.png']);

    auth.userId = null;
    rerender();
    expect(result.current.records).toEqual([]);
  });
});
