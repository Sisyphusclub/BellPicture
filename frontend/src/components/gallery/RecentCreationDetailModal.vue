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
const imageButtonRef = ref<HTMLButtonElement | null>(null);
const backButtonRef = ref<HTMLButtonElement | null>(null);
const isImageExpanded = ref(false);

const aspectRatioLabel = computed(() => {
  const value = props.entry?.record.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  return ASPECT_RATIO_LABELS[value];
});

const generationModeLabel = computed(() => (props.entry?.record.referenceId ? '图生图' : '文生图'));

const fileSizeLabel = computed(() => {
  if (!props.entry) return '本地缓存';
  return props.entry.size === undefined ? '本地缓存' : formatBytes(props.entry.size);
});

function requestClose(): void {
  isImageExpanded.value = false;
  emit('close');
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    requestClose();
  }
}

function handleCopyPrompt(): void {
  if (!props.entry) return;
  emit('copy-prompt', props.entry);
}

function openExpandedImage(): void {
  isImageExpanded.value = true;
}

function returnToDetails(): void {
  isImageExpanded.value = false;
}

watch(
  () => props.entry,
  (next, prev) => {
    if (next !== prev) {
      isImageExpanded.value = false;
    }

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

watch(isImageExpanded, (expanded) => {
  if (!props.entry) return;

  void nextTick(() => {
    if (!props.entry) return;

    if (expanded) {
      backButtonRef.value?.focus();
    } else {
      imageButtonRef.value?.focus();
    }
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div v-if="entry" class="recent-detail" @click.self="requestClose">
    <article
      class="recent-detail__panel"
      :class="{ 'recent-detail__panel--expanded': isImageExpanded }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-detail-title"
      tabindex="-1"
    >
      <button
        ref="closeButtonRef"
        type="button"
        class="recent-detail__close"
        aria-label="关闭图片详情"
        @click="requestClose"
      >
        ×
      </button>

      <section v-if="isImageExpanded" class="recent-detail__viewer" aria-label="放大图片预览">
        <header class="recent-detail__viewer-header">
          <button
            ref="backButtonRef"
            type="button"
            class="recent-detail__back"
            aria-label="返回图片详情"
            @click="returnToDetails"
          >
            返回详情
          </button>
          <h2 id="recent-detail-title">图片放大预览</h2>
        </header>
        <div class="recent-detail__viewer-stage">
          <img :src="entry.imageUrl" alt="放大查看的最近创作图片" />
        </div>
      </section>

      <template v-else>
        <div class="recent-detail__image">
          <button
            ref="imageButtonRef"
            type="button"
            class="recent-detail__image-button"
            aria-label="放大查看选中的图片"
            title="放大查看图片"
            @click="openExpandedImage"
          >
            <img :src="entry.imageUrl" alt="选中的最近创作图片" />
            <span class="recent-detail__image-hint" aria-hidden="true">点击放大</span>
          </button>
        </div>
        <div class="recent-detail__content">
          <p class="recent-detail__eyebrow">图片详情</p>
          <h2 id="recent-detail-title">最近创作提示词</h2>
          <div class="recent-detail__prompt-panel" tabindex="0" aria-label="提示词内容">
            <p class="recent-detail__prompt">{{ entry.record.prompt }}</p>
          </div>
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
      </template>
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
  background: oklch(95.5% 0.008 86deg / 0.68);
}

.recent-detail__panel {
  position: relative;
  display: grid;
  width: min(100%, 960px);
  max-height: min(760px, calc(100vh - 48px));
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  overflow: hidden;
  border: 1px solid oklch(24% 0.012 78deg / 0.12);
  border-radius: 28px;
  background: oklch(99.1% 0.004 88deg / 0.96);
}

.recent-detail__panel--expanded {
  width: min(100%, 1120px);
  grid-template-columns: 1fr;
}

.recent-detail__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
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
  overflow: hidden;
  background: oklch(97.4% 0.008 86deg);
  padding: 28px;
}

.recent-detail__image-button {
  position: relative;
  display: grid;
  width: 100%;
  min-height: inherit;
  place-items: center;
  border: 0;
  border-radius: 22px;
  background: transparent;
  cursor: zoom-in;
  padding: 0;
}

.recent-detail__image-button:focus-visible,
.recent-detail__back:focus-visible,
.recent-detail__close:focus-visible,
.recent-detail__copy:focus-visible,
.recent-detail__prompt-panel:focus-visible {
  outline: 3px solid oklch(78% 0.13 57deg / 0.78);
  outline-offset: 3px;
}

.recent-detail__image-button img {
  max-width: 100%;
  max-height: 660px;
  object-fit: contain;
  border: 1px solid var(--color-hairline-soft);
  border-radius: 14px;
}

.recent-detail__image-hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  border: 1px solid var(--color-hairline);
  border-radius: 999px;
  background: oklch(99% 0.004 88deg / 0.94);
  color: var(--color-ink);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 7px 12px;
  pointer-events: none;
}

.recent-detail__viewer {
  display: grid;
  min-height: min(760px, calc(100vh - 48px));
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
  padding: 26px;
  background: oklch(97.4% 0.008 86deg);
}

.recent-detail__viewer-header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
  padding-right: 54px;
}

.recent-detail__back {
  flex: 0 0 auto;
  height: 38px;
  border: 1px solid rgba(44, 39, 33, 0.12);
  border-radius: 999px;
  background: oklch(99% 0.004 88deg / 0.9);
  color: var(--color-ink);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 0 16px;
}

.recent-detail__viewer h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: 22px;
  letter-spacing: -0.03em;
}

.recent-detail__viewer-stage {
  display: grid;
  min-height: 0;
  place-items: center;
  overflow: auto;
  border: 1px solid var(--color-hairline-soft);
  border-radius: 22px;
  background: oklch(99.1% 0.004 88deg / 0.82);
  padding: 18px;
}

.recent-detail__viewer-stage img {
  max-width: min(100%, 1040px);
  max-height: calc(100vh - 170px);
  object-fit: contain;
  border: 1px solid var(--color-hairline-soft);
  border-radius: 16px;
}

.recent-detail__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
  padding: 42px 34px 34px;
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
  font-size: 22px;
  letter-spacing: -0.03em;
}

.recent-detail__prompt-panel {
  max-height: min(210px, 30vh);
  overflow: auto;
  border: 1px solid rgba(44, 39, 33, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 253, 250, 0.82), rgba(248, 241, 232, 0.72));
  padding: 14px 16px;
}

.recent-detail__prompt {
  margin: 0;
  color: var(--color-body);
  font-size: 13px;
  letter-spacing: 0.01em;
  line-height: 1.62;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.recent-detail__copy {
  align-self: flex-start;
  height: 40px;
  border: 0;
  border-radius: 20px;
  background: linear-gradient(180deg, oklch(27% 0.012 76deg), var(--color-primary));
  color: var(--color-on-primary);
  cursor: pointer;
  font-weight: 800;
  padding: 0 18px;
}

.recent-detail__meta {
  display: grid;
  gap: 10px;
  margin: 4px 0 0;
}

.recent-detail__meta div {
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
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
  .recent-detail {
    padding: 14px;
  }

  .recent-detail__panel {
    max-height: calc(100vh - 28px);
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .recent-detail__close {
    top: 10px;
    right: 10px;
  }

  .recent-detail__image {
    min-height: 280px;
    padding: 16px;
  }

  .recent-detail__image-button {
    min-height: 280px;
  }

  .recent-detail__image-button img {
    max-height: 360px;
  }

  .recent-detail__image-hint {
    bottom: 12px;
  }

  .recent-detail__content {
    gap: 12px;
    padding: 24px 18px 22px;
  }

  .recent-detail__content h2,
  .recent-detail__viewer h2 {
    font-size: 20px;
  }

  .recent-detail__prompt-panel {
    max-height: 160px;
    padding: 12px;
  }

  .recent-detail__prompt {
    font-size: 12.5px;
    line-height: 1.55;
  }

  .recent-detail__viewer {
    min-height: calc(100vh - 28px);
    gap: 14px;
    padding: 16px;
  }

  .recent-detail__viewer-header {
    flex-wrap: wrap;
    gap: 10px;
    padding-right: 48px;
  }

  .recent-detail__viewer-stage {
    padding: 10px;
  }

  .recent-detail__viewer-stage img {
    max-height: calc(100vh - 160px);
  }
}
</style>
