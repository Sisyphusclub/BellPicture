<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

interface NavItem {
  label: string;
  to: string;
  icon: 'discover' | 'generate' | 'assets' | 'users';
}

const navItems: NavItem[] = [
  { label: '发现', to: '/', icon: 'discover' },
  { label: '生图', to: '/generate', icon: 'generate' },
  { label: '资产', to: '/history', icon: 'assets' },
];
const { user, isAuthenticated, isAdmin, logout } = useAuth();
const { open: openLoginModal } = useAuthModal();

const visibleNavItems = computed<NavItem[]>(() =>
  isAdmin.value
    ? [...navItems, { label: '用户管理', to: '/admin/users', icon: 'users' }]
    : navItems,
);
const isMenuOpen = ref(false);
const accountLabel = computed(() => (isAuthenticated.value ? displayName() : '登录'));

function toggleMenu(): void {
  isMenuOpen.value = !isMenuOpen.value;
}

function handleAccountClick(): void {
  if (!isAuthenticated.value) {
    openLoginModal();
    return;
  }
  toggleMenu();
}

async function handleLogout(): Promise<void> {
  isMenuOpen.value = false;
  try {
    await logout();
  } catch {
    ElMessage.error('退出登录失败，请稍后再试。');
  }
}

function displayName(): string {
  const u = user.value;
  if (!u) return '';
  return u.username ?? u.name ?? '账户';
}

function initials(): string {
  const name = displayName();
  if (!name) return '?';
  const first = name.charAt(0).toUpperCase();
  return first || '?';
}
</script>

<template>
  <header class="app-sidebar" aria-label="Nebulens 主导航">
    <RouterLink class="sidebar-brand" to="/" aria-label="Nebulens，返回发现首页" title="Nebulens">
      <img class="sidebar-brand__mark" src="/brand/logo.png" alt="Nebulens 标志" />
    </RouterLink>

    <nav class="sidebar-nav" aria-label="主要导航">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.to"
        class="sidebar-nav__link"
        :to="item.to"
      >
        <span class="sidebar-nav__icon" aria-hidden="true">
          <svg
            v-if="item.icon === 'discover'"
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
          </svg>
          <svg
            v-else-if="item.icon === 'generate'"
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
            <path d="m6.2 6.2 2.8 2.8M15 15l2.8 2.8M17.8 6.2 15 9M9 15l-2.8 2.8" />
          </svg>
          <svg
            v-else-if="item.icon === 'assets'"
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2.5h5.5A2.5 2.5 0 0 1 20 10v6.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z"
            />
            <path d="M8 13h8" />
          </svg>
          <svg
            v-else
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="10" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="sidebar-account"
        :aria-expanded="isAuthenticated ? isMenuOpen : undefined"
        :aria-label="isAuthenticated ? '账户菜单' : '登录'"
        @click="handleAccountClick"
      >
        <span
          v-if="isAuthenticated && user?.image"
          class="sidebar-account__avatar"
          :style="{ backgroundImage: `url(${user.image})` }"
          aria-hidden="true"
        />
        <span
          v-else-if="isAuthenticated"
          class="sidebar-account__avatar sidebar-account__avatar--initials"
          aria-hidden="true"
        >
          {{ initials() }}
        </span>
        <span
          v-else
          class="sidebar-account__avatar sidebar-account__avatar--guest"
          aria-hidden="true"
        >
          <svg
            class="sidebar-account__guest-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.1"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="8" r="3.6" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          </svg>
        </span>
        <span>{{ accountLabel }}</span>
      </button>
      <div v-if="isAuthenticated && isMenuOpen" class="sidebar-account-menu" role="menu">
        <button type="button" role="menuitem" @click="handleLogout">退出登录</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-sidebar {
  position: fixed;
  z-index: 40;
  top: 20px;
  bottom: 20px;
  left: 16px;
  display: flex;
  width: var(--app-sidebar-width);
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--radius-panel);
  background: var(--color-surface-sidebar);
  box-shadow: var(--shadow-soft);
  color: var(--color-body);
  padding: 18px 8px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.sidebar-brand {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--radius-md);
  background: var(--color-surface-glass);
}

.sidebar-brand.router-link-exact-active {
  background: var(--color-surface-glass);
}

.sidebar-brand:focus-visible,
.sidebar-nav__link:focus-visible,
.sidebar-account:focus-visible,
.sidebar-account-menu button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.sidebar-brand__mark {
  display: block;
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.sidebar-nav {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.sidebar-nav__link,
.sidebar-account {
  display: grid;
  width: 100%;
  justify-items: center;
  gap: 5px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: var(--text-caption-size);
  font-weight: 800;
  line-height: 1.25;
  padding: 10px 4px;
  text-align: center;
}

.sidebar-nav__link:hover,
.sidebar-account:hover,
.sidebar-nav__link.router-link-exact-active {
  background: var(--color-surface-glass-strong);
  color: var(--color-ink);
}

.sidebar-nav__link.router-link-exact-active {
  box-shadow: inset 0 0 0 1px var(--color-hairline-soft);
}

.sidebar-nav__icon {
  display: grid;
  place-items: center;
  color: currentColor;
}

.sidebar-footer {
  position: relative;
  display: flex;
  width: 100%;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
}

.sidebar-account__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: oklch(87% 0.05 250deg);
  background-size: cover;
  background-position: center;
}

.sidebar-account__avatar--initials,
.sidebar-account__avatar--guest {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-hairline-soft);
  color: var(--color-ink);
}

.sidebar-account__avatar--initials {
  background: linear-gradient(135deg, var(--color-accent-soft), var(--color-chip));
  font-family: var(--font-brand);
  font-size: var(--text-label-size);
  font-weight: 900;
}

.sidebar-account__avatar--guest {
  background: var(--color-surface-glass-strong);
  color: var(--color-muted);
  transition:
    background-color 180ms ease,
    color 180ms ease;
}

.sidebar-account:hover .sidebar-account__avatar--guest {
  background: var(--color-chip);
  color: var(--color-ink);
}

.sidebar-account__guest-icon {
  display: block;
}

.sidebar-account-menu {
  position: absolute;
  bottom: 0;
  left: calc(100% + 12px);
  min-width: 132px;
  padding: 6px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-overlay);
  box-shadow: none;
}

.sidebar-account-menu button {
  width: 100%;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 9px 10px;
  text-align: left;
}

.sidebar-account-menu button:hover {
  background: var(--color-chip);
}

@media (max-width: 760px) {
  .app-sidebar {
    top: auto;
    right: max(10px, env(safe-area-inset-right));
    bottom: max(10px, env(safe-area-inset-bottom));
    left: max(10px, env(safe-area-inset-left));
    width: auto;
    height: 68px;
    flex-direction: row;
    justify-content: space-between;
    gap: 6px;
    border-radius: 22px;
    padding: 7px 8px;
  }

  .sidebar-brand {
    width: 44px;
    height: 44px;
    border-radius: 15px;
  }

  .sidebar-brand__mark {
    width: 32px;
    height: 32px;
  }

  .sidebar-nav {
    flex: 1;
    min-width: 0;
    flex-direction: row;
    justify-content: center;
    gap: 1px;
  }

  .sidebar-nav__link {
    min-width: 0;
    flex: 1 1 0;
    padding: 7px 1px;
    font-size: 10px;
  }

  .sidebar-nav__link span:last-child {
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-nav__icon svg {
    width: 19px;
    height: 19px;
  }

  .sidebar-footer {
    flex: 0 0 44px;
    min-width: 0;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
  }

  .sidebar-account {
    width: 44px;
    padding: 5px 1px;
    font-size: 10px;
  }

  .sidebar-account > span:last-child {
    display: none;
  }

  .sidebar-account__avatar {
    width: 26px;
    height: 26px;
  }

  .sidebar-account-menu {
    right: 0;
    bottom: calc(100% + 12px);
    left: auto;
  }
}

@media (max-width: 390px) {
  .sidebar-brand {
    display: none;
  }

  .app-sidebar {
    gap: 4px;
  }
}
</style>
