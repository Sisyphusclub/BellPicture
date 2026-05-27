<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, nextTick, ref, watch } from 'vue';

import type { HistoryEntry } from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatBytes, formatDateTime } from '@/utils/format';

interface Props {
  entry: HistoryEntry | null;
  initialExpanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialExpanded: false,
});

const emit = defineEmits<{
  (e: 'rerun', entry: HistoryEntry): void;
  (e: 'remove', entry: HistoryEntry): void;
  (e: 'expanded-change', expanded: boolean): void;
}>();

const imageButtonRef = ref<HTMLButtonElement | null>(null);
const backButtonRef = ref<HTMLButtonElement | null>(null);
const isImageExpanded = ref(props.initialExpanded);

const HISTORY_TITLE_MAX_LENGTH = 18;
const HISTORY_TITLE_BREAK_PATTERN = /[，,。！？!?；;\n]/;

const detailTitle = computed(() => {
  if (!props.entry) return '';
  return buildTitleFromPrompt(props.entry.record.prompt);
});

const generationMode = computed(() => {
  if (!props.entry) return '—';
  return props.entry.record.referenceId ? '参考图生成' : '提示词生成';
});

const fileSizeLabel = computed(() => {
  if (!props.entry) return '—';
  return props.entry.size === undefined ? '浏览器缓存' : formatBytes(props.entry.size);
});

watch(
  () => props.entry,
  (entry) => {
    if (!entry || isImageExpanded.value) {
      setImageExpanded(false);
    }
  },
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

function setImageExpanded(expanded: boolean): void {
  if (isImageExpanded.value === expanded) return;
  isImageExpanded.value = expanded;
  emit('expanded-change', expanded);
}

function openExpandedImage(): void {
  if (!props.entry) return;
  setImageExpanded(true);
}

function returnToDetails(): void {
  setImageExpanded(false);
}

function buildTitleFromPrompt(prompt: string): string {
  const normalizedPrompt = prompt.trim().replace(/\s+/g, ' ');
  if (!normalizedPrompt) return '未命名图片';

  const [firstSegment] = normalizedPrompt.split(HISTORY_TITLE_BREAK_PATTERN);
  const title = (firstSegment || normalizedPrompt).trim() || normalizedPrompt;
  return title.length > HISTORY_TITLE_MAX_LENGTH
    ? `${title.slice(0, HISTORY_TITLE_MAX_LENGTH)}…`
    : title;
}

async function handleDownload(): Promise<void> {
  if (!props.entry) return;
  try {
    await downloadUrl(props.entry.imageUrl, props.entry.record.id);
    ElMessage.success('下载已开始。');
  } catch {
    ElMessage.error('下载失败，请稍后重试。');
  }
}

function handleRerun(): void {
  if (props.entry) emit('rerun', props.entry);
}

function handleRemove(): void {
  if (props.entry) emit('remove', props.entry);
}
</script>

<template>
  <aside
    class="detail-panel"
    :class="{ 'detail-panel--expanded': isImageExpanded }"
    aria-label="资产详情"
  >
    <template v-if="entry">
      <section v-if="isImageExpanded" class="detail-panel__viewer" aria-label="放大图片预览">
        <header class="detail-panel__viewer-header">
          <button
            ref="backButtonRef"
            type="button"
            class="detail-panel__back"
            aria-label="返回资产详情"
            @click="returnToDetails"
          >
            返回详情
          </button>
          <h2 id="history-detail-expanded-title" class="detail-panel__viewer-title">
            图片放大预览
          </h2>
        </header>
        <div class="detail-panel__viewer-stage">
          <img :src="entry.imageUrl" alt="放大查看的资产图片" />
        </div>
      </section>

      <template v-else>
        <div class="detail-panel__image">
          <button
            ref="imageButtonRef"
            type="button"
            class="detail-panel__image-button"
            aria-label="放大查看选中的资产图片"
            title="放大查看图片"
            @click="openExpandedImage"
          >
            <img :src="entry.imageUrl" alt="选中的资产图片" />
            <span class="detail-panel__image-hint" aria-hidden="true">点击放大</span>
          </button>
        </div>
        <div class="detail-panel__content">
          <p class="section-kicker">详情</p>
          <h2 id="history-detail-title" class="detail-panel__title">{{ detailTitle }}</h2>
          <dl class="meta-list">
            <div class="meta-row detail-panel__prompt-row">
              <dt>提示词</dt>
              <dd>
                <textarea
                  class="detail-panel__prompt-field textarea-field"
                  :value="entry.record.prompt"
                  readonly
                  aria-label="完整提示词"
                ></textarea>
              </dd>
            </div>
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
              <dt>文件大小</dt>
              <dd>{{ fileSizeLabel }}</dd>
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
            <button
              type="button"
              class="detail-panel__remove claude-button claude-button--danger"
              @click="handleRemove"
            >
              移除
            </button>
          </div>
        </div>
      </template>
    </template>
    <div v-else class="detail-panel__empty">
      <span aria-hidden="true">✣</span>
      <p>选择一项资产，查看提示词、元数据和下载操作。</p>
    </div>
  </aside>
</template>

<style scoped>
.detail-panel {
  display: grid;
  width: 100%;
  max-height: calc(100vh - 96px);
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-body);
}

.detail-panel--expanded {
  height: 100%;
  max-height: 100%;
  grid-template-rows: minmax(0, 1fr);
}

.detail-panel__image {
  display: grid;
  min-height: 360px;
  max-height: 360px;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(145deg, var(--color-surface), var(--color-canvas-soft));
}

.detail-panel__image-button {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 360px;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: zoom-in;
  padding: 0;
}

.detail-panel__image-button:focus-visible,
.detail-panel__back:focus-visible,
.detail-panel__remove:focus-visible,
.detail-panel__actions .claude-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.detail-panel__image-button img {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
}

.detail-panel__image-hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-overlay);
  color: var(--color-ink);
  font-size: var(--text-caption-size);
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 7px 12px;
  pointer-events: none;
  transform: translateX(-50%);
}

.detail-panel__viewer {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-md);
  overflow: hidden;
  background: var(--color-canvas);
  padding: var(--space-lg);
}

.detail-panel__viewer-header {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
  padding-right: 54px;
}

.detail-panel__back {
  flex: 0 0 auto;
  height: var(--control-height-md);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-overlay);
  box-shadow: none;
  color: var(--color-ink);
  cursor: pointer;
  font-size: var(--text-label-size);
  font-weight: 800;
  padding: 0 var(--space-md);
}

.detail-panel__viewer-title {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.detail-panel__viewer-stage {
  --history-detail-viewer-stage-padding: 18px;

  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-height: 100%;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--radius-image-lg);
  background: var(--color-overlay);
  padding: var(--history-detail-viewer-stage-padding);
}

.detail-panel__viewer-stage img {
  position: absolute;
  inset: var(--history-detail-viewer-stage-padding);
  display: block;
  width: calc(
    100% - var(--history-detail-viewer-stage-padding) - var(--history-detail-viewer-stage-padding)
  );
  height: calc(
    100% - var(--history-detail-viewer-stage-padding) - var(--history-detail-viewer-stage-padding)
  );
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.detail-panel__content {
  display: grid;
  gap: var(--space-lg);
  overflow: auto;
  min-height: 0;
  padding: var(--space-xl);
}

.detail-panel__title {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: var(--text-section-title-size);
  font-weight: var(--font-weight-title);
  letter-spacing: -0.03em;
  line-height: 1.12;
}

.detail-panel__prompt-row {
  align-items: flex-start;
}

.detail-panel__prompt-row dd {
  width: min(100%, 520px);
}

.detail-panel__prompt-field {
  min-height: 92px;
  color: var(--color-body-strong);
  font-size: var(--text-body-sm-size);
  line-height: 1.55;
}

.detail-panel__prompt-field:focus {
  outline: none;
}

.detail-panel :deep(.section-kicker) {
  background: var(--color-chip);
  color: var(--color-ink);
}

.detail-panel :deep(.meta-row) {
  border-color: var(--color-hairline-soft);
}

.detail-panel :deep(.meta-row dt) {
  color: var(--color-muted);
}

.detail-panel :deep(.meta-row dd) {
  color: var(--color-body-strong);
}

.detail-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.detail-panel__actions .claude-button {
  box-shadow: none;
  filter: none;
}

.detail-panel__remove {
  padding: 0 var(--space-md);
}

.detail-panel__empty {
  display: grid;
  min-height: 520px;
  place-items: center;
  padding: var(--space-xl);
  text-align: center;
}

.detail-panel__empty span {
  color: var(--color-accent-active);
  font-size: 42px;
}

.detail-panel__empty p {
  margin: var(--space-sm) 0 0;
  color: var(--color-muted);
}

@media (max-width: 920px) {
  .detail-panel {
    max-height: calc(100vh - 28px);
  }

  .detail-panel--expanded {
    max-height: 100%;
  }

  .detail-panel__image {
    min-height: 280px;
    max-height: 320px;
  }

  .detail-panel__image-button {
    min-height: 280px;
  }

  .detail-panel__image-button img {
    max-height: 320px;
  }

  .detail-panel__viewer {
    gap: 14px;
    padding: 16px;
  }

  .detail-panel__viewer-header {
    flex-wrap: wrap;
    gap: 10px;
    padding-right: 48px;
  }

  .detail-panel__viewer-title {
    font-size: 21px;
  }

  .detail-panel__title {
    font-size: 23px;
  }

  .detail-panel__prompt-row {
    flex-direction: column;
    gap: 8px;
  }

  .detail-panel__prompt-row dd {
    width: 100%;
  }

  .detail-panel__viewer-stage {
    --history-detail-viewer-stage-padding: 10px;
  }
}
</style>
