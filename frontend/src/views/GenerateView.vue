<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useFileUpload } from '@/composables/useFileUpload';
import { useImageGeneration, type GenerateImageOptions } from '@/composables/useImageGeneration';
import { useImageHistory } from '@/composables/useImageHistory';
import type { HistoryEntry } from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatBytes, formatDateTime } from '@/utils/format';

const route = useRoute();
const { entries, remove } = useImageHistory();
const { selectedFile, previewUrl, validationMessage, selectFile, clear } = useFileUpload();
const { generate, isLoading, error, lastResult, statusMessage } = useImageGeneration();

const prompt = ref('');
const model = ref('gpt-image-2');
const activeEntry = ref<HistoryEntry | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isComposerDragging = ref(false);

const recentEntries = computed(() => entries.value.slice(0, 8));
const selectedEntryId = computed(() => activeEntry.value?.record.id ?? null);
const displayedImageUrl = computed(
  () => activeEntry.value?.imageUrl ?? lastResult.value?.imageUrl ?? null,
);
const displayedRecord = computed(
  () => activeEntry.value?.record ?? lastResult.value?.record ?? null,
);
const canGenerate = computed(() => prompt.value.trim().length > 0 && !isLoading.value);
const canDelete = computed(
  () => activeEntry.value !== null || selectedFile.value !== null || prompt.value.trim().length > 0,
);
const modeLabel = computed(() => (selectedFile.value ? '参考图生成' : '提示词生成'));
const selectedFileMeta = computed(() => {
  if (!selectedFile.value) return '';
  return `${selectedFile.value.name} · ${formatBytes(selectedFile.value.size)}`;
});
const displayedModeLabel = computed(() => {
  if (!displayedRecord.value) return modeLabel.value;
  return displayedRecord.value.referenceId ? '参考图生成' : '提示词生成';
});

watch(
  () => route.query.prompt,
  (value) => {
    const nextPrompt = readQueryString(value);
    if (nextPrompt) {
      prompt.value = nextPrompt;
      activeEntry.value = null;
    }
  },
  { immediate: true },
);

watch(entries, (nextEntries) => {
  if (!activeEntry.value) return;
  const stillExists = nextEntries.some((entry) => entry.record.id === activeEntry.value?.record.id);
  if (!stillExists) activeEntry.value = null;
});

async function handleSubmit(): Promise<void> {
  if (!canGenerate.value) return;
  activeEntry.value = null;
  const options: GenerateImageOptions = {
    prompt: prompt.value,
    model: model.value,
  };
  if (selectedFile.value) options.referenceFile = selectedFile.value;

  try {
    await generate(options);
    ElMessage.success('图片已生成，并保存到历史记录。');
  } catch (unknownError) {
    ElMessage.error(messageForError(unknownError));
  }
}

function handleSelectEntry(entry: HistoryEntry): void {
  activeEntry.value = entry;
  prompt.value = entry.record.prompt;
}

function handleNewConversation(): void {
  activeEntry.value = null;
  prompt.value = '';
  clear();
}

async function handleDelete(): Promise<void> {
  if (activeEntry.value) {
    const entry = activeEntry.value;
    try {
      await remove(entry.record.id);
      activeEntry.value = null;
      ElMessage.success('对话记录已删除。');
    } catch {
      ElMessage.error('删除失败，请稍后重试。');
    }
    return;
  }

  prompt.value = '';
  clear();
  ElMessage.success('当前草稿已清空。');
}

function openUploadPicker(): void {
  if (isLoading.value) return;
  fileInput.value?.click();
}

function handleInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const file = target.files?.item(0);
  if (file) addReferenceFile(file);
  target.value = '';
}

function handleComposerDrop(event: DragEvent): void {
  isComposerDragging.value = false;
  if (isLoading.value) return;
  const file = firstImageFile(event.dataTransfer?.files ?? null);
  if (file) addReferenceFile(file);
}

function handlePaste(event: ClipboardEvent): void {
  if (isLoading.value) return;
  const file = firstClipboardImageFile(event.clipboardData);
  if (!file) return;
  event.preventDefault();
  addReferenceFile(file);
}

function handleDragEnter(): void {
  if (!isLoading.value) isComposerDragging.value = true;
}

function handleDragLeave(): void {
  isComposerDragging.value = false;
}

function addReferenceFile(file: File): void {
  activeEntry.value = null;
  selectFile(file);
  ElMessage.success('参考图已添加到输入框。');
}

function firstImageFile(files: FileList | null): File | null {
  if (!files) return null;
  for (let index = 0; index < files.length; index += 1) {
    const file = files.item(index);
    if (file && file.type.startsWith('image/')) return file;
  }
  return files.item(0);
}

function firstClipboardImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  const directFile = firstImageFile(data.files);
  if (directFile?.type.startsWith('image/')) return directFile;

  for (let index = 0; index < data.items.length; index += 1) {
    const item = data.items[index];
    if (item?.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return directFile;
}

function handleDownload(): void {
  const imageUrl = displayedImageUrl.value;
  const record = displayedRecord.value;
  if (!imageUrl || !record) return;
  downloadUrl(imageUrl, record.id);
}

function readQueryString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function messageForError(unknownError: unknown): string {
  if (unknownError instanceof Error) return unknownError.message;
  return '生成失败，请稍后重试。';
}
</script>

<template>
  <section class="image-workspace">
    <aside class="conversation-rail" aria-label="对话历史">
      <div class="conversation-rail__actions">
        <button type="button" class="conversation-rail__new" @click="handleNewConversation">
          新建对话
        </button>
        <button
          type="button"
          class="conversation-rail__delete"
          :disabled="!canDelete"
          @click="handleDelete"
        >
          删除
        </button>
      </div>

      <div class="conversation-rail__section">
        <p class="conversation-rail__title">最近对话</p>
        <div v-if="recentEntries.length > 0" class="conversation-list">
          <button
            v-for="entry in recentEntries"
            :key="entry.record.id"
            type="button"
            class="conversation-item"
            :class="{ 'conversation-item--active': entry.record.id === selectedEntryId }"
            @click="handleSelectEntry(entry)"
          >
            <img :src="entry.imageUrl" alt="历史生成缩略图" />
            <span class="conversation-item__body">
              <span class="conversation-item__prompt">{{ entry.record.prompt }}</span>
              <span class="conversation-item__meta">{{
                formatDateTime(entry.record.createdAt)
              }}</span>
            </span>
          </button>
        </div>
        <p v-else class="conversation-rail__empty">生成图片后，对话会自动出现在这里。</p>
      </div>
    </aside>

    <section class="workspace-main" aria-label="画图工作区">
      <div class="canvas-panel">
        <header class="canvas-panel__header">
          <div>
            <p class="canvas-panel__eyebrow">画图工作台</p>
            <h1>图像生成与提示词记录</h1>
          </div>
          <div class="canvas-panel__chips" aria-label="当前状态">
            <span>{{ displayedModeLabel }}</span>
            <span>{{ model }}</span>
          </div>
        </header>

        <div class="canvas-panel__content">
          <div v-if="displayedImageUrl" class="image-stage">
            <img :src="displayedImageUrl" alt="当前生成图片" />
            <button type="button" class="image-stage__download" @click="handleDownload">
              下载图片
            </button>
          </div>
          <div v-else class="canvas-empty">
            <span aria-hidden="true">✣</span>
            <p>在底部输入提示词，或粘贴、拖入参考图开始生成。</p>
          </div>

          <div class="prompt-transcript" aria-live="polite">
            <p class="prompt-transcript__title">提示词记录</p>
            <div v-if="prompt.trim().length > 0" class="transcript-bubble transcript-bubble--user">
              <span>你</span>
              <p>{{ prompt }}</p>
            </div>
            <div v-if="isLoading" class="transcript-bubble transcript-bubble--assistant">
              <span>生成进度</span>
              <p>{{ statusMessage }}</p>
              <div class="transcript-progress" aria-hidden="true"><span /></div>
            </div>
            <div v-else-if="displayedRecord" class="transcript-bubble transcript-bubble--assistant">
              <span>生成结果</span>
              <p>
                已保存于 {{ formatDateTime(displayedRecord.createdAt) }}，尺寸
                {{ displayedRecord.width }} × {{ displayedRecord.height }}。
              </p>
            </div>
            <div v-else class="transcript-bubble transcript-bubble--assistant">
              <span>系统</span>
              <p>等待新的提示词。生成完成后，这里会保留本次对话摘要。</p>
            </div>
            <div v-if="error" class="transcript-bubble transcript-bubble--error" role="alert">
              <span>错误</span>
              <p>{{ error.message }}</p>
            </div>
          </div>
        </div>
      </div>

      <form
        class="composer-dock"
        :class="{ 'composer-dock--dragging': isComposerDragging }"
        aria-label="图片生成输入框"
        @submit.prevent="handleSubmit"
        @dragenter.prevent="handleDragEnter"
        @dragover.prevent="handleDragEnter"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleComposerDrop"
      >
        <input
          ref="fileInput"
          class="composer-dock__file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          :disabled="isLoading"
          @change="handleInput"
        />

        <label class="composer-dock__prompt">
          <span class="composer-dock__label">输入提示词，粘贴或拖入参考图</span>
          <textarea
            v-model="prompt"
            class="composer-dock__textarea"
            placeholder="例如：暖色摄影棚里，一台复古相机正在拍摄珊瑚色产品海报，背景是深海军蓝控制台。"
            :disabled="isLoading"
            @paste="handlePaste"
          />
        </label>

        <div v-if="selectedFile" class="composer-attachment">
          <img v-if="previewUrl" :src="previewUrl" alt="已添加参考图预览" />
          <span v-else class="composer-attachment__fallback" aria-hidden="true">图</span>
          <span class="composer-attachment__meta">
            <strong>参考图已添加</strong>
            <span>{{ selectedFileMeta }}</span>
            <span v-if="validationMessage" class="composer-attachment__warning">{{
              validationMessage
            }}</span>
          </span>
          <button type="button" :disabled="isLoading" @click="clear">移除</button>
        </div>

        <div class="composer-dock__toolbar">
          <button
            type="button"
            class="claude-button claude-button--secondary"
            :disabled="isLoading"
            @click="openUploadPicker"
          >
            上传
          </button>

          <label class="model-switcher">
            <span>当前模型</span>
            <select v-model="model" :disabled="isLoading" aria-label="当前模型">
              <option value="gpt-image-2">gpt-image-2</option>
            </select>
          </label>

          <span class="composer-dock__mode">{{ modeLabel }}</span>

          <button
            type="submit"
            class="claude-button claude-button--primary"
            :disabled="!canGenerate"
          >
            {{ isLoading ? '正在生成…' : '生成图片' }}
          </button>
        </div>
      </form>
    </section>
  </section>
</template>

<style scoped>
.image-workspace {
  display: grid;
  min-height: calc(100vh - 64px);
  grid-template-columns: 280px minmax(0, 1fr);
  background: var(--color-canvas);
}

.conversation-rail {
  display: grid;
  align-content: start;
  gap: var(--space-lg);
  border-right: 1px solid var(--color-hairline);
  background: var(--color-surface-soft);
  padding: var(--space-lg);
}

.conversation-rail__actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-sm);
}

.conversation-rail__new,
.conversation-rail__delete {
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
}

.conversation-rail__new {
  background: var(--color-primary);
  color: var(--color-ink);
  padding: 0 var(--space-lg);
}

.conversation-rail__delete {
  border-color: var(--color-hairline);
  background: var(--color-canvas);
  color: var(--color-body-strong);
  padding: 0 var(--space-md);
}

.conversation-rail__delete:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.conversation-rail__section {
  display: grid;
  gap: var(--space-sm);
}

.conversation-rail__title {
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.conversation-list {
  display: grid;
  gap: var(--space-xs);
}

.conversation-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: var(--space-sm);
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-body);
  cursor: pointer;
  padding: var(--space-xs);
  text-align: left;
}

.conversation-item--active {
  border-color: var(--color-primary);
  background: var(--color-canvas);
}

.conversation-item img {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
  object-fit: cover;
}

.conversation-item__body {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.conversation-item__prompt {
  overflow: hidden;
  color: var(--color-ink);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item__meta,
.conversation-rail__empty {
  color: var(--color-muted);
  font-size: 12px;
}

.conversation-rail__empty {
  margin: 0;
  border: 1px dashed var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.workspace-main {
  display: grid;
  min-width: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: calc(100vh - 64px);
}

.canvas-panel {
  display: grid;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-lg);
  padding: var(--space-xl) var(--space-xl) var(--space-lg);
}

.canvas-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
}

.canvas-panel__eyebrow {
  margin: 0 0 var(--space-xs);
  color: var(--color-primary-active);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.canvas-panel h1 {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.canvas-panel__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-xs);
}

.canvas-panel__chips span,
.composer-dock__mode {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-soft);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
}

.canvas-panel__content {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--space-lg);
}

.image-stage,
.canvas-empty {
  display: grid;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-xl);
  background: var(--color-surface-card);
}

.image-stage {
  position: relative;
  padding: var(--space-lg);
}

.image-stage img {
  max-height: calc(100vh - 360px);
  border-radius: var(--radius-lg);
  object-fit: contain;
}

.image-stage__download {
  position: absolute;
  right: var(--space-lg);
  bottom: var(--space-lg);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-canvas);
  color: var(--color-ink);
  cursor: pointer;
  font-weight: 600;
  padding: 9px 14px;
}

.canvas-empty {
  color: var(--color-muted);
  padding: var(--space-xl);
  text-align: center;
}

.canvas-empty span {
  color: var(--color-primary-active);
  font-size: 42px;
}

.canvas-empty p {
  max-width: 360px;
  margin: var(--space-sm) 0 0;
}

.prompt-transcript {
  display: grid;
  align-content: start;
  gap: var(--space-sm);
  overflow: auto;
  border-radius: var(--radius-xl);
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  padding: var(--space-lg);
}

.prompt-transcript__title {
  margin: 0 0 var(--space-xs);
  color: var(--color-on-dark-soft);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.transcript-bubble {
  display: grid;
  gap: var(--space-xs);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
}

.transcript-bubble span {
  color: var(--color-on-dark-soft);
  font-size: 12px;
  font-weight: 700;
}

.transcript-bubble p {
  margin: 0;
  color: var(--color-on-dark);
}

.transcript-bubble--user {
  background: var(--color-surface-dark-elevated);
}

.transcript-bubble--assistant {
  background: var(--color-surface-dark-soft);
}

.transcript-bubble--error {
  border: 1px solid rgba(198, 69, 69, 0.45);
  background: rgba(198, 69, 69, 0.16);
}

.transcript-progress {
  overflow: hidden;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-dark-elevated);
}

.transcript-progress span {
  display: block;
  width: 48%;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.composer-dock {
  display: grid;
  gap: var(--space-md);
  margin: 0 var(--space-xl) var(--space-xl);
  border: 1px solid var(--color-hairline);
  border-radius: 24px;
  background: var(--color-surface-soft);
  padding: var(--space-md);
}

.composer-dock--dragging {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.16);
}

.composer-dock__file {
  display: none;
}

.composer-dock__prompt {
  display: grid;
  gap: var(--space-xs);
}

.composer-dock__label {
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
}

.composer-dock__textarea {
  width: 100%;
  min-height: 116px;
  border: 0;
  border-radius: 18px;
  background: var(--color-canvas);
  color: var(--color-ink);
  outline: none;
  padding: var(--space-md);
  resize: vertical;
}

.composer-dock__textarea:focus {
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.18);
}

.composer-attachment {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-sm);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  background: var(--color-canvas);
  padding: var(--space-xs);
}

.composer-attachment img,
.composer-attachment__fallback {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.composer-attachment__fallback {
  display: grid;
  place-items: center;
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  font-family: var(--font-code);
}

.composer-attachment__meta {
  display: grid;
  min-width: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.composer-attachment__meta strong {
  color: var(--color-ink);
}

.composer-attachment__warning {
  color: var(--color-warning);
}

.composer-attachment button {
  border: 0;
  background: transparent;
  color: var(--color-primary-active);
  cursor: pointer;
  font-weight: 600;
  padding: var(--space-xs);
}

.composer-dock__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.model-switcher {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: var(--space-xs);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-canvas);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  padding: 0 var(--space-sm);
}

.model-switcher select {
  border: 0;
  background: transparent;
  color: var(--color-ink);
  outline: none;
}

.composer-dock__toolbar .claude-button--primary {
  margin-left: auto;
}

@media (max-width: 1180px) {
  .image-workspace {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .canvas-panel__content {
    grid-template-columns: 1fr;
  }

  .image-stage img {
    max-height: 56vh;
  }
}

@media (max-width: 860px) {
  .image-workspace {
    grid-template-columns: 1fr;
  }

  .conversation-rail {
    border-right: 0;
    border-bottom: 1px solid var(--color-hairline);
  }

  .conversation-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .canvas-panel {
    padding: var(--space-md);
  }

  .canvas-panel__header,
  .composer-dock__toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .canvas-panel__chips {
    justify-content: flex-start;
  }

  .composer-dock {
    margin: 0 var(--space-md) var(--space-md);
    border-radius: var(--radius-xl);
  }

  .composer-attachment {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .composer-attachment button {
    grid-column: 1 / -1;
    justify-self: start;
  }

  .composer-dock__toolbar .claude-button--primary {
    width: 100%;
    margin-left: 0;
  }

  .conversation-list {
    grid-template-columns: 1fr;
  }
}
</style>
