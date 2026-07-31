import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import { fetchImageQuota } from '@/services/api/imagesApi';
import type { QuotaResponse } from '@/types/image';

import { useAuth } from './useAuth';

interface QuotaState {
  quota: QuotaResponse | null;
  isLoading: boolean;
  error: Error | null;
}

const store = createExternalStore<QuotaState>({ quota: null, isLoading: false, error: null });
let requested = false;
let requestId = 0;

async function loadQuota(authenticated: boolean): Promise<void> {
  const currentId = requestId + 1;
  requestId = currentId;
  store.set((state) => ({ ...state, isLoading: true, error: null }));
  try {
    const quota = await fetchImageQuota();
    if (requestId === currentId) store.set({ quota, isLoading: false, error: null });
  } catch {
    if (requestId === currentId) {
      store.set({
        quota: authenticated ? { total: 20, remaining: 20 } : null,
        isLoading: false,
        error: new Error('无法读取剩余额度。'),
      });
    }
  } finally {
    if (requestId === currentId) requested = true;
  }
}

export function useImageQuota() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;
    if (isAuthenticated) {
      if (!requested || state.quota === null) void loadQuota(true);
      return;
    }
    requestId += 1;
    requested = false;
    store.set({ quota: null, isLoading: false, error: null });
  }, [isAuthenticated, isAuthLoading, state.quota]);

  const refresh = useCallback(() => loadQuota(isAuthenticated), [isAuthenticated]);
  return { ...state, refresh };
}

export function resetImageQuotaForTests(): void {
  requested = false;
  requestId = 0;
  store.set({ quota: null, isLoading: false, error: null });
}
