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
  ownerUserId: string | null;
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
  ownerUserId: null,
  records: [],
  isHydrating: false,
  hydrateError: null,
});
let hydratedUserId: string | null = null;
let requestGeneration = 0;

function imageUrlFor(record: ImageRecord): string {
  return buildApiUrl(`/api/outputs/${record.id}`);
}

function resetForUser(userId: string | null): void {
  requestGeneration += 1;
  hydratedUserId = null;
  store.set({ ownerUserId: userId, records: [], isHydrating: false, hydrateError: null });
}

async function hydrate(userId: string): Promise<void> {
  const state = store.getSnapshot();
  if (state.ownerUserId !== userId) resetForUser(userId);
  if (hydratedUserId === userId || store.getSnapshot().isHydrating) return;
  hydratedUserId = userId;
  const currentRequest = ++requestGeneration;
  store.set({ ...store.getSnapshot(), isHydrating: true, hydrateError: null });
  try {
    const remote = await fetchHistory();
    if (currentRequest !== requestGeneration || store.getSnapshot().ownerUserId !== userId) {
      return;
    }
    store.set({
      ownerUserId: userId,
      records: [...remote].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      isHydrating: false,
      hydrateError: null,
    });
  } catch (error) {
    if (currentRequest !== requestGeneration || store.getSnapshot().ownerUserId !== userId) {
      return;
    }
    hydratedUserId = null;
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
  if (store.getSnapshot().ownerUserId === null) {
    return { record, imageUrl: imageUrlFor(record) };
  }
  store.set((state) => ({
    ...state,
    records: [record, ...state.records.filter((item) => item.id !== record.id)],
  }));
  return { record, imageUrl: imageUrlFor(record) };
}

export function useImageHistory() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const userId = isAuthenticated ? (user?.id ?? null) : null;
  const visibleState = state.ownerUserId === userId ? state : EMPTY_HISTORY_STATE;

  useEffect(() => {
    if (isAuthLoading) return;
    if (userId !== null) {
      if (store.getSnapshot().ownerUserId !== userId) resetForUser(userId);
      void hydrate(userId);
      return;
    }
    if (store.getSnapshot().ownerUserId !== null || store.getSnapshot().records.length > 0) {
      resetForUser(null);
    }
  }, [isAuthLoading, userId]);

  const entries = useMemo<HistoryEntry[]>(
    () => visibleState.records.map((record) => ({ record, imageUrl: imageUrlFor(record) })),
    [visibleState.records],
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
    if (userId === null) {
      resetForUser(null);
      return;
    }
    hydratedUserId = null;
    await hydrate(userId);
  }, [userId]);
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const mutationUserId = userId;
      const mutationGeneration = requestGeneration;
      await deleteHistoryRecord(id);
      if (
        mutationUserId === null ||
        mutationGeneration !== requestGeneration ||
        store.getSnapshot().ownerUserId !== mutationUserId
      ) {
        return;
      }
      store.set((current) => ({
        ...current,
        records: current.records.filter((record) => record.id !== id),
      }));
    },
    [userId],
  );
  const removeBatch = useCallback(
    async (batchId: string): Promise<void> => {
      const mutationUserId = userId;
      const mutationGeneration = requestGeneration;
      await deleteHistoryBatch(batchId);
      if (
        mutationUserId === null ||
        mutationGeneration !== requestGeneration ||
        store.getSnapshot().ownerUserId !== mutationUserId
      ) {
        return;
      }
      store.set((current) => ({
        ...current,
        records: current.records.filter((record) => (record.batchId ?? record.id) !== batchId),
      }));
    },
    [userId],
  );
  const update = useCallback(
    async (id: string, updates: ImageMetadataUpdate): Promise<ImageRecord> => {
      const mutationUserId = userId;
      const mutationGeneration = requestGeneration;
      const record = await updateHistoryRecord(id, updates);
      if (
        mutationUserId === null ||
        mutationGeneration !== requestGeneration ||
        store.getSnapshot().ownerUserId !== mutationUserId
      ) {
        return record;
      }
      store.set((current) => ({
        ...current,
        records: current.records.map((item) => (item.id === id ? record : item)),
      }));
      return record;
    },
    [userId],
  );
  const updateMany = useCallback(
    async (ids: readonly string[], updates: ImageMetadataUpdate): Promise<ImageRecord[]> => {
      const mutationUserId = userId;
      const mutationGeneration = requestGeneration;
      const records = await updateHistoryRecords(ids, updates);
      if (
        mutationUserId === null ||
        mutationGeneration !== requestGeneration ||
        store.getSnapshot().ownerUserId !== mutationUserId
      ) {
        return records;
      }
      const byId = new Map(records.map((record) => [record.id, record]));
      store.set((current) => ({
        ...current,
        records: current.records.map((record) => byId.get(record.id) ?? record),
      }));
      return records;
    },
    [userId],
  );
  const removeMany = useCallback(
    async (ids: readonly string[]): Promise<number> => {
      const mutationUserId = userId;
      const mutationGeneration = requestGeneration;
      const removed = await deleteHistoryRecords(ids);
      if (
        mutationUserId === null ||
        mutationGeneration !== requestGeneration ||
        store.getSnapshot().ownerUserId !== mutationUserId
      ) {
        return removed;
      }
      const selected = new Set(ids);
      store.set((current) => ({
        ...current,
        records: current.records.filter((record) => !selected.has(record.id)),
      }));
      return removed;
    },
    [userId],
  );

  return {
    records: visibleState.records,
    entries,
    batches,
    isHydrating: visibleState.isHydrating,
    hydrateError: visibleState.hydrateError,
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
  requestGeneration += 1;
  hydratedUserId = null;
  store.set({ ownerUserId: null, records: [], isHydrating: false, hydrateError: null });
}

const EMPTY_HISTORY_STATE: HistoryState = {
  ownerUserId: null,
  records: [],
  isHydrating: false,
  hydrateError: null,
};
