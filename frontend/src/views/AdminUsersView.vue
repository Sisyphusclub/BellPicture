<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';

import { useAdminUsers } from '@/composables/useAdminUsers';
import { useAuth } from '@/composables/useAuth';
import type { AdminUser } from '@/types/admin';

const { users, isLoading, refresh, createUser, updateQuota, removeUser } = useAdminUsers();
const { user: currentUser, isAdmin } = useAuth();

const newUsername = ref('');
const newPassword = ref('');
const newDailyTotal = ref(20);
const isCreating = ref(false);
const editingQuota = ref<Record<string, number>>({});
const savingQuotaUserId = ref<string | null>(null);
const deletingUserId = ref<string | null>(null);

const canCreate = computed(
  () =>
    newUsername.value.trim().length > 0 &&
    newPassword.value.length >= 8 &&
    Number.isInteger(newDailyTotal.value) &&
    newDailyTotal.value >= 0,
);

watch(
  isAdmin,
  (canManage) => {
    if (!canManage) return;
    void refresh().catch((err) => {
      ElMessage.error(err instanceof Error ? err.message : '用户列表加载失败，请稍后再试。');
    });
  },
  { immediate: true },
);

function displayUserName(user: AdminUser): string {
  return user.username ?? user.name;
}

function createdAtLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function quotaInputValue(user: AdminUser): number {
  return editingQuota.value[user.id] ?? user.quota.total;
}

function quotaInputId(user: AdminUser): string {
  return `admin-quota-${user.id}`;
}

function setQuotaInputValue(userId: string, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const parsed = Number.parseInt(target.value, 10);
  editingQuota.value = {
    ...editingQuota.value,
    [userId]: Number.isFinite(parsed) ? parsed : 0,
  };
}

async function handleCreate(): Promise<void> {
  if (!canCreate.value || isCreating.value) return;
  isCreating.value = true;
  try {
    await createUser({
      username: newUsername.value.trim(),
      password: newPassword.value,
      dailyTotal: newDailyTotal.value,
    });
    newUsername.value = '';
    newPassword.value = '';
    newDailyTotal.value = 20;
    ElMessage.success('用户已创建。');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '创建用户失败，请稍后再试。');
  } finally {
    isCreating.value = false;
  }
}

async function handleUpdateQuota(target: AdminUser): Promise<void> {
  if (savingQuotaUserId.value) return;
  const dailyTotal = quotaInputValue(target);
  savingQuotaUserId.value = target.id;
  try {
    await updateQuota(target.id, dailyTotal);
    const nextEditing = { ...editingQuota.value };
    delete nextEditing[target.id];
    editingQuota.value = nextEditing;
    ElMessage.success('额度已更新。');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '更新额度失败，请稍后再试。');
  } finally {
    savingQuotaUserId.value = null;
  }
}

async function handleDelete(target: AdminUser): Promise<void> {
  if (deletingUserId.value || target.id === currentUser.value?.id || target.isAdmin) return;
  deletingUserId.value = target.id;
  try {
    await removeUser(target.id);
    ElMessage.success('用户已删除。');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除用户失败，请稍后再试。');
  } finally {
    deletingUserId.value = null;
  }
}
</script>

<template>
  <section class="admin-users" aria-labelledby="admin-users-title">
    <header class="admin-users__hero">
      <div class="admin-users__hero-copy">
        <p class="admin-users__eyebrow">REF2IMAGE 管理</p>
        <h1 id="admin-users-title">用户管理</h1>
        <p>集中创建成员、调整每日额度，并保护管理员账号。</p>
      </div>
      <div class="admin-users__hero-notes" aria-label="管理规则">
        <span>仅管理员可见</span>
        <span>额度按天结算</span>
        <span>管理员账号受保护</span>
      </div>
    </header>

    <div v-if="!isAdmin" class="admin-users__forbidden" role="status">
      <p class="admin-users__state-kicker">权限提示</p>
      <h2>无权访问</h2>
      <p>只有管理员账号可以查看和管理用户。请切换到管理员账号后再进入此工作台。</p>
    </div>

    <form v-else class="admin-users__create" aria-label="创建新用户" @submit.prevent="handleCreate">
      <div class="admin-users__create-intro">
        <span class="admin-users__create-icon" aria-hidden="true">＋</span>
        <span class="admin-users__create-copy">
          <strong>创建用户</strong>
          <small>为新成员准备用户名、初始密码和每日生图额度。</small>
        </span>
      </div>
      <label for="admin-new-username">
        <span>用户名</span>
        <input
          id="admin-new-username"
          v-model="newUsername"
          name="username"
          type="text"
          autocomplete="username"
          placeholder="例如 new_user"
        />
      </label>
      <label for="admin-new-password">
        <span>初始密码</span>
        <input
          id="admin-new-password"
          v-model="newPassword"
          name="password"
          type="password"
          autocomplete="new-password"
          placeholder="至少 8 个字符"
        />
      </label>
      <label for="admin-new-daily-total">
        <span>每日额度</span>
        <input
          id="admin-new-daily-total"
          v-model.number="newDailyTotal"
          name="dailyTotal"
          type="number"
          min="0"
          max="10000"
          step="1"
        />
      </label>
      <button class="admin-users__create-submit" type="submit" :disabled="!canCreate || isCreating">
        {{ isCreating ? '正在创建…' : '创建用户' }}
      </button>
    </form>

    <div v-if="isAdmin" class="admin-users__panel">
      <div class="admin-users__panel-header">
        <div>
          <p class="admin-users__panel-kicker">用户与额度</p>
          <h2>账号列表</h2>
          <p>查看账号信息、今日额度消耗，并在同一个安静的管理台中完成调整。</p>
        </div>
        <button class="admin-users__refresh" type="button" :disabled="isLoading" @click="refresh">
          <span aria-hidden="true">↻</span>
          {{ isLoading ? '刷新中…' : '刷新' }}
        </button>
      </div>

      <p v-if="users.length === 0 && !isLoading" class="admin-users__empty">暂无用户。可以先从上方创建一个新账号。</p>

      <div v-else class="admin-users__table" role="table" aria-label="用户额度列表">
        <div class="admin-users__row admin-users__row--head" role="row">
          <span role="columnheader">用户</span>
          <span role="columnheader">创建时间</span>
          <span role="columnheader">今日额度</span>
          <span role="columnheader">操作</span>
        </div>
        <article v-for="item in users" :key="item.id" class="admin-users__row" role="row">
          <div class="admin-users__identity" role="cell">
            <span class="admin-users__avatar" aria-hidden="true">
              {{ displayUserName(item).slice(0, 1).toUpperCase() }}
            </span>
            <span class="admin-users__user-copy">
              <span class="admin-users__user-title">
                <strong>{{ displayUserName(item) }}</strong>
                <em v-if="item.isAdmin">管理员</em>
                <em v-else class="admin-users__badge--muted">普通用户</em>
              </span>
              <small>{{ item.email }}</small>
            </span>
          </div>
          <time role="cell" :datetime="item.createdAt">{{ createdAtLabel(item.createdAt) }}</time>
          <div class="admin-users__quota" role="cell">
            <label :for="quotaInputId(item)" :aria-label="`设置 ${displayUserName(item)} 的每日额度`">
              <input
                :id="quotaInputId(item)"
                :name="`quota-${item.id}`"
                type="number"
                min="0"
                max="10000"
                step="1"
                :value="quotaInputValue(item)"
                @input="setQuotaInputValue(item.id, $event)"
              />
            </label>
            <span>已用 {{ item.quota.usedToday }}，剩余 {{ item.quota.remainingToday }}</span>
            <small>当前每日上限 {{ item.quota.total }} 张</small>
          </div>
          <div class="admin-users__actions" role="cell">
            <button
              type="button"
              :disabled="savingQuotaUserId === item.id"
              @click="handleUpdateQuota(item)"
            >
              {{ savingQuotaUserId === item.id ? '保存中…' : '保存额度' }}
            </button>
            <button
              type="button"
              class="admin-users__danger"
              :disabled="item.isAdmin || item.id === currentUser?.id || deletingUserId === item.id"
              :aria-label="`删除用户 ${displayUserName(item)}`"
              @click="handleDelete(item)"
            >
              {{ deletingUserId === item.id ? '删除中…' : '删除' }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-users {
  display: flex;
  width: min(100%, var(--content-width));
  min-height: calc(100vh - var(--topbar-height));
  flex-direction: column;
  gap: var(--space-xl);
  margin: 0 auto;
  padding: 72px 40px var(--space-section);
}

.admin-users__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.admin-users__hero-copy {
  display: flex;
  max-width: 620px;
  flex-direction: column;
  gap: 8px;
}

.admin-users__eyebrow,
.admin-users__panel-kicker,
.admin-users__state-kicker {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-caption-size);
  font-weight: var(--font-weight-label);
  letter-spacing: 0.2em;
}

.admin-users__hero h1 {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: clamp(34px, 4.2vw, 56px);
  font-weight: var(--font-weight-title);
  letter-spacing: -0.035em;
  line-height: 1.04;
}

.admin-users__hero p:last-child {
  max-width: 560px;
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-body-sm-size);
  line-height: 1.7;
}

.admin-users__hero-notes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.admin-users__hero-notes span {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border: 0;
  border-radius: var(--radius-pill);
  background: oklch(95% 0.006 88deg / 0.72);
  color: var(--color-body);
  font-size: 12px;
  font-weight: 700;
  padding: 0 9px;
}

.admin-users__create,
.admin-users__forbidden {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  background: var(--color-surface-card-solid);
  box-shadow: none;
}

.admin-users__create {
  display: grid;
  grid-template-columns: minmax(210px, 1.05fr) minmax(150px, 0.9fr) minmax(170px, 1fr) 132px auto;
  align-items: end;
  gap: 14px;
  padding: 18px;
}

.admin-users__create-intro {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  align-self: center;
  padding-right: 6px;
}

.admin-users__create-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 20px;
  line-height: 1;
}

.admin-users__create-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.admin-users__create-copy strong {
  color: var(--color-ink);
  font-size: 15px;
  line-height: 1.2;
}

.admin-users__create-copy small {
  color: var(--color-muted);
  font-size: var(--text-caption-size);
  line-height: 1.5;
}

.admin-users__create label,
.admin-users__quota label {
  display: grid;
  gap: 7px;
}

.admin-users__create label > span {
  color: var(--color-body-strong);
  font-size: var(--text-caption-size);
  font-weight: var(--font-weight-label);
}

.admin-users input {
  min-height: var(--control-height-lg);
  border: 1px solid var(--field-border);
  border-radius: 16px;
  background: var(--field-background);
  color: var(--field-foreground);
  font: inherit;
  outline: none;
  padding: 0 14px;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
}

.admin-users input:hover {
  border-color: var(--field-border-hover);
  background: var(--field-background-hover);
}

.admin-users input:focus,
.admin-users input:focus-visible {
  border-color: var(--field-border-focus);
  box-shadow: var(--field-focus-ring);
}

.admin-users input::placeholder {
  color: var(--field-placeholder);
}

.admin-users button {
  display: inline-flex;
  min-height: var(--control-height-lg);
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: var(--color-on-primary);
  cursor: pointer;
  font-size: var(--text-body-sm-size);
  font-weight: 800;
  line-height: 1;
  padding: 0 18px;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease,
    opacity 140ms ease,
    transform 140ms ease;
}

.admin-users button:not(:disabled):hover {
  background: var(--color-primary-active);
  transform: translateY(-1px);
}

.admin-users button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.admin-users button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.admin-users__create-submit {
  align-self: end;
  white-space: nowrap;
}

.admin-users__forbidden {
  display: grid;
  gap: 10px;
  max-width: 680px;
  padding: 26px 28px 28px;
}

.admin-users__forbidden h2 {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: -0.025em;
}

.admin-users__forbidden p {
  margin: 0;
  color: var(--color-muted);
  line-height: 1.75;
}

.admin-users__panel {
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  background: var(--color-surface-card-solid);
  box-shadow: none;
}

.admin-users__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--color-hairline-soft);
  background: transparent;
  padding: 26px 28px 22px;
}

.admin-users__panel-header h2 {
  margin: 6px 0 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 28px;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.admin-users__panel-header p:last-child {
  max-width: 560px;
  margin: 10px 0 0;
  color: var(--color-muted);
  font-size: var(--text-body-sm-size);
  line-height: 1.7;
}

.admin-users__refresh,
.admin-users__actions button {
  background: var(--button-secondary-bg);
  color: var(--button-secondary-fg);
  box-shadow: none;
}

.admin-users__refresh:not(:disabled):hover,
.admin-users__actions button:not(:disabled):hover {
  background: var(--button-secondary-bg-hover);
  transform: translateY(-1px);
}

.admin-users__empty {
  margin: 0;
  color: var(--color-muted);
  padding: 52px 30px;
  text-align: center;
}

.admin-users__table {
  display: grid;
}

.admin-users__row {
  display: grid;
  grid-template-columns:
    minmax(230px, 1.36fr) minmax(170px, 0.88fr) minmax(250px, 1.08fr)
    minmax(190px, auto);
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--color-hairline-soft);
  padding: 20px 30px;
  transition: background-color 140ms ease;
}

.admin-users__row:not(.admin-users__row--head):hover {
  background: var(--color-surface-soft);
}

.admin-users__row:last-child {
  border-bottom: 0;
}

.admin-users__row--head {
  min-height: 44px;
  background: transparent;
  color: var(--color-muted-soft);
  font-size: var(--text-caption-size);
  font-weight: 900;
  letter-spacing: 0.08em;
  padding-top: 14px;
  padding-bottom: 10px;
}

.admin-users__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
}

.admin-users__avatar {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--color-hairline-soft);
  border-radius: 15px;
  background: var(--color-chip);
  color: var(--color-body-strong);
  font-weight: 900;
}

.admin-users__user-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.admin-users__user-title {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.admin-users__row strong {
  overflow: hidden;
  color: var(--color-ink);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-users__row small {
  display: block;
  color: var(--color-muted);
  font-size: var(--text-caption-size);
  word-break: break-all;
}

.admin-users__row em {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 11px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: 0.02em;
  padding: 0 9px;
}

.admin-users__row .admin-users__badge--muted {
  background: var(--color-chip);
  color: var(--color-body-strong);
}

.admin-users__row time {
  color: var(--color-body);
  font-size: var(--text-body-sm-size);
  font-variant-numeric: tabular-nums;
}

.admin-users__quota {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 4px 12px;
}

.admin-users__quota label {
  grid-row: 1 / span 2;
}

.admin-users__quota input {
  width: 112px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.admin-users__quota span {
  color: var(--color-body-strong);
  font-size: var(--text-label-size);
  font-weight: 800;
}

.admin-users__quota small {
  color: var(--color-muted);
  font-size: var(--text-caption-size);
}

.admin-users__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.admin-users__actions button {
  min-height: 36px;
  font-size: var(--text-label-size);
  padding: 0 14px;
}

.admin-users__actions .admin-users__danger {
  border-color: oklch(55% 0.17 28deg / 0.28);
  background: transparent;
  color: var(--color-error);
}

.admin-users__actions .admin-users__danger:not(:disabled):hover {
  background: var(--color-error-soft);
  color: var(--color-error);
}

@media (max-width: 1160px) {
  .admin-users__create {
    grid-template-columns: minmax(210px, 1fr) minmax(160px, 1fr) minmax(160px, 1fr);
  }

  .admin-users__create-submit {
    grid-column: 3;
  }

  .admin-users__row {
    grid-template-columns: minmax(220px, 1.2fr) minmax(150px, 0.8fr) minmax(220px, 1fr);
  }

  .admin-users__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 860px) {
  .admin-users {
    width: min(100%, 760px);
    padding: var(--space-lg) var(--space-md) var(--space-xl);
  }

  .admin-users__hero {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-users__create {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .admin-users__create-submit {
    grid-column: auto;
  }

  .admin-users__panel {
    border-radius: 28px;
  }

  .admin-users__panel-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 24px 20px 20px;
  }

  .admin-users__refresh {
    width: 100%;
  }

  .admin-users__row {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 18px 20px;
  }

  .admin-users__row--head {
    display: none;
  }

  .admin-users__quota {
    grid-template-columns: 1fr;
  }

  .admin-users__quota label {
    grid-row: auto;
  }

  .admin-users__quota input {
    width: 100%;
  }

  .admin-users__actions {
    justify-content: flex-start;
  }
}
</style>
