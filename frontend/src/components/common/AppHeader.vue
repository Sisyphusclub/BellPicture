<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface ModuleItem {
  label: string;
  to?: string;
  disabled?: boolean;
}

const modules: ModuleItem[] = [
  { label: '画图', to: '/' },
  { label: '号池管理', disabled: true },
  { label: '注册机', disabled: true },
  { label: '图片管理', to: '/history' },
  { label: '日志管理', disabled: true },
  { label: '设置', disabled: true },
];
</script>

<template>
  <header class="app-header" aria-label="Ref2Image Studio 顶部导航">
    <RouterLink class="brand" to="/" aria-label="返回画图工作区">
      <span class="brand__mark" aria-hidden="true">✣</span>
      <span class="brand__name">Ref2Image Studio</span>
    </RouterLink>

    <nav class="module-nav" aria-label="主模块">
      <template v-for="module in modules" :key="module.label">
        <RouterLink v-if="module.to" :to="module.to" class="module-nav__item">
          {{ module.label }}
        </RouterLink>
        <button v-else type="button" class="module-nav__item module-nav__item--disabled" disabled>
          {{ module.label }}
        </button>
      </template>
    </nav>

    <div class="header-chips" aria-label="账户状态占位">
      <span class="header-chip">管理员</span>
      <span class="header-chip">v0.1.0</span>
      <button type="button" class="header-chip header-chip--button">退出</button>
    </div>
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
  min-height: 64px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-lg);
  border-bottom: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  color: var(--color-ink);
  padding: 0 var(--space-xl);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: max-content;
  color: var(--color-ink);
  font-weight: 600;
}

.brand__mark {
  display: inline-grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  font-size: 17px;
  line-height: 1;
}

.brand__name {
  font-size: 15px;
  letter-spacing: -0.01em;
  line-height: 1;
}

.module-nav {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  overflow-x: auto;
  scrollbar-width: none;
}

.module-nav::-webkit-scrollbar {
  display: none;
}

.module-nav__item {
  display: inline-flex;
  min-height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 14px;
}

.module-nav__item.router-link-exact-active {
  background: var(--color-surface-card);
  color: var(--color-ink);
}

.module-nav__item--disabled {
  cursor: not-allowed;
  opacity: 0.54;
}

.header-chips {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-xs);
  min-width: max-content;
}

.header-chip {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-soft);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
}

.header-chip--button {
  color: var(--color-ink);
  cursor: pointer;
}

@media (max-width: 1080px) {
  .app-header {
    grid-template-columns: 1fr auto;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
  }

  .module-nav {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .brand__name {
    display: none;
  }

  .header-chips {
    gap: var(--space-xxs);
  }

  .header-chip {
    padding: 6px 9px;
  }
}
</style>
