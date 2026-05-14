<script setup lang="ts">
import type { HistoryEntry } from '@/types/image';
import { formatBytes, formatFullDateTime } from '@/utils/format';

interface Props {
  entries: HistoryEntry[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', entry: HistoryEntry): void;
  (e: 'copy-id', entry: HistoryEntry): void;
}>();

function fileSizeLabel(entry: HistoryEntry): string {
  return entry.size === undefined ? '本地缓存' : formatBytes(entry.size);
}
</script>

<template>
  <div v-if="entries.length > 0" class="history-grid" aria-label="图片列表">
    <article v-for="entry in entries" :key="entry.record.id" class="history-tile">
      <button
        type="button"
        class="history-tile__thumb"
        :aria-label="`打开图片详情：${entry.record.prompt}`"
        @click="emit('select', entry)"
      >
        <img :src="entry.imageUrl" alt="生成历史图片预览" />
      </button>
      <div class="history-tile__meta">
        <div class="history-tile__row history-tile__row--top">
          <span class="history-tile__date">
            <svg
              width="14"
              height="14"
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
            {{ formatFullDateTime(entry.record.createdAt) }}
          </span>
          <button
            type="button"
            class="history-tile__copy"
            aria-label="复制图片编号"
            @click="emit('copy-id', entry)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
        <div class="history-tile__row history-tile__row--bottom">
          <span>{{ fileSizeLabel(entry) }}</span>
          <span>{{ entry.record.width }} x {{ entry.record.height }}</span>
        </div>
      </div>
    </article>
  </div>
  <div v-else class="history-empty">
    <p>暂无符合条件的图片。</p>
  </div>
</template>

<style scoped>
.history-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-md);
}

.history-tile {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-tile__thumb {
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid oklch(24% 0.012 78deg / 0.08);
  border-radius: 22px;
  background: linear-gradient(145deg, oklch(99% 0.004 88deg), oklch(94.8% 0.018 82deg));
  cursor: pointer;
  box-shadow: 0 10px 36px rgba(56, 49, 42, 0.08);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.history-tile__thumb:hover {
  box-shadow: 0 16px 44px rgba(56, 49, 42, 0.12);
  transform: translateY(-2px);
}

.history-tile__thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12%;
}

.history-tile__meta {
  display: grid;
  gap: 6px;
  padding: 0 4px;
}

.history-tile__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  color: var(--color-muted);
  font-size: 13px;
}

.history-tile__row--top {
  color: var(--color-body-strong);
  font-weight: 600;
}

.history-tile__date {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-tile__copy {
  display: inline-grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
}

.history-tile__copy:hover {
  background: var(--color-chip);
  color: var(--color-ink);
}

.history-empty {
  display: grid;
  min-height: 240px;
  place-items: center;
  color: var(--color-muted);
}

@media (max-width: 1180px) {
  .history-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .history-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
