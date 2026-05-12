<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface ModuleItem {
  label: string;
  to: string;
}

const modules: ModuleItem[] = [
  { label: '画布', to: '/' },
  { label: '历史', to: '/history' },
];
</script>

<template>
  <header class="app-header" aria-label="Ref2Image Studio 顶部导航">
    <RouterLink class="brand" to="/" aria-label="返回画图工作区">Ref2Image Studio</RouterLink>

    <nav class="module-nav" aria-label="主模块">
      <RouterLink
        v-for="module in modules"
        :key="module.label"
        :to="module.to"
        class="module-nav__item"
      >
        <span class="module-nav__label">{{ module.label }}</span>
      </RouterLink>
    </nav>

    <div class="header-actions" aria-hidden="true" />
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  z-index: 40;
  top: 0;
  right: 0;
  left: 0;
  display: grid;
  height: var(--topbar-height);
  grid-template-columns: var(--sidebar-width) 1fr auto;
  align-items: center;
  border-bottom: 1px solid var(--color-hairline);
  background: var(--color-surface-glass);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  color: var(--color-ink);
}

.brand {
  padding-left: 26px;
  color: var(--color-ink);
  font-family: var(--font-brand);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

.module-nav {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 44px;
}

.module-nav__item {
  position: relative;
  display: inline-flex;
  height: 100%;
  align-items: center;
  color: #5b554d;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.module-nav__item.router-link-exact-active {
  color: #161411;
}

.module-nav__item.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 54px;
  height: 2px;
  background: #161411;
  border-radius: var(--radius-pill);
  transform: translateX(-50%);
}

.header-actions {
  width: 16px;
  padding-right: 26px;
}

@media (max-width: 1080px) {
  .app-header {
    grid-template-columns: 1fr;
    height: auto;
    min-height: var(--topbar-height);
    grid-template-rows: auto auto;
    padding: var(--space-sm) var(--space-md);
    gap: var(--space-xs);
  }

  .brand {
    padding-left: 0;
  }

  .module-nav {
    height: auto;
    justify-content: flex-start;
    gap: var(--space-lg);
  }

  .header-actions {
    display: none;
  }
}
</style>
