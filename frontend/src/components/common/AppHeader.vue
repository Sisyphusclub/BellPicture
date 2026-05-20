<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

interface NavItem {
  label: string;
  to: string;
  icon: 'discover' | 'generate' | 'images';
}

const navItems: NavItem[] = [
  { label: '发现', to: '/', icon: 'discover' },
  { label: '生图', to: '/generate', icon: 'generate' },
  { label: '图片管理', to: '/history', icon: 'images' },
];

const { user, isAuthenticated, logout } = useAuth();
const { open: openLoginModal } = useAuthModal();

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
  <header class="app-sidebar" aria-label="Ref2Image 主导航">
    <RouterLink class="sidebar-brand" to="/" aria-label="返回发现首页">
      <img class="sidebar-brand__mark" src="/brand/logo.png" alt="Ref2Image Studio 标志" />
    </RouterLink>

    <nav class="sidebar-nav" aria-label="主要导航">
      <RouterLink
        v-for="item in navItems"
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
            <rect x="3" y="3" width="7" height="7" rx="1.6" />
            <rect x="14" y="3" width="7" height="7" rx="1.6" />
            <rect x="3" y="14" width="7" height="7" rx="1.6" />
            <rect x="14" y="14" width="7" height="7" rx="1.6" />
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
        <span v-else class="sidebar-account__avatar sidebar-account__avatar--initials" aria-hidden="true">
          {{ isAuthenticated ? initials() : '入' }}
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
  gap: 26px;
  border: 1px solid rgba(54, 62, 72, 0.08);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(235, 247, 255, 0.76), rgba(255, 255, 255, 0.78));
  box-shadow: 0 18px 44px rgba(48, 88, 126, 0.08);
  color: var(--color-body);
  padding: 18px 8px;
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.sidebar-brand {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(44, 39, 33, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.48);
}

.sidebar-brand.router-link-exact-active {
  background: rgba(255, 255, 255, 0.48);
}

.sidebar-brand__mark {
  display: block;
  width: 50px;
  height: 50px;
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
  border-radius: 18px;
  background: transparent;
  color: rgba(31, 29, 26, 0.7);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  padding: 10px 4px;
  text-align: center;
}

.sidebar-nav__link:hover,
.sidebar-account:hover,
.sidebar-nav__link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.56);
  color: var(--color-ink);
}

.sidebar-nav__link.router-link-exact-active {
  box-shadow: inset 0 0 0 1px rgba(44, 39, 33, 0.07);
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

.sidebar-account__avatar--initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(44, 39, 33, 0.08);
  background: linear-gradient(135deg, #e5edff, #ffd8e9);
  color: var(--color-ink);
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 900;
}

.sidebar-account-menu {
  position: absolute;
  bottom: 0;
  left: calc(100% + 12px);
  min-width: 132px;
  padding: 6px;
  border: 1px solid var(--color-hairline);
  border-radius: 16px;
  background: oklch(99.1% 0.004 88deg / 0.96);
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
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
    height: 70px;
    flex-direction: row;
    justify-content: space-between;
    gap: 8px;
    border-radius: 22px;
    padding: 8px 10px;
  }

  .sidebar-brand {
    width: 46px;
    height: 46px;
    border-radius: 15px;
  }

  .sidebar-brand__mark {
    width: 40px;
    height: 40px;
  }

  .sidebar-nav {
    flex: 1;
    flex-direction: row;
    justify-content: center;
    gap: 2px;
  }

  .sidebar-nav__link {
    min-width: 54px;
    padding: 7px 2px;
    font-size: 11px;
  }

  .sidebar-nav__icon svg {
    width: 19px;
    height: 19px;
  }

  .sidebar-footer {
    flex: 0 0 auto;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
  }

  .sidebar-account {
    width: 48px;
    padding: 5px 2px;
    font-size: 10px;
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
</style>
