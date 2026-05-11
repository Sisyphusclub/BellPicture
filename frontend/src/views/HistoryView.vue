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
  <section class="history-hero">
    <div class="container history-hero__inner">
      <div>
        <p class="section-kicker">本地档案</p>
        <h1 class="display-heading">你的生成历史会保存在这个浏览器中。</h1>
        <p>
          元数据保存在 localStorage，生成图片保存在 IndexedDB；无需服务端账号，刷新后也能继续查看。
        </p>
      </div>
      <button
        type="button"
        class="claude-button claude-button--secondary"
        :disabled="isHydrating"
        @click="handleRefresh"
      >
        {{ isHydrating ? '正在刷新…' : '刷新历史' }}
      </button>
    </div>
  </section>

  <section class="history-section">
    <div class="container history-section__grid">
      <div class="history-section__main">
        <p v-if="hydrateError" class="history-section__error" role="alert">
          {{ hydrateError.message }}
        </p>
        <HistoryGrid :entries="entries" :selected-id="selectedId" @select="handleSelect" />
      </div>
      <HistoryDetailPanel :entry="selectedEntry" @rerun="handleRerun" @remove="handleRemove" />
    </div>
  </section>
</template>

<style scoped>
.history-hero {
  padding: var(--space-section) 0 var(--space-xxl);
}

.history-hero__inner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-xl);
}

.history-hero .display-heading {
  max-width: 760px;
  font-size: clamp(38px, 5vw, 58px);
}

.history-hero p:not(.section-kicker) {
  max-width: 700px;
  margin: var(--space-md) 0 0;
  color: var(--color-body-strong);
  font-size: 18px;
}

.history-section {
  padding-bottom: var(--space-section);
}

.history-section__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: var(--space-xl);
  align-items: start;
}

.history-section__main {
  display: grid;
  gap: var(--space-md);
}

.history-section__error {
  margin: 0;
  border-left: 4px solid var(--color-error);
  color: var(--color-error);
  padding-left: var(--space-sm);
}

@media (max-width: 920px) {
  .history-hero__inner,
  .history-section__grid {
    grid-template-columns: 1fr;
  }

  .history-hero__inner {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
