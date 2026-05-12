import { computed, readonly, ref } from 'vue';

import { deleteBlob, getBlob, putBlob } from '@/services/storage/indexedDb';
import * as metaStore from '@/services/storage/localStorageMeta';
import type { HistoryEntry, ImageRecord } from '@/types/image';

const records = ref<ImageRecord[]>([]);
const entryUrls = ref<Record<string, string>>({});
const entrySizes = ref<Record<string, number>>({});
const isHydrating = ref(false);
const hydrateError = ref<Error | null>(null);
let hydrated = false;

const entries = computed<HistoryEntry[]>(() =>
  records.value
    .map((record) => {
      const imageUrl = entryUrls.value[record.id];
      if (!imageUrl) return null;
      const size = entrySizes.value[record.id];
      return size === undefined ? { record, imageUrl } : { record, imageUrl, size };
    })
    .filter((entry): entry is HistoryEntry => entry !== null),
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
  void hydrate();

  async function refresh(): Promise<void> {
    hydrated = false;
    await hydrate();
  }

  async function add(record: ImageRecord, blob: Blob): Promise<HistoryEntry> {
    await putBlob(record.id, blob);
    metaStore.put(record);
    records.value = [record, ...records.value.filter((item) => item.id !== record.id)];
    setEntryUrl(record.id, URL.createObjectURL(blob), blob.size);
    return { record, imageUrl: entryUrls.value[record.id] ?? '', size: blob.size };
  }

  async function remove(id: string): Promise<void> {
    await deleteBlob(id);
    metaStore.remove(id);
    records.value = records.value.filter((record) => record.id !== id);
    revokeEntryUrl(id);
  }

  async function removeBatch(batchId: string): Promise<void> {
    const ids = records.value.filter((record) => (record.batchId ?? record.id) === batchId).map((record) => record.id);
    for (const id of ids) {
      await deleteBlob(id);
      metaStore.remove(id);
      revokeEntryUrl(id);
    }
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
  Object.keys(entryUrls.value).forEach(revokeEntryUrl);
  records.value = [];
  entryUrls.value = {};
  entrySizes.value = {};
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
    const storedRecords = metaStore.listAll();
    records.value = storedRecords;
    const nextUrls: Record<string, string> = {};
    const nextSizes: Record<string, number> = {};

    for (const record of storedRecords) {
      const blob = await getBlob(record.id);
      if (blob) {
        nextUrls[record.id] = URL.createObjectURL(blob);
        nextSizes[record.id] = blob.size;
      }
    }

    Object.keys(entryUrls.value).forEach((id) => {
      if (nextUrls[id] === undefined) revokeEntryUrl(id);
    });
    entryUrls.value = nextUrls;
    entrySizes.value = nextSizes;
  } catch {
    hydrateError.value = new Error('无法读取本地历史记录，请刷新页面或检查浏览器存储权限。');
  } finally {
    isHydrating.value = false;
  }
}

function setEntryUrl(id: string, url: string, size: number): void {
  revokeEntryUrl(id);
  entryUrls.value = {
    ...entryUrls.value,
    [id]: url,
  };
  entrySizes.value = {
    ...entrySizes.value,
    [id]: size,
  };
}

function revokeEntryUrl(id: string): void {
  const previous = entryUrls.value[id];
  if (previous) URL.revokeObjectURL(previous);
  const remainingUrls = { ...entryUrls.value };
  delete remainingUrls[id];
  entryUrls.value = remainingUrls;

  const remainingSizes = { ...entrySizes.value };
  delete remainingSizes[id];
  entrySizes.value = remainingSizes;
}
