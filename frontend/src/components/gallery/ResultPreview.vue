<script setup lang="ts">
import { computed } from 'vue';

import type { GeneratedImageResult } from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatBytes } from '@/utils/format';

interface Props {
  result: GeneratedImageResult | null;
}

const props = defineProps<Props>();

const dimensions = computed(() => {
  if (!props.result) return '—';
  return `${props.result.record.width} × ${props.result.record.height}`;
});

const generationModeLabel = computed(() => {
  if (!props.result) return '—';
  return props.result.generationMode === 'image-to-image' ? '参考图生成' : '提示词生成';
});

function handleDownload(): void {
  if (!props.result) return;
  downloadUrl(props.result.imageUrl, props.result.record.id);
}
</script>

<template>
  <section class="result-card">
    <div class="result-card__header">
      <div>
        <p class="section-kicker">结果</p>
        <h2 class="result-card__title">生成图片</h2>
      </div>
      <button
        v-if="result"
        type="button"
        class="claude-button claude-button--secondary"
        @click="handleDownload"
      >
        下载
      </button>
    </div>

    <div v-if="result" class="result-card__body">
      <img :src="result.imageUrl" alt="生成结果" />
      <dl class="meta-list">
        <div class="meta-row">
          <dt>模式</dt>
          <dd>{{ generationModeLabel }}</dd>
        </div>
        <div class="meta-row">
          <dt>尺寸</dt>
          <dd>{{ dimensions }}</dd>
        </div>
        <div class="meta-row">
          <dt>类型</dt>
          <dd>{{ result.mime }}</dd>
        </div>
        <div class="meta-row">
          <dt>本地文件</dt>
          <dd>{{ formatBytes(result.size) }}</dd>
        </div>
      </dl>
    </div>

    <div v-else class="result-card__empty">
      <span aria-hidden="true">✣</span>
      <p>生成完成后，图片会显示在这里，并自动保存到本地历史记录。</p>
    </div>
  </section>
</template>

<style scoped>
.result-card {
  display: grid;
  gap: var(--space-lg);
  border-radius: var(--radius-lg);
  background: var(--color-surface-card);
  padding: var(--space-xl);
}

.result-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}

.result-card__title {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.result-card__body {
  display: grid;
  gap: var(--space-lg);
}

.result-card__body img {
  width: 100%;
  border-radius: var(--radius-lg);
  background: var(--color-canvas);
}

.result-card__empty {
  display: grid;
  min-height: 280px;
  place-items: center;
  border: 1px dashed var(--color-hairline);
  border-radius: var(--radius-lg);
  color: var(--color-muted);
  padding: var(--space-xl);
  text-align: center;
}

.result-card__empty span {
  color: var(--color-primary-active);
  font-size: 40px;
}

@media (max-width: 640px) {
  .result-card__header {
    flex-direction: column;
  }
}
</style>
