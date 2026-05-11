<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <header class="app-header">
    <div class="container app-header__inner">
      <RouterLink class="brand" to="/" aria-label="返回 Ref2Image Studio 首页">
        <span class="brand__mark" aria-hidden="true">✣</span>
        <span class="brand__text">Ref2Image Studio</span>
      </RouterLink>
      <nav class="nav-links" aria-label="主导航">
        <RouterLink to="/" class="nav-links__item">生成</RouterLink>
        <RouterLink to="/history" class="nav-links__item">历史</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--color-hairline-soft);
  background: rgba(250, 249, 245, 0.92);
  backdrop-filter: blur(12px);
}

.app-header__inner {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-lg);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--color-ink);
  font-weight: 500;
}

.brand__mark {
  display: inline-grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-ink);
  color: var(--color-canvas);
  font-size: 17px;
  line-height: 1;
}

.brand__text {
  font-size: 15px;
  letter-spacing: -0.01em;
}

.nav-links {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.nav-links__item {
  border-radius: var(--radius-md);
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 14px;
}

.nav-links__item.router-link-active {
  background: var(--color-surface-card);
  color: var(--color-ink);
}

@media (max-width: 520px) {
  .app-header__inner {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md) 0;
  }
}
</style>
