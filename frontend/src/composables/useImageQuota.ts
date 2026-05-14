import { readonly, ref } from 'vue';

import { fetchImageQuota } from '@/services/api/imagesApi';
import type { QuotaResponse } from '@/types/image';

const quota = ref<QuotaResponse | null>(null);
const isLoading = ref(false);
const error = ref<Error | null>(null);
let requested = false;

export function useImageQuota() {
  async function refresh(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      quota.value = await fetchImageQuota();
    } catch {
      error.value = new Error('无法读取剩余额度。');
    } finally {
      isLoading.value = false;
      requested = true;
    }
  }

  if (!requested && !isLoading.value) {
    void refresh();
  }

  return {
    quota: readonly(quota),
    isLoading: readonly(isLoading),
    error: readonly(error),
    refresh,
  };
}
