import { computed, readonly, ref, watch } from 'vue';

import { useAuth } from '@/composables/useAuth';
import { deleteHistoryBatch, deleteHistoryRecord, fetchHistory } from '@/services/api/historyApi';
import { buildApiUrl } from '@/services/api/imagesApi';
import type { HistoryEntry, ImageRecord } from '@/types/image';

const records = ref<ImageRecord[]>([]);
const isHydrating = ref(false);
const hydrateError = ref<Error | null>(null);
let hydrated = false;

function imageUrlFor(record: ImageRecord): string {
  return buildApiUrl(`/api/outputs/${record.id}`);
}

const entries = computed<HistoryEntry[]>(() =>
  records.value.map((record) => ({ record, imageUrl: imageUrlFor(record) })),
);

export interface GroupedBatch {
  batchId: string;
  createdAt: string;
  prompt: string;
  model: string;
  entries: HistoryEntry[];
}

/** Groups entries by batchId. Entries without a batchId get their id as a synthetic batchId so
 * legacy single-image records still render. Returns groups sorted newest-first by createdAt. */
const batches = computed<GroupedBatch[]>(() => {
  const map = new Map<string, GroupedBatch>();
  for (const entry of entries.value) {
    const batchId = entry.record.batchId ?? entry.record.id;
    const existing = map.get(batchId);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }
    map.set(batchId, {
      batchId,
      createdAt: entry.record.createdAt,
      prompt: entry.record.prompt,
      model: entry.record.model,
      entries: [entry],
    });
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

export function useImageHistory() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  watch(
    [isAuthLoading, isAuthenticated],
    ([authLoading, authenticated]) => {
      if (authLoading) return;
      if (authenticated) {
        void hydrate();
        return;
      }
      records.value = [];
      hydrateError.value = null;
      hydrated = false;
    },
    { immediate: true },
  );

  async function refresh(): Promise<void> {
    if (!isAuthenticated.value) {
      records.value = [];
      hydrateError.value = null;
      hydrated = false;
      return;
    }
    hydrated = false;
    await hydrate();
  }

  function add(record: ImageRecord): HistoryEntry {
    records.value = [record, ...records.value.filter((item) => item.id !== record.id)];
    return { record, imageUrl: imageUrlFor(record) };
  }

  async function remove(id: string): Promise<void> {
    await deleteHistoryRecord(id);
    records.value = records.value.filter((record) => record.id !== id);
  }

  async function removeBatch(batchId: string): Promise<void> {
    await deleteHistoryBatch(batchId);
    records.value = records.value.filter((record) => (record.batchId ?? record.id) !== batchId);
  }

  function getEntry(id: string): HistoryEntry | null {
    return entries.value.find((entry) => entry.record.id === id) ?? null;
  }

  function getBatch(batchId: string): GroupedBatch | null {
    return batches.value.find((batch) => batch.batchId === batchId) ?? null;
  }

  return {
    records: readonly(records),
    entries,
    batches,
    isHydrating: readonly(isHydrating),
    hydrateError: readonly(hydrateError),
    refresh,
    add,
    remove,
    removeBatch,
    getEntry,
    getBatch,
  };
}

export function resetImageHistoryForTests(): void {
  records.value = [];
  hydrateError.value = null;
  isHydrating.value = false;
  hydrated = false;
}

async function hydrate(): Promise<void> {
  if (hydrated || isHydrating.value) return;
  hydrated = true;
  isHydrating.value = true;
  hydrateError.value = null;

  try {
    const remote = await fetchHistory();
    records.value = [...remote].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    hydrated = false;
    // Upstream `authedFetch` already converts native fetch failures into
    // ImageApiError with a Simplified-Chinese message, so `err` will almost
    // always be an Error with localized copy. The fallback below stays as
    // defense-in-depth for any non-Error thrown by future callers.
    hydrateError.value =
      err instanceof Error ? err : new Error('无法从服务器加载历史，请刷新或重新登录后重试。');
  } finally {
    isHydrating.value = false;
  }
}
