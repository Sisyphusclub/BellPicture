<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import LoginModal from '@/components/auth/LoginModal.vue';
import AppHeader from '@/components/common/AppHeader.vue';
import { useImageDetailModalState } from '@/composables/useImageDetailModalState';

const route = useRoute();
const { isImageDetailModalOpen } = useImageDetailModalState();
const videoBackdropRoutes = new Set(['discover', 'generate', 'history', 'admin-users']);
const isCompactViewport = ref(false);
let compactViewportMediaQuery: MediaQueryList | null = null;

const shouldShowBackdropVideo = computed(
  () =>
    !isCompactViewport.value &&
    typeof route.name === 'string' &&
    videoBackdropRoutes.has(route.name),
);

function handleCompactViewportChange(event: MediaQueryListEvent): void {
  isCompactViewport.value = event.matches;
}

onMounted(() => {
  if (typeof window.matchMedia !== 'function') return;
  compactViewportMediaQuery = window.matchMedia('(max-width: 760px)');
  isCompactViewport.value = compactViewportMediaQuery.matches;
  compactViewportMediaQuery.addEventListener('change', handleCompactViewportChange);
});

onBeforeUnmount(() => {
  compactViewportMediaQuery?.removeEventListener('change', handleCompactViewportChange);
});
</script>

<template>
  <div class="app-backdrop" aria-hidden="true">
    <video
      v-if="shouldShowBackdropVideo"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      class="app-backdrop__video"
    >
      <source
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
        type="video/mp4"
      />
    </video>
    <div class="app-backdrop__gradient" />
  </div>
  <div class="app-shell">
    <AppHeader v-if="!isImageDetailModalOpen" />
    <main class="app-main" aria-label="贝尔灵画工作区">
      <RouterView />
    </main>
    <LoginModal />
  </div>
</template>

<style scoped>
.app-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: var(--color-canvas-clean);
  pointer-events: none;
}

.app-backdrop__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.88;
  transform: scaleY(-1);
}

.app-backdrop__gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 26.416%,
    var(--color-canvas-clean) 66.943%
  );
}

.app-shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}

.app-main {
  min-height: 100vh;
  padding-left: calc(var(--app-sidebar-width) + 28px);
}

@media (max-width: 760px) {
  .app-main {
    padding-right: 0;
    padding-bottom: calc(104px + env(safe-area-inset-bottom));
    padding-left: 0;
  }
}
</style>
