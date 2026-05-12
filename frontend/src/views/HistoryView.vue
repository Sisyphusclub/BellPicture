<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import HistoryDetailPanel from '@/components/gallery/HistoryDetailPanel.vue';
import HistoryGrid from '@/components/gallery/HistoryGrid.vue';
import { useImageHistory } from '@/composables/useImageHistory';
import type { HistoryEntry } from '@/types/image';
import { downloadUrl } from '@/utils/download';

const router = useRouter();
const { entries, isHydrating, hydrateError, refresh, remove } = useImageHistory();

type HistoryModeFilter = 'all' | 'text-to-image' | 'image-to-image';

const selectedEntry = ref<HistoryEntry | null>(null);
const searchText = ref('');
const appliedSearchText = ref('');
const modeFilter = ref<HistoryModeFilter>('all');
const appliedModeFilter = ref<HistoryModeFilter>('all');

const selectedId = computed(() => selectedEntry.value?.record.id ?? null);
const filteredEntries = computed(() => {
  const keyword = appliedSearchText.value.trim().toLocaleLowerCase('zh-CN');
  return entries.value.filter((entry) => {
    const matchesKeyword =
      keyword.length === 0 ||
      entry.record.prompt.toLocaleLowerCase('zh-CN').includes(keyword) ||
      entry.record.model.toLocaleLowerCase('zh-CN').includes(keyword) ||
      entry.record.id.toLocaleLowerCase('zh-CN').includes(keyword);
    const matchesMode =
      appliedModeFilter.value === 'all' ||
      (appliedModeFilter.value === 'image-to-image' && entry.record.referenceId !== undefined) ||
      (appliedModeFilter.value === 'text-to-image' && entry.record.referenceId === undefined);

    return matchesKeyword && matchesMode;
  });
});
const totalLabel = computed(() => {
  if (filteredEntries.value.length === entries.value.length) {
    return `共 ${entries.value.length} 张图片`;
  }
  return `共 ${filteredEntries.value.length} 张图片 / 全部 ${entries.value.length} 张`;
});

watch(
  filteredEntries,
  (nextEntries) => {
    if (
      selectedEntry.value &&
      nextEntries.some((entry) => entry.record.id === selectedEntry.value?.record.id)
    ) {
      return;
    }
    selectedEntry.value = nextEntries[0] ?? null;
  },
  { immediate: true },
);

function handleSelect(entry: HistoryEntry): void {
  selectedEntry.value = entry;
}

function handleQuery(): void {
  appliedSearchText.value = searchText.value;
  appliedModeFilter.value = modeFilter.value;
}

function handleClearFilters(): void {
  searchText.value = '';
  appliedSearchText.value = '';
  modeFilter.value = 'all';
  appliedModeFilter.value = 'all';
}

function handleRerun(entry: HistoryEntry): void {
  void router.push({
    path: '/',
    query: {
      prompt: entry.record.prompt,
    },
  });
}

async function handleRemove(entry: HistoryEntry): Promise<void> {
  try {
    await remove(entry.record.id);
    selectedEntry.value = null;
    ElMessage.success('历史记录已移除。');
  } catch {
    ElMessage.error('无法移除历史记录，请稍后重试。');
  }
}

async function handleRefresh(): Promise<void> {
  await refresh();
}

function handleDownload(entry: HistoryEntry): void {
  downloadUrl(entry.imageUrl, entry.record.id);
  ElMessage.success('下载已开始。');
}

async function handleCopyPrompt(entry: HistoryEntry): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    ElMessage.error('当前浏览器不支持自动复制，请手动复制提示词。');
    return;
  }

  try {
    await clipboard.writeText(entry.record.prompt);
    ElMessage.success('提示词已复制。');
  } catch {
    ElMessage.error('复制失败，请手动复制提示词。');
  }
}
</script>

<template>
  <section class="history-workspace">
    <header class="history-workspace__header">
      <div>
        <p class="section-kicker">本地图库</p>
        <h1 class="display-heading">图片管理</h1>
      </div>
      <p class="history-workspace__total" aria-live="polite">{{ totalLabel }}</p>
    </header>

    <form class="history-filters" aria-label="图片筛选" @submit.prevent="handleQuery">
      <label class="history-filters__search" for="history-search">
        <span>搜索</span>
        <input
          id="history-search"
          v-model="searchText"
          name="historySearch"
          type="search"
          placeholder="搜索提示词、模型或图片编号"
        />
      </label>

      <label class="history-filters__select" for="history-mode-filter">
        <span>类型</span>
        <select
          id="history-mode-filter"
          v-model="modeFilter"
          name="historyMode"
          aria-label="生成类型"
        >
          <option value="all">全部图片</option>
          <option value="text-to-image">提示词生成</option>
          <option value="image-to-image">参考图生成</option>
        </select>
      </label>

      <div class="history-filters__actions">
        <button
          type="button"
          class="claude-button claude-button--secondary"
          @click="handleClearFilters"
        >
          清空
        </button>
        <button type="submit" class="claude-button claude-button--primary">查询</button>
        <button
          type="button"
          class="claude-button claude-button--secondary"
          :disabled="isHydrating"
          @click="handleRefresh"
        >
          {{ isHydrating ? '正在刷新…' : '刷新' }}
        </button>
      </div>
    </form>

    <p v-if="hydrateError" class="history-workspace__error" role="alert">
      {{ hydrateError.message }}
    </p>

    <div class="history-workspace__grid">
      <HistoryGrid
        :entries="filteredEntries"
        :selected-id="selectedId"
        @select="handleSelect"
        @download="handleDownload"
        @copy-prompt="handleCopyPrompt"
      />
      <HistoryDetailPanel :entry="selectedEntry" @rerun="handleRerun" @remove="handleRemove" />
    </div>
  </section>
</template>

<style scoped>
.history-workspace {
  display: grid;
  gap: var(--space-lg);
  min-height: calc(100vh - var(--topbar-height));
  padding: var(--space-xl) var(--space-xl) var(--space-section);
}

.history-workspace__header,
.history-filters,
.history-workspace__error,
.history-workspace__grid {
  width: min(100%, 1240px);
  margin: 0 auto;
}

.history-workspace__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-xl);
}

.history-workspace__header .display-heading {
  font-size: clamp(36px, 5vw, 54px);
}

.history-workspace__total {
  margin: 0;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-glass-strong);
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 600;
  padding: 8px 14px;
}

.history-filters {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px auto;
  align-items: end;
  gap: var(--space-sm);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
  padding: var(--space-sm);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.history-filters__search,
.history-filters__select {
  display: grid;
  gap: var(--space-xxs);
}

.history-filters__search span,
.history-filters__select span {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
}

.history-filters input,
.history-filters select {
  min-height: 40px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card-solid);
  color: var(--color-ink);
  outline: none;
  padding: 9px 12px;
}

.history-filters input:focus,
.history-filters select:focus {
  border-color: var(--color-accent-active);
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.18);
}

.history-filters__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-xs);
}

.history-workspace__error {
  border: 1px solid rgba(198, 69, 69, 0.28);
  border-radius: var(--radius-sm);
  background: rgba(198, 69, 69, 0.08);
  color: var(--color-error);
  padding: var(--space-sm) var(--space-md);
}

.history-workspace__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
  gap: var(--space-lg);
  align-items: start;
}

@media (max-width: 1180px) {
  .history-workspace__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .history-workspace {
    padding: var(--space-lg) var(--space-md) var(--space-xl);
  }

  .history-workspace__header {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-md);
  }

  .history-filters {
    grid-template-columns: 1fr;
  }

  .history-filters__actions {
    justify-content: flex-start;
  }
}
</style>
