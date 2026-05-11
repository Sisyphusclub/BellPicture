<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <footer class="app-footer">
    <div class="container app-footer__inner">
      <div>
        <p class="app-footer__brand"><span aria-hidden="true">✣</span> Ref2Image Studio</p>
        <p class="app-footer__copy">由你的后端驱动、优先保存在本地的参考图生图工作台。</p>
      </div>
      <nav class="app-footer__links" aria-label="页脚导航">
        <RouterLink to="/">生成</RouterLink>
        <RouterLink to="/history">历史</RouterLink>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: var(--space-section);
  background: var(--color-surface-dark);
  color: var(--color-on-dark-soft);
}

.app-footer__inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-xl);
  padding: 48px 0;
}

.app-footer__brand {
  margin: 0 0 var(--space-xs);
  color: var(--color-on-dark);
  font-weight: 500;
}

.app-footer__copy {
  max-width: 440px;
  margin: 0;
}

.app-footer__links {
  display: flex;
  gap: var(--space-md);
}

.app-footer__links a {
  color: var(--color-on-dark);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .app-footer__inner {
    flex-direction: column;
  }
}
</style>
