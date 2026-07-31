import { useCallback, useSyncExternalStore } from 'react';

import { createExternalStore } from '@/lib/externalStore';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserQuota,
} from '@/services/api/adminUsersApi';
import type { AdminUser, CreateAdminUserRequest } from '@/types/admin';

interface AdminState {
  users: AdminUser[];
  isLoading: boolean;
  error: Error | null;
}

const store = createExternalStore<AdminState>({ users: [], isLoading: false, error: null });

function upsert(user: AdminUser): void {
  store.set((state) => ({
    ...state,
    users: state.users.some((item) => item.id === user.id)
      ? state.users.map((item) => (item.id === user.id ? user : item))
      : [user, ...state.users],
  }));
}

export function useAdminUsers() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const refresh = useCallback(async (): Promise<void> => {
    store.set((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const users = await fetchAdminUsers();
      store.set({ users, isLoading: false, error: null });
    } catch (error) {
      const nextError =
        error instanceof Error ? error : new Error('用户列表加载失败，请稍后再试。');
      store.set((current) => ({ ...current, isLoading: false, error: nextError }));
      throw nextError;
    }
  }, []);
  const createUser = useCallback(async (request: CreateAdminUserRequest): Promise<AdminUser> => {
    try {
      const user = await createAdminUser(request);
      upsert(user);
      return user;
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error('创建用户失败，请稍后再试。');
      store.set((current) => ({ ...current, error: nextError }));
      throw nextError;
    }
  }, []);
  const updateQuota = useCallback(async (id: string, total: number): Promise<AdminUser> => {
    const user = await updateAdminUserQuota(id, { dailyTotal: total });
    upsert(user);
    return user;
  }, []);
  const removeUser = useCallback(async (id: string): Promise<void> => {
    await deleteAdminUser(id);
    store.set((current) => ({
      ...current,
      users: current.users.filter((item) => item.id !== id),
    }));
  }, []);
  return { ...state, refresh, createUser, updateQuota, removeUser };
}
