import { ChevronLeft, ChevronRight, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { OperationalPageHeader } from '@/components/common/OperationalPageHeader';
import { useToast } from '@/components/common/ToastProvider';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { refreshImageQuota } from '@/hooks/useImageQuota';
import type { AdminUser } from '@/types/admin';

function displayName(user: AdminUser): string {
  return user.username ?? user.name;
}

function isValidDailyTotal(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 10_000;
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 条', description: '适合日常管理' },
  { value: '20', label: '20 条', description: '显示更多账号' },
  { value: '50', label: '50 条', description: '适合批量核对' },
] as const;

export function AdminUsersView() {
  const { notify } = useToast();
  const { user: currentUser, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { users, isLoading, error, refresh, createUser, updateQuota, removeUser } = useAdminUsers();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dailyTotal, setDailyTotal] = useState(20);
  const [creating, setCreating] = useState(false);
  const [quotaEdits, setQuotaEdits] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]['value']>('10');
  const [page, setPage] = useState(1);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreCreateFocusRef = useRef(false);

  useEffect(() => {
    if (isAdmin)
      void refresh().catch((caught) =>
        notify(caught instanceof Error ? caught.message : '用户列表加载失败。', 'error'),
      );
  }, [isAdmin, notify, refresh]);

  const canCreate = useMemo(
    () => username.trim().length > 0 && password.length >= 8 && isValidDailyTotal(dailyTotal),
    [dailyTotal, password, username],
  );
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((item) =>
      [displayName(item), item.email, item.isAdmin ? '管理员' : '普通用户'].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [query, users]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / Number(pageSize)));
  const safePage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice(
    (safePage - 1) * Number(pageSize),
    safePage * Number(pageSize),
  );

  useEffect(() => setPage(1), [pageSize, query]);
  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);
  useEffect(() => {
    if (createOpen || creating || !shouldRestoreCreateFocusRef.current) return;
    shouldRestoreCreateFocusRef.current = false;
    createTriggerRef.current?.focus();
  }, [createOpen, creating]);
  const refreshUsers = (): void => {
    void refresh().catch((caught) =>
      notify(caught instanceof Error ? caught.message : '用户列表加载失败。', 'error'),
    );
  };
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      await createUser({ username: username.trim(), password, dailyTotal });
      setUsername('');
      setPassword('');
      setDailyTotal(20);
      shouldRestoreCreateFocusRef.current = true;
      setCreateOpen(false);
      notify('用户已创建。');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : '创建用户失败。', 'error');
    } finally {
      setCreating(false);
    }
  };
  const saveQuota = async (target: AdminUser): Promise<void> => {
    const dailyQuota = quotaEdits[target.id] ?? target.quota.total;
    if (savingId !== null || !isValidDailyTotal(dailyQuota)) return;
    setSavingId(target.id);
    try {
      await updateQuota(target.id, dailyQuota);
      if (target.id === currentUser?.id) await refreshImageQuota();
      setQuotaEdits((current) => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });
      notify('额度已更新。');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : '更新额度失败。', 'error');
    } finally {
      setSavingId(null);
    }
  };
  const remove = async (target: AdminUser): Promise<void> => {
    if (target.isAdmin || target.id === currentUser?.id) return;
    setDeletingId(target.id);
    try {
      await removeUser(target.id);
      notify('用户已删除。');
      setDeleteTarget(null);
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : '删除用户失败。', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="workspace-page admin-page" aria-labelledby="admin-title">
      <OperationalPageHeader
        id="admin-title"
        title="用户管理"
        meta={isAdmin ? `${users.length} 个账号` : undefined}
        actions={
          isAdmin ? (
            <>
              <Button type="button" variant="secondary" disabled={isLoading} onClick={refreshUsers}>
                <RefreshCw aria-hidden="true" />
                {isLoading ? '刷新中…' : '刷新'}
              </Button>
              <Button
                ref={createTriggerRef}
                type="button"
                aria-expanded={createOpen}
                aria-controls="admin-create-form"
                disabled={creating}
                onClick={() => setCreateOpen((current) => !current)}
              >
                <Plus aria-hidden="true" />
                创建用户
              </Button>
            </>
          ) : undefined
        }
      />
      {authLoading ? (
        <p className="loading-state" role="status">
          正在确认管理员权限…
        </p>
      ) : !isAuthenticated ? (
        <div className="auth-gate" role="status">
          <h2>登录后管理用户</h2>
          <p>请使用管理员账号登录后继续。</p>
          <Button type="button" onClick={() => openAuthModal()}>
            登录
          </Button>
        </div>
      ) : !isAdmin ? (
        <div className="auth-gate" role="status">
          <p className="eyebrow">权限提示</p>
          <h2>无权访问</h2>
          <p>只有管理员账号可以查看和管理用户。</p>
        </div>
      ) : null}
      {isAdmin ? (
        <>
          {createOpen ? (
            <form
              id="admin-create-form"
              className="admin-create"
              aria-label="创建新用户"
              aria-busy={creating}
              onSubmit={(event) => void submit(event)}
            >
              <div className="admin-create__heading">
                <strong>创建用户</strong>
              </div>
              <label>
                <span>用户名</span>
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={creating}
                  placeholder="例如 new_user"
                />
              </label>
              <label>
                <span>初始密码</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={creating}
                  placeholder="至少 8 个字符"
                />
              </label>
              <label>
                <span>每日额度</span>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  value={dailyTotal}
                  disabled={creating}
                  onChange={(event) => setDailyTotal(Number.parseInt(event.target.value, 10) || 0)}
                />
              </label>
              <Button type="submit" disabled={!canCreate || creating}>
                {creating ? '正在创建…' : '确认创建'}
              </Button>
            </form>
          ) : null}
          <section className="admin-panel" aria-label="用户额度列表" aria-busy={isLoading}>
            <h2 className="sr-only">账号列表</h2>
            {error ? (
              <div className="inline-error" role="alert">
                <span>{error.message}</span>
                <Button type="button" variant="secondary" size="compact" onClick={refreshUsers}>
                  重新加载
                </Button>
              </div>
            ) : null}
            {isLoading && !users.length ? (
              <p className="loading-state" role="status">
                正在载入账号…
              </p>
            ) : error && !users.length ? null : !users.length ? (
              <div className="empty-state">
                <p>暂无用户。可以先从上方创建一个新账号。</p>
              </div>
            ) : (
              <>
                <div className="operational-toolbar admin-table-toolbar">
                  <label className="admin-search">
                    <Search aria-hidden="true" />
                    <span className="sr-only">搜索用户</span>
                    <Input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索用户名、邮箱或角色"
                    />
                  </label>
                  <span>
                    显示 {filteredUsers.length} / {users.length} 个账号
                  </span>
                  <SelectMenu
                    label="每页显示数量"
                    value={pageSize}
                    options={PAGE_SIZE_OPTIONS}
                    onValueChange={setPageSize}
                    className="admin-page-size"
                  />
                </div>
                <div className="admin-table-shell">
                  {visibleUsers.length ? (
                    <div className="admin-table" role="table">
                      <div className="admin-row admin-row--head" role="row">
                        <span role="columnheader">用户</span>
                        <span role="columnheader">创建时间</span>
                        <span role="columnheader">今日额度</span>
                        <span role="columnheader">操作</span>
                      </div>
                      {visibleUsers.map((item) => (
                        <article className="admin-row" role="row" key={item.id}>
                          <div className="admin-identity" role="cell" data-label="用户">
                            <span className="account-avatar" aria-hidden="true">
                              {displayName(item).slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <strong>{displayName(item)}</strong>
                              <em>{item.isAdmin ? '管理员' : '普通用户'}</em>
                              <small>{item.email}</small>
                            </span>
                          </div>
                          <time role="cell" data-label="创建时间" dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}
                          </time>
                          <div className="admin-quota" role="cell" data-label="今日额度">
                            <label htmlFor={`quota-${item.id}`}>
                              <span className="sr-only">设置 {displayName(item)} 的每日额度</span>
                              <Input
                                id={`quota-${item.id}`}
                                type="number"
                                min="0"
                                max="10000"
                                value={quotaEdits[item.id] ?? item.quota.total}
                                disabled={savingId === item.id}
                                onChange={(event) =>
                                  setQuotaEdits((current) => ({
                                    ...current,
                                    [item.id]: Number.parseInt(event.target.value, 10) || 0,
                                  }))
                                }
                              />
                            </label>
                            <span>
                              已用 {item.quota.usedToday}，剩余 {item.quota.remainingToday}
                            </span>
                            <div aria-hidden="true">
                              <i
                                style={{
                                  width: `${item.quota.total > 0 ? Math.min(100, (item.quota.usedToday / item.quota.total) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="admin-actions" role="cell" data-label="操作">
                            <Button
                              type="button"
                              variant="secondary"
                              size="compact"
                              disabled={
                                savingId !== null ||
                                !isValidDailyTotal(quotaEdits[item.id] ?? item.quota.total)
                              }
                              onClick={() => void saveQuota(item)}
                            >
                              <Save aria-hidden="true" />
                              {savingId === item.id ? '保存中…' : '保存额度'}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="compact"
                              title={
                                item.isAdmin || item.id === currentUser?.id
                                  ? '受保护账号不可删除'
                                  : '删除用户'
                              }
                              aria-label={`删除用户 ${displayName(item)}`}
                              disabled={
                                item.isAdmin ||
                                item.id === currentUser?.id ||
                                deletingId === item.id
                              }
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 aria-hidden="true" />
                              {deletingId === item.id ? '删除中…' : '删除'}
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state admin-table-empty">
                      <p>没有匹配“{query.trim()}”的账号。</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        onClick={() => setQuery('')}
                      >
                        清除搜索
                      </Button>
                    </div>
                  )}
                  <footer className="admin-pagination" aria-label="用户列表分页">
                    <span>
                      第 {safePage} / {pageCount} 页
                    </span>
                    <div>
                      <IconTooltip label="上一页">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="icon-button"
                          aria-label="上一页"
                          disabled={safePage <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                          <ChevronLeft aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="下一页">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="icon-button"
                          aria-label="下一页"
                          disabled={safePage >= pageCount}
                          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                        >
                          <ChevronRight aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                    </div>
                  </footer>
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
      <ConfirmActionModal
        id="admin-user-delete"
        open={deleteTarget !== null}
        title="删除用户"
        description={deleteTarget ? `确认删除用户“${displayName(deleteTarget)}”？` : ''}
        confirmLabel="删除用户"
        isPending={deleteTarget !== null && deletingId === deleteTarget.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => (deleteTarget ? remove(deleteTarget) : undefined)}
      />
    </section>
  );
}
