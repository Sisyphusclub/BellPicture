import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import {
  deleteImageApiKey,
  fetchImageApiKeyStatus,
  saveImageApiKey,
} from '@/services/api/imageApiKeyApi';
import { ImageApiError } from '@/services/api/httpClient';
import type { ImageApiKeyStatus } from '@/types/settings';

import { useAuth } from './useAuth';

interface ImageApiKeyState {
  userId: string | null;
  status: ImageApiKeyStatus | null;
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
}

const EMPTY_STATE: ImageApiKeyState = {
  userId: null,
  status: null,
  isLoading: false,
  isMutating: false,
  error: null,
};
const store = createExternalStore<ImageApiKeyState>(EMPTY_STATE);
let requestId = 0;
let requestedUserId: string | null = null;

function readableError(error: unknown): Error {
  if (!(error instanceof ImageApiError)) {
    return new Error('生图 API Key 操作失败，请稍后重试。');
  }
  const messages: Record<string, string> = {
    PROVIDER_KEY_INVALID: '这个 API Key 未通过 sub2api 鉴权。',
    PROVIDER_KEY_MODEL_UNAVAILABLE: '这个 Key 所属分组不支持当前生图模型。',
    PROVIDER_KEY_VALIDATION_FAILED: '暂时未能连接 sub2api 验证 Key，请稍后重试。',
    RATE_LIMITED: '操作过于频繁，请稍后重试。',
    BAD_REQUEST: 'API Key 格式无效，请检查后重试。',
    INVALID_RESPONSE: error.message,
    NETWORK_ERROR: error.message,
  };
  return new Error(messages[error.code] ?? '生图 API Key 操作失败，请稍后重试。');
}

async function load(userId: string): Promise<void> {
  const currentRequestId = requestId + 1;
  requestId = currentRequestId;
  requestedUserId = userId;
  store.set({ userId, status: null, isLoading: true, isMutating: false, error: null });
  try {
    const status = await fetchImageApiKeyStatus();
    if (requestId === currentRequestId) {
      store.set({ userId, status, isLoading: false, isMutating: false, error: null });
    }
  } catch (error) {
    if (requestId === currentRequestId) {
      store.set({
        userId,
        status: null,
        isLoading: false,
        isMutating: false,
        error: readableError(error),
      });
    }
  }
}

export function useImageApiKey() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const userId = isAuthenticated ? (user?.id ?? null) : null;

  useEffect(() => {
    if (isAuthLoading) return;
    if (userId === null) {
      requestId += 1;
      requestedUserId = null;
      store.set(EMPTY_STATE);
      return;
    }
    if (requestedUserId !== userId) void load(userId);
  }, [isAuthLoading, userId]);

  const refresh = useCallback(async (): Promise<void> => {
    if (userId !== null) await load(userId);
  }, [userId]);
  const save = useCallback(
    async (
      apiKey: string,
      group: 'standard' | 'high-res' = 'standard',
    ): Promise<ImageApiKeyStatus> => {
      if (userId === null) throw new Error('请先登录。');
      const currentRequestId = requestId + 1;
      requestId = currentRequestId;
      store.set((current) => ({ ...current, userId, isMutating: true, error: null }));
      try {
        const status = await saveImageApiKey(apiKey, ...(group === 'standard' ? [] : [group]));
        if (requestId === currentRequestId) {
          store.set({ userId, status, isLoading: false, isMutating: false, error: null });
        }
        return status;
      } catch (error) {
        const nextError = readableError(error);
        if (requestId === currentRequestId) {
          store.set((current) => ({ ...current, isMutating: false, error: nextError }));
        }
        throw nextError;
      }
    },
    [userId],
  );
  const remove = useCallback(
    async (group: 'standard' | 'high-res' = 'standard'): Promise<ImageApiKeyStatus> => {
      if (userId === null) throw new Error('请先登录。');
      const currentRequestId = requestId + 1;
      requestId = currentRequestId;
      store.set((current) => ({ ...current, userId, isMutating: true, error: null }));
      try {
        const status = await deleteImageApiKey(...(group === 'standard' ? [] : [group]));
        if (requestId === currentRequestId) {
          store.set({ userId, status, isLoading: false, isMutating: false, error: null });
        }
        return status;
      } catch (error) {
        const nextError = readableError(error);
        if (requestId === currentRequestId) {
          store.set((current) => ({ ...current, isMutating: false, error: nextError }));
        }
        throw nextError;
      }
    },
    [userId],
  );

  const visibleState = state.userId === userId ? state : { ...EMPTY_STATE, userId };
  return { ...visibleState, refresh, save, remove };
}

export function resetImageApiKeyForTests(): void {
  requestId = 0;
  requestedUserId = null;
  store.set(EMPTY_STATE);
}
