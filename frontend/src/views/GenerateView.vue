<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import RecentCreationDetailModal from '@/components/gallery/RecentCreationDetailModal.vue';
import RecentCreationsMasonry from '@/components/gallery/RecentCreationsMasonry.vue';
import { useFileUpload } from '@/composables/useFileUpload';
import { useImageGeneration, type GenerateImageOptions } from '@/composables/useImageGeneration';
import { useImageQuota } from '@/composables/useImageQuota';
import { useImageHistory, type GroupedBatch } from '@/composables/useImageHistory';
import { downloadUrl } from '@/utils/download';
import { DATE_BUCKET_LABELS, dateBucket, formatClockTime, type DateBucket } from '@/utils/format';
import {
  ASPECT_CHOICES,
  ASPECT_CHOICE_LABELS,
  ASPECT_RATIO_LABELS,
  DEFAULT_ASPECT_CHOICE,
  DEFAULT_COUNT,
  MAX_COUNT,
  MIN_COUNT,
  type AspectChoice,
  type HistoryEntry,
} from '@/types/image';

const route = useRoute();
const router = useRouter();
const { entries, batches, removeBatch } = useImageHistory();
const { selectedFile, previewUrl, validationMessage, selectFile, clear } = useFileUpload();
const { generate, isLoading, error, lastBatch, statusMessage, clearLastBatch } =
  useImageGeneration();
const { quota, isLoading: isQuotaLoading, refresh: refreshQuota } = useImageQuota();

interface PendingGeneration {
  id: number;
  prompt: string;
  model: string;
  count: number;
  aspectRatio: AspectChoice;
  submittedAt: string;
  referenceFile?: File;
  errorMessage?: string;
}

const prompt = ref('');
const model = ref('gpt-image-2');
const count = ref<number>(DEFAULT_COUNT);
const aspectRatio = ref<AspectChoice>(DEFAULT_ASPECT_CHOICE);
const activeBatchId = ref<string | null>(null);
const pendingGeneration = ref<PendingGeneration | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null);
const isComposerDragging = ref(false);
const aspectMenuOpen = ref(false);
const modelMenuOpen = ref(false);
const aspectButtonRef = ref<HTMLButtonElement | null>(null);
const modelButtonRef = ref<HTMLButtonElement | null>(null);
const selectedRecentEntry = ref<HistoryEntry | null>(null);
let pendingGenerationId = 0;

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

const hasActiveSurface = computed(
  () => pendingGeneration.value !== null || displayedBatch.value !== null,
);
const currentResultEntries = computed(() => displayedBatch.value?.entries ?? []);
const isGeneratingSurface = computed(() => pendingGeneration.value !== null && isLoading.value);
const generationErrorMessage = computed(() => pendingGeneration.value?.errorMessage ?? null);
const hasGenerationError = computed(
  () => generationErrorMessage.value !== null && displayedBatch.value === null,
);
const canSaveCurrent = computed(() => currentResultEntries.value.length > 0 && !isLoading.value);
const surfacePrompt = computed(
  () => pendingGeneration.value?.prompt ?? displayedBatch.value?.prompt ?? '新的生成',
);
const surfaceModel = computed(
  () => pendingGeneration.value?.model ?? displayedBatch.value?.model ?? model.value,
);
const surfaceModelLabel = computed(() => modelDisplayName(surfaceModel.value));
const surfaceDateLabel = computed(() =>
  formatStageDate(pendingGeneration.value?.submittedAt ?? displayedBatch.value?.createdAt),
);

const canGenerate = computed(() => prompt.value.trim().length > 0 && !isLoading.value);
const modeLabel = computed(() => (selectedFile.value ? '参考图生成' : '提示词生成'));
const selectedFileSummary = computed(() => (selectedFile.value ? '1' : '0'));
const quotaLabel = computed(() => {
  if (isQuotaLoading.value) return '额度读取中';
  if (!quota.value) return '额度暂不可用';
  return `剩余额度 ${quota.value.remaining}`;
});

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
      pendingGeneration.value = null;
      clearLastBatch();
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
  await runGeneration(createSnapshotFromCurrentComposer());
}

function createSnapshotFromCurrentComposer(): PendingGeneration {
  pendingGenerationId += 1;
  const snapshot: PendingGeneration = {
    id: pendingGenerationId,
    prompt: prompt.value.trim(),
    model: model.value,
    count: count.value,
    aspectRatio: aspectRatio.value,
    submittedAt: new Date().toISOString(),
  };
  if (selectedFile.value) snapshot.referenceFile = selectedFile.value;
  return snapshot;
}

function createSnapshotFromDisplayedBatch(batch: GroupedBatch): PendingGeneration {
  pendingGenerationId += 1;
  const firstRecord = batch.entries[0]?.record;
  return {
    id: pendingGenerationId,
    prompt: batch.prompt,
    model: batch.model,
    count: Math.min(MAX_COUNT, Math.max(MIN_COUNT, batch.entries.length)),
    aspectRatio: firstRecord?.aspectRatio ?? DEFAULT_ASPECT_CHOICE,
    submittedAt: new Date().toISOString(),
  };
}

function optionsFromSnapshot(snapshot: PendingGeneration): GenerateImageOptions {
  const options: GenerateImageOptions = {
    prompt: snapshot.prompt,
    model: snapshot.model,
    count: snapshot.count,
  };
  if (snapshot.aspectRatio !== 'auto') options.aspectRatio = snapshot.aspectRatio;
  if (snapshot.referenceFile) options.referenceFile = snapshot.referenceFile;
  return options;
}

async function runGeneration(snapshot: PendingGeneration): Promise<void> {
  activeBatchId.value = null;
  pendingGeneration.value = snapshot;
  clearLastBatch();

  prompt.value = snapshot.prompt;
  model.value = snapshot.model;
  count.value = snapshot.count;
  aspectRatio.value = snapshot.aspectRatio;

  try {
    const result = await generate(optionsFromSnapshot(snapshot));
    activeBatchId.value = result.batchId;
    await refreshQuota();
    ElMessage.success(`已生成 ${result.entries.length} 张图片，并保存到历史记录。`);
  } catch (unknownError) {
    const message = messageForError(unknownError);
    if (pendingGeneration.value?.id === snapshot.id) {
      pendingGeneration.value = { ...snapshot, errorMessage: message };
    }
    ElMessage.error(message);
  }
}

function handleSelectBatch(batch: GroupedBatch): void {
  pendingGeneration.value = null;
  activeBatchId.value = batch.batchId;
  prompt.value = batch.prompt;
  const first = batch.entries[0];
  if (first?.record.aspectRatio) aspectRatio.value = first.record.aspectRatio;
  count.value = Math.min(MAX_COUNT, Math.max(MIN_COUNT, batch.entries.length));
}

function handleSelectRecentEntry(entry: HistoryEntry): void {
  selectedRecentEntry.value = entry;
}

function handleCloseRecentDetail(): void {
  selectedRecentEntry.value = null;
}

async function handleCopyPrompt(entry: HistoryEntry): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    ElMessage.error('当前浏览器不支持自动复制。');
    return;
  }
  try {
    await clipboard.writeText(entry.record.prompt);
    ElMessage.success('提示词已复制。');
  } catch {
    ElMessage.error('复制失败。');
  }
}

function handleNewConversation(): void {
  activeBatchId.value = null;
  pendingGeneration.value = null;
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

async function handleDeleteCurrent(): Promise<void> {
  const batch = displayedBatch.value;
  if (!batch) return;
  await handleDeleteBatch(batch.batchId);
  clearLastBatch();
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

function handleHeroPromptKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  void handleSubmit();
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

async function handleEditPrompt(): Promise<void> {
  const snapshot = pendingGeneration.value ?? displayedBatch.value;
  if (!snapshot) return;
  prompt.value = snapshot.prompt;
  model.value = snapshot.model;
  if ('entries' in snapshot) {
    count.value = Math.min(MAX_COUNT, Math.max(MIN_COUNT, snapshot.entries.length));
    aspectRatio.value = snapshot.entries[0]?.record.aspectRatio ?? DEFAULT_ASPECT_CHOICE;
  } else {
    count.value = snapshot.count;
    aspectRatio.value = snapshot.aspectRatio;
  }
  await nextTick();
  composerTextareaRef.value?.focus();
}

async function handleRegenerate(): Promise<void> {
  if (isLoading.value) return;
  const snapshot = pendingGeneration.value ?? displayedBatch.value;
  if (!snapshot) return;
  const nextSnapshot =
    'entries' in snapshot
      ? createSnapshotFromDisplayedBatch(snapshot)
      : createSnapshotFromPending(snapshot);
  await runGeneration(nextSnapshot);
}

function createSnapshotFromPending(snapshot: PendingGeneration): PendingGeneration {
  pendingGenerationId += 1;
  const next: PendingGeneration = {
    id: pendingGenerationId,
    prompt: snapshot.prompt,
    model: snapshot.model,
    count: snapshot.count,
    aspectRatio: snapshot.aspectRatio,
    submittedAt: new Date().toISOString(),
  };
  if (snapshot.referenceFile) next.referenceFile = snapshot.referenceFile;
  return next;
}

function handleSaveCurrent(): void {
  const batch = displayedBatch.value;
  if (!batch) return;
  for (const entry of batch.entries) {
    handleDownload(entry);
  }
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

function chooseAspect(value: AspectChoice): void {
  aspectRatio.value = value;
  aspectMenuOpen.value = false;
}

function chooseModel(value: string): void {
  model.value = value;
  modelMenuOpen.value = false;
}

function handleDocumentClick(event: MouseEvent): void {
  if (!aspectMenuOpen.value && !modelMenuOpen.value) return;
  const target = event.target as Element | null;
  if (target?.closest('.prompt-showcase__select, .prompt-showcase__aspect')) return;
  aspectMenuOpen.value = false;
  modelMenuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

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

function aspectLabel(value: AspectChoice | undefined): string {
  if (!value) return ASPECT_CHOICE_LABELS[DEFAULT_ASPECT_CHOICE];
  if (value === 'auto') return ASPECT_CHOICE_LABELS.auto;
  return ASPECT_RATIO_LABELS[value];
}

function modelDisplayName(value: string): string {
  return value.trim().toUpperCase();
}

function formatStageDate(iso: string | undefined): string {
  const fallback = new Date();
  const date = iso ? new Date(iso) : fallback;
  if (Number.isNaN(date.getTime())) return iso ?? formatStageDate(fallback.toISOString());
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-');
}
</script>

<template>
  <section
    class="studio"
    :class="{ 'studio--home': !hasActiveSurface, 'studio--stage': hasActiveSurface }"
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

    <aside class="studio__sidebar" aria-label="生成历史">
      <div class="sidebar-actions">
        <button type="button" class="sidebar-new" @click="handleNewConversation">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建生成
        </button>
        <button
          type="button"
          class="sidebar-delete"
          :disabled="!displayedBatch"
          :aria-label="'删除当前画布'"
          @click="handleDeleteCurrent"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      <div class="sidebar-history" role="list">
        <template v-for="group in groupedSidebarBatches" :key="group.bucket">
          <p class="sidebar-history__title">{{ bucketLabel(group.bucket) }}</p>
          <div
            v-for="batch in group.batches"
            :key="batch.batchId"
            class="sidebar-item"
            :class="{ 'sidebar-item--active': batch.batchId === activeBatchId }"
            role="listitem"
          >
            <button type="button" class="sidebar-item__select" @click="handleSelectBatch(batch)">
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
            </button>
            <button
              type="button"
              class="sidebar-item__more"
              aria-label="删除该批次"
              @click="handleDeleteBatch(batch.batchId)"
            >
              ···
            </button>
          </div>
        </template>
        <p v-if="batches.length === 0" class="sidebar-empty">尚无历史记录。生成第一张图试试吧。</p>
      </div>

      <button type="button" class="sidebar-all" @click="goToHistoryPage">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        查看全部历史
      </button>
    </aside>

    <main class="studio__main" aria-label="生成结果">
      <div class="studio__content">
        <section v-if="hasActiveSurface" class="generation-stage" aria-live="polite">
          <article
            class="generation-item"
            :class="{
              'generation-item--loading': isGeneratingSurface,
              'generation-item--error': hasGenerationError,
            }"
          >
            <p class="generation-item__date">{{ surfaceDateLabel }}</p>
            <h1 class="generation-item__prompt">{{ surfacePrompt }}</h1>
            <span class="generation-item__model">✦ {{ surfaceModelLabel }}</span>

            <div class="generation-visual" :aria-busy="isGeneratingSurface">
              <div
                v-if="currentResultEntries.length > 0"
                class="generation-result-grid"
                :class="{ 'generation-result-grid--multiple': currentResultEntries.length > 1 }"
              >
                <figure
                  v-for="(entry, index) in currentResultEntries"
                  :key="entry.record.id"
                  class="generated-figure"
                >
                  <div class="generated-figure__frame">
                    <img :src="entry.imageUrl" :alt="`生成结果图片 ${index + 1}`" />
                  </div>
                </figure>
              </div>

              <div v-else-if="isGeneratingSurface" class="generation-placeholder" role="status">
                <span class="generation-badge">生成中...</span>
                <span class="generation-placeholder__status">{{ statusMessage }}</span>
              </div>

              <div v-else class="generation-error-card" role="alert">
                <span>生成失败</span>
                <p>{{ generationErrorMessage ?? error?.message ?? '生成失败，请稍后重试。' }}</p>
              </div>
            </div>

            <div class="generation-actions" aria-label="生成操作">
              <button
                type="button"
                class="generation-action"
                :disabled="isLoading"
                @click="handleEditPrompt"
              >
                ✎ 重新编辑
              </button>
              <button
                type="button"
                class="generation-action"
                :disabled="isLoading"
                @click="handleRegenerate"
              >
                ↻ 再次生成
              </button>
              <button
                v-if="currentResultEntries.length > 0"
                type="button"
                class="generation-action"
                :disabled="!canSaveCurrent"
                @click="handleSaveCurrent"
              >
                ↓ 保存
              </button>
            </div>
          </article>
        </section>

        <template v-else>
          <section class="canvas-hero" aria-live="polite">
            <p class="canvas-hero__kicker hero-rise hero-rise--1">REF2IMAGE STUDIO</p>
            <h2 class="canvas-hero__title hero-rise hero-rise--2">
              Turn your <span>idea</span> into images
            </h2>
            <p class="canvas-hero__subtitle hero-rise hero-rise--3">
              用 GPT-IMAGE-2 将你的创意变为精美图片，只需描述你脑海中的画面
            </p>
            <form
              class="prompt-showcase hero-rise hero-rise--4"
              aria-label="快速生成输入组件"
              @submit.prevent="handleSubmit"
              @dragenter.prevent="handleDragEnter"
              @dragover.prevent="handleDragEnter"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleComposerDrop"
            >
              <button
                type="button"
                class="prompt-showcase__add"
                aria-label="添加参考图"
                :disabled="isLoading"
                @click="openUploadPicker"
              >
                +
              </button>
              <textarea
                v-model="prompt"
                class="prompt-showcase__input"
                name="heroPrompt"
                placeholder="请输入你的创意（按 Enter 发送，Shift+Enter 换行）"
                :disabled="isLoading"
                @keydown="handleHeroPromptKeydown"
                @paste="handlePaste"
              />
              <div v-if="selectedFile" class="prompt-showcase__attachment">
                <span>参考图已添加</span>
                <button type="button" :disabled="isLoading" @click="clear">移除</button>
              </div>
              <div class="prompt-showcase__bar">
                <span class="prompt-showcase__model">✦ GPT-IMAGE-2</span>
                <span class="prompt-showcase__grid">{{ quotaLabel }}</span>
                <div class="prompt-showcase__aspect">
                  <button
                    type="button"
                    class="prompt-showcase__smart"
                    :aria-expanded="aspectMenuOpen"
                    aria-label="选择图片比例"
                    @click="toggleAspectMenu"
                  >
                    <span>比例</span>
                    <strong>{{ aspectLabel(aspectRatio) }}</strong>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <ul v-if="aspectMenuOpen" class="prompt-showcase__menu" role="listbox">
                    <li v-for="value in ASPECT_CHOICES" :key="value">
                      <button
                        type="button"
                        role="option"
                        :aria-selected="value === aspectRatio"
                        @click="chooseAspect(value)"
                      >
                        {{ aspectLabel(value) }}
                      </button>
                    </li>
                  </ul>
                </div>
                <span class="prompt-showcase__public">公开 <i aria-hidden="true" /></span>
                <button type="submit" class="prompt-showcase__generate" :disabled="!canGenerate">
                  {{ isLoading ? '生成中' : '生成' }}
                </button>
              </div>
            </form>
            <div class="hero-daily hero-rise hero-rise--5" aria-label="今日生成数量">
              <span class="hero-daily__stars" aria-hidden="true">★★★★★</span>
              <span>今日已生成 4,200+ 张图片</span>
              <span class="hero-daily__dots" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
          </section>

          <RecentCreationsMasonry :entries="entries" @select="handleSelectRecentEntry" />
        </template>
      </div>
    </main>

    <form
      v-if="hasActiveSurface"
      class="prompt-showcase prompt-showcase--dock"
      :class="{ 'prompt-showcase--dragging': isComposerDragging }"
      aria-label="图片生成输入框"
      @submit.prevent="handleSubmit"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleComposerDrop"
    >
      <button
        type="button"
        class="prompt-showcase__add"
        aria-label="添加参考图"
        :disabled="isLoading"
        @click="openUploadPicker"
      >
        +
      </button>
      <textarea
        id="generate-prompt"
        ref="composerTextareaRef"
        v-model="prompt"
        class="prompt-showcase__input"
        name="prompt"
        placeholder="输入你想要生成的画面，也可直接粘贴图片"
        :disabled="isLoading"
        @keydown="handleHeroPromptKeydown"
        @paste="handlePaste"
      />

      <div
        v-if="selectedFile"
        class="prompt-showcase__attachment prompt-showcase__attachment--rich"
      >
        <img
          v-if="previewUrl"
          class="prompt-showcase__attachment-preview"
          :src="previewUrl"
          alt="已添加参考图预览"
        />
        <span v-else class="prompt-showcase__attachment-fallback" aria-hidden="true">图</span>
        <span class="prompt-showcase__attachment-meta">
          <strong>参考图已添加</strong>
          <span v-if="validationMessage" class="prompt-showcase__attachment-warning">{{
            validationMessage
          }}</span>
        </span>
        <button type="button" :disabled="isLoading" @click="clear">移除</button>
      </div>

      <div class="prompt-showcase__bar">
        <div class="prompt-showcase__select prompt-showcase__model-control">
          <button
            ref="modelButtonRef"
            type="button"
            class="prompt-showcase__smart prompt-showcase__smart--model"
            :aria-expanded="modelMenuOpen"
            aria-label="选择生成模型"
            @click="toggleModelMenu"
          >
            <span>模型</span>
            <strong>{{ modelDisplayName(model) }}</strong>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul v-if="modelMenuOpen" class="prompt-showcase__menu" role="listbox">
            <li v-for="value in modelOptions" :key="value">
              <button
                type="button"
                role="option"
                :aria-selected="value === model"
                :class="{ 'prompt-showcase__menu-item--active': value === model }"
                @click="chooseModel(value)"
              >
                {{ modelDisplayName(value) }}
              </button>
            </li>
          </ul>
        </div>
        <span class="prompt-showcase__grid">{{ quotaLabel }}</span>
        <span class="prompt-showcase__grid">参考图 {{ selectedFileSummary }}</span>
        <div class="prompt-showcase__stepper" role="group" aria-label="生成数量">
          <button
            type="button"
            :disabled="count <= MIN_COUNT"
            aria-label="减少数量"
            @click="decreaseCount"
          >
            −
          </button>
          <span>{{ count }} 张</span>
          <button
            type="button"
            :disabled="count >= MAX_COUNT"
            aria-label="增加数量"
            @click="increaseCount"
          >
            ＋
          </button>
        </div>
        <div class="prompt-showcase__aspect prompt-showcase__select">
          <button
            ref="aspectButtonRef"
            type="button"
            class="prompt-showcase__smart"
            :aria-expanded="aspectMenuOpen"
            aria-label="选择图片比例"
            @click="toggleAspectMenu"
          >
            <span>比例</span>
            <strong>{{ aspectLabel(aspectRatio) }}</strong>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul v-if="aspectMenuOpen" class="prompt-showcase__menu" role="listbox">
            <li v-for="value in ASPECT_CHOICES" :key="value">
              <button
                type="button"
                role="option"
                :aria-selected="value === aspectRatio"
                :class="{ 'prompt-showcase__menu-item--active': value === aspectRatio }"
                @click="chooseAspect(value)"
              >
                {{ aspectLabel(value) }}
              </button>
            </li>
          </ul>
        </div>
        <span class="prompt-showcase__mode" aria-live="polite">{{ modeLabel }}</span>
        <button
          type="button"
          class="prompt-showcase__generate"
          :disabled="!canGenerate"
          @click="handleSubmit"
        >
          {{ isLoading ? '生成中' : '生成' }}
        </button>
      </div>
    </form>

    <RecentCreationDetailModal
      :entry="selectedRecentEntry"
      @close="handleCloseRecentDetail"
      @copy-prompt="handleCopyPrompt"
    />
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
  border-right: 1px solid oklch(24% 0.012 78deg / 0.08);
  background: oklch(99% 0.004 88deg / 0.58);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  padding: 28px 20px 22px;
  min-height: 0;
}

.studio--home {
  display: flex;
  min-height: calc(100vh - var(--topbar-height));
  flex-direction: column;
  align-items: center;
}

.studio--home .studio__sidebar {
  display: none;
}

.studio--home .studio__main {
  width: 100%;
  overflow: visible;
  padding: 0;
}

.sidebar-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.sidebar-new {
  display: inline-flex;
  flex: 1;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(180deg, oklch(25% 0.012 76deg), var(--color-primary));
  color: var(--color-on-primary);
  font-size: 15px;
  font-weight: 700;
  box-shadow:
    inset -4px -6px 25px 0 rgba(201, 201, 201, 0.08),
    inset 4px 4px 10px 0 rgba(29, 29, 29, 0.24);
  cursor: pointer;
}

.sidebar-delete {
  display: inline-grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--color-hairline);
  border-radius: 13px;
  background: var(--color-surface-glass-strong);
  color: var(--color-body-strong);
  cursor: pointer;
}

.sidebar-delete:not(:disabled):hover {
  background: var(--color-surface-card-solid);
  color: var(--color-error);
}

.sidebar-delete:disabled {
  color: var(--color-muted-soft);
  cursor: not-allowed;
  opacity: 0.5;
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
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 70px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: transparent;
  color: var(--color-body);
  transition: background-color 140ms ease;
}

.sidebar-item__select {
  display: grid;
  min-width: 0;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
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
  padding: 0 40px calc(var(--composer-height) + 48px);
}

.studio__content {
  margin: 0 auto;
  max-width: 1200px;
}

.studio--stage {
  --stage-rail-width: min(calc(100vw - 64px), 960px);

  display: flex;
  min-height: calc(100vh - var(--topbar-height));
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  isolation: isolate;
}

.studio--stage::before,
.studio--stage::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: 0;
  pointer-events: none;
}

.studio--stage::before {
  z-index: 0;
  height: min(54vh, 520px);
  background:
    radial-gradient(circle at 18% 8%, rgba(116, 184, 255, 0.36), transparent 34%),
    radial-gradient(circle at 76% 14%, rgba(235, 136, 226, 0.3), transparent 35%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0));
  opacity: 0.9;
}

.studio--stage::after {
  z-index: 0;
  height: min(44vh, 420px);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.58) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.58) 1px, transparent 1px);
  background-size: 112px 112px;
  mask-image: linear-gradient(to bottom, black 0%, transparent 92%);
  opacity: 0.46;
}

.studio--stage .studio__sidebar {
  display: none;
}

.studio--stage .studio__main {
  z-index: 1;
  width: 100%;
  min-height: calc(100vh - var(--topbar-height));
  overflow: visible;
  padding: 0 24px calc(var(--composer-height) + 84px);
}

.studio--stage .studio__content {
  width: 100%;
  max-width: none;
}

.generation-stage {
  display: flex;
  width: var(--stage-rail-width);
  min-height: calc(100vh - var(--topbar-height) - var(--composer-height) - 44px);
  align-items: flex-start;
  justify-content: flex-start;
  margin: 0 auto;
  padding: 74px 0 0;
}

.generation-item {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  color: var(--color-ink);
  text-align: left;
}

.generation-item__date {
  width: min(100%, 420px);
  margin: 0 0 16px;
  color: oklch(66% 0.014 268deg);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.generation-item__prompt {
  width: min(100%, 420px);
  margin: 0 0 14px;
  color: #292521;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.65;
  white-space: pre-wrap;
}

.generation-item__model {
  display: inline-flex;
  width: min(100%, 420px);
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  margin-bottom: 18px;
  color: #746f86;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.generation-visual {
  display: grid;
  width: 100%;
  justify-items: start;
}

.generation-placeholder,
.generation-error-card,
.generated-figure__frame {
  width: min(100%, 320px);
  aspect-ratio: 1;
  border: 1px solid rgba(95, 74, 180, 0.08);
  border-radius: 22px;
  box-shadow: 0 22px 58px rgba(111, 99, 160, 0.08);
}

.generation-placeholder {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle, rgba(142, 116, 255, 0.34) 0 1.8px, transparent 2.4px) 0 0 / 27px 27px,
    radial-gradient(circle at 50% 45%, rgba(159, 136, 255, 0.1), transparent 56%),
    linear-gradient(145deg, rgba(253, 252, 255, 0.98), rgba(246, 243, 255, 0.96));
}

.generation-placeholder::before {
  content: '';
  position: absolute;
  inset: -22%;
  background: linear-gradient(
    112deg,
    transparent 10%,
    rgba(255, 255, 255, 0.08) 34%,
    rgba(255, 255, 255, 0.74) 50%,
    rgba(255, 255, 255, 0.06) 66%,
    transparent 90%
  );
  animation: placeholder-shimmer 2.2s ease-in-out infinite;
  transform: translateX(-56%);
}

.generation-placeholder::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 46%, rgba(141, 112, 255, 0.14), transparent 54%);
  animation: placeholder-breathe 2.4s ease-in-out infinite;
}

.generation-badge {
  position: absolute;
  z-index: 2;
  top: 18px;
  left: 18px;
  display: inline-flex;
  height: 30px;
  align-items: center;
  border-radius: var(--radius-pill);
  background: rgba(39, 39, 43, 0.84);
  color: #fffaf4;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
  padding: 0 13px;
  box-shadow: 0 10px 28px rgba(38, 32, 56, 0.14);
}

.generation-placeholder__status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.generation-result-grid {
  display: grid;
  width: min(100%, 320px);
  gap: 14px;
}

.generation-result-grid--multiple {
  width: min(100%, 680px);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.generated-figure {
  margin: 0;
}

.generated-figure__frame {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  animation: result-reveal 240ms ease-out both;
}

.generated-figure__frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.generation-error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 252, 249, 0.84);
  color: var(--color-error);
  padding: 24px;
  text-align: center;
}

.generation-error-card span {
  color: var(--color-error);
  font-size: 15px;
  font-weight: 800;
}

.generation-error-card p {
  margin: 0;
  color: #5f5550;
  font-size: 13px;
  line-height: 1.7;
}

.generation-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 12px;
  width: min(100%, 420px);
  margin-top: 22px;
}

.generation-action {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(44, 39, 33, 0.08);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.78);
  color: #4b4640;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 0 17px;
  box-shadow: 0 8px 22px rgba(50, 45, 40, 0.045);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition:
    transform 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.generation-action:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 26px rgba(50, 45, 40, 0.075);
  transform: translateY(-1px);
}

.generation-action:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

@keyframes placeholder-shimmer {
  0% {
    transform: translateX(-58%);
  }

  100% {
    transform: translateX(58%);
  }
}

@keyframes placeholder-breathe {
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

@keyframes result-reveal {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.canvas-hero {
  display: flex;
  min-height: auto;
  max-width: 1200px;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin: 0 auto;
  padding: 214px 24px 0;
  text-align: center;
}

.canvas-hero__kicker {
  margin: 0 0 4px;
  color: oklch(44% 0.012 78deg);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
}

.canvas-hero__title {
  max-width: 980px;
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 80px;
  font-weight: 500;
  letter-spacing: -0.04em;
  line-height: 0.92;
}

.canvas-hero__title span {
  display: inline-block;
  font-family: var(--font-serif);
  font-size: 100px;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.035em;
}

.canvas-hero__subtitle {
  max-width: 620px;
  margin: 0 0 18px;
  color: #373a46;
  font-size: 18px;
  line-height: 1.72;
  opacity: 0.8;
}

.prompt-showcase {
  position: relative;
  display: grid;
  width: min(100%, 960px);
  min-height: 172px;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
  column-gap: 12px;
  overflow: visible;
  border: 1px solid oklch(24% 0.012 78deg / 0.12);
  border-radius: 24px;
  background: oklch(99.1% 0.004 88deg / 0.94);
  box-shadow: 0 18px 60px rgba(70, 62, 54, 0.08);
  text-align: left;
}

.prompt-showcase__add {
  width: 44px;
  height: 44px;
  margin: 20px 0 0 20px;
  border: 1px dashed oklch(24% 0.012 78deg / 0.18);
  border-radius: 12px;
  background: oklch(98.8% 0.005 88deg);
  color: oklch(70% 0.01 78deg);
  cursor: pointer;
  font-size: 24px;
  font-weight: 500;
}

.prompt-showcase__input {
  height: 96px;
  min-width: 0;
  resize: none;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font-size: 15px;
  line-height: 1.6;
  outline: none;
  padding: 28px 24px 16px 0;
}

.prompt-showcase__input::placeholder {
  color: oklch(31% 0.012 78deg);
  opacity: 0.82;
}

.prompt-showcase__attachment {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 20px 12px;
  border-radius: 12px;
  background: oklch(96.4% 0.01 86deg);
  color: oklch(42% 0.012 78deg);
  font-size: 13px;
  padding: 8px 10px;
}

.prompt-showcase__attachment button {
  border: 0;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font-weight: 700;
}

.prompt-showcase__bar {
  grid-column: 1 / -1;
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 12px;
  border-top: 1px solid oklch(24% 0.012 78deg / 0.08);
  padding: 10px 20px 12px;
}

.prompt-showcase__model {
  display: inline-flex;
  height: 30px;
  align-items: center;
  border-radius: 18px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 13px;
  font-weight: 800;
  padding: 0 13px;
}

.prompt-showcase__grid {
  display: inline-flex;
  height: 34px;
  align-items: center;
  border-radius: 18px;
  background: oklch(96% 0.008 86deg);
  color: oklch(42% 0.012 78deg);
  font-size: 13px;
  font-weight: 800;
  padding: 0 12px;
}

.prompt-showcase__aspect {
  position: relative;
}

.prompt-showcase__smart {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 18px;
  background: oklch(96% 0.008 86deg);
  color: oklch(42% 0.012 78deg);
  cursor: pointer;
  font-size: 13px;
  padding: 0 12px;
}

.prompt-showcase__smart strong {
  color: var(--color-ink);
}

.prompt-showcase__menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 20;
  min-width: 150px;
  margin: 0;
  padding: 6px;
  border: 1px solid var(--color-hairline);
  border-radius: 12px;
  background: var(--color-surface-card-solid);
  box-shadow: var(--shadow-soft);
  list-style: none;
}

.prompt-showcase__menu button {
  display: block;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-body-strong);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 10px;
  text-align: left;
}

.prompt-showcase__menu button:hover {
  background: var(--color-chip);
}

.prompt-showcase__public {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  color: oklch(46% 0.012 78deg);
  font-size: 13px;
  font-weight: 700;
}

.prompt-showcase__public i {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: oklch(82% 0.006 86deg);
}

.prompt-showcase__public i::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: oklch(99% 0.004 88deg);
}

.prompt-showcase__generate {
  height: 40px;
  min-width: 72px;
  border: 0;
  border-radius: 20px;
  background: oklch(72% 0.006 86deg);
  color: var(--color-on-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  padding: 0 20px;
}

.prompt-showcase__generate:not(:disabled) {
  background: linear-gradient(180deg, oklch(27% 0.012 76deg), var(--color-primary));
  box-shadow:
    inset -4px -6px 25px 0 rgba(201, 201, 201, 0.08),
    inset 4px 4px 10px 0 rgba(29, 29, 29, 0.24);
}

.hero-daily {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  color: oklch(55% 0.012 78deg);
  font-size: 14px;
  font-weight: 700;
}

.hero-daily__stars {
  color: oklch(72% 0.14 82deg);
  letter-spacing: 0.06em;
}

.hero-daily__dots {
  display: inline-flex;
  gap: 6px;
}

.hero-daily__dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.hero-daily__dots i:nth-child(1) {
  background: oklch(61% 0.18 252deg);
}

.hero-daily__dots i:nth-child(2) {
  background: oklch(66% 0.2 28deg);
}

.hero-daily__dots i:nth-child(3) {
  background: oklch(74% 0.17 74deg);
}

.hero-daily__dots i:nth-child(4) {
  background: oklch(68% 0.16 146deg);
}

.hero-daily__dots i:nth-child(5) {
  background: oklch(66% 0.14 285deg);
}

.hero-rise {
  animation: fade-slide-up 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hero-rise--1 {
  animation-delay: 40ms;
}

.hero-rise--2 {
  animation-delay: 120ms;
}

.hero-rise--3 {
  animation-delay: 200ms;
}

.hero-rise--4 {
  animation-delay: 280ms;
}

.hero-rise--5 {
  animation-delay: 360ms;
}

@keyframes fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(22px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prompt-showcase--dock {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 4;
  width: var(--stage-rail-width);
  min-height: 152px;
  margin: 0;
  background: oklch(99.1% 0.004 88deg / 0.92);
  box-shadow: 0 18px 60px rgba(70, 62, 54, 0.12);
  transform: translateX(-50%);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.prompt-showcase--dragging {
  border-color: var(--color-accent);
  box-shadow:
    0 18px 60px rgba(70, 62, 54, 0.12),
    0 0 0 3px rgba(204, 120, 92, 0.18);
}

.composer-file {
  display: none;
}

.prompt-showcase--dock .prompt-showcase__input {
  height: 86px;
  padding-top: 24px;
}

.prompt-showcase__attachment--rich {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  justify-content: initial;
}

.prompt-showcase__attachment-preview,
.prompt-showcase__attachment-fallback {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  object-fit: cover;
}

.prompt-showcase__attachment-fallback {
  display: grid;
  place-items: center;
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  font-family: var(--font-code);
}

.prompt-showcase__attachment-meta {
  display: grid;
  min-width: 0;
  color: var(--color-muted);
  font-size: 13px;
}

.prompt-showcase__attachment-meta strong {
  color: var(--color-ink);
}

.prompt-showcase__attachment-warning {
  color: var(--color-warning);
}

.prompt-showcase__select {
  position: relative;
}

.prompt-showcase__model-control {
  flex: 0 0 auto;
}

.prompt-showcase__smart--model {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.prompt-showcase__smart--model strong {
  color: inherit;
}

.prompt-showcase__stepper {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 4px;
  border-radius: 18px;
  background: oklch(96% 0.008 86deg);
  color: oklch(42% 0.012 78deg);
  font-size: 13px;
  font-weight: 800;
  padding: 0 8px;
}

.prompt-showcase__stepper button {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
}

.prompt-showcase__stepper button:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.72);
}

.prompt-showcase__stepper button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.prompt-showcase__stepper span {
  min-width: 38px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.prompt-showcase__menu-item--active {
  background: var(--color-chip-strong);
  color: var(--color-ink);
}

.prompt-showcase__mode {
  display: inline-flex;
  height: 34px;
  align-items: center;
  margin-left: auto;
  color: oklch(46% 0.012 78deg);
  font-size: 13px;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .hero-rise,
  .generation-placeholder::before,
  .generation-placeholder::after,
  .generated-figure__frame {
    animation: none;
  }

  .generation-action {
    transition: none;
  }
}

@media (max-width: 1180px) {
  .generation-stage {
    padding-top: 58px;
  }

  .canvas-hero {
    padding-top: 180px;
  }

  .studio--home .canvas-hero {
    padding-top: 180px;
  }

  .canvas-hero__title {
    font-size: 58px;
  }

  .canvas-hero__title span {
    font-size: 72px;
  }
}

@media (max-width: 1100px) {
  .prompt-showcase--dock .prompt-showcase__bar {
    flex-wrap: wrap;
  }

  .prompt-showcase--dock .prompt-showcase__mode {
    margin-left: 0;
  }

  .prompt-showcase--dock .prompt-showcase__generate {
    margin-left: auto;
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

  .studio--stage {
    --stage-rail-width: min(calc(100vw - 24px), 720px);
  }

  .studio--stage .studio__main {
    padding-right: 12px;
    padding-left: 12px;
  }

  .generation-stage {
    padding: 42px 0 0;
  }

  .generation-item__date,
  .generation-item__prompt,
  .generation-item__model,
  .generation-visual,
  .generation-placeholder,
  .generation-error-card,
  .generated-figure__frame,
  .generation-result-grid {
    width: min(100%, 300px);
  }

  .prompt-showcase--dock .prompt-showcase__bar {
    align-items: flex-start;
  }

  .prompt-showcase--dock .prompt-showcase__generate {
    width: 100%;
    margin-left: 0;
  }

  .canvas-hero,
  .studio--home .canvas-hero {
    min-height: auto;
    padding: 96px 16px 0;
  }

  .canvas-hero__title {
    font-size: 42px;
  }

  .canvas-hero__title span {
    font-size: 54px;
  }
}
</style>
