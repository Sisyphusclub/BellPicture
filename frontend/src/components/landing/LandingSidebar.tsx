import { Gem, UserRound, X, type LucideIcon } from 'lucide-react';
import { useEffect, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

export interface LandingSidebarItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

interface LandingSidebarProps {
  accountName: string;
  brandHref?: string;
  brandLabel: string;
  creditsRemaining: number | string;
  ctaLabel: string;
  ctaTo: string;
  isAuthenticated: boolean;
  items: readonly LandingSidebarItem[];
  logoSrc: string;
  onLogin: () => void;
}

type SidebarVariables = CSSProperties & {
  '--sidebar-width': string;
  '--sidebar-width-icon': string;
};

function isItemActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

function LandingSidebarContent({
  accountName,
  brandHref = '/',
  brandLabel,
  creditsRemaining,
  ctaLabel,
  ctaTo,
  isAuthenticated,
  items,
  logoSrc,
  onLogin,
}: LandingSidebarProps) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);

  const primaryItems = items.slice(0, -1);
  const utilityItems = items.slice(-1);
  const closeMobile = (): void => setOpenMobile(false);
  const handleLogin = (): void => {
    closeMobile();
    onLogin();
  };

  const renderItems = (entries: readonly LandingSidebarItem[]) => (
    <SidebarMenu>
      {entries.map((item) => {
        const active = isItemActive(location.pathname, item.to);
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
              <Link to={item.to} aria-current={active ? 'page' : undefined} onClick={closeMobile}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <>
      <Sidebar className="landing-sidebar" collapsible="icon" variant="floating">
        <SidebarHeader>
          <div className="landing-sidebar__header-row">
            <Link
              className="landing-sidebar__brand"
              to={brandHref}
              aria-label={`${brandLabel} 首页`}
              onClick={closeMobile}
            >
              <img src={logoSrc} alt="" />
              <span>{brandLabel}</span>
            </Link>
            <Button
              className="landing-sidebar__mobile-close"
              type="button"
              variant="ghost"
              size="icon"
              aria-label="关闭首页菜单"
              onClick={closeMobile}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="首页导航">
            <SidebarGroup>
              <SidebarGroupContent>{renderItems(primaryItems)}</SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>{renderItems(utilityItems)}</SidebarGroupContent>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter className="landing-sidebar__mobile-footer">
          {!isAuthenticated ? (
            <Button type="button" variant="ghost" onClick={handleLogin}>
              <UserRound aria-hidden="true" />
              登录
            </Button>
          ) : (
            <span className="landing-sidebar__mobile-account">
              <b>{accountName.slice(0, 1).toUpperCase()}</b>
              <span>{accountName}</span>
              <strong>{creditsRemaining} 积分</strong>
            </span>
          )}
          <Button asChild>
            <Link to={ctaTo} onClick={closeMobile}>
              {ctaLabel}
            </Link>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <header className="landing-mobile-header">
        <Link
          className="landing-mobile-header__brand"
          to={brandHref}
          aria-label={`${brandLabel} 首页`}
        >
          <img src={logoSrc} alt="" />
          <span>{brandLabel}</span>
        </Link>
        <SidebarTrigger aria-label="打开首页菜单" />
      </header>

      <aside className="landing-account-actions" aria-label="账户与个人积分">
        {!isAuthenticated ? (
          <Button type="button" variant="ghost" onClick={handleLogin}>
            <UserRound aria-hidden="true" />
            <span>登录</span>
          </Button>
        ) : (
          <span
            className="landing-account-actions__account"
            aria-label={`当前账户：${accountName}`}
          >
            <b>{accountName.slice(0, 1).toUpperCase()}</b>
            <span>{accountName}</span>
          </span>
        )}
        {isAuthenticated ? (
          <span
            className="landing-account-actions__credits"
            aria-label={`个人积分：${creditsRemaining}`}
          >
            <Gem aria-hidden="true" />
            <span>个人积分</span>
            <strong>{creditsRemaining}</strong>
          </span>
        ) : (
          <Button
            className="landing-account-actions__credits"
            type="button"
            variant="ghost"
            aria-label="个人积分，登录后查看"
            onClick={handleLogin}
          >
            <Gem aria-hidden="true" />
            <span>个人积分</span>
          </Button>
        )}
      </aside>
    </>
  );
}

export function LandingSidebar(props: LandingSidebarProps) {
  const sidebarStyle: SidebarVariables = {
    '--sidebar-width': '14rem',
    '--sidebar-width-icon': '5.5rem',
  };

  return (
    <SidebarProvider defaultOpen={false} className="landing-navigation-shell" style={sidebarStyle}>
      <LandingSidebarContent {...props} />
    </SidebarProvider>
  );
}
