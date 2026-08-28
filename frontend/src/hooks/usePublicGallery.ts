import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import { deletePublicGalleryRecordAsAdmin, fetchPublicHistory } from '@/services/api/historyApi';
import { buildApiUrl } from '@/services/api/imagesApi';
import type { HistoryEntry, ImageRecord } from '@/types/image';

interface GalleryState {
  records: ImageRecord[];
  isHydrating: boolean;
  hydrateError: Error | null;
  nextCursor: string | null;
}

const store = createExternalStore<GalleryState>({
  records: [],
  isHydrating: false,
  hydrateError: null,
  nextCursor: null,
});
let hydrated = false;
let requestGeneration = 0;

async function hydrate(): Promise<void> {
  const state = store.getSnapshot();
  if (hydrated || state.isHydrating) return;
  hydrated = true;
  const currentRequest = ++requestGeneration;
  store.set({ ...state, isHydrating: true, hydrateError: null });
  try {
    const page = await fetchPublicHistory();
    if (currentRequest !== requestGeneration) return;
    store.set({
      records: [...page.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      isHydrating: false,
      hydrateError: null,
      nextCursor: page.nextCursor ?? null,
    });
  } catch (error) {
    if (currentRequest !== requestGeneration) return;
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
    requestGeneration += 1;
    hydrated = false;
    store.set((current) => ({ ...current, isHydrating: false }));
    await hydrate();
  }, []);
  const loadMore = useCallback(async (): Promise<void> => {
    const current = store.getSnapshot();
    if (current.isHydrating || current.nextCursor === null) return;
    store.set({ ...current, isHydrating: true, hydrateError: null });
    const currentRequest = ++requestGeneration;
    try {
      const page = await fetchPublicHistory({ cursor: current.nextCursor });
      if (currentRequest !== requestGeneration) return;
      store.set((latest) => ({
        records: [
          ...latest.records,
          ...page.records.filter(
            (record) => !latest.records.some((existing) => existing.id === record.id),
          ),
        ],
        isHydrating: false,
        hydrateError: null,
        nextCursor: page.nextCursor ?? null,
      }));
    } catch (error) {
      if (currentRequest !== requestGeneration) return;
      store.set((latest) => ({
        ...latest,
        isHydrating: false,
        hydrateError:
          error instanceof Error ? error : new Error('无法加载更多公开作品，请稍后重试。'),
      }));
    }
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
    hasMore: state.nextCursor !== null,
    refresh,
    loadMore,
    add: addPublicRecord,
    removeAsAdmin,
  };
}

export function resetPublicGalleryForTests(): void {
  requestGeneration += 1;
  hydrated = false;
  store.set({ records: [], isHydrating: false, hydrateError: null, nextCursor: null });
}
