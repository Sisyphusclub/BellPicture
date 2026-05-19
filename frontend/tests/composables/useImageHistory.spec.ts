import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { useImageHistory, resetImageHistoryForTests } from '@/composables/useImageHistory';
import type { ImageRecord } from '@/types/image';

const authenticated = ref(true);
const authLoading = ref(false);

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: computed(() => authenticated.value),
    isLoading: computed(() => authLoading.value),
  }),
}));

const sampleRecord = (overrides: Partial<ImageRecord> = {}): ImageRecord => ({
  id: 'generated.png',
  batchId: 'batch-1',
  createdAt: '2026-05-13T00:00:00.000Z',
  prompt: 'dark navy product surface',
  model: 'gpt-image-2',
  width: 1024,
  height: 1024,
  isPublic: false,
  ...overrides,
});

describe('useImageHistory', () => {
  beforeEach(() => {
    authenticated.value = true;
    authLoading.value = false;
    resetImageHistoryForTests();
    vi.unstubAllGlobals();
  });

  it('add() prepends a record and exposes a remote image URL', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ records: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { add, entries } = useImageHistory();
    const record = sampleRecord();
    add(record);

    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]?.record.prompt).toBe(record.prompt);
    expect(entries.value[0]?.imageUrl).toBe('http://localhost:3000/api/outputs/generated.png');
  });

  it('hydrates from /api/history when authenticated', async () => {
    const remote: ImageRecord = sampleRecord({ id: 'remote.png', prompt: 'cloud copy' });
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ records: [remote] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { entries } = useImageHistory();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(entries.value.some((entry) => entry.record.prompt === 'cloud copy')).toBe(true);
  });

  it('does not request private history for anonymous visitors', async () => {
    authenticated.value = false;
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const { entries } = useImageHistory();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(entries.value).toEqual([]);
  });
});
