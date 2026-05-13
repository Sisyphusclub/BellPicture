<script setup lang="ts">
import { ElDialog, ElMessage } from 'element-plus';
import { ref, watch } from 'vue';

import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

const { isOpen, close } = useAuthModal();
const { isAuthenticated, signInWithGoogle } = useAuth();

const isPending = ref(false);

watch(isAuthenticated, (next) => {
  if (next && isOpen.value) close();
});

async function handleGoogle(): Promise<void> {
  if (isPending.value) return;
  isPending.value = true;
  try {
    await signInWithGoogle();
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '登录失败，请稍后再试。');
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <ElDialog
    v-model="isOpen"
    class="login-modal"
    width="380px"
    :show-close="true"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    align-center
    aria-label="登录 Ref2Image Studio"
  >
    <template #header>
      <h2 class="login-modal__title">登录 Ref2Image Studio</h2>
    </template>
    <div class="login-modal__body">
      <p class="login-modal__hint">用 Google 账号登录后可生成图片，每日额度独立分配。</p>
      <button
        type="button"
        class="login-modal__google"
        :disabled="isPending"
        @click="handleGoogle"
      >
        <span class="login-modal__google-icon" aria-hidden="true">G</span>
        <span>{{ isPending ? '正在跳转…' : 'Continue with Google' }}</span>
      </button>
      <p class="login-modal__fineprint">登录即表示你同意以 Google 邮箱建立账号信息。</p>
    </div>
  </ElDialog>
</template>

<style scoped>
.login-modal__title {
  margin: 0;
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}

.login-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.login-modal__hint {
  margin: 0;
  color: oklch(45% 0.012 78deg);
  font-size: 13px;
  line-height: 1.55;
}

.login-modal__google {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  border: 1px solid oklch(24% 0.012 78deg / 0.12);
  border-radius: 12px;
  background: oklch(99% 0.004 88deg);
  color: var(--color-ink);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: background 120ms ease;
}

.login-modal__google:hover:not(:disabled) {
  background: oklch(97% 0.006 86deg);
}

.login-modal__google:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.login-modal__google-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4285f4, #ea4335 70%);
  color: #fff;
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 800;
}

.login-modal__fineprint {
  margin: 0;
  color: oklch(55% 0.01 78deg);
  font-size: 11px;
  text-align: center;
}
</style>
