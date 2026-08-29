import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminUser } from '@/types/admin';

interface MockAuthState {
  user: { id: string; name: string; email: string; isAdmin: boolean } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

const authMocks = vi.hoisted(
  (): MockAuthState => ({
    user: { id: 'user-0', name: 'Admin', email: 'admin@example.com', isAdmin: true },
    isAuthenticated: true,
    isAdmin: true,
    isLoading: false,
  }),
);

const authModalMocks = vi.hoisted(() => ({
  openAuthModal: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
  users: [] as AdminUser[],
  isLoading: false,
  error: null as Error | null,
  refresh: vi.fn(),
  createUser: vi.fn(),
  updateQuota: vi.fn(),
  removeUser: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMocks,
}));

vi.mock('@/hooks/useAuthModal', () => authModalMocks);

vi.mock('@/hooks/useAdminUsers', () => ({
  useAdminUsers: () => adminMocks,
}));

import { ToastProvider } from '@/components/common/ToastProvider';
import { AdminUsersView } from '@/views/AdminUsersView';

function makeUsers(count = 12): AdminUser[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `user-${index}`,
    username: `member${index}`,
    name: `Member ${index}`,
    email: `member${index}@example.com`,
    isAdmin: index === 0,
    createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T08:00:00.000Z`,
    quota: {
      total: 20 + index,
      usedToday: index,
      remainingToday: 20,
    },
  }));
}

function renderView() {
  return render(
    <ToastProvider>
      <AdminUsersView />
    </ToastProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.user = { id: 'user-0', name: 'Admin', email: 'admin@example.com', isAdmin: true };
  authMocks.isAuthenticated = true;
  authMocks.isAdmin = true;
  authMocks.isLoading = false;
  adminMocks.users = makeUsers();
  adminMocks.isLoading = false;
  adminMocks.error = null;
  adminMocks.refresh.mockResolvedValue(undefined);
  adminMocks.createUser.mockResolvedValue(makeUsers(13)[12]);
  adminMocks.updateQuota.mockImplementation((id: string, total: number) =>
    Promise.resolve({
      ...adminMocks.users.find((item) => item.id === id)!,
      quota: { total, usedToday: 0, remainingToday: total },
    }),
  );
  adminMocks.removeUser.mockResolvedValue(undefined);
});

describe('AdminUsersView workbench', () => {
  it('uses the shared operational title and keeps filters outside the table surface', () => {
    renderView();

    const title = screen.getByRole('heading', { level: 1, name: '用户管理' });
    const header = title.closest('header');
    const search = screen.getByRole('searchbox', { name: '搜索用户' });
    const toolbar = search.closest('.admin-table-toolbar');
    const tableShell = screen.getByRole('table').closest('.admin-table-shell');

    expect(header).toHaveClass('operational-page-header');
    expect(within(header!).getByText('12 个账号')).toHaveClass('operational-page-header__meta');
    expect(toolbar).toHaveClass('operational-toolbar');
    expect(tableShell).not.toContainElement(toolbar as HTMLElement);
  });

  it('keeps the account form secondary and creates a user from the inline workflow', async () => {
    const createRequest = deferred<AdminUser>();
    adminMocks.createUser.mockReturnValueOnce(createRequest.promise);
    const user = userEvent.setup();
    renderView();

    const createTrigger = screen.getByRole('button', { name: '创建用户' });
    expect(createTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('form', { name: '创建新用户' })).not.toBeInTheDocument();

    await user.click(createTrigger);
    const form = screen.getByRole('form', { name: '创建新用户' });
    expect(createTrigger).toHaveAttribute('aria-expanded', 'true');
    await user.type(within(form).getByLabelText('用户名'), 'new_member');
    await user.type(within(form).getByLabelText('初始密码'), 'password-123');
    await user.clear(within(form).getByLabelText('每日额度'));
    await user.type(within(form).getByLabelText('每日额度'), '10001');
    expect(within(form).getByRole('button', { name: '确认创建' })).toBeDisabled();
    await user.clear(within(form).getByLabelText('每日额度'));
    await user.type(within(form).getByLabelText('每日额度'), '35');
    await user.click(within(form).getByRole('button', { name: '确认创建' }));

    await waitFor(() =>
      expect(adminMocks.createUser).toHaveBeenCalledWith({
        username: 'new_member',
        password: 'password-123',
        dailyTotal: 35,
      }),
    );
    expect(within(form).getByRole('button', { name: '正在创建…' })).toBeDisabled();
    expect(within(form).getByLabelText('用户名')).toBeDisabled();
    expect(createTrigger).toBeDisabled();

    await act(async () => {
      createRequest.resolve(makeUsers(13)[12]!);
      await createRequest.promise;
    });
    await waitFor(() =>
      expect(screen.queryByRole('form', { name: '创建新用户' })).not.toBeInTheDocument(),
    );
    expect(createTrigger).toHaveFocus();
  });

  it('supports search, pagination, page size, and inline quota saving', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => expect(adminMocks.refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: '每页显示数量' })).toHaveTextContent('10 条');
    expect(screen.getByText('member9')).toBeInTheDocument();
    expect(screen.queryByText('member10')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '每页显示数量' }));
    await user.click(screen.getByRole('menuitemradio', { name: /20 条/ }));
    expect(screen.getByRole('button', { name: '每页显示数量' })).toHaveTextContent('20 条');
    expect(screen.getByText('member10')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '每页显示数量' }));
    await user.click(screen.getByRole('menuitemradio', { name: /10 条/ }));

    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('member10')).toBeInTheDocument();
    expect(screen.getByText('第 2 / 2 页')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: '搜索用户' }), 'member11');
    expect(screen.getByText('member11')).toBeInTheDocument();
    expect(screen.queryByText('member10')).not.toBeInTheDocument();
    expect(screen.getByText('显示 1 / 12 个账号')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: '搜索用户' }));
    const memberRow = screen.getByText('member1').closest('[role="row"]');
    expect(memberRow).not.toBeNull();
    const quotaInput = within(memberRow as HTMLElement).getByLabelText('设置 member1 的每日额度');
    await user.clear(quotaInput);
    await user.type(quotaInput, '42');
    await user.click(within(memberRow as HTMLElement).getByRole('button', { name: '保存额度' }));

    await waitFor(() => expect(adminMocks.updateQuota).toHaveBeenCalledWith('user-1', 42));
  });

  it('protects admin accounts and confirms deletion of a regular user', async () => {
    const user = userEvent.setup();
    renderView();

    const protectedDelete = screen.getByRole('button', { name: '删除用户 member0' });
    expect(protectedDelete).toBeDisabled();
    expect(protectedDelete).toHaveAttribute('title', '受保护账号不可删除');

    const deleteTrigger = screen.getByRole('button', { name: '删除用户 member1' });
    await user.click(deleteTrigger);
    let dialog = screen.getByRole('alertdialog', { name: '删除用户' });
    expect(dialog).toHaveTextContent('确认删除用户“member1”？');

    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(deleteTrigger).toHaveFocus());

    await user.click(deleteTrigger);
    dialog = screen.getByRole('alertdialog', { name: '删除用户' });
    await user.click(within(dialog).getByRole('button', { name: '删除用户' }));

    await waitFor(() => expect(adminMocks.removeUser).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('renders permission and loading states without exposing admin actions', () => {
    authMocks.isAuthenticated = true;
    authMocks.isAdmin = false;
    authMocks.user = { id: 'user-9', name: 'Member', email: 'member@example.com', isAdmin: false };
    const forbidden = renderView();

    expect(screen.getByRole('status')).toHaveTextContent('无权访问');
    expect(screen.queryByRole('button', { name: '创建用户' })).not.toBeInTheDocument();
    expect(adminMocks.refresh).not.toHaveBeenCalled();

    forbidden.unmount();
    authMocks.isLoading = true;
    const permissionLoading = renderView();
    expect(screen.getByRole('status')).toHaveTextContent('正在确认管理员权限');

    permissionLoading.unmount();
    authMocks.isLoading = false;
    authMocks.isAdmin = true;
    adminMocks.users = [];
    adminMocks.isLoading = true;
    renderView();
    expect(screen.getByRole('status')).toHaveTextContent('正在载入账号');
  });

  it('gives signed-out users a login recovery path', async () => {
    const user = userEvent.setup();
    authMocks.user = null;
    authMocks.isAuthenticated = false;
    authMocks.isAdmin = false;
    renderView();

    expect(screen.getByRole('heading', { level: 1, name: '用户管理' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '登录后管理用户' })).toBeInTheDocument();
    expect(screen.queryByText('无权访问')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建用户' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(authModalMocks.openAuthModal).toHaveBeenCalledOnce();
    expect(adminMocks.refresh).not.toHaveBeenCalled();
  });

  it('keeps a load error authoritative and retryable when no cached users exist', async () => {
    const user = userEvent.setup();
    adminMocks.users = [];
    adminMocks.error = new Error('用户列表暂时不可用');
    renderView();

    expect(screen.getByRole('alert')).toHaveTextContent('用户列表暂时不可用');
    expect(screen.queryByText(/暂无用户/)).not.toBeInTheDocument();
    await waitFor(() => expect(adminMocks.refresh).toHaveBeenCalledOnce());
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await waitFor(() => expect(adminMocks.refresh).toHaveBeenCalledTimes(2));
  });

  it('renders the empty state only after a successful empty load', () => {
    adminMocks.users = [];
    renderView();
    expect(screen.getByText(/暂无用户/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
