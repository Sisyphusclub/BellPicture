'use client';

import { Menu, X } from 'lucide-react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { SPRING_LAYOUT, SPRING_PANEL } from '@/lib/ease';

export interface NavbarExpandItem {
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
  const layoutId = useId();
  const { scrollY } = useScroll();
  const expandingWidth = useTransform(scrollY, [0, 320], [720, 960], { clamp: true });
  const [hoveredTo, setHoveredTo] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeTo = items.find((item) => isItemActive(location.pathname, item.to))?.to ?? null;
  const highlightedTo = hoveredTo ?? activeTo;

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
    <motion.header
      className="landing-navbar"
      style={{ width: reduceMotion ? 720 : expandingWidth }}
    >
      <nav className="landing-navbar__surface" aria-label="首页导航">
        <Link className="landing-brand" to={brandHref} aria-label={`${brandLabel} 首页`}>
          <img src={logoSrc} alt="" />
          <span>{brandLabel}</span>
        </Link>

        <LayoutGroup id={`landing-navbar-${layoutId}`}>
          <div className="landing-nav" onMouseLeave={() => setHoveredTo(null)}>
            {items.map((item) => {
              const active = isItemActive(location.pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => setHoveredTo(item.to)}
                  onFocus={() => setHoveredTo(item.to)}
                  onBlur={() => setHoveredTo(null)}
                >
                  {highlightedTo === item.to ? (
                    <motion.span
                      layoutId={`landing-navbar-pill-${layoutId}`}
                      className="landing-nav__pill"
                      transition={reduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                    />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </LayoutGroup>

        <div className="landing-actions">
          {!isAuthenticated ? (
            <button type="button" onClick={handleLogin}>
              登录
            </button>
          ) : (
            <span
              className="landing-account"
              aria-label={`${accountName}，剩余 ${creditsRemaining} 积分`}
            >
              <b>{accountName.slice(0, 1).toUpperCase()}</b>
              <span>{creditsRemaining} 积分</span>
            </span>
          )}
          <Link className="landing-cta" to={ctaTo}>
            {ctaLabel}
          </Link>
        </div>

        <button
          className="landing-menu-toggle"
          type="button"
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
        </button>
      </nav>

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
                return (
                  <Link
                    key={item.to}
                    className={active ? 'is-active' : undefined}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="landing-mobile-menu__footer">
              {!isAuthenticated ? (
                <button type="button" onClick={handleLogin}>
                  登录
                </button>
              ) : (
                <span>{creditsRemaining} 积分可用</span>
              )}
              <Link className="landing-cta" to={ctaTo} onClick={() => setMenuOpen(false)}>
                {ctaLabel}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
