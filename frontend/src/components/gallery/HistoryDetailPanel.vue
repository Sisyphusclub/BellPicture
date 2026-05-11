<script setup lang="ts">
import { computed } from 'vue';

import type { HistoryEntry } from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatDateTime } from '@/utils/format';

interface Props {
  entry: HistoryEntry | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'rerun', entry: HistoryEntry): void;
  (e: 'remove', entry: HistoryEntry): void;
}>();

const generationMode = computed(() => {
  if (!props.entry) return '—';
  return props.entry.record.referenceId ? '参考图生成' : '提示词生成';
});

function handleDownload(): void {
  if (!props.entry) return;
  downloadUrl(props.entry.imageUrl, props.entry.record.id);
}

function handleRerun(): void {
  if (props.entry) emit('rerun', props.entry);
}

function handleRemove(): void {
  if (props.entry) emit('remove', props.entry);
}
</script>

<template>
  <aside class="detail-panel" aria-label="历史详情">
    <template v-if="entry">
      <img :src="entry.imageUrl" alt="选中的生成历史图片" />
      <div class="detail-panel__content">
        <p class="section-kicker">详情</p>
        <h2>{{ entry.record.prompt }}</h2>
        <dl class="meta-list">
          <div class="meta-row">
            <dt>创建时间</dt>
            <dd>{{ formatDateTime(entry.record.createdAt) }}</dd>
          </div>
          <div class="meta-row">
            <dt>模型</dt>
            <dd>{{ entry.record.model }}</dd>
          </div>
          <div class="meta-row">
            <dt>模式</dt>
            <dd>{{ generationMode }}</dd>
          </div>
          <div class="meta-row">
            <dt>尺寸</dt>
            <dd>{{ entry.record.width }} × {{ entry.record.height }}</dd>
          </div>
          <div v-if="entry.record.referenceId" class="meta-row">
            <dt>参考图</dt>
            <dd>{{ entry.record.referenceId }}</dd>
          </div>
        </dl>
        <div class="detail-panel__actions">
          <button type="button" class="claude-button claude-button--primary" @click="handleRerun">
            用此提示词再生成
          </button>
          <button
            type="button"
            class="claude-button claude-button--secondary"
            @click="handleDownload"
          >
            下载
          </button>
          <button type="button" class="detail-panel__remove" @click="handleRemove">移除</button>
        </div>
      </div>
    </template>
    <div v-else class="detail-panel__empty">
      <span aria-hidden="true">✣</span>
      <p>选择一张历史卡片，查看提示词、元数据和下载操作。</p>
    </div>
  </aside>
</template>

<style scoped>
.detail-panel {
  position: sticky;
  top: 88px;
  display: grid;
  overflow: hidden;
  max-height: calc(100vh - 112px);
  border-radius: var(--radius-lg);
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
}

.detail-panel > img {
  width: 100%;
  max-height: 360px;
  object-fit: cover;
}

.detail-panel__content {
  display: grid;
  gap: var(--space-lg);
  overflow: auto;
  padding: var(--space-xl);
}

.detail-panel h2 {
  margin: 0;
  color: var(--color-on-dark);
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.detail-panel :deep(.section-kicker) {
  background: var(--color-surface-dark-elevated);
  color: var(--color-on-dark);
}

.detail-panel :deep(.meta-row) {
  border-color: var(--color-surface-dark-elevated);
}

.detail-panel :deep(.meta-row dt) {
  color: var(--color-on-dark-soft);
}

.detail-panel :deep(.meta-row dd) {
  color: var(--color-on-dark);
}

.detail-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.detail-panel__remove {
  border: 0;
  background: transparent;
  color: var(--color-on-dark-soft);
  cursor: pointer;
  font-weight: 500;
  padding: 0 var(--space-xs);
}

.detail-panel__empty {
  display: grid;
  min-height: 520px;
  place-items: center;
  padding: var(--space-xl);
  text-align: center;
}

.detail-panel__empty span {
  color: var(--color-primary);
  font-size: 42px;
}

.detail-panel__empty p {
  margin: var(--space-sm) 0 0;
  color: var(--color-on-dark-soft);
}

@media (max-width: 920px) {
  .detail-panel {
    position: static;
    max-height: none;
  }
}
</style>
