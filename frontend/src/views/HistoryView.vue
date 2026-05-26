<script setup lang="ts">
import { ElConfigProvider, ElDatePicker, ElMessage } from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useRouter } from 'vue-router';

import HistoryDetailPanel from '@/components/gallery/HistoryDetailPanel.vue';
import HistoryGrid from '@/components/gallery/HistoryGrid.vue';
import { useImageHistory } from '@/composables/useImageHistory';
import type { HistoryEntry } from '@/types/image';

type DateRange = [string, string];

const router = useRouter();
const { entries, isHydrating, hydrateError, refresh, remove } = useImageHistory();

const HistoryConfigProvider: Component = ElConfigProvider;
const HistoryDateRangePicker: Component = ElDatePicker;

const datePickerProps = {
  type: 'daterange',
  format: 'YYYY/MM/DD',
  valueFormat: 'YYYY-MM-DD',
  rangeSeparator: '—',
  startPlaceholder: '起始日期',
  endPlaceholder: '结束日期',
  popperClass: 'history-date-range-popper',
  unlinkPanels: true,
} as const;

const selectedEntry = ref<HistoryEntry | null>(null);
const isDetailImageExpanded = ref(false);
const historyModalCloseRef = ref<HTMLButtonElement | null>(null);
const selectedDateRange = ref<DateRange | null>(null);
const appliedStartDate = ref('');
const appliedEndDate = ref('');

const filteredEntries = computed(() => {
  const startMs = appliedStartDate.value ? Date.parse(`${appliedStartDate.value}T00:00:00`) : null;
  const endMs = appliedEndDate.value ? Date.parse(`${appliedEndDate.value}T23:59:59.999`) : null;
  return entries.value.filter((entry) => {
    const ts = Date.parse(entry.record.createdAt);
    if (startMs !== null && ts < startMs) return false;
    if (endMs !== null && ts > endMs) return false;
    return true;
  });
});

const totalLabel = computed(() => `共 ${filteredEntries.value.length} 张`);

watch(filteredEntries, (next) => {
  if (selectedEntry.value && !next.some((e) => e.record.id === selectedEntry.value?.record.id)) {
    selectedEntry.value = null;
  }
});

watch(selectedEntry, (next, prev) => {
  if (next && !prev) {
    document.addEventListener('keydown', handleHistoryModalKeydown);
    void nextTick(() => {
      historyModalCloseRef.value?.focus();
    });
  } else if (!next && prev) {
    document.removeEventListener('keydown', handleHistoryModalKeydown);
    isDetailImageExpanded.value = false;
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleHistoryModalKeydown);
});

function handleSelect(entry: HistoryEntry): void {
  isDetailImageExpanded.value = false;
  selectedEntry.value = entry;
}

function handleExpand(entry: HistoryEntry): void {
  isDetailImageExpanded.value = true;
  selectedEntry.value = entry;
}

function handleCloseDetail(): void {
  isDetailImageExpanded.value = false;
  selectedEntry.value = null;
}

function handleHistoryModalKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  handleCloseDetail();
}

function handleQuery(): void {
  const [rangeStart = '', rangeEnd = ''] = selectedDateRange.value ?? [];
  appliedStartDate.value = rangeStart;
  appliedEndDate.value = rangeEnd;
}

function handleClearFilters(): void {
  selectedDateRange.value = null;
  appliedStartDate.value = '';
  appliedEndDate.value = '';
}

function handleRerun(entry: HistoryEntry): void {
  void router.push({
    path: '/generate',
    query: { prompt: entry.record.prompt },
  });
  handleCloseDetail();
}

async function handleRemove(entry: HistoryEntry): Promise<void> {
  try {
    await remove(entry.record.id);
    handleCloseDetail();
    ElMessage.success('历史记录已移除。');
  } catch {
    ElMessage.error('无法移除历史记录，请稍后重试。');
  }
}

async function handleRefresh(): Promise<void> {
  await refresh();
}

function handleDetailExpandedChange(expanded: boolean): void {
  isDetailImageExpanded.value = expanded;
}

async function handleCopyId(entry: HistoryEntry): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    ElMessage.error('当前浏览器不支持自动复制。');
    return;
  }
  try {
    await clipboard.writeText(entry.record.id);
    ElMessage.success('图片编号已复制。');
  } catch {
    ElMessage.error('复制失败。');
  }
}
</script>

<template>
  <section class="history-page">
    <header class="history-page__header">
      <div class="history-page__title-block">
        <p class="history-page__kicker">IMAGES</p>
        <h1 class="history-page__title">图片管理</h1>
      </div>
      <form class="history-page__filters" @submit.prevent="handleQuery">
        <div class="history-filter text-field" role="group" aria-label="历史日期范围筛选">
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
          @click="handleClearFilters"
        >
          清除筛选条件
        </button>
        <button type="submit" class="history-btn claude-button claude-button--primary">
          <svg
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
          查询
        </button>
      </form>
    </header>

    <p v-if="hydrateError" class="history-page__error" role="alert">
      {{ hydrateError.message }}
    </p>

    <section class="history-card surface-panel">
      <div class="history-card__top">
        <span class="history-card__count">
          <svg
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
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {{ totalLabel }}
        </span>
        <button
          type="button"
          class="history-btn claude-button claude-button--secondary"
          :disabled="isHydrating"
          @click="handleRefresh"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          {{ isHydrating ? '正在刷新…' : '刷新' }}
        </button>
      </div>

      <HistoryGrid
        :entries="filteredEntries"
        @select="handleSelect"
        @expand="handleExpand"
        @remove="handleRemove"
        @copy-id="handleCopyId"
      />
    </section>

    <div v-if="selectedEntry" class="history-modal" @click.self="handleCloseDetail">
      <div
        class="history-modal__panel popup-panel"
        :class="{ 'history-modal__panel--expanded': isDetailImageExpanded }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="
          isDetailImageExpanded ? 'history-detail-expanded-title' : 'history-detail-title'
        "
        tabindex="-1"
      >
        <button
          ref="historyModalCloseRef"
          type="button"
          class="history-modal__close icon-button"
          :aria-label="isDetailImageExpanded ? '关闭历史图片放大预览' : '关闭历史详情'"
          @click="handleCloseDetail"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <HistoryDetailPanel
          :entry="selectedEntry"
          :initial-expanded="isDetailImageExpanded"
          @rerun="handleRerun"
          @remove="handleRemove"
          @expanded-change="handleDetailExpandedChange"
        />
      </div>
    </div>
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
  padding: var(--space-section) 40px var(--space-section);
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
  flex-direction: column;
  gap: 6px;
}

.history-page__kicker {
  margin: 0;
  color: var(--color-body-strong);
  font-size: var(--text-caption-size);
  font-weight: var(--font-weight-label);
  letter-spacing: 0.22em;
}

.history-page__title {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: var(--text-page-title-size);
  font-weight: var(--font-weight-title);
  letter-spacing: -0.035em;
  line-height: 1.08;
}

.history-page__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

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

.history-filter:focus-within {
  border-color: var(--field-border-focus);
  box-shadow: var(--field-focus-ring);
}

.history-filter__icon {
  flex: 0 0 auto;
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
  padding: var(--space-md) var(--space-md) var(--space-lg);
  box-shadow: none;
}

.history-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.history-card__count {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 600;
}

.history-modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: var(--color-overlay-backdrop);
  padding: var(--space-lg);
}

.history-modal__panel {
  position: relative;
  display: flex;
  width: min(720px, 100%);
  max-height: calc(100vh - 96px);
  flex-direction: column;
  overflow: hidden;
}

.history-modal__panel--expanded {
  width: min(1120px, 100%);
  height: min(760px, calc(100vh - 96px));
  max-height: calc(100vh - 96px);
}

.history-modal__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 32px;
  height: 32px;
}

@media (max-width: 860px) {
  .history-page {
    padding: var(--space-lg) var(--space-md) var(--space-xl);
  }

  .history-modal {
    padding: 14px;
  }

  .history-modal__panel {
    max-height: calc(100vh - 28px);
  }

  .history-page__header {
    flex-direction: column;
    align-items: stretch;
  }

  .history-page__filters {
    flex-direction: column;
    align-items: stretch;
  }

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

  .history-modal__panel--expanded {
    height: calc(100vh - 28px);
    max-height: calc(100vh - 28px);
  }
}
</style>
