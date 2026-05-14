<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { ASPECT_RATIO_LABELS, DEFAULT_ASPECT_RATIO, type HistoryEntry } from '@/types/image';
import { formatBytes, formatFullDateTime } from '@/utils/format';

interface Props {
  entry: HistoryEntry | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'copy-prompt', entry: HistoryEntry): void;
}>();

const closeButtonRef = ref<HTMLButtonElement | null>(null);

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
  }
}

watch(
  () => props.entry,
  (next, prev) => {
    if (next && !prev) {
      document.addEventListener('keydown', handleKeydown);
      void nextTick(() => {
        closeButtonRef.value?.focus();
      });
    } else if (!next && prev) {
      document.removeEventListener('keydown', handleKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});

const aspectRatioLabel = computed(() => {
  const value = props.entry?.record.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  return ASPECT_RATIO_LABELS[value];
});

const generationModeLabel = computed(() => (props.entry?.record.referenceId ? '图生图' : '文生图'));

const fileSizeLabel = computed(() => {
  if (!props.entry) return '本地缓存';
  return props.entry.size === undefined ? '本地缓存' : formatBytes(props.entry.size);
});

function handleCopyPrompt(): void {
  if (!props.entry) return;
  emit('copy-prompt', props.entry);
}
</script>

<template>
  <div
    v-if="entry"
    class="recent-detail"
    role="dialog"
    aria-modal="true"
    aria-labelledby="recent-detail-title"
    @click.self="emit('close')"
  >
    <article class="recent-detail__panel">
      <button
        ref="closeButtonRef"
        type="button"
        class="recent-detail__close"
        aria-label="关闭图片详情"
        @click="emit('close')"
      >
        ×
      </button>
      <div class="recent-detail__image">
        <img :src="entry.imageUrl" alt="选中的最近创作图片" />
      </div>
      <div class="recent-detail__content">
        <p class="recent-detail__eyebrow">图片详情</p>
        <h2 id="recent-detail-title">最近创作提示词</h2>
        <p class="recent-detail__prompt">{{ entry.record.prompt }}</p>
        <button type="button" class="recent-detail__copy" @click="handleCopyPrompt">
          复制提示词
        </button>
        <dl class="recent-detail__meta">
          <div>
            <dt>模型</dt>
            <dd>{{ entry.record.model }} · {{ generationModeLabel }}</dd>
          </div>
          <div>
            <dt>尺寸</dt>
            <dd>{{ entry.record.width }} × {{ entry.record.height }}</dd>
          </div>
          <div>
            <dt>比例</dt>
            <dd>{{ aspectRatioLabel }}</dd>
          </div>
          <div>
            <dt>大小</dt>
            <dd>{{ fileSizeLabel }}</dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>{{ formatFullDateTime(entry.record.createdAt) }}</dd>
          </div>
        </dl>
      </div>
    </article>
  </div>
</template>

<style scoped>
.recent-detail {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(28, 24, 20, 0.38);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.recent-detail__panel {
  position: relative;
  display: grid;
  width: min(100%, 960px);
  max-height: min(760px, calc(100vh - 48px));
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 28px;
  background: var(--color-surface-card-solid);
  box-shadow: 0 30px 90px rgba(30, 24, 18, 0.25);
}

.recent-detail__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgba(44, 39, 33, 0.1);
  border-radius: 50%;
  background: oklch(99% 0.004 88deg / 0.86);
  color: var(--color-ink);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.recent-detail__image {
  display: grid;
  min-height: 520px;
  place-items: center;
  overflow: auto;
  background: linear-gradient(145deg, #fffdfa, #eee7dd);
  padding: 28px;
}

.recent-detail__image img {
  max-width: 100%;
  max-height: 660px;
  border-radius: 14px;
  box-shadow: 0 18px 60px rgba(38, 32, 24, 0.16);
}

.recent-detail__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
  padding: 46px 36px 36px;
}

.recent-detail__eyebrow {
  margin: 0;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.recent-detail__content h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: 24px;
  letter-spacing: -0.03em;
}

.recent-detail__prompt {
  margin: 0;
  color: var(--color-body);
  font-size: 15px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.recent-detail__copy {
  align-self: flex-start;
  height: 42px;
  border: 0;
  border-radius: 21px;
  background: linear-gradient(180deg, oklch(27% 0.012 76deg), var(--color-primary));
  color: var(--color-on-primary);
  cursor: pointer;
  font-weight: 800;
  padding: 0 18px;
}

.recent-detail__meta {
  display: grid;
  gap: 12px;
  margin: 6px 0 0;
}

.recent-detail__meta div {
  display: grid;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-hairline-soft);
}

.recent-detail__meta dt {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 800;
}

.recent-detail__meta dd {
  margin: 0;
  color: var(--color-body-strong);
  font-size: 13px;
}

@media (max-width: 760px) {
  .recent-detail__panel {
    grid-template-columns: 1fr;
  }

  .recent-detail__image {
    min-height: 320px;
  }
}
</style>
