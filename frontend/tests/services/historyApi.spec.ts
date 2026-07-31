import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  deleteHistoryRecords,
  updateHistoryRecord,
  updateHistoryRecords,
} from '@/services/api/historyApi';

const record = {
  id: 'asset-one.png',
  batchId: 'batch-one',
  createdAt: '2026-07-30T08:00:00.000Z',
  prompt: '雨夜街道',
  model: 'gpt-image-2',
  aspectRatio: '1:1',
  width: 1024,
  height: 1024,
  count: 1,
  resolution: 'standard',
  isPublic: false,
  isFavorite: true,
  collection: '灵感库',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('history metadata API', () => {
  it('updates one asset through the owner-scoped endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ record }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(updateHistoryRecord(record.id, { isFavorite: true })).resolves.toMatchObject({
      id: record.id,
      isFavorite: true,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/history/asset-one.png'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isFavorite: true }),
      }),
    );
  });

  it('round-trips bulk metadata updates and bulk deletion', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: [record] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ removed: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(updateHistoryRecords([record.id], { collection: '灵感库' })).resolves.toHaveLength(
      1,
    );
    await expect(deleteHistoryRecords([record.id])).resolves.toBe(1);

    expect(fetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ ids: [record.id], updates: { collection: '灵感库' } }),
      }),
    );
    expect(fetch.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: [record.id] }),
      }),
    );
  });
});
