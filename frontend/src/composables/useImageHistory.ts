import { computed, readonly, ref } from 'vue';

import { deleteBlob, getBlob, putBlob } from '@/services/storage/indexedDb';
import * as metaStore from '@/services/storage/localStorageMeta';
import type { HistoryEntry, ImageRecord } from '@/types/image';

const records = ref<ImageRecord[]>([]);
const entryUrls = ref<Record<string, string>>({});
const isHydrating = ref(false);
const hydrateError = ref<Error | null>(null);
let hydrated = false;

const entries = computed<HistoryEntry[]>(() =>
  records.value
    .map((record) => {
      const imageUrl = entryUrls.value[record.id];
      return imageUrl ? { record, imageUrl } : null;
    })
    .filter((entry): entry is HistoryEntry => entry !== null),
);

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
    setEntryUrl(record.id, URL.createObjectURL(blob));
    return { record, imageUrl: entryUrls.value[record.id] ?? '' };
  }

  async function remove(id: string): Promise<void> {
    await deleteBlob(id);
    metaStore.remove(id);
    records.value = records.value.filter((record) => record.id !== id);
    revokeEntryUrl(id);
  }

  function getEntry(id: string): HistoryEntry | null {
    return entries.value.find((entry) => entry.record.id === id) ?? null;
  }

  return {
    records: readonly(records),
    entries,
    isHydrating: readonly(isHydrating),
    hydrateError: readonly(hydrateError),
    refresh,
    add,
    remove,
    getEntry,
  };
}

export function resetImageHistoryForTests(): void {
  Object.keys(entryUrls.value).forEach(revokeEntryUrl);
  records.value = [];
  entryUrls.value = {};
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

    for (const record of storedRecords) {
      const blob = await getBlob(record.id);
      if (blob) {
        nextUrls[record.id] = URL.createObjectURL(blob);
      }
    }

    Object.keys(entryUrls.value).forEach((id) => {
      if (nextUrls[id] === undefined) revokeEntryUrl(id);
    });
    entryUrls.value = nextUrls;
  } catch {
    hydrateError.value = new Error('无法读取本地历史记录，请刷新页面或检查浏览器存储权限。');
  } finally {
    isHydrating.value = false;
  }
}

function setEntryUrl(id: string, url: string): void {
  revokeEntryUrl(id);
  entryUrls.value = {
    ...entryUrls.value,
    [id]: url,
  };
}

function revokeEntryUrl(id: string): void {
  const previous = entryUrls.value[id];
  if (previous) URL.revokeObjectURL(previous);
  const remaining = { ...entryUrls.value };
  delete remaining[id];
  entryUrls.value = remaining;
}
