import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
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
import { getAppNavigation } from '@/config/navigation';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { quota, isLoading: quotaLoading } = useImageQuota();
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const links = getAppNavigation(isAdmin);
  const accountName = user?.username ?? user?.name ?? '账户';

  return (
    <>
      <aside className="app-sidebar" aria-label="主导航">
        <NavLink to="/" className="app-brand" aria-label="Nebulens 首页">
          <img src="/brand/logo.png" alt="Nebulens 标志" />
          <span>Nebulens</span>
        </NavLink>
        <nav className="app-nav" aria-label="工作区导航">
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
