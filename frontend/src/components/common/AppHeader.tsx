import {
  History,
  ImagePlus,
  LayoutGrid,
  LayoutTemplate,
  LogIn,
  LogOut,
  Check,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useGenerationSessions, type GenerationSession } from '@/hooks/useGenerationSessions';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownTrigger,
} from '@/components/premium/animated-dropdown';
import { useImageQuota } from '@/hooks/useImageQuota';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const baseLinks = [
  { to: '/', label: '发现', icon: LayoutGrid },
  { to: '/generate', label: '生图', icon: ImagePlus },
  { to: '/templates', label: '创作模板', icon: LayoutTemplate },
  { to: '/history', label: '资产', icon: History },
];

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { quota, isLoading: quotaLoading } = useImageQuota();
  const {
    sessions,
    create: createSession,
    rename: renameSession,
    remove: removeSession,
  } = useGenerationSessions();
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GenerationSession | null>(null);
  const links = isAdmin
    ? [...baseLinks, { to: '/admin/users', label: '用户管理', icon: Users }]
    : baseLinks;
  const accountName = user?.username ?? user?.name ?? '账户';
  const activeSessionId = new URLSearchParams(location.search).get('session');

  const startNewSession = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    const session = createSession();
    setRenamingSessionId(null);
    void navigate(`/generate?session=${encodeURIComponent(session.id)}`);
  };

  const beginRename = (id: string, title: string): void => {
    setRenamingSessionId(id);
    setRenameValue(title === '未命名会话' ? '' : title);
  };

  const commitRename = (event: FormEvent<HTMLFormElement>, id: string): void => {
    event.preventDefault();
    const title = renameValue.trim();
    if (title) renameSession(id, title);
    setRenamingSessionId(null);
  };

  const confirmDeleteSession = (): void => {
    if (!deleteTarget) return;
    removeSession(deleteTarget.id);
    setDeleteTarget(null);
    setRenamingSessionId(null);
    if (activeSessionId === deleteTarget.id) void navigate('/generate');
  };

  return (
    <>
      <aside className="app-sidebar" aria-label="主导航">
        <NavLink to="/" className="app-brand" aria-label="Nebulens 首页">
          <img src="/brand/logo.png" alt="Nebulens 标志" />
          <span>Nebulens</span>
        </NavLink>
        <nav className="app-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn('app-nav__link', isActive && 'is-active')}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="sidebar-create" to="/generate" onClick={startNewSession}>
          <Plus aria-hidden="true" />
          <span>新建生成</span>
        </Link>
        <section className="sidebar-sessions" aria-label="最近会话">
          <div className="sidebar-sessions__heading">
            <span className="sidebar-sessions__label">最近会话</span>
          </div>
          <div className="sidebar-sessions__list">
            {sessions.length ? (
              sessions.slice(0, 12).map((session) => (
                <div
                  className={cn(
                    'sidebar-session',
                    activeSessionId === session.id && 'is-active',
                    renamingSessionId === session.id && 'is-renaming',
                  )}
                  key={session.id}
                >
                  <NavLink
                    className="sidebar-session__link"
                    to={`/generate?session=${encodeURIComponent(session.id)}`}
                    title={session.title}
                  >
                    <span className="sidebar-session__title">{session.title}</span>
                  </NavLink>
                  <AnimatedDropdown>
                    <AnimatedDropdownTrigger asChild>
                      <Button
                        className="sidebar-session__menu"
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`会话选项：${session.title}`}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    </AnimatedDropdownTrigger>
                    <AnimatedDropdownContent
                      className="sidebar-session-menu"
                      side="right"
                      align="start"
                      sideOffset={8}
                      onCloseAutoFocus={(event) => event.preventDefault()}
                    >
                      <AnimatedDropdownItem onSelect={() => beginRename(session.id, session.title)}>
                        <AnimatedDropdownItemIcon>
                          <Pencil aria-hidden="true" />
                        </AnimatedDropdownItemIcon>
                        <AnimatedDropdownItemText>重命名</AnimatedDropdownItemText>
                      </AnimatedDropdownItem>
                      <AnimatedDropdownItem destructive onSelect={() => setDeleteTarget(session)}>
                        <AnimatedDropdownItemIcon>
                          <Trash2 aria-hidden="true" />
                        </AnimatedDropdownItemIcon>
                        <AnimatedDropdownItemText>删除</AnimatedDropdownItemText>
                      </AnimatedDropdownItem>
                    </AnimatedDropdownContent>
                  </AnimatedDropdown>
                  {renamingSessionId === session.id ? (
                    <form
                      className="sidebar-session__form"
                      onSubmit={(event) => commitRename(event, session.id)}
                    >
                      <Input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        aria-label="会话名称"
                        placeholder="输入会话名称"
                        autoFocus
                        maxLength={40}
                      />
                      <Button
                        className="sidebar-session__save"
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label="保存会话名称"
                      >
                        <Check aria-hidden="true" />
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="sidebar-sessions__empty">生成后会自动记录在这里</p>
            )}
          </div>
        </section>
        <div className="sidebar-account-area">
          <div className="sidebar-quota" aria-label="今日生成额度">
            <span>今日额度</span>
            <strong>
              {!isAuthenticated
                ? '登录后查看'
                : quotaLoading
                  ? '同步中'
                  : `${quota?.remaining ?? '—'} / ${quota?.total ?? '—'}`}
            </strong>
          </div>
          <div className="account-control">
            {!isAuthenticated ? (
              <Button type="button" variant="ghost" onClick={() => openAuthModal()}>
                <LogIn aria-hidden="true" />
                <span>登录</span>
              </Button>
            ) : (
              <AnimatedDropdown>
                <AnimatedDropdownTrigger asChild>
                  <Button type="button" variant="ghost">
                    <span className="account-avatar" aria-hidden="true">
                      {accountName.slice(0, 1).toUpperCase()}
                    </span>
                    <span>{accountName}</span>
                  </Button>
                </AnimatedDropdownTrigger>
                <AnimatedDropdownContent
                  className="account-menu"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
                  <AnimatedDropdownItem onSelect={() => void logout()}>
                    <AnimatedDropdownItemIcon>
                      <LogOut aria-hidden="true" />
                    </AnimatedDropdownItemIcon>
                    <AnimatedDropdownItemText>退出登录</AnimatedDropdownItemText>
                  </AnimatedDropdownItem>
                </AnimatedDropdownContent>
              </AnimatedDropdown>
            )}
          </div>
        </div>
      </aside>
      <ConfirmActionModal
        id="session-delete"
        open={deleteTarget !== null}
        title="删除历史会话"
        description={
          deleteTarget ? `将从最近会话中移除“${deleteTarget.title}”，已生成的图片资产会保留。` : ''
        }
        confirmLabel="删除会话"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteSession}
      />
      <nav
        className={cn('mobile-bottom-nav', isAdmin && 'mobile-bottom-nav--admin')}
        aria-label="移动端主导航"
      >
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(isActive && 'is-active')}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={
            isAuthenticated ? () => setMobileAccountOpen((value) => !value) : () => openAuthModal()
          }
        >
          {isAuthenticated ? (
            <span className="account-avatar" aria-hidden="true">
              {accountName.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <LogIn aria-hidden="true" />
          )}
          <span>{isAuthenticated ? '账户' : '登录'}</span>
        </Button>
        {isAuthenticated && mobileAccountOpen ? (
          <Button
            className="mobile-logout"
            type="button"
            variant="ghost"
            size="icon"
            aria-label="退出登录"
            onClick={() => void logout()}
          >
            <LogOut aria-hidden="true" />
          </Button>
        ) : null}
      </nav>
    </>
  );
}
