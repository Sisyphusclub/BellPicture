import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminUser } from '@/types/admin';

const users = ref<AdminUser[]>([]);
const isLoading = ref(false);
const refresh = vi.fn<() => Promise<void>>(() => Promise.resolve());
const createUser = vi.fn<() => Promise<AdminUser>>();
const updateQuota = vi.fn<() => Promise<AdminUser>>();
const removeUser = vi.fn<() => Promise<void>>(() => Promise.resolve());
const currentUser = ref<{ id: string; username: string; isAdmin: boolean } | null>({
  id: 'admin-id',
  username: 'blur',
  isAdmin: true,
});

vi.mock('@/composables/useAdminUsers', () => ({
  useAdminUsers: () => ({
    users,
    isLoading,
    error: ref(null),
    refresh,
    createUser,
    updateQuota,
    removeUser,
  }),
}));

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: computed(() => currentUser.value),
    isAdmin: computed(() => currentUser.value?.isAdmin === true),
  }),
}));

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import AdminUsersView from '@/views/AdminUsersView.vue';

function makeUser(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: 'user-id',
    username: 'member',
    name: 'member',
    email: 'member@test.local',
    isAdmin: false,
    createdAt: '2026-05-27T00:00:00.000Z',
    quota: { total: 20, usedToday: 2, remainingToday: 18 },
    ...overrides,
  };
}

describe('AdminUsersView', () => {
  beforeEach(() => {
    users.value = [
      makeUser({ id: 'admin-id', username: 'blur', email: 'blur@test.local', isAdmin: true }),
      makeUser({ id: 'member-id', username: 'member', email: 'member@test.local', isAdmin: false }),
    ];
    isLoading.value = false;
    currentUser.value = { id: 'admin-id', username: 'blur', isAdmin: true };
    refresh.mockClear();
    createUser.mockReset();
    updateQuota.mockReset();
    removeUser.mockReset();
    createUser.mockResolvedValue(makeUser({ id: 'new-id', username: 'new_user' }));
    updateQuota.mockResolvedValue(makeUser({ id: 'member-id', username: 'member', quota: { total: 5, usedToday: 2, remainingToday: 3 } }));
    removeUser.mockResolvedValue();
  });

  it('loads and renders users with quota information', () => {
    const wrapper = mount(AdminUsersView);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('用户管理');
    expect(wrapper.text()).toContain('blur@test.local');
    expect(wrapper.text()).toContain('member@test.local');
    expect(wrapper.text()).toContain('已用 2，剩余 18');
  });

  it('blocks non-admin users before loading admin data', () => {
    currentUser.value = { id: 'member-id', username: 'member', isAdmin: false };

    const wrapper = mount(AdminUsersView);

    expect(refresh).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('无权访问');
    expect(wrapper.text()).not.toContain('blur@test.local');
  });

  it('creates a username/password user', async () => {
    const wrapper = mount(AdminUsersView);
    const inputs = wrapper.findAll('input');

    await inputs[0]!.setValue('new_user');
    await inputs[1]!.setValue('password123');
    await inputs[2]!.setValue('5');
    await wrapper.get('form').trigger('submit');

    expect(createUser).toHaveBeenCalledWith({
      username: 'new_user',
      password: 'password123',
      dailyTotal: 5,
    });
  });

  it('updates a user quota total', async () => {
    const wrapper = mount(AdminUsersView);
    const quotaInputs = wrapper.findAll('.admin-users__quota input');

    await quotaInputs[1]!.setValue('5');
    const saveButtons = wrapper.findAll('.admin-users__actions button').filter((button) => button.text().includes('保存额度'));
    await saveButtons[1]!.trigger('click');

    expect(updateQuota).toHaveBeenCalledWith('member-id', 5);
  });

  it('disables deletion for the current admin and deletes a normal user', async () => {
    const wrapper = mount(AdminUsersView);
    const deleteButtons = wrapper.findAll('.admin-users__danger');

    expect((deleteButtons[0]!.element as HTMLButtonElement).disabled).toBe(true);
    expect((deleteButtons[1]!.element as HTMLButtonElement).disabled).toBe(false);

    await deleteButtons[1]!.trigger('click');
    expect(removeUser).toHaveBeenCalledWith('member-id');
  });
});
