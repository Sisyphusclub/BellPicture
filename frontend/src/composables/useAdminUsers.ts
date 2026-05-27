import { readonly, ref } from 'vue';

import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserQuota,
} from '@/services/api/adminUsersApi';
import type { AdminUser, CreateAdminUserRequest } from '@/types/admin';

const users = ref<AdminUser[]>([]);
const isLoading = ref(false);
const error = ref<Error | null>(null);

function upsertUser(nextUser: AdminUser): void {
  const existingIndex = users.value.findIndex((user) => user.id === nextUser.id);
  if (existingIndex === -1) {
    users.value = [nextUser, ...users.value];
    return;
  }
  users.value = users.value.map((user) => (user.id === nextUser.id ? nextUser : user));
}

export function useAdminUsers() {
  async function refresh(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      users.value = await fetchAdminUsers();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('用户列表加载失败，请稍后再试。');
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function createUser(request: CreateAdminUserRequest): Promise<AdminUser> {
    error.value = null;
    try {
      const created = await createAdminUser(request);
      upsertUser(created);
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('创建用户失败，请稍后再试。');
      throw error.value;
    }
  }

  async function updateQuota(userId: string, dailyTotal: number): Promise<AdminUser> {
    error.value = null;
    try {
      const updated = await updateAdminUserQuota(userId, { dailyTotal });
      upsertUser(updated);
      return updated;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('更新额度失败，请稍后再试。');
      throw error.value;
    }
  }

  async function removeUser(userId: string): Promise<void> {
    error.value = null;
    try {
      await deleteAdminUser(userId);
      users.value = users.value.filter((user) => user.id !== userId);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('删除用户失败，请稍后再试。');
      throw error.value;
    }
  }

  return {
    users: readonly(users),
    isLoading: readonly(isLoading),
    error: readonly(error),
    refresh,
    createUser,
    updateQuota,
    removeUser,
  };
}
