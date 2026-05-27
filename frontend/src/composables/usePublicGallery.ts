import { computed, readonly, ref } from 'vue';

import { deletePublicGalleryRecordAsAdmin, fetchPublicHistory } from '@/services/api/historyApi';
import { buildApiUrl } from '@/services/api/imagesApi';
import type { HistoryEntry, ImageRecord } from '@/types/image';

const records = ref<ImageRecord[]>([]);
const isHydrating = ref(false);
const hydrateError = ref<Error | null>(null);
let hydrated = false;

const entries = computed<HistoryEntry[]>(() =>
  records.value.map((record) => ({
    record,
    imageUrl: buildApiUrl(`/api/outputs/${record.id}`),
  })),
);

export function usePublicGallery() {
  void hydrate();

  function add(record: ImageRecord): HistoryEntry | null {
    if (!record.isPublic) return null;
    records.value = [record, ...records.value.filter((item) => item.id !== record.id)];
    return { record, imageUrl: buildApiUrl(`/api/outputs/${record.id}`) };
  }

  async function removeAsAdmin(id: string): Promise<void> {
    await deletePublicGalleryRecordAsAdmin(id);
    records.value = records.value.filter((record) => record.id !== id);
  }

  async function refresh(): Promise<void> {
    hydrated = false;
    await hydrate();
  }

  return {
    entries,
    isHydrating: readonly(isHydrating),
    hydrateError: readonly(hydrateError),
    refresh,
    add,
    removeAsAdmin,
  };
}

export function resetPublicGalleryForTests(): void {
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
    const remote = await fetchPublicHistory();
    records.value = [...remote].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    hydrated = false;
    hydrateError.value =
      err instanceof Error ? err : new Error('无法加载公开画廊，请稍后刷新重试。');
  } finally {
    isHydrating.value = false;
  }
}
