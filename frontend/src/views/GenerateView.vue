<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useFileUpload } from '@/composables/useFileUpload';
import { useImageGeneration, type GenerateImageOptions } from '@/composables/useImageGeneration';
import { useImageHistory, type GroupedBatch } from '@/composables/useImageHistory';
import { downloadUrl } from '@/utils/download';
import {
  DATE_BUCKET_LABELS,
  dateBucket,
  formatClockTime,
  formatElapsed,
  formatFullDateTime,
  type DateBucket,
} from '@/utils/format';
import {
  ASPECT_RATIOS,
  ASPECT_RATIO_LABELS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  MAX_COUNT,
  MIN_COUNT,
  type AspectRatio,
  type HistoryEntry,
} from '@/types/image';

const route = useRoute();
const router = useRouter();
const { batches, removeBatch } = useImageHistory();
const { selectedFile, previewUrl, validationMessage, selectFile, clear } = useFileUpload();
const { generate, isLoading, error, lastBatch, statusMessage, clearLastBatch } =
  useImageGeneration();

const prompt = ref('');
const model = ref('gpt-image-2');
const count = ref<number>(DEFAULT_COUNT);
const aspectRatio = ref<AspectRatio>(DEFAULT_ASPECT_RATIO);
const activeBatchId = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const isComposerDragging = ref(false);
const aspectMenuOpen = ref(false);
const modelMenuOpen = ref(false);
const aspectButtonRef = ref<HTMLButtonElement | null>(null);
const modelButtonRef = ref<HTMLButtonElement | null>(null);

const modelOptions = ['gpt-image-2'] as const;

const displayedBatch = computed<GroupedBatch | null>(() => {
  if (activeBatchId.value) {
    const hit = batches.value.find((batch) => batch.batchId === activeBatchId.value);
    if (hit) return hit;
  }
  if (lastBatch.value) {
    const fromLast = batches.value.find((batch) => batch.batchId === lastBatch.value?.batchId);
    if (fromLast) return fromLast;
    return {
      batchId: lastBatch.value.batchId,
      createdAt: lastBatch.value.entries[0]?.record.createdAt ?? new Date().toISOString(),
      prompt: lastBatch.value.entries[0]?.record.prompt ?? prompt.value,
      model: lastBatch.value.entries[0]?.record.model ?? model.value,
      entries: [...lastBatch.value.entries],
    };
  }
  return null;
});

const displayedTitle = computed(() => {
  const text = displayedBatch.value?.prompt ?? '新的画布';
  if (text.length > 24) return `${text.slice(0, 24)}…`;
  return text;
});

const canGenerate = computed(() => prompt.value.trim().length > 0 && !isLoading.value);
const modeLabel = computed(() => (selectedFile.value ? '参考图生成' : '提示词生成'));
const selectedFileSummary = computed(() => (selectedFile.value ? '1' : '0'));

const groupedSidebarBatches = computed(() => {
  const groups: { bucket: DateBucket; batches: GroupedBatch[] }[] = [];
  const indexByBucket: Partial<Record<DateBucket, number>> = {};
  for (const batch of batches.value) {
    const bucket = dateBucket(batch.createdAt);
    const index = indexByBucket[bucket];
    if (index === undefined) {
      indexByBucket[bucket] = groups.length;
      groups.push({ bucket, batches: [batch] });
    } else {
      groups[index]!.batches.push(batch);
    }
  }
  return groups;
});

watch(
  () => route.query.prompt,
  (value) => {
    const nextPrompt = readQueryString(value);
    if (nextPrompt) {
      prompt.value = nextPrompt;
      activeBatchId.value = null;
    }
  },
  { immediate: true },
);

watch(batches, (nextBatches) => {
  if (!activeBatchId.value) return;
  const exists = nextBatches.some((batch) => batch.batchId === activeBatchId.value);
  if (!exists) activeBatchId.value = null;
});

async function handleSubmit(): Promise<void> {
  if (!canGenerate.value) return;
  activeBatchId.value = null;
  const options: GenerateImageOptions = {
    prompt: prompt.value,
    model: model.value,
    count: count.value,
    aspectRatio: aspectRatio.value,
  };
  if (selectedFile.value) options.referenceFile = selectedFile.value;

  try {
    const result = await generate(options);
    activeBatchId.value = result.batchId;
    ElMessage.success(`已生成 ${result.entries.length} 张图片，并保存到历史记录。`);
  } catch (unknownError) {
    ElMessage.error(messageForError(unknownError));
  }
}

function handleSelectBatch(batch: GroupedBatch): void {
  activeBatchId.value = batch.batchId;
  prompt.value = batch.prompt;
  const first = batch.entries[0];
  if (first?.record.aspectRatio) aspectRatio.value = first.record.aspectRatio;
  count.value = Math.min(MAX_COUNT, Math.max(MIN_COUNT, batch.entries.length));
}

function handleNewConversation(): void {
  activeBatchId.value = null;
  prompt.value = '';
  clear();
  clearLastBatch();
}

async function handleDeleteBatch(batchId: string): Promise<void> {
  try {
    await removeBatch(batchId);
    if (activeBatchId.value === batchId) activeBatchId.value = null;
    ElMessage.success('已删除该批次。');
  } catch {
    ElMessage.error('删除失败，请稍后重试。');
  }
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

function handleDownload(entry: HistoryEntry): void {
  downloadUrl(entry.imageUrl, entry.record.id);
}

function decreaseCount(): void {
  if (count.value > MIN_COUNT) count.value -= 1;
}

function increaseCount(): void {
  if (count.value < MAX_COUNT) count.value += 1;
}

function toggleAspectMenu(): void {
  aspectMenuOpen.value = !aspectMenuOpen.value;
  modelMenuOpen.value = false;
}

function toggleModelMenu(): void {
  modelMenuOpen.value = !modelMenuOpen.value;
  aspectMenuOpen.value = false;
}

function chooseAspect(value: AspectRatio): void {
  aspectRatio.value = value;
  aspectMenuOpen.value = false;
}

function chooseModel(value: string): void {
  model.value = value;
  modelMenuOpen.value = false;
}

function goToHistoryPage(): void {
  void router.push('/history');
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

function bucketLabel(bucket: DateBucket): string {
  return DATE_BUCKET_LABELS[bucket];
}

function batchThumb(batch: GroupedBatch): string | undefined {
  return batch.entries[0]?.imageUrl;
}

function aspectLabel(value: AspectRatio | undefined): string {
  if (!value) return ASPECT_RATIO_LABELS[DEFAULT_ASPECT_RATIO];
  return ASPECT_RATIO_LABELS[value];
}
</script>

<template>
  <section class="studio">
    <aside class="studio__sidebar" aria-label="生成历史">
      <button type="button" class="sidebar-new" @click="handleNewConversation">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建生成
      </button>

      <div class="sidebar-history" role="list">
        <template v-for="group in groupedSidebarBatches" :key="group.bucket">
          <p class="sidebar-history__title">{{ bucketLabel(group.bucket) }}</p>
          <button
            v-for="batch in group.batches"
            :key="batch.batchId"
            type="button"
            class="sidebar-item"
            :class="{ 'sidebar-item--active': batch.batchId === activeBatchId }"
            role="listitem"
            @click="handleSelectBatch(batch)"
          >
            <span class="sidebar-item__thumb">
              <img v-if="batchThumb(batch)" :src="batchThumb(batch)" alt="批次缩略图" />
              <span v-else aria-hidden="true">✣</span>
            </span>
            <span class="sidebar-item__body">
              <span class="sidebar-item__title">{{ batch.prompt }}</span>
              <span class="sidebar-item__meta">
                {{ formatClockTime(batch.createdAt) }} · {{ batch.entries.length }} 张图
              </span>
            </span>
            <button
              type="button"
              class="sidebar-item__more"
              aria-label="删除该批次"
              @click.stop="handleDeleteBatch(batch.batchId)"
            >
              ···
            </button>
          </button>
        </template>
        <p v-if="batches.length === 0" class="sidebar-empty">尚无历史记录。生成第一张图试试吧。</p>
      </div>

      <button type="button" class="sidebar-all" @click="goToHistoryPage">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        查看全部历史
      </button>
    </aside>

    <main class="studio__main" aria-label="生成结果">
      <div class="studio__content">
        <header class="project-header">
          <div class="project-header__title-block">
            <h1 class="project-header__title">
              {{ displayedTitle }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#80786f" stroke-width="2" aria-hidden="true">
                <path d="m16 3 5 5L8 21H3v-5z" />
              </svg>
            </h1>
            <p v-if="displayedBatch" class="project-header__status">
              <span class="status-dot" aria-hidden="true" />
              已完成 · {{ displayedBatch.entries.length }} 张图
            </p>
            <p v-else class="project-header__status">
              <span class="status-dot status-dot--idle" aria-hidden="true" />
              等待生成
            </p>
          </div>
        </header>

        <section v-if="displayedBatch" class="result-list" aria-label="生成结果列表">
          <article
            v-for="entry in displayedBatch.entries"
            :key="entry.record.id"
            class="result-card"
          >
            <div class="result-card__preview">
              <div class="preview-frame">
                <img :src="entry.imageUrl" :alt="`生成图 ${entry.record.id}`" />
              </div>
              <div class="preview-meta">
                <span>⌘ {{ entry.record.width }} × {{ entry.record.height }}</span>
                <span>▢ {{ aspectLabel(entry.record.aspectRatio) }}</span>
                <button type="button" class="preview-download" @click="handleDownload(entry)">
                  下载
                </button>
              </div>
            </div>
            <div class="result-card__info">
              <div>
                <span class="info-pill">提示词</span>
                <p class="info-prompt">{{ entry.record.prompt }}</p>
              </div>
              <div class="info-grid">
                <div>
                  <p class="info-label">模型</p>
                  <p class="info-value">
                    {{ entry.record.model }}
                    <span class="info-chip">{{ entry.record.referenceId ? '图生图' : '文生图' }}</span>
                  </p>
                </div>
                <div>
                  <p class="info-label">生成信息</p>
                  <p class="info-value">
                    {{ formatFullDateTime(entry.record.createdAt) }}
                    <br />
                    用时 {{ formatElapsed(entry.record.elapsedMs) }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section v-else class="canvas-hero" aria-live="polite">
          <h2 class="canvas-hero__title">Turn ideas into images</h2>
          <p class="canvas-hero__subtitle">
            在同一窗口里保留本地历史与任务状态，并从已有结果图继续发起新的无状态编辑。
          </p>
        </section>

        <div v-if="isLoading" class="floating-status floating-status--loading" aria-live="polite">
          <span>正在生成</span>
          <p>{{ statusMessage }}</p>
          <div class="floating-status__bar" aria-hidden="true"><span /></div>
        </div>
        <div v-else-if="error" class="floating-status floating-status--error" role="alert">
          <span>生成失败</span>
          <p>{{ error.message }}</p>
        </div>
      </div>
    </main>

    <form
      class="composer-shell"
      :class="{ 'composer-shell--dragging': isComposerDragging }"
      aria-label="图片生成输入框"
      @submit.prevent="handleSubmit"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleComposerDrop"
    >
      <input
        id="generate-reference-file"
        ref="fileInput"
        class="composer-file"
        name="referenceImage"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        :disabled="isLoading"
        @change="handleInput"
      />

      <div class="composer-textarea">
        <textarea
          id="generate-prompt"
          v-model="prompt"
          name="prompt"
          placeholder="输入你想要生成的画面，也可直接粘贴图片"
          :disabled="isLoading"
          @paste="handlePaste"
        />
      </div>

      <div v-if="selectedFile" class="composer-attachment">
        <img v-if="previewUrl" :src="previewUrl" alt="已添加参考图预览" />
        <span v-else class="composer-attachment__fallback" aria-hidden="true">图</span>
        <span class="composer-attachment__meta">
          <strong>参考图已添加</strong>
          <span v-if="validationMessage" class="composer-attachment__warning">{{
            validationMessage
          }}</span>
        </span>
        <button type="button" :disabled="isLoading" @click="clear">移除</button>
      </div>

      <div class="composer-controls">
        <button
          type="button"
          class="control control--upload"
          :disabled="isLoading"
          @click="openUploadPicker"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m17 8-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          上传
        </button>
        <div class="control control--count" aria-label="已添加参考图数量">{{ selectedFileSummary }}</div>
        <div class="control control--stepper" role="group" aria-label="生成数量">
          <button type="button" :disabled="count <= MIN_COUNT" aria-label="减少数量" @click="decreaseCount">−</button>
          <span>{{ count }}</span>
          <button type="button" :disabled="count >= MAX_COUNT" aria-label="增加数量" @click="increaseCount">＋</button>
        </div>
        <div class="control control--dropdown">
          <button
            ref="aspectButtonRef"
            type="button"
            :aria-expanded="aspectMenuOpen"
            @click="toggleAspectMenu"
          >
            {{ aspectLabel(aspectRatio) }}<span aria-hidden="true">⌄</span>
          </button>
          <ul v-if="aspectMenuOpen" class="control-menu" role="listbox" :aria-labelledby="undefined">
            <li v-for="value in ASPECT_RATIOS" :key="value">
              <button
                type="button"
                role="option"
                :aria-selected="value === aspectRatio"
                :class="{ 'control-menu__item--active': value === aspectRatio }"
                @click="chooseAspect(value)"
              >
                {{ aspectLabel(value) }}
              </button>
            </li>
          </ul>
        </div>
        <div class="control control--dropdown control--dropdown-model">
          <button
            ref="modelButtonRef"
            type="button"
            :aria-expanded="modelMenuOpen"
            @click="toggleModelMenu"
          >
            {{ model }}<span aria-hidden="true">⌄</span>
          </button>
          <ul v-if="modelMenuOpen" class="control-menu" role="listbox">
            <li v-for="value in modelOptions" :key="value">
              <button
                type="button"
                role="option"
                :aria-selected="value === model"
                :class="{ 'control-menu__item--active': value === model }"
                @click="chooseModel(value)"
              >
                {{ value }}
              </button>
            </li>
          </ul>
        </div>
        <button type="submit" class="control control--generate" :disabled="!canGenerate">
          <span aria-hidden="true">✧</span>
          <span>{{ isLoading ? '正在生成…' : '生成图像' }}</span>
        </button>
      </div>
      <p class="composer-mode" aria-live="polite">{{ modeLabel }}</p>
    </form>
  </section>
</template>

<style scoped>
.studio {
  position: relative;
  display: grid;
  min-height: calc(100vh - var(--topbar-height));
  grid-template-columns: var(--sidebar-width) 1fr;
}

.studio__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  border-right: 1px solid var(--color-hairline);
  background: var(--color-surface-soft);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 28px 20px 22px;
  min-height: 0;
}

.sidebar-new {
  display: inline-flex;
  width: 100%;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-radius: 13px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 18px 30px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.sidebar-new:hover {
  background: var(--color-primary-active);
}

.sidebar-history {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  overflow: auto;
  min-height: 0;
  padding-right: 2px;
}

.sidebar-history__title {
  margin: 18px 0 10px;
  color: var(--color-muted-soft);
  font-size: 13px;
  font-weight: 700;
}

.sidebar-history__title:first-child {
  margin-top: 0;
}

.sidebar-item {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 70px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--color-body);
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms ease;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.45);
}

.sidebar-item--active {
  background: var(--color-surface-cream-strong);
}

.sidebar-item__thumb {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 11px;
  background: var(--color-chip);
  color: var(--color-muted);
  font-size: 18px;
}

.sidebar-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-item__body {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.sidebar-item__title {
  overflow: hidden;
  color: #34302b;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-item__meta {
  color: #8e887f;
  font-size: 12px;
}

.sidebar-item__more {
  border: 0;
  background: transparent;
  color: #514b44;
  font-weight: 900;
  letter-spacing: 1px;
  cursor: pointer;
  padding: 0 4px;
  visibility: hidden;
}

.sidebar-item:hover .sidebar-item__more,
.sidebar-item--active .sidebar-item__more {
  visibility: visible;
}

.sidebar-empty {
  margin: var(--space-lg) 0;
  color: var(--color-muted);
  font-size: 13px;
  text-align: center;
}

.sidebar-all {
  display: inline-flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--color-hairline);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.55);
  color: #3d3934;
  font-weight: 700;
  cursor: pointer;
}

.sidebar-all:hover {
  background: var(--color-surface-card-solid);
}

.studio__main {
  position: relative;
  min-width: 0;
  overflow: auto;
  padding: 28px 32px calc(var(--composer-height) + 48px);
}

.studio__content {
  margin: 0 auto;
  max-width: 1120px;
}

.project-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: 0 0 20px;
}

.project-header__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.005em;
  color: var(--color-ink);
}

.project-header__status {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: #8b857c;
  font-size: 13px;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
}

.status-dot--idle {
  background: var(--color-muted-soft);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-card {
  display: grid;
  grid-template-columns: minmax(360px, 1.1fr) minmax(320px, 0.9fr);
  gap: 38px;
  min-height: 290px;
  padding: 18px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.result-card__preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-frame {
  display: grid;
  flex: 1;
  min-height: 230px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(44, 39, 33, 0.07);
  border-radius: 14px;
  background: linear-gradient(145deg, #fffdf9, #f3eee8);
}

.preview-frame img {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
  border-radius: 6px;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 22px;
  color: #8b867e;
  font-size: 12px;
  padding-left: 4px;
}

.preview-meta button.preview-download {
  margin-left: auto;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-glass-strong);
  color: var(--color-ink);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 11px;
  cursor: pointer;
}

.preview-meta button.preview-download:hover {
  background: var(--color-surface-card-solid);
}

.result-card__info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 22px;
  padding: 18px 18px 10px 0;
}

.info-pill {
  display: inline-block;
  border-radius: 8px;
  padding: 5px 8px;
  background: var(--color-chip-strong);
  color: #6a6258;
  font-size: 12px;
  font-weight: 800;
}

.info-prompt {
  margin: 10px 0 0;
  max-width: 440px;
  color: #37322c;
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  color: #8b867e;
  font-size: 13px;
}

.info-label {
  margin: 0 0 5px;
  color: #3d3730;
  font-size: 13px;
  font-weight: 800;
}

.info-value {
  margin: 0;
  color: #34302b;
  font-size: 13px;
}

.info-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 4px 7px;
  border-radius: 7px;
  background: var(--color-chip-strong);
  color: #6b6257;
  font-size: 11px;
  font-weight: 800;
}

.canvas-hero {
  display: grid;
  place-items: center;
  gap: var(--space-md);
  min-height: 420px;
  padding: var(--space-xxl) var(--space-md);
  text-align: center;
}

.canvas-hero__title {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.05;
}

.canvas-hero__subtitle {
  margin: 0;
  max-width: 560px;
  color: var(--color-muted);
  font-size: 15px;
  font-style: italic;
  line-height: 1.7;
}

.floating-status {
  position: fixed;
  right: var(--space-xl);
  bottom: calc(var(--composer-height) + 36px);
  display: grid;
  gap: var(--space-xs);
  max-width: 460px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-glass-strong);
  color: var(--color-body-strong);
  padding: var(--space-md);
  z-index: 6;
  box-shadow: var(--shadow-soft);
}

.floating-status span {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.floating-status p {
  margin: 0;
}

.floating-status--loading {
  border-color: var(--color-surface-dark-elevated);
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
}

.floating-status--loading span {
  color: var(--color-on-dark-soft);
}

.floating-status--error {
  border-color: rgba(198, 69, 69, 0.45);
  background: var(--color-surface-card-solid);
  color: var(--color-error);
}

.floating-status__bar {
  overflow: hidden;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-dark-elevated);
}

.floating-status__bar span {
  display: block;
  width: 48%;
  height: 100%;
  background: var(--color-on-dark);
  animation: indeterminate 1.4s ease-in-out infinite;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-30%);
  }
  100% {
    transform: translateX(220%);
  }
}

.composer-shell {
  position: fixed;
  left: calc(var(--sidebar-width) + 32px);
  right: 32px;
  bottom: 24px;
  z-index: 4;
  display: grid;
  gap: var(--space-sm);
  margin: 0 auto;
  max-width: 1120px;
  padding: 12px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-glass-strong);
  box-shadow: var(--shadow-glass);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

@media (max-width: 1480px) {
  .composer-shell {
    max-width: none;
  }
}

.composer-shell--dragging {
  border-color: var(--color-accent);
  box-shadow:
    var(--shadow-glass),
    0 0 0 3px rgba(204, 120, 92, 0.18);
}

.composer-file {
  display: none;
}

.composer-textarea {
  position: relative;
  min-height: 118px;
  border: 1px solid rgba(45, 38, 30, 0.08);
  border-radius: 14px;
  background: linear-gradient(180deg, #fffdfa 0%, #f8f5f0 100%);
  padding: 22px 24px;
}

.composer-textarea textarea {
  width: 100%;
  height: 72px;
  resize: none;
  border: 0;
  background: transparent;
  color: #2d2924;
  font-size: 15px;
  line-height: 1.7;
  outline: none;
}

.composer-textarea textarea::placeholder {
  color: #a7a099;
  font-weight: 600;
}

.composer-attachment {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs);
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  background: var(--color-surface-card-solid);
}

.composer-attachment img,
.composer-attachment__fallback {
  width: 48px;
  height: 48px;
  border-radius: 10px;
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
  color: var(--color-accent-active);
  font-weight: 600;
  cursor: pointer;
  padding: var(--space-xs);
}

.composer-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 2px 0;
}

.control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border: 1px solid var(--color-hairline);
  border-radius: 13px;
  background: var(--color-surface-glass-strong);
  color: var(--color-body-strong);
  font-size: 14px;
  font-weight: 800;
  box-shadow: var(--shadow-button-soft);
  cursor: pointer;
}

.control:not(:disabled):hover {
  background: var(--color-surface-card-solid);
}

.control:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.control--upload {
  width: 92px;
}

.control--count {
  width: 40px;
  border-radius: 50%;
  border-color: transparent;
  background: var(--color-chip);
  color: var(--color-muted);
  cursor: default;
}

.control--stepper {
  width: 138px;
  justify-content: space-between;
  padding: 0 6px;
  font-size: 15px;
}

.control--stepper button {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-body-strong);
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.control--stepper button:hover:not(:disabled) {
  background: var(--color-chip);
}

.control--stepper button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.control--stepper span {
  min-width: 36px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.control--dropdown {
  position: relative;
}

.control--dropdown button {
  display: inline-flex;
  width: 168px;
  height: 40px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border: 1px solid var(--color-hairline);
  border-radius: 13px;
  background: var(--color-surface-glass-strong);
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.control--dropdown-model button {
  width: 150px;
}

.control--dropdown button:hover {
  background: var(--color-surface-card-solid);
}

.control-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  margin: 0;
  padding: 6px;
  min-width: 100%;
  list-style: none;
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  background: var(--color-surface-card-solid);
  box-shadow: var(--shadow-soft);
  z-index: 10;
}

.control-menu li {
  margin: 0;
}

.control-menu button {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-body-strong);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
}

.control-menu button:hover {
  background: var(--color-chip);
}

.control-menu__item--active {
  background: var(--color-chip-strong);
  color: var(--color-ink);
}

.control--generate {
  margin-left: auto;
  height: 46px;
  min-width: 142px;
  border: 0;
  border-radius: 12px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 16px;
  font-weight: 800;
  box-shadow: var(--shadow-button);
  cursor: pointer;
}

.control--generate:not(:disabled):hover {
  background: var(--color-primary-active);
}

.composer-mode {
  margin: 0;
  padding: 0 4px;
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 1180px) {
  .composer-shell {
    left: calc(var(--sidebar-width) + 18px);
    right: 18px;
  }

  .result-card {
    grid-template-columns: 1fr;
  }

  .result-card__info {
    padding: 4px;
  }
}

@media (max-width: 1100px) {
  .composer-controls {
    flex-wrap: wrap;
  }

  .control--generate {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 860px) {
  .studio {
    grid-template-columns: 1fr;
  }

  .studio__sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--color-hairline);
  }

  .composer-shell {
    left: 12px;
    right: 12px;
  }
}
</style>
