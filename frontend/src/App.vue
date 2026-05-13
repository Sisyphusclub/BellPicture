<script setup lang="ts">
import { watch } from 'vue';
import { RouterView } from 'vue-router';

import LoginModal from '@/components/auth/LoginModal.vue';
import AppHeader from '@/components/common/AppHeader.vue';
import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

const { isAuthenticated, isLoading } = useAuth();
const { open } = useAuthModal();

// 当 session 加载完成且未登录时，自动弹出登录 modal。
watch(
  [isLoading, isAuthenticated],
  ([loading, authed]) => {
    if (!loading && !authed) open();
  },
  { immediate: true },
);
</script>

<template>
  <div class="app-backdrop" aria-hidden="true">
    <video autoplay muted loop playsinline preload="metadata" class="app-backdrop__video">
      <source
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
        type="video/mp4"
      />
    </video>
    <div class="app-backdrop__gradient" />
  </div>
  <AppHeader />
  <main class="app-main" aria-label="Ref2Image Studio 工作区">
    <RouterView />
  </main>
  <LoginModal />
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

.app-main {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding-top: var(--topbar-height);
}

@media (max-width: 1080px) {
  .app-main {
    padding-top: calc(var(--topbar-height) + 36px);
  }
}
</style>
