import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, type EffectScope } from 'vue';

import type { useImageQuota as useImageQuotaFn } from '@/composables/useImageQuota';
import type { QuotaResponse } from '@/types/image';

type UseImageQuota = typeof useImageQuotaFn;
type ImageQuotaState = ReturnType<UseImageQuota>;

const activeScopes: EffectScope[] = [];

async function flushAsync(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

function mountComposable(useImageQuota: UseImageQuota): ImageQuotaState {
  const scope = effectScope();
  const state = scope.run(() => useImageQuota());
  activeScopes.push(scope);
  if (!state) throw new Error('useImageQuota did not return state.');
  return state;
}

async function loadSubject() {
  vi.resetModules();

  const authenticated = ref(false);
  const authLoading = ref(false);
  const fetchImageQuota = vi.fn<() => Promise<QuotaResponse>>();

  vi.doMock('@/composables/useAuth', () => ({
    useAuth: () => ({
      isAuthenticated: computed(() => authenticated.value),
      isLoading: computed(() => authLoading.value),
    }),
  }));
  vi.doMock('@/services/api/imagesApi', () => ({ fetchImageQuota }));

  const quotaModule = await import('@/composables/useImageQuota');
  quotaModule.resetImageQuotaForTests();

  return { authenticated, authLoading, fetchImageQuota, useImageQuota: quotaModule.useImageQuota };
}

describe('useImageQuota', () => {
  afterEach(() => {
    for (const scope of activeScopes) scope.stop();
    activeScopes.length = 0;
    vi.doUnmock('@/composables/useAuth');
    vi.doUnmock('@/services/api/imagesApi');
  });

  it('refreshes quota after the session becomes authenticated', async () => {
    const { authenticated, fetchImageQuota, useImageQuota } = await loadSubject();
    fetchImageQuota
      .mockRejectedValueOnce(new Error('Authentication required'))
      .mockResolvedValueOnce({ total: 20, remaining: 20 });
    const state = mountComposable(useImageQuota);

    await state.refresh();
    await flushAsync();
    expect(state.quota.value).toBeNull();

    authenticated.value = true;
    await flushAsync();

    expect(fetchImageQuota).toHaveBeenCalledTimes(2);
    expect(state.quota.value?.remaining).toBe(20);
  });

  it('shows the optimistic daily default when an authenticated quota fetch fails', async () => {
    const { authenticated, fetchImageQuota, useImageQuota } = await loadSubject();
    authenticated.value = true;
    fetchImageQuota.mockRejectedValueOnce(new Error('Server temporarily unavailable'));

    const state = mountComposable(useImageQuota);
    await flushAsync();

    expect(fetchImageQuota).toHaveBeenCalledTimes(1);
    expect(state.quota.value).toEqual({ total: 20, remaining: 20 });
    expect(state.error.value?.message).toBe('无法读取剩余额度。');
  });

  it('replaces the optimistic default with the server quota on refresh', async () => {
    const { authenticated, fetchImageQuota, useImageQuota } = await loadSubject();
    authenticated.value = true;
    fetchImageQuota
      .mockRejectedValueOnce(new Error('Server temporarily unavailable'))
      .mockResolvedValueOnce({ total: 20, remaining: 18 });
    const state = mountComposable(useImageQuota);

    await flushAsync();
    expect(state.quota.value?.remaining).toBe(20);

    await state.refresh();

    expect(state.quota.value?.remaining).toBe(18);
  });
});
