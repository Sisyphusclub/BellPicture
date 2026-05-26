<script setup lang="ts">
import { ElConfigProvider, ElDialog, ElInput, ElMessage } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { computed, ref, watch, type Component } from 'vue';

import { useAuth } from '@/composables/useAuth';
import { useAuthModal } from '@/composables/useAuthModal';

type Mode = 'sign-in' | 'sign-up';

const { isOpen, close } = useAuthModal();
const { isAuthenticated, signInWithUsername, signUpWithUsername } = useAuth();

const LoginConfigProvider: Component = ElConfigProvider;

const mode = ref<Mode>('sign-in');
const isPending = ref(false);
const MIN_PASSWORD_LENGTH = 8;

const signInUsername = ref('');
const signInPassword = ref('');

const signUpUsername = ref('');
const signUpPassword = ref('');

const canSubmitSignIn = computed(
  () => signInUsername.value.trim().length > 0 && signInPassword.value.length > 0,
);
const canSubmitSignUp = computed(
  () =>
    signUpUsername.value.trim().length > 0 && signUpPassword.value.length >= MIN_PASSWORD_LENGTH,
);

watch(isAuthenticated, (next) => {
  if (next && isOpen.value) close();
});

watch(isOpen, (next) => {
  if (!next) {
    // Reset form state when the modal closes so reopening starts clean.
    mode.value = 'sign-in';
    signInUsername.value = '';
    signInPassword.value = '';
    signUpUsername.value = '';
    signUpPassword.value = '';
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
    await signInWithUsername({
      username: signInUsername.value.trim(),
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
    await signUpWithUsername({
      username: signUpUsername.value.trim(),
      password: signUpPassword.value,
    });
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '注册失败，请稍后再试。');
  } finally {
    isPending.value = false;
  }
}
</script>

<template>
  <component :is="LoginConfigProvider" :locale="zhCn">
    <ElDialog
      v-model="isOpen"
      class="login-modal"
      width="380px"
      modal-class="login-modal__overlay"
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
            :class="['login-modal__tab', { 'login-modal__tab--active': mode === 'sign-in' }]"
            :tabindex="mode === 'sign-in' ? 0 : -1"
            @click="switchMode('sign-in')"
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'sign-up'"
            :class="['login-modal__tab', { 'login-modal__tab--active': mode === 'sign-up' }]"
            :tabindex="mode === 'sign-up' ? 0 : -1"
            @click="switchMode('sign-up')"
          >
            注册
          </button>
        </div>

        <form v-if="mode === 'sign-in'" class="login-modal__form" @submit.prevent="handleSignIn">
          <label class="login-modal__field">
            <span class="login-modal__label">用户名</span>
            <ElInput
              v-model="signInUsername"
              type="text"
              placeholder="输入用户名"
              autocomplete="username"
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
          <button type="submit" class="login-modal__submit" :disabled="isPending || !canSubmitSignIn">
            {{ isPending ? '正在登录…' : '登录' }}
          </button>
        </form>

        <form v-else class="login-modal__form" @submit.prevent="handleSignUp">
          <label class="login-modal__field">
            <span class="login-modal__label">用户名</span>
            <ElInput
              v-model="signUpUsername"
              type="text"
              placeholder="3-32 位小写字母、数字或下划线"
              autocomplete="username"
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
          <button type="submit" class="login-modal__submit" :disabled="isPending || !canSubmitSignUp">
            {{ isPending ? '正在注册…' : '注册' }}
          </button>
        </form>

        <p class="login-modal__fineprint">用户名提交时会自动转为小写，仅支持字母、数字和下划线。</p>
      </div>
    </ElDialog>
  </component>
</template>

<style scoped>
:global(.login-modal__overlay.el-overlay) {
  background-color: var(--color-overlay-backdrop);
}

:global(.login-modal.el-dialog) {
  --el-dialog-bg-color: var(--color-overlay);
  --el-dialog-border-radius: var(--radius-panel);
  --el-dialog-box-shadow: none;

  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-panel);
  background: var(--el-dialog-bg-color);
  box-shadow: none;
}

:global(.login-modal .el-dialog__header) {
  margin: 0;
  padding: 22px 24px 10px;
  border-bottom: 1px solid var(--color-hairline-soft);
}

:global(.login-modal .el-dialog__body) {
  padding: 18px 24px 22px;
  color: var(--color-body);
}

:global(.login-modal .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-overlay);
  box-shadow: none;
}

:global(.login-modal .el-dialog__headerbtn:focus-visible) {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
  box-shadow: none;
}

:global(.login-modal .el-dialog__headerbtn .el-dialog__close) {
  color: var(--color-body-strong);
}

:global(.login-modal .el-input) {
  --el-input-bg-color: transparent;
  --el-input-border-color: transparent;
  --el-input-hover-border-color: transparent;
  --el-input-focus-border-color: transparent;
  --el-input-text-color: var(--field-foreground);
  --el-input-placeholder-color: var(--field-placeholder);
}

:global(.login-modal .el-input__wrapper) {
  min-height: var(--control-height-lg);
  border: 1px solid var(--field-border);
  border-radius: var(--field-radius);
  background: var(--field-background);
  box-shadow: none;
}

:global(.login-modal .el-input__wrapper:hover) {
  border-color: var(--field-border-hover);
  box-shadow: none;
}

:global(.login-modal .el-input.is-focus .el-input__wrapper),
:global(.login-modal .el-input__wrapper.is-focus),
:global(.login-modal .el-input__wrapper:focus-within) {
  border-color: var(--field-border-focus);
  box-shadow: var(--field-focus-ring);
}

:global(.login-modal .el-input.is-disabled .el-input__wrapper) {
  background: var(--color-surface-tertiary);
  box-shadow: none;
}

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
  gap: var(--space-xxs);
  padding: var(--space-xxs);
  background: var(--color-surface-tertiary);
  border-radius: var(--radius-sm);
  box-shadow: none;
}

.login-modal__tab {
  appearance: none;
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: calc(var(--radius-sm) - 4px);
  box-shadow: none;
  font-size: var(--text-body-sm-size);
  font-weight: 700;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.login-modal__tab:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.login-modal__tab:hover:not(.login-modal__tab--active) {
  color: var(--color-ink);
}

.login-modal__tab--active {
  background: var(--color-overlay);
  box-shadow: none;
  color: var(--color-ink);
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
  color: var(--color-body-strong);
  font-size: var(--text-caption-size);
  font-weight: var(--font-weight-label);
}

.login-modal__submit {
  display: inline-flex;
  width: 100%;
  min-height: var(--control-height-lg);
  align-items: center;
  justify-content: center;
  margin-top: var(--space-xxs);
  border: none;
  border-radius: var(--control-radius);
  background: var(--color-accent);
  box-shadow: none;
  color: var(--color-on-accent);
  cursor: pointer;
  font-size: var(--text-body-sm-size);
  font-weight: 700;
  transition:
    background 120ms ease,
    opacity 120ms ease;
}

.login-modal__submit:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.login-modal__submit:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.login-modal__submit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.login-modal__fineprint {
  margin: 0;
  color: var(--color-muted);
  font-size: 11px;
  text-align: center;
}
</style>
