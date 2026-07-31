import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import {
  deleteHistoryBatch,
  deleteHistoryRecord,
  deleteHistoryRecords,
  fetchHistory,
  updateHistoryRecord,
  updateHistoryRecords,
} from '@/services/api/historyApi';
import { buildApiUrl } from '@/services/api/imagesApi';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  type GenerationSettingsSnapshot,
  type HistoryEntry,
  type ImageMetadataUpdate,
  type ImageRecord,
} from '@/types/image';

import { useAuth } from './useAuth';

interface HistoryState {
  records: ImageRecord[];
  isHydrating: boolean;
  hydrateError: Error | null;
}

export interface GroupedBatch {
  batchId: string;
  createdAt: string;
  prompt: string;
  model: string;
  entries: HistoryEntry[];
  settings: GenerationSettingsSnapshot;
}

const store = createExternalStore<HistoryState>({
  records: [],
  isHydrating: false,
  hydrateError: null,
});
let hydrated = false;

function imageUrlFor(record: ImageRecord): string {
  return buildApiUrl(`/api/outputs/${record.id}`);
}

async function hydrate(): Promise<void> {
  const state = store.getSnapshot();
  if (hydrated || state.isHydrating) return;
  hydrated = true;
  store.set({ ...state, isHydrating: true, hydrateError: null });
  try {
    const remote = await fetchHistory();
    store.set({
      records: [...remote].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      isHydrating: false,
      hydrateError: null,
    });
  } catch (error) {
    hydrated = false;
    store.set({
      ...store.getSnapshot(),
      isHydrating: false,
      hydrateError:
        error instanceof Error
          ? error
          : new Error('无法从服务器加载历史，请刷新或重新登录后重试。'),
    });
  }
}

export function addImageRecord(record: ImageRecord): HistoryEntry {
  store.set((state) => ({
    ...state,
    records: [record, ...state.records.filter((item) => item.id !== record.id)],
  }));
  return { record, imageUrl: imageUrlFor(record) };
}

export function useImageHistory() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;
    if (isAuthenticated) {
      void hydrate();
      return;
    }
    hydrated = false;
    store.set({ records: [], isHydrating: false, hydrateError: null });
  }, [isAuthenticated, isAuthLoading]);

  const entries = useMemo<HistoryEntry[]>(
    () => state.records.map((record) => ({ record, imageUrl: imageUrlFor(record) })),
    [state.records],
  );
  const batches = useMemo<GroupedBatch[]>(() => {
    const grouped = new Map<string, GroupedBatch>();
    entries.forEach((entry) => {
      const batchId = entry.record.batchId ?? entry.record.id;
      const current = grouped.get(batchId);
      if (current) current.entries.push(entry);
      else {
        grouped.set(batchId, {
          batchId,
          createdAt: entry.record.createdAt,
          prompt: entry.record.prompt,
          model: entry.record.model,
          entries: [entry],
          settings: {
            prompt: entry.record.prompt,
            model: entry.record.model,
            count: entry.record.count ?? DEFAULT_COUNT,
            aspectRatio: entry.record.aspectRatio ?? DEFAULT_ASPECT_RATIO,
            resolution: entry.record.resolution ?? DEFAULT_IMAGE_RESOLUTION,
            isPublic: entry.record.isPublic,
            referenceIds:
              entry.record.referenceIds ??
              (entry.record.referenceId ? [entry.record.referenceId] : []),
          },
        });
      }
    });
    return [...grouped.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      hydrated = false;
      store.set({ records: [], isHydrating: false, hydrateError: null });
      return;
    }
    hydrated = false;
    await hydrate();
  }, [isAuthenticated]);
  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteHistoryRecord(id);
    store.set((current) => ({
      ...current,
      records: current.records.filter((record) => record.id !== id),
    }));
  }, []);
  const removeBatch = useCallback(async (batchId: string): Promise<void> => {
    await deleteHistoryBatch(batchId);
    store.set((current) => ({
      ...current,
      records: current.records.filter((record) => (record.batchId ?? record.id) !== batchId),
    }));
  }, []);
  const update = useCallback(
    async (id: string, updates: ImageMetadataUpdate): Promise<ImageRecord> => {
      const record = await updateHistoryRecord(id, updates);
      store.set((current) => ({
        ...current,
        records: current.records.map((item) => (item.id === id ? record : item)),
      }));
      return record;
    },
    [],
  );
  const updateMany = useCallback(
    async (ids: readonly string[], updates: ImageMetadataUpdate): Promise<ImageRecord[]> => {
      const records = await updateHistoryRecords(ids, updates);
      const byId = new Map(records.map((record) => [record.id, record]));
      store.set((current) => ({
        ...current,
        records: current.records.map((record) => byId.get(record.id) ?? record),
      }));
      return records;
    },
    [],
  );
  const removeMany = useCallback(async (ids: readonly string[]): Promise<number> => {
    const removed = await deleteHistoryRecords(ids);
    const selected = new Set(ids);
    store.set((current) => ({
      ...current,
      records: current.records.filter((record) => !selected.has(record.id)),
    }));
    return removed;
  }, []);

  return {
    records: state.records,
    entries,
    batches,
    isHydrating: state.isHydrating,
    hydrateError: state.hydrateError,
    refresh,
    add: addImageRecord,
    remove,
    removeBatch,
    removeMany,
    update,
    updateMany,
    getEntry: (id: string) => entries.find((entry) => entry.record.id === id) ?? null,
    getBatch: (id: string) => batches.find((batch) => batch.batchId === id) ?? null,
  };
}

export function resetImageHistoryForTests(): void {
  hydrated = false;
  store.set({ records: [], isHydrating: false, hydrateError: null });
}
