import { Gem, Menu, UserRound, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { SPRING_LAYOUT, SPRING_PANEL } from '@/lib/ease';

export interface NavbarExpandItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

export interface NavbarExpandProps {
  accountName: string;
  brandHref?: string;
  brandLabel: string;
  creditsRemaining: number | string;
  ctaLabel: string;
  ctaTo: string;
  isAuthenticated: boolean;
  items: readonly NavbarExpandItem[];
  logoSrc: string;
  onLogin: () => void;
}

function isItemActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

export function NavbarExpand({
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
}: NavbarExpandProps) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const handleLogin = (): void => {
    setMenuOpen(false);
    onLogin();
  };

  return (
    <header className="landing-navbar">
      <nav className="landing-navbar__surface" aria-label="首页导航">
        <Link className="landing-brand" to={brandHref} aria-label={`${brandLabel} 首页`}>
          <img src={logoSrc} alt="" />
          <span>{brandLabel}</span>
        </Link>

        <div className="landing-nav">
          {items.map((item) => {
            const active = isItemActive(location.pathname, item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined}>
                {active ? (
                  <motion.span
                    layoutId="landing-navbar-active"
                    className="landing-nav__pill"
                    transition={reduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                  />
                ) : null}
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Button
          className="landing-menu-toggle"
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? '关闭首页菜单' : '打开首页菜单'}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={menuOpen ? 'close' : 'menu'}
              initial={reduceMotion ? false : { opacity: 0, rotate: -18, scale: 0.72 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0, rotate: 18, scale: 0.72 }}
              transition={reduceMotion ? { duration: 0 } : SPRING_PANEL}
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </nav>

      <aside className="landing-actions" aria-label="账户与个人积分">
        {!isAuthenticated ? (
          <Button type="button" variant="ghost" onClick={handleLogin}>
            <UserRound aria-hidden="true" />
            <span>登录</span>
          </Button>
        ) : (
          <span className="landing-account" aria-label={`当前账户：${accountName}`}>
            <b>{accountName.slice(0, 1).toUpperCase()}</b>
            <span>{accountName}</span>
          </span>
        )}
        {isAuthenticated ? (
          <span className="landing-credits" aria-label={`个人积分：${creditsRemaining}`}>
            <Gem aria-hidden="true" />
            <span>个人积分</span>
            <strong>{creditsRemaining}</strong>
          </span>
        ) : (
          <Button
            className="landing-credits"
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

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id="landing-mobile-menu"
            className="landing-mobile-menu"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? {} : { opacity: 0, y: -8, scale: 0.97 }}
            transition={reduceMotion ? { duration: 0 } : SPRING_PANEL}
          >
            <nav aria-label="移动端首页导航">
              {items.map((item) => {
                const active = isItemActive(location.pathname, item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    className={active ? 'is-active' : undefined}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="landing-mobile-menu__footer">
              {!isAuthenticated ? (
                <Button type="button" variant="ghost" onClick={handleLogin}>
                  <UserRound aria-hidden="true" />
                  登录
                </Button>
              ) : (
                <span className="landing-mobile-menu__account">
                  <b>{accountName.slice(0, 1).toUpperCase()}</b>
                  <span>{accountName}</span>
                  <strong>{creditsRemaining} 积分</strong>
                </span>
              )}
              <Link className="landing-cta" to={ctaTo} onClick={() => setMenuOpen(false)}>
                {ctaLabel}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
