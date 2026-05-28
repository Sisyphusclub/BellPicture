<script setup lang="ts">
import { ElConfigProvider, ElDatePicker, ElMessage } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { computed, ref, type Component } from 'vue';

import HistoryGrid from '@/components/gallery/HistoryGrid.vue';
import RecentCreationDetailModal from '@/components/gallery/RecentCreationDetailModal.vue';
import { useImageHistory } from '@/composables/useImageHistory';
import type { HistoryEntry } from '@/types/image';

type DateRange = [string, string];

const { entries, hydrateError, remove } = useImageHistory();

const HistoryConfigProvider: Component = ElConfigProvider;
const HistoryDateRangePicker: Component = ElDatePicker;

const datePickerProps = {
  type: 'daterange',
  format: 'YYYY/MM/DD',
  valueFormat: 'YYYY-MM-DD',
  rangeSeparator: '至',
  startPlaceholder: '起始日期',
  endPlaceholder: '结束日期',
  popperClass: 'history-date-range-popper',
  unlinkPanels: true,
} as const;

const selectedPreviewEntry = ref<HistoryEntry | null>(null);
const selectedDateRange = ref<DateRange | null>(null);
const searchInput = ref('');
const appliedSearchQuery = ref('');
const appliedStartDate = ref('');
const appliedEndDate = ref('');

const normalizedSearchQuery = computed(() =>
  appliedSearchQuery.value.trim().toLocaleLowerCase('zh-CN'),
);

const filteredEntries = computed(() => {
  const startMs = appliedStartDate.value ? Date.parse(`${appliedStartDate.value}T00:00:00`) : null;
  const endMs = appliedEndDate.value ? Date.parse(`${appliedEndDate.value}T23:59:59.999`) : null;
  const query = normalizedSearchQuery.value;

  return entries.value.filter((entry) => {
    const ts = Date.parse(entry.record.createdAt);
    if (startMs !== null && ts < startMs) return false;
    if (endMs !== null && ts > endMs) return false;
    if (query && !assetSearchText(entry).includes(query)) return false;
    return true;
  });
});

const canClearFilters = computed(
  () =>
    searchInput.value.trim().length > 0 ||
    appliedSearchQuery.value.length > 0 ||
    selectedDateRange.value !== null ||
    appliedStartDate.value.length > 0 ||
    appliedEndDate.value.length > 0,
);
const appliedFilterChips = computed(() => {
  const chips: string[] = [];
  const query = appliedSearchQuery.value.trim();
  if (query) chips.push(`搜索：${query}`);
  if (appliedStartDate.value || appliedEndDate.value) {
    chips.push(`日期：${appliedStartDate.value || '不限'} 至 ${appliedEndDate.value || '不限'}`);
  }
  return chips;
});

function handleExpand(entry: HistoryEntry): void {
  selectedPreviewEntry.value = entry;
}

function handleClosePreview(): void {
  selectedPreviewEntry.value = null;
}

function handleQuery(): void {
  const [rangeStart = '', rangeEnd = ''] = selectedDateRange.value ?? [];
  appliedStartDate.value = rangeStart;
  appliedEndDate.value = rangeEnd;
  appliedSearchQuery.value = searchInput.value.trim();
}

function handleClearFilters(): void {
  selectedDateRange.value = null;
  searchInput.value = '';
  appliedSearchQuery.value = '';
  appliedStartDate.value = '';
  appliedEndDate.value = '';
}

function assetSearchText(entry: HistoryEntry): string {
  return [
    entry.record.prompt,
    entry.record.id,
    entry.record.batchId,
    entry.record.model,
    entry.record.aspectRatio,
    entry.record.isPublic ? '已发布 公开' : '未发布 私密',
  ]
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .join(' ')
    .toLocaleLowerCase('zh-CN');
}

async function handleRemove(entry: HistoryEntry): Promise<void> {
  try {
    await remove(entry.record.id);
    if (selectedPreviewEntry.value?.record.id === entry.record.id) {
      selectedPreviewEntry.value = null;
    }
    ElMessage.success('资产已移除。');
  } catch {
    ElMessage.error('无法移除资产，请稍后重试。');
  }
}

async function handleCopyPrompt(entry: HistoryEntry): Promise<void> {
  await copyText(entry.record.prompt, '提示词已复制。');
}

async function copyText(text: string, successMessage: string): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    ElMessage.error('当前浏览器不支持自动复制。');
    return;
  }
  try {
    await clipboard.writeText(text);
    ElMessage.success(successMessage);
  } catch {
    ElMessage.error('复制失败。');
  }
}
</script>

<template>
  <section class="history-page">
    <header class="history-page__header">
      <div class="history-page__title-block">
        <p class="history-page__kicker">ASSETS</p>
        <h1 class="history-page__title">个人资产</h1>
        <p class="history-page__lede">按时间整理你的生成作品，快速检索、预览与复用提示词。</p>
      </div>
    </header>

    <section class="asset-console" aria-label="资产筛选">
      <form class="history-page__filters" @submit.prevent="handleQuery">
        <label class="history-search text-field" aria-label="搜索资产">
          <svg
            class="history-filter__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            v-model="searchInput"
            type="search"
            name="assetSearch"
            placeholder="搜索提示词、编号或状态"
            aria-label="搜索资产"
          />
        </label>
        <div class="history-filter text-field" role="group" aria-label="资产日期范围筛选">
          <svg
            class="history-filter__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <component :is="HistoryConfigProvider" :locale="zhCn">
            <component
              :is="HistoryDateRangePicker"
              v-model="selectedDateRange"
              class="history-date-range"
              v-bind="datePickerProps"
              aria-label="历史日期范围"
            />
          </component>
        </div>
        <button
          type="button"
          class="history-btn claude-button claude-button--secondary"
          :disabled="!canClearFilters"
          @click="handleClearFilters"
        >
          清除筛选
        </button>
        <button type="submit" class="history-btn claude-button claude-button--primary">
          查询
        </button>
      </form>
      <div v-if="appliedFilterChips.length > 0" class="asset-filter-chips" aria-label="已应用筛选">
        <span v-for="chip in appliedFilterChips" :key="chip">{{ chip }}</span>
      </div>
    </section>

    <p v-if="hydrateError" class="history-page__error" role="alert">
      {{ hydrateError.message }}
    </p>

    <section class="history-card" aria-label="个人资产列表">
      <HistoryGrid
        :entries="filteredEntries"
        @expand="handleExpand"
        @remove="handleRemove"
      />
    </section>

    <RecentCreationDetailModal
      :entry="selectedPreviewEntry"
      @close="handleClosePreview"
      @copy-prompt="handleCopyPrompt"
    />
  </section>
</template>

<style scoped>
.history-page {
  display: flex;
  width: min(100%, var(--content-width));
  min-height: calc(100vh - var(--topbar-height));
  flex-direction: column;
  gap: var(--space-xl);
  margin: 0 auto;
  padding: 72px 40px var(--space-section);
}

.history-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.history-page__title-block {
  display: flex;
  max-width: 620px;
  flex-direction: column;
  gap: 8px;
}

.history-page__kicker {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-caption-size);
  font-weight: var(--font-weight-label);
  letter-spacing: 0.2em;
}

.history-page__title {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: clamp(34px, 4.2vw, 56px);
  font-weight: var(--font-weight-title);
  letter-spacing: -0.035em;
  line-height: 1.04;
}

.history-page__lede {
  max-width: 560px;
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-body-sm-size);
  line-height: 1.7;
}
.asset-console {
  display: grid;
  gap: var(--space-md);
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.history-page__filters {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto auto;
  align-items: center;
  gap: 10px;
}

.history-search,
.history-filter {
  display: inline-flex;
  width: auto;
  height: var(--control-height-lg);
  min-width: 0;
  align-items: center;
  gap: var(--space-xs);
  padding: 0 var(--space-sm);
  color: var(--color-muted);
  font-size: var(--text-body-sm-size);
}

.history-search:focus-within,
.history-filter:focus-within {
  border-color: var(--field-border-focus);
  box-shadow: var(--field-focus-ring);
}

.history-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  outline: none;
}

.history-search input::placeholder {
  color: var(--color-muted-soft);
}

.history-filter__icon {
  flex: 0 0 auto;
}

.asset-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.asset-filter-chips span {
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

.history-filter :deep(.history-date-range) {
  --el-input-bg-color: transparent;
  --el-input-border-color: transparent;
  --el-input-hover-border-color: transparent;
  --el-input-focus-border-color: transparent;
  --el-input-text-color: var(--field-foreground);
  --el-text-color-placeholder: var(--field-placeholder);
  --el-input-icon-color: var(--color-muted);

  width: 286px;
  min-width: 0;
  max-width: 100%;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--color-ink);
  font: inherit;
}

.history-filter :deep(.history-date-range.el-input__wrapper),
.history-filter :deep(.history-date-range.el-range-editor) {
  box-shadow: none;
}

.history-filter :deep(.history-date-range .el-range-input) {
  background: transparent;
  color: var(--color-ink);
  font: inherit;
}

.history-filter :deep(.history-date-range .el-range-input::placeholder) {
  color: var(--color-muted-soft);
}

.history-filter :deep(.history-date-range .el-range-separator) {
  flex: 0 0 auto;
  padding: 0 6px;
  color: var(--color-muted);
  line-height: 1;
}

.history-filter :deep(.history-date-range .el-range__icon) {
  display: none;
}

.history-filter :deep(.history-date-range .el-range__close-icon) {
  color: var(--color-muted);
}

:global(.history-date-range-popper.el-popper) {
  --el-bg-color-overlay: var(--color-surface-card-solid);
  --el-border-color-light: var(--color-hairline);
  --el-datepicker-active-color: var(--color-primary);
  --el-datepicker-hover-text-color: var(--color-accent-active);
  --el-datepicker-inrange-bg-color: var(--color-accent-soft);
  --el-datepicker-inrange-hover-bg-color: var(--color-chip-strong);
  --el-text-color-primary: var(--color-ink);
  --el-text-color-regular: var(--color-body);
  --el-text-color-placeholder: var(--color-muted-soft);

  border: 1px solid var(--color-hairline) !important;
  border-radius: var(--radius-sm);
  background: var(--color-surface-card-solid);
  box-shadow: none !important;
  filter: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

:global(.history-date-range-popper .el-popper__arrow) {
  display: none;
}

:global(.history-date-range-popper .el-picker-panel) {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-body);
  box-shadow: none;
}

:global(.history-date-range-popper .el-date-range-picker) {
  width: min(646px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
}

:global(.history-date-range-popper .el-picker-panel__body-wrapper),
:global(.history-date-range-popper .el-picker-panel__body),
:global(.history-date-range-popper .el-picker-panel__content) {
  background: transparent;
}

:global(.history-date-range-popper .el-date-range-picker__header),
:global(.history-date-range-popper .el-date-table th) {
  color: var(--color-muted);
}

:global(.history-date-range-popper .el-date-table td.in-range .el-date-table-cell) {
  background: var(--color-accent-soft);
}

:global(.history-date-range-popper .el-date-table td.today .el-date-table-cell__text) {
  color: var(--color-accent-active);
}

:global(.history-date-range-popper .el-date-table td.start-date .el-date-table-cell__text),
:global(.history-date-range-popper .el-date-table td.end-date .el-date-table-cell__text),
:global(
  .history-date-range-popper .el-date-table td.current:not(.disabled) .el-date-table-cell__text
) {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

:global(.history-date-range-popper .el-date-table-cell__text) {
  border-radius: calc(var(--radius-sm) - 4px);
}

@media (max-width: 720px) {
  :global(.history-date-range-popper.el-popper) {
    width: calc(100vw - 24px) !important;
    max-width: calc(100vw - 24px);
  }

  :global(.history-date-range-popper .el-date-range-picker) {
    width: 100%;
    max-width: 100%;
  }

  :global(.history-date-range-popper .el-picker-panel__body) {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  :global(.history-date-range-popper .el-date-range-picker__content) {
    display: block;
    width: 100%;
    padding: 12px;
  }

  :global(.history-date-range-popper .el-date-range-picker__content.is-left) {
    border-right: 0;
    border-bottom: 1px solid var(--color-hairline);
  }
}

.history-btn {
  min-height: var(--control-height-lg);
}

.history-page__error {
  margin: 0;
  border: 1px solid var(--color-error-soft);
  border-radius: var(--radius-sm);
  background: var(--color-error-soft);
  color: var(--color-error);
  padding: var(--space-sm) var(--space-md);
}

.history-card {
  display: grid;
  gap: var(--space-md);
  box-shadow: none;
}

@media (max-width: 860px) {
  .history-page {
    padding: var(--space-lg) var(--space-md) calc(112px + env(safe-area-inset-bottom));
  }

  .history-page__header {
    flex-direction: column;
    align-items: stretch;
  }

  .history-page__filters {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .history-search,
  .history-filter {
    width: 100%;
    height: auto;
    padding: 8px 12px;
  }

  .history-filter :deep(.history-date-range) {
    width: calc(100% - 24px);
  }

  .history-btn {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .history-page {
    gap: var(--space-lg);
    padding-right: 12px;
    padding-left: 12px;
  }

  .history-page__title {
    font-size: 32px;
  }

  .history-page__filters {
    gap: 8px;
  }

  .history-filter :deep(.history-date-range) {
    width: 100%;
  }

  .asset-filter-chips span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

</style>
