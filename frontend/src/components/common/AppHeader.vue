<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

const { user, isAuthenticated, logout } = useAuth();
const { open: openLoginModal } = useAuthModal();

const isMenuOpen = ref(false);

function toggleMenu(): void {
  isMenuOpen.value = !isMenuOpen.value;
}

function handleLoginClick(): void {
  openLoginModal();
}

async function handleLogout(): Promise<void> {
  isMenuOpen.value = false;
  try {
    await logout();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '退出登录失败。');
  }
}

function displayName(): string {
  const u = user.value;
  if (!u) return '';
  return u.name ?? u.email ?? '账户';
}

function initials(): string {
  const name = displayName();
  if (!name) return '?';
  const first = name.charAt(0).toUpperCase();
  return first || '?';
}
</script>

<template>
  <header class="app-header" aria-label="Ref2Image 顶部导航">
    <RouterLink class="brand" to="/" aria-label="返回首页">ref2image</RouterLink>

    <nav class="header-nav" aria-label="主要导航">
      <RouterLink class="header-nav__link" to="/">画图</RouterLink>
      <RouterLink class="header-nav__link" to="/history">图片管理</RouterLink>
    </nav>

    <div class="header-actions" aria-label="账户">
      <template v-if="isAuthenticated">
        <button
          type="button"
          class="account-button"
          :aria-expanded="isMenuOpen"
          aria-label="账户菜单"
          @click="toggleMenu"
        >
          <span
            v-if="user?.image"
            class="account-button__avatar"
            :style="{ backgroundImage: `url(${user.image})` }"
            aria-hidden="true"
          />
          <span v-else class="account-button__avatar account-button__avatar--initials" aria-hidden="true">
            {{ initials() }}
          </span>
          <span class="account-button__name">{{ displayName() }}</span>
        </button>
        <div v-if="isMenuOpen" class="account-menu" role="menu">
          <button type="button" class="account-menu__item" role="menuitem" @click="handleLogout">
            退出登录
          </button>
        </div>
      </template>
      <button v-else type="button" class="login-button" @click="handleLoginClick">登录</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  z-index: 40;
  top: 18px;
  left: 50%;
  display: grid;
  width: min(calc(100% - 48px), 760px);
  height: 46px;
  grid-template-columns: auto auto auto;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid oklch(24% 0.012 78deg / 0.07);
  border-radius: 40px;
  background: oklch(99.4% 0.003 88deg / 0.82);
  box-shadow: 0 12px 42px rgba(196, 190, 181, 0.24);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--color-ink);
  padding: 0 8px 0 18px;
  transform: translateX(-50%);
}

.brand {
  color: var(--color-ink);
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.header-nav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: oklch(94.8% 0.008 86deg / 0.56);
}

.header-nav__link {
  display: inline-flex;
  height: 30px;
  align-items: center;
  border-radius: var(--radius-pill);
  color: oklch(45% 0.012 78deg);
  font-size: 12px;
  font-weight: 800;
  padding: 0 12px;
}

.header-nav__link.router-link-exact-active {
  background: oklch(99% 0.004 88deg / 0.92);
  color: var(--color-ink);
  box-shadow: 0 4px 12px rgba(48, 42, 35, 0.08);
}

.header-actions {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.login-button {
  display: inline-flex;
  min-width: 58px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 24px;
  background: linear-gradient(180deg, oklch(27% 0.012 76deg), var(--color-primary));
  color: var(--color-on-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  box-shadow:
    inset -4px -6px 25px 0 rgba(201, 201, 201, 0.08),
    inset 4px 4px 10px 0 rgba(29, 29, 29, 0.24);
}

.account-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 2px 12px 2px 4px;
  border: 1px solid oklch(24% 0.012 78deg / 0.1);
  border-radius: 24px;
  background: oklch(99% 0.004 88deg / 0.82);
  cursor: pointer;
}

.account-button__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: oklch(85% 0.02 88deg);
  background-size: cover;
  background-position: center;
}

.account-button__avatar--initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink);
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 700;
}

.account-button__name {
  max-width: 110px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--color-ink);
  font-size: 12px;
  font-weight: 700;
}

.account-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  padding: 4px;
  border: 1px solid oklch(24% 0.012 78deg / 0.08);
  border-radius: 12px;
  background: oklch(99% 0.004 88deg);
  box-shadow: 0 12px 32px rgba(48, 42, 35, 0.12);
}

.account-menu__item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.account-menu__item:hover {
  background: oklch(95% 0.008 86deg);
}

@media (max-width: 767px) {
  .app-header {
    top: 12px;
    width: min(calc(100% - 24px), 560px);
    gap: 10px;
    padding-left: 14px;
  }

  .brand {
    font-size: 15px;
  }

  .header-nav__link {
    padding: 0 9px;
  }

  .login-button {
    min-width: 54px;
  }

  .account-button__name {
    display: none;
  }
}
</style>
