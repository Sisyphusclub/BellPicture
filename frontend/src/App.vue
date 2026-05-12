<script setup lang="ts">
import { RouterView } from 'vue-router';

import AppHeader from '@/components/common/AppHeader.vue';
</script>

<template>
  <AppHeader />
  <main class="app-main" aria-label="Ref2Image Studio 工作区">
    <RouterView />
  </main>
</template>

<style scoped>
.app-main {
  min-height: 100vh;
  padding-top: var(--topbar-height);
}

@media (max-width: 1080px) {
  .app-main {
    padding-top: calc(var(--topbar-height) + 36px);
  }
}
</style>
