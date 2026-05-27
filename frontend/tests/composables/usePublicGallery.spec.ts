import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPublicGalleryForTests, usePublicGallery } from '@/composables/usePublicGallery';
import type { ImageRecord } from '@/types/image';

const sampleRecord = (overrides: Partial<ImageRecord> = {}): ImageRecord => ({
  id: 'public.png',
  batchId: 'batch-public',
  createdAt: '2026-05-13T00:00:00.000Z',
  prompt: '公开画廊作品',
  model: 'gpt-image-2',
  width: 1024,
  height: 1024,
  isPublic: true,
  ...overrides,
});

describe('usePublicGallery', () => {
  beforeEach(() => {
    resetPublicGalleryForTests();
    vi.unstubAllGlobals();
  });

  it('hydrates public records without credentials from /api/history/public', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ records: [sampleRecord()] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { entries } = usePublicGallery();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/history/public', {});
    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]?.imageUrl).toBe('http://localhost:3000/api/outputs/public.png');
  });

  it('adds only public generated records to the gallery cache', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ records: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { add, entries } = usePublicGallery();
    add(sampleRecord({ id: 'private.png', isPublic: false }));
    add(sampleRecord({ id: 'visible.png', prompt: '新公开作品' }));

    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]?.record.id).toBe('visible.png');
  });

  it('removes a public gallery record through the admin endpoint', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: [sampleRecord()] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const { entries, removeAsAdmin } = usePublicGallery();
    await new Promise((resolve) => setTimeout(resolve, 5));

    await removeAsAdmin('public.png');

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:3000/api/history/public/public.png',
      {
        credentials: 'include',
        method: 'DELETE',
      },
    );
    expect(entries.value).toEqual([]);
  });
});
