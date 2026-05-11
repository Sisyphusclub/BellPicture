<script setup lang="ts">
import type { HistoryEntry } from '@/types/image';
import { formatDateTime } from '@/utils/format';

interface Props {
  entries: HistoryEntry[];
  selectedId?: string | null;
}

withDefaults(defineProps<Props>(), {
  selectedId: null,
});

const emit = defineEmits<{
  (e: 'select', entry: HistoryEntry): void;
}>();
</script>

<template>
  <div v-if="entries.length > 0" class="history-grid">
    <button
      v-for="entry in entries"
      :key="entry.record.id"
      type="button"
      class="history-card"
      :class="{ 'history-card--selected': entry.record.id === selectedId }"
      @click="emit('select', entry)"
    >
      <img :src="entry.imageUrl" alt="生成历史缩略图" />
      <span class="history-card__body">
        <span class="history-card__prompt">{{ entry.record.prompt }}</span>
        <span class="history-card__meta">
          {{ formatDateTime(entry.record.createdAt) }} · {{ entry.record.width }}×{{
            entry.record.height
          }}
        </span>
      </span>
    </button>
  </div>
  <div v-else class="history-empty">
    <span aria-hidden="true">✣</span>
    <h2>还没有历史记录</h2>
    <p>生成第一张图片后，它会在刷新后出现在这里。</p>
  </div>
</template>

<style scoped>
.history-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
}

.history-card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  background: var(--color-canvas);
  color: var(--color-body);
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.history-card--selected {
  border-color: var(--color-primary-active);
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.14);
}

.history-card img {
  width: 100%;
  aspect-ratio: 1;
  background: var(--color-surface-card);
  object-fit: cover;
}

.history-card__body {
  display: grid;
  gap: var(--space-xs);
  padding: var(--space-md);
}

.history-card__prompt {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-ink);
  font-weight: 500;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.history-card__meta {
  color: var(--color-muted);
  font-size: 13px;
}

.history-empty {
  display: grid;
  min-height: 380px;
  place-items: center;
  border-radius: var(--radius-lg);
  background: var(--color-surface-card);
  padding: var(--space-xl);
  text-align: center;
}

.history-empty span {
  color: var(--color-primary-active);
  font-size: 42px;
}

.history-empty h2 {
  margin: var(--space-sm) 0 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -0.03em;
}

.history-empty p {
  margin: var(--space-xs) 0 0;
  color: var(--color-muted);
}

@media (max-width: 1024px) {
  .history-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
