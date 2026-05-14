import { readonly, ref, watch } from 'vue';

import { useAuth } from '@/composables/useAuth';
import { fetchImageQuota } from '@/services/api/imagesApi';
import type { QuotaResponse } from '@/types/image';

const DEFAULT_DAILY_QUOTA = 20;

const quota = ref<QuotaResponse | null>(null);
const isLoading = ref(false);
const error = ref<Error | null>(null);
let requested = false;
let requestId = 0;

function optimisticDefaultQuota(): QuotaResponse {
  return { total: DEFAULT_DAILY_QUOTA, remaining: DEFAULT_DAILY_QUOTA };
}

export function useImageQuota() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  let wasAuthenticated = isAuthenticated.value;

  async function refresh(): Promise<void> {
    const currentRequestId = requestId + 1;
    requestId = currentRequestId;
    const authenticatedAtStart = isAuthenticated.value;

    isLoading.value = true;
    error.value = null;
    try {
      const nextQuota = await fetchImageQuota();
      if (currentRequestId !== requestId) return;
      quota.value = nextQuota;
    } catch {
      if (currentRequestId !== requestId) return;
      quota.value = authenticatedAtStart ? optimisticDefaultQuota() : null;
      error.value = new Error('无法读取剩余额度。');
    } finally {
      if (currentRequestId === requestId) {
        isLoading.value = false;
        requested = true;
      }
    }
  }

  watch(
    [isAuthLoading, isAuthenticated],
    ([authLoading, authenticated]) => {
      if (authLoading) return;

      const becameAuthenticated = authenticated && !wasAuthenticated;
      if (authenticated) {
        if (!requested || becameAuthenticated || quota.value === null) {
          void refresh();
        }
      } else {
        requestId += 1;
        quota.value = null;
        isLoading.value = false;
        error.value = null;
        requested = false;
      }

      wasAuthenticated = authenticated;
    },
    { immediate: true },
  );

  return {
    quota: readonly(quota),
    isLoading: readonly(isLoading),
    error: readonly(error),
    refresh,
  };
}

export function resetImageQuotaForTests(): void {
  quota.value = null;
  isLoading.value = false;
  error.value = null;
  requested = false;
  requestId = 0;
}
