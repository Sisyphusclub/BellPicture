import {
  History,
  ImagePlus,
  LayoutGrid,
  LayoutTemplate,
  LogIn,
  LogOut,
  Plus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useImageQuota } from '@/hooks/useImageQuota';
import { cn } from '@/lib/utils';

const baseLinks = [
  { to: '/', label: '发现', icon: LayoutGrid },
  { to: '/generate', label: '生图', icon: ImagePlus },
  { to: '/templates', label: '创作模板', icon: LayoutTemplate },
  { to: '/history', label: '资产', icon: History },
];

export function AppHeader() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { quota, isLoading: quotaLoading } = useImageQuota();
  const [accountOpen, setAccountOpen] = useState(false);
  const links = isAdmin
    ? [...baseLinks, { to: '/admin/users', label: '用户管理', icon: Users }]
    : baseLinks;
  const accountName = user?.username ?? user?.name ?? '账户';

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
        <Link className="sidebar-create" to="/generate">
          <Plus aria-hidden="true" />
          <span>新建生成</span>
        </Link>
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
            <button type="button" onClick={() => openAuthModal()}>
              <LogIn aria-hidden="true" />
              <span>登录</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((value) => !value)}
              >
                <span className="account-avatar" aria-hidden="true">
                  {accountName.slice(0, 1).toUpperCase()}
                </span>
                <span>{accountName}</span>
              </button>
              {accountOpen ? (
                <div className="account-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => void logout()}>
                    <LogOut aria-hidden="true" />
                    退出登录
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>
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
        <button
          type="button"
          onClick={
            isAuthenticated ? () => setAccountOpen((value) => !value) : () => openAuthModal()
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
        </button>
        {isAuthenticated && accountOpen ? (
          <button
            className="mobile-logout"
            type="button"
            aria-label="退出登录"
            onClick={() => void logout()}
          >
            <LogOut aria-hidden="true" />
          </button>
        ) : null}
      </nav>
    </>
  );
}
