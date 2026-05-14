<script setup lang="ts">
import { ElDialog, ElInput, ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';

import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

type Mode = 'sign-in' | 'sign-up';

const { isOpen, close } = useAuthModal();
const { isAuthenticated, signInWithEmail, signUpWithEmail } = useAuth();

const mode = ref<Mode>('sign-in');
const isPending = ref(false);

const signInEmail = ref('');
const signInPassword = ref('');

const signUpEmail = ref('');
const signUpPassword = ref('');
const signUpName = ref('');

const canSubmitSignIn = computed(
  () => signInEmail.value.trim().length > 0 && signInPassword.value.length > 0,
);
const canSubmitSignUp = computed(
  () =>
    signUpEmail.value.trim().length > 0 &&
    signUpPassword.value.length > 0 &&
    signUpName.value.trim().length > 0,
);

watch(isAuthenticated, (next) => {
  if (next && isOpen.value) close();
});

watch(isOpen, (next) => {
  if (!next) {
    // Reset form state when the modal closes so reopening starts clean.
    mode.value = 'sign-in';
    signInEmail.value = '';
    signInPassword.value = '';
    signUpEmail.value = '';
    signUpPassword.value = '';
    signUpName.value = '';
    isPending.value = false;
  }
});

function switchMode(next: Mode): void {
  if (isPending.value) return;
  mode.value = next;
}

async function handleSignIn(): Promise<void> {
  if (isPending.value || !canSubmitSignIn.value) return;
  isPending.value = true;
  try {
    await signInWithEmail({
      email: signInEmail.value.trim(),
      password: signInPassword.value,
    });
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '登录失败，请稍后再试。');
  } finally {
    isPending.value = false;
  }
}

async function handleSignUp(): Promise<void> {
  if (isPending.value || !canSubmitSignUp.value) return;
  isPending.value = true;
  try {
    await signUpWithEmail({
      email: signUpEmail.value.trim(),
      password: signUpPassword.value,
      name: signUpName.value.trim(),
    });
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '注册失败，请稍后再试。');
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
      <h2 class="login-modal__title">Ref2Image Studio</h2>
    </template>
    <div class="login-modal__body">
      <div class="login-modal__tabs" role="tablist" aria-label="账号操作">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'sign-in'"
          :class="[
            'login-modal__tab',
            { 'login-modal__tab--active': mode === 'sign-in' },
          ]"
          :tabindex="mode === 'sign-in' ? 0 : -1"
          @click="switchMode('sign-in')"
        >
          登录
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'sign-up'"
          :class="[
            'login-modal__tab',
            { 'login-modal__tab--active': mode === 'sign-up' },
          ]"
          :tabindex="mode === 'sign-up' ? 0 : -1"
          @click="switchMode('sign-up')"
        >
          注册
        </button>
      </div>

      <form v-if="mode === 'sign-in'" class="login-modal__form" @submit.prevent="handleSignIn">
        <label class="login-modal__field">
          <span class="login-modal__label">邮箱</span>
          <ElInput
            v-model="signInEmail"
            type="email"
            placeholder="输入邮箱地址"
            autocomplete="email"
            :disabled="isPending"
          />
        </label>
        <label class="login-modal__field">
          <span class="login-modal__label">密码</span>
          <ElInput
            v-model="signInPassword"
            type="password"
            placeholder="输入密码"
            autocomplete="current-password"
            show-password
            :disabled="isPending"
          />
        </label>
        <button
          type="submit"
          class="login-modal__submit"
          :disabled="isPending || !canSubmitSignIn"
        >
          {{ isPending ? '正在登录…' : '登录' }}
        </button>
      </form>

      <form v-else class="login-modal__form" @submit.prevent="handleSignUp">
        <label class="login-modal__field">
          <span class="login-modal__label">邮箱</span>
          <ElInput
            v-model="signUpEmail"
            type="email"
            placeholder="输入邮箱地址"
            autocomplete="email"
            :disabled="isPending"
          />
        </label>
        <label class="login-modal__field">
          <span class="login-modal__label">密码</span>
          <ElInput
            v-model="signUpPassword"
            type="password"
            placeholder="输入密码（至少 8 个字符）"
            autocomplete="new-password"
            show-password
            :disabled="isPending"
          />
        </label>
        <label class="login-modal__field">
          <span class="login-modal__label">昵称</span>
          <ElInput
            v-model="signUpName"
            type="text"
            placeholder="输入昵称"
            autocomplete="nickname"
            :disabled="isPending"
          />
        </label>
        <button
          type="submit"
          class="login-modal__submit"
          :disabled="isPending || !canSubmitSignUp"
        >
          {{ isPending ? '正在注册…' : '注册' }}
        </button>
      </form>

      <p class="login-modal__fineprint">
        注册即表示同意以邮箱建立账号信息。
      </p>
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

.login-modal__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: oklch(96% 0.006 84deg);
  border-radius: 10px;
}

.login-modal__tab {
  appearance: none;
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: oklch(45% 0.012 78deg);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.login-modal__tab:hover:not(.login-modal__tab--active) {
  color: var(--color-ink);
}

.login-modal__tab--active {
  background: oklch(99% 0.004 88deg);
  color: var(--color-ink);
  box-shadow: 0 1px 2px oklch(24% 0.012 78deg / 0.06);
}

.login-modal__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login-modal__label {
  font-size: 12px;
  font-weight: 600;
  color: oklch(35% 0.012 78deg);
}

.login-modal__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  margin-top: 4px;
  border: none;
  border-radius: 12px;
  background: var(--color-accent, oklch(72% 0.16 38deg));
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: background 120ms ease, opacity 120ms ease;
}

.login-modal__submit:hover:not(:disabled) {
  opacity: 0.92;
}

.login-modal__submit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.login-modal__fineprint {
  margin: 0;
  color: oklch(55% 0.01 78deg);
  font-size: 11px;
  text-align: center;
}
</style>
