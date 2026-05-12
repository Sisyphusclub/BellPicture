<script setup lang="ts">
import type { HistoryEntry } from '@/types/image';
import { formatBytes, formatDateTime } from '@/utils/format';

interface Props {
  entries: HistoryEntry[];
  selectedId?: string | null;
}

withDefaults(defineProps<Props>(), {
  selectedId: null,
});

const emit = defineEmits<{
  (e: 'select', entry: HistoryEntry): void;
  (e: 'download', entry: HistoryEntry): void;
  (e: 'copy-prompt', entry: HistoryEntry): void;
}>();

function fileSizeLabel(entry: HistoryEntry): string {
  return entry.size === undefined ? '浏览器缓存' : formatBytes(entry.size);
}
</script>

<template>
  <div v-if="entries.length > 0" class="history-grid" aria-label="图片列表">
    <article
      v-for="entry in entries"
      :key="entry.record.id"
      class="history-card"
      :class="{ 'history-card--selected': entry.record.id === selectedId }"
    >
      <button
        type="button"
        class="history-card__preview"
        :aria-label="`打开图片详情：${entry.record.prompt}`"
        @click="emit('select', entry)"
      >
        <img :src="entry.imageUrl" alt="生成历史图片预览" />
      </button>

      <div class="history-card__body">
        <p class="history-card__prompt">{{ entry.record.prompt }}</p>
        <dl class="history-card__meta">
          <div>
            <dt>创建时间</dt>
            <dd>{{ formatDateTime(entry.record.createdAt) }}</dd>
          </div>
          <div>
            <dt>文件大小</dt>
            <dd>{{ fileSizeLabel(entry) }}</dd>
          </div>
          <div>
            <dt>尺寸</dt>
            <dd>{{ entry.record.width }} × {{ entry.record.height }}</dd>
          </div>
          <div>
            <dt>模型</dt>
            <dd>{{ entry.record.model }}</dd>
          </div>
        </dl>

        <div class="history-card__actions" aria-label="图片操作">
          <button type="button" @click="emit('select', entry)">打开</button>
          <button type="button" @click="emit('download', entry)">下载</button>
          <button type="button" @click="emit('copy-prompt', entry)">复制提示词</button>
        </div>
      </div>
    </article>
  </div>
  <div v-else class="history-empty">
    <span aria-hidden="true">✣</span>
    <h2>暂无图片</h2>
    <p>生成第一张图片后，它会在这里显示。</p>
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
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
  color: var(--color-body);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.history-card--selected {
  border-color: var(--color-accent-active);
  box-shadow:
    var(--shadow-soft),
    0 0 0 3px rgba(204, 120, 92, 0.14);
}

.history-card__preview {
  overflow: hidden;
  width: 100%;
  border: 0;
  background: linear-gradient(145deg, #fffdf9, #f3eee8);
  cursor: pointer;
  padding: 0;
}

.history-card__preview img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.history-card__body {
  display: grid;
  gap: var(--space-sm);
  padding: var(--space-md);
}

.history-card__prompt {
  display: -webkit-box;
  overflow: hidden;
  min-height: 44px;
  margin: 0;
  color: var(--color-ink);
  font-weight: 700;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.history-card__meta {
  display: grid;
  gap: var(--space-xs);
  margin: 0;
}

.history-card__meta div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: baseline;
}

.history-card__meta dt {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}

.history-card__meta dd {
  overflow: hidden;
  margin: 0;
  color: var(--color-body-strong);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  padding-top: var(--space-xs);
}

.history-card__actions button {
  min-height: 32px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-glass-strong);
  color: var(--color-ink);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
}

.history-card__actions button:hover {
  background: var(--color-surface-card-solid);
}

.history-empty {
  display: grid;
  min-height: 380px;
  place-items: center;
  border: 1px dashed var(--color-hairline);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.45);
  padding: var(--space-xl);
  text-align: center;
}

.history-empty span {
  color: var(--color-accent-active);
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
