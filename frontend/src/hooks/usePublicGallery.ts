import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import { deletePublicGalleryRecordAsAdmin, fetchPublicHistory } from '@/services/api/historyApi';
import { buildApiUrl } from '@/services/api/imagesApi';
import type { HistoryEntry, ImageRecord } from '@/types/image';

interface GalleryState {
  records: ImageRecord[];
  isHydrating: boolean;
  hydrateError: Error | null;
}

const store = createExternalStore<GalleryState>({
  records: [],
  isHydrating: false,
  hydrateError: null,
});
let hydrated = false;

async function hydrate(): Promise<void> {
  const state = store.getSnapshot();
  if (hydrated || state.isHydrating) return;
  hydrated = true;
  store.set({ ...state, isHydrating: true, hydrateError: null });
  try {
    const records = await fetchPublicHistory();
    store.set({
      records: [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      isHydrating: false,
      hydrateError: null,
    });
  } catch (error) {
    hydrated = false;
    store.set({
      ...store.getSnapshot(),
      isHydrating: false,
      hydrateError:
        error instanceof Error ? error : new Error('无法加载公开画廊，请稍后刷新重试。'),
    });
  }
}

export function addPublicRecord(record: ImageRecord): HistoryEntry | null {
  if (!record.isPublic) return null;
  store.set((state) => ({
    ...state,
    records: [record, ...state.records.filter((item) => item.id !== record.id)],
  }));
  return { record, imageUrl: buildApiUrl(`/api/outputs/${record.id}`) };
}

export function usePublicGallery() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => void hydrate(), []);
  const entries = useMemo<HistoryEntry[]>(
    () =>
      state.records.map((record) => ({
        record,
        imageUrl: buildApiUrl(`/api/outputs/${record.id}`),
      })),
    [state.records],
  );
  const refresh = useCallback(async (): Promise<void> => {
    hydrated = false;
    await hydrate();
  }, []);
  const removeAsAdmin = useCallback(async (id: string): Promise<void> => {
    await deletePublicGalleryRecordAsAdmin(id);
    store.set((current) => ({
      ...current,
      records: current.records.filter((record) => record.id !== id),
    }));
  }, []);
  return {
    entries,
    isHydrating: state.isHydrating,
    hydrateError: state.hydrateError,
    refresh,
    add: addPublicRecord,
    removeAsAdmin,
  };
}

export function resetPublicGalleryForTests(): void {
  hydrated = false;
  store.set({ records: [], isHydrating: false, hydrateError: null });
}
