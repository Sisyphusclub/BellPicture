<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import HistoryDetailPanel from '@/components/gallery/HistoryDetailPanel.vue';
import HistoryGrid from '@/components/gallery/HistoryGrid.vue';
import { useImageHistory } from '@/composables/useImageHistory';
import type { HistoryEntry } from '@/types/image';

const router = useRouter();
const { entries, isHydrating, hydrateError, refresh, remove } = useImageHistory();

const selectedEntry = ref<HistoryEntry | null>(null);
const selectedId = computed(() => selectedEntry.value?.record.id ?? null);

watch(
  entries,
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
  } catch (unknownError) {
    ElMessage.error(unknownError instanceof Error ? unknownError.message : '无法移除历史记录。');
  }
}

async function handleRefresh(): Promise<void> {
  await refresh();
}
</script>

<template>
  <section class="history-workspace">
    <header class="history-workspace__header">
      <div>
        <p class="section-kicker">本地历史</p>
        <h1 class="display-heading">浏览这个浏览器里的生成记录。</h1>
        <p>选择任意卡片查看大图、提示词、模型与下载操作；也可以把提示词带回生成工作区。</p>
      </div>
      <button
        type="button"
        class="claude-button claude-button--secondary"
        :disabled="isHydrating"
        @click="handleRefresh"
      >
        {{ isHydrating ? '正在刷新…' : '刷新历史' }}
      </button>
    </header>

    <p v-if="hydrateError" class="history-workspace__error" role="alert">
      {{ hydrateError.message }}
    </p>

    <div class="history-workspace__grid">
      <HistoryGrid :entries="entries" :selected-id="selectedId" @select="handleSelect" />
      <HistoryDetailPanel :entry="selectedEntry" @rerun="handleRerun" @remove="handleRemove" />
    </div>
  </section>
</template>

<style scoped>
.history-workspace {
  display: grid;
  gap: var(--space-lg);
  min-height: 100vh;
  padding: 96px var(--space-xl) var(--space-section);
}

.history-workspace__header {
  display: flex;
  width: min(100%, 1100px);
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-xl);
  margin: 0 auto;
}

.history-workspace__header .display-heading {
  max-width: 760px;
  font-size: clamp(38px, 5vw, 56px);
}

.history-workspace__header p:not(.section-kicker) {
  max-width: 700px;
  margin: var(--space-md) 0 0;
  color: var(--color-body-strong);
  font-size: 17px;
}

.history-workspace__error {
  width: min(100%, 1100px);
  margin: 0 auto;
  border: 1px solid rgba(198, 69, 69, 0.28);
  border-radius: var(--radius-md);
  background: rgba(198, 69, 69, 0.08);
  color: var(--color-error);
  padding: var(--space-sm) var(--space-md);
}

.history-workspace__grid {
  display: grid;
  width: min(100%, 1100px);
  grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
  gap: var(--space-lg);
  margin: 0 auto;
  align-items: start;
}

@media (max-width: 1080px) {
  .history-workspace__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .history-workspace {
    padding-top: var(--space-xl);
  }
}

@media (max-width: 640px) {
  .history-workspace {
    padding-right: var(--space-md);
    padding-left: var(--space-md);
  }

  .history-workspace__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
