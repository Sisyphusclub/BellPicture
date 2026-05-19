<script setup lang="ts">
import type { HistoryEntry } from '@/types/image';
import { formatBytes, formatFullDateTime } from '@/utils/format';

interface Props {
  entries: HistoryEntry[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', entry: HistoryEntry): void;
  (e: 'expand', entry: HistoryEntry): void;
  (e: 'remove', entry: HistoryEntry): void;
  (e: 'copy-id', entry: HistoryEntry): void;
}>();

function fileSizeLabel(entry: HistoryEntry): string {
  return entry.size === undefined ? '本地缓存' : formatBytes(entry.size);
}
</script>

<template>
  <div v-if="entries.length > 0" class="history-grid" aria-label="图片列表">
    <article v-for="entry in entries" :key="entry.record.id" class="history-tile">
      <div class="history-tile__media">
        <button
          type="button"
          class="history-tile__thumb"
          :aria-label="`打开图片详情：${entry.record.prompt}`"
          @click="emit('select', entry)"
        >
          <img :src="entry.imageUrl" alt="生成历史图片预览" />
        </button>
        <div class="history-tile__quick-actions" role="group" aria-label="图片快捷操作">
          <button
            type="button"
            class="history-tile__action history-tile__action--expand"
            :aria-label="`放大查看图片：${entry.record.prompt}`"
            @click.stop="emit('expand', entry)"
          >
            放大
          </button>
          <button
            type="button"
            class="history-tile__action history-tile__action--remove"
            :aria-label="`删除历史图片：${entry.record.prompt}`"
            @click.stop="emit('remove', entry)"
          >
            删除
          </button>
        </div>
      </div>
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

.history-tile__media {
  position: relative;
  overflow: hidden;
  border: 1px solid oklch(24% 0.012 78deg / 0.08);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card-solid);
}

.history-tile__thumb {
  display: grid;
  width: 100%;
  aspect-ratio: 1;
  place-items: center;
  padding: var(--space-xs);
  border: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  transition: background-color 160ms ease;
}

.history-tile__media:hover .history-tile__thumb,
.history-tile__media:focus-within .history-tile__thumb {
  background: oklch(98.4% 0.006 88deg / 0.72);
}

.history-tile__thumb:focus-visible,
.history-tile__action:focus-visible,
.history-tile__copy:focus-visible {
  outline: 3px solid oklch(78% 0.13 57deg / 0.78);
  outline-offset: -3px;
}

.history-tile__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: calc(var(--radius-sm) - 2px);
  object-fit: contain;
  padding: 0;
}

.history-tile__quick-actions {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 8px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.history-tile__media:hover .history-tile__quick-actions,
.history-tile__media:focus-within .history-tile__quick-actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.history-tile__action {
  display: inline-flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: oklch(99% 0.004 88deg / 0.94);
  box-shadow: none;
  color: var(--color-ink);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 0 12px;
}

.history-tile__action:hover {
  background: var(--color-chip);
}

.history-tile__action--remove {
  color: var(--color-error);
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
