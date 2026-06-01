<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import RecentCreationDetailModal from '@/components/gallery/RecentCreationDetailModal.vue';
import RecentCreationsMasonry from '@/components/gallery/RecentCreationsMasonry.vue';
import { useAuth } from '@/composables/useAuth';
import { useFileUpload } from '@/composables/useFileUpload';
import { useImageGeneration, type GenerateImageOptions } from '@/composables/useImageGeneration';
import { useImageQuota } from '@/composables/useImageQuota';
import { useImageHistory, type GroupedBatch } from '@/composables/useImageHistory';
import { usePublicGallery } from '@/composables/usePublicGallery';
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

interface Props {
  mode?: 'discover' | 'generate';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'discover',
});

const HERO_PROMPT_SUGGESTIONS = [
  '一间清晨阳光洒入的复古书房，木质书桌上摆着咖啡、手稿与一束白色小花。',
  '雨夜城市街角的电影感人像，霓虹倒影铺在湿润路面，色调克制而温暖。',
  '为独立咖啡品牌设计一张极简海报，奶油色背景、手写字标与柔和产品摄影。',
  '一只戴着丝绒披肩的橘猫坐在老式相机旁，像旧杂志封面的主角。',
  '未来感植物实验室，透明玻璃温室里漂浮着发光叶片与细密水雾。',
] as const;
const DEFAULT_HERO_PROMPT_SUGGESTION = HERO_PROMPT_SUGGESTIONS[0];

const route = useRoute();
const router = useRouter();
const { isAdmin } = useAuth();
const { batches, removeBatch } = useImageHistory();
const {
  entries: galleryEntries,
  add: addPublicGalleryRecord,
  removeAsAdmin: removePublicGalleryRecordAsAdmin,
} = usePublicGallery();
const { selectedFiles, selectFiles, replaceFiles, clear } = useFileUpload();
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
  referenceFiles?: File[];
  referenceFile?: File;
  referenceIds?: string[];
  referenceId?: string;
  demoPresetId?: string;
  isPublic: boolean;
  errorMessage?: string;
}

interface GenerationFeedPendingItem {
  type: 'pending';
  key: string;
  prompt: string;
  model: string;
  createdAt: string;
  statusLabel: string;
  entries: HistoryEntry[];
  snapshot: PendingGeneration;
  errorMessage?: string;
}

interface GenerationFeedBatchItem {
  type: 'batch';
  key: string;
  prompt: string;
  model: string;
  createdAt: string;
  statusLabel: string;
  entries: HistoryEntry[];
  batch: GroupedBatch;
  isActive: boolean;
}

type GenerationFeedItem = GenerationFeedPendingItem | GenerationFeedBatchItem;

const prompt = ref('');
const model = ref('gpt-image-2');
const count = ref<number>(DEFAULT_COUNT);
const aspectRatio = ref<AspectChoice>(DEFAULT_ASPECT_CHOICE);
const isPublicGeneration = ref(false);
const activeBatchId = ref<string | null>(null);
const pendingGeneration = ref<PendingGeneration | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null);
const reusedReferenceId = ref<string | null>(null);
const isComposerDragging = ref(false);
const aspectMenuOpen = ref(false);
const modelMenuOpen = ref(false);
const aspectButtonRef = ref<HTMLButtonElement | null>(null);
const modelButtonRef = ref<HTMLButtonElement | null>(null);
const selectedRecentEntry = ref<HistoryEntry | null>(null);
const deletingGalleryEntryId = ref<string | null>(null);
const deletingBatchId = ref<string | null>(null);
const confirmingDeleteBatchId = ref<string | null>(null);
const isHeroPromptFocused = ref(false);
const isDiscoverSubmitTransitionActive = ref(false);
const activeHeroSuggestion = ref<string>(DEFAULT_HERO_PROMPT_SUGGESTION);
const streamedHeroSuggestion = ref<string>('');
const hasReducedMotion = ref(false);
let pendingGenerationId = 0;
let heroSuggestionTimer: number | null = null;
let heroSuggestionIndex = 0;
let heroSuggestionCharIndex = 0;
let reducedMotionMediaQuery: MediaQueryList | null = null;
let isHeroSuggestionReady = false;

const modelOptions = ['gpt-image-2'] as const;

const fallbackLastBatch = computed<GroupedBatch | null>(() => {
  if (!lastBatch.value) return null;
  return {
    batchId: lastBatch.value.batchId,
    createdAt: lastBatch.value.entries[0]?.record.createdAt ?? new Date().toISOString(),
    prompt: lastBatch.value.entries[0]?.record.prompt ?? prompt.value,
    model: lastBatch.value.entries[0]?.record.model ?? model.value,
    entries: [...lastBatch.value.entries],
  };
});

const displayedBatch = computed<GroupedBatch | null>(() => {
  if (activeBatchId.value) {
    const hit = batches.value.find((batch) => batch.batchId === activeBatchId.value);
    if (hit) return hit;
  }
  if (lastBatch.value) {
    const fromLast = batches.value.find((batch) => batch.batchId === lastBatch.value?.batchId);
    if (fromLast) return fromLast;
    return fallbackLastBatch.value;
  }
  return batches.value[0] ?? null;
});

const generationFeedItems = computed<GenerationFeedItem[]>(() => {
  const items: GenerationFeedItem[] = [];
  const pending = pendingGeneration.value;

  if (pending) {
    const matchedBatch = activeBatchId.value
      ? batches.value.find((batch) => batch.batchId === activeBatchId.value)
      : null;
    if (!matchedBatch || isLoading.value || pending.errorMessage) {
      items.push({
        type: 'pending',
        key: `pending-${pending.id}`,
        prompt: pending.prompt,
        model: pending.model,
        createdAt: pending.submittedAt,
        statusLabel: pending.errorMessage ? '生成失败' : '生成中...',
        entries: [],
        snapshot: pending,
        ...(pending.errorMessage !== undefined ? { errorMessage: pending.errorMessage } : {}),
      });
    }
  }

  for (const batch of batches.value) {
    items.push({
      type: 'batch',
      key: batch.batchId,
      prompt: batch.prompt,
      model: batch.model,
      createdAt: batch.createdAt,
      statusLabel: '已保存',
      entries: batch.entries,
      batch,
      isActive: batch.batchId === activeBatchId.value,
    });
  }

  const fallback = fallbackLastBatch.value;
  const hasFallback = items.some(
    (item) => item.type === 'batch' && item.batch.batchId === fallback?.batchId,
  );
  if (fallback && !hasFallback) {
    items.push({
      type: 'batch',
      key: fallback.batchId,
      prompt: fallback.prompt,
      model: fallback.model,
      createdAt: fallback.createdAt,
      statusLabel: '已保存',
      entries: fallback.entries,
      batch: fallback,
      isActive: fallback.batchId === activeBatchId.value,
    });
  }

  return items;
});

const hasGeneratedSurface = computed(
  () => pendingGeneration.value !== null || generationFeedItems.value.length > 0,
);
const isGenerateWorkspace = computed(() => props.mode === 'generate');
const hasActiveSurface = computed(
  () =>
    isGenerateWorkspace.value ||
    (props.mode === 'discover' &&
      isDiscoverSubmitTransitionActive.value &&
      pendingGeneration.value !== null),
);
const shouldShowWorkspaceEmpty = computed(
  () => isGenerateWorkspace.value && !hasGeneratedSurface.value,
);
const shouldShowHeroSuggestion = computed(
  () => !hasActiveSurface.value && prompt.value.length === 0 && !isHeroPromptFocused.value,
);
const heroSuggestionText = computed(() =>
  hasReducedMotion.value ? activeHeroSuggestion.value : streamedHeroSuggestion.value,
);
const canGenerate = computed(() => prompt.value.trim().length > 0 && !isLoading.value);
const hasReferenceContext = computed(
  () => selectedFiles.value.length > 0 || reusedReferenceId.value !== null,
);
const modeLabel = computed(() => (hasReferenceContext.value ? '参考图生成' : '提示词生成'));
const selectedFileSummary = computed(() =>
  reusedReferenceId.value !== null ? '历史参考图' : `${selectedFiles.value.length}`,
);
const referenceAttachmentTitle = computed(() =>
  selectedFiles.value.length > 0
    ? selectedFiles.value.length > 1
      ? `已添加 ${selectedFiles.value.length} 张参考图`
      : '参考图已添加'
    : '已沿用历史参考图',
);
const primarySelectedFile = computed(() => selectedFiles.value[0] ?? null);
const attachmentWarning = computed(
  () =>
    selectedFiles.value.find((item) => item.validationMessage !== null)?.validationMessage ?? null,
);
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
  if (activeBatchId.value) {
    const exists = nextBatches.some((batch) => batch.batchId === activeBatchId.value);
    if (!exists) activeBatchId.value = null;
  }
  if (
    confirmingDeleteBatchId.value !== null &&
    !nextBatches.some((batch) => batch.batchId === confirmingDeleteBatchId.value)
  ) {
    confirmingDeleteBatchId.value = null;
  }
});

watch(
  () => props.mode,
  (mode) => {
    if (mode === 'generate') isDiscoverSubmitTransitionActive.value = false;
  },
);

watch(shouldShowHeroSuggestion, (isVisible) => {
  if (!isHeroSuggestionReady) return;
  if (!isVisible || hasReducedMotion.value) {
    stopHeroSuggestionTimer();
    return;
  }
  if (heroSuggestionCharIndex >= activeHeroSuggestion.value.length) {
    scheduleNextHeroSuggestion();
  } else {
    scheduleHeroSuggestionTick(220);
  }
});

async function handleSubmit(): Promise<void> {
  if (!canGenerate.value) return;
  const snapshot = createSnapshotFromCurrentComposer();
  if (props.mode === 'discover') {
    isDiscoverSubmitTransitionActive.value = true;
    void router.push('/generate');
  }
  await runGeneration(snapshot);
}

function createSnapshotFromCurrentComposer(): PendingGeneration {
  pendingGenerationId += 1;
  const snapshot: PendingGeneration = {
    id: pendingGenerationId,
    prompt: prompt.value.trim(),
    model: model.value,
    count: count.value,
    aspectRatio: aspectRatio.value,
    isPublic: isPublicGeneration.value,
    submittedAt: new Date().toISOString(),
  };
  if (selectedFiles.value.length > 0) {
    snapshot.referenceFiles = selectedFiles.value.map((item) => item.file);
  }
  else if (reusedReferenceId.value) snapshot.referenceId = reusedReferenceId.value;
  return snapshot;
}

function createSnapshotFromDisplayedBatch(batch: GroupedBatch): PendingGeneration {
  pendingGenerationId += 1;
  const firstRecord = batch.entries[0]?.record;
  const referenceIds = referenceIdsFromBatch(batch);
  const snapshot: PendingGeneration = {
    id: pendingGenerationId,
    prompt: batch.prompt,
    model: batch.model,
    count: Math.min(MAX_COUNT, Math.max(MIN_COUNT, batch.entries.length)),
    aspectRatio: firstRecord?.aspectRatio ?? DEFAULT_ASPECT_CHOICE,
    isPublic: batch.entries.some((entry) => entry.record.isPublic),
    submittedAt: new Date().toISOString(),
  };
  if (referenceIds.length > 0) snapshot.referenceIds = referenceIds;
  return snapshot;
}

function optionsFromSnapshot(snapshot: PendingGeneration): GenerateImageOptions {
  const options: GenerateImageOptions = {
    prompt: snapshot.prompt,
    model: snapshot.model,
    count: snapshot.count,
  };
  if (snapshot.aspectRatio !== 'auto') options.aspectRatio = snapshot.aspectRatio;
  const referenceFiles = normalizeReferenceFiles(snapshot.referenceFiles, snapshot.referenceFile);
  const referenceIds = normalizeReferenceIds(snapshot.referenceIds, snapshot.referenceId);
  if (referenceFiles.length > 0) options.referenceFiles = referenceFiles;
  else if (referenceIds.length > 0) options.referenceIds = referenceIds;
  options.isPublic = snapshot.isPublic;
  if (snapshot.demoPresetId !== undefined) options.demoPresetId = snapshot.demoPresetId;
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
  isPublicGeneration.value = snapshot.isPublic;
  syncReferenceInputFromSnapshot(snapshot);

  try {
    const result = await generate(optionsFromSnapshot(snapshot));
    activeBatchId.value = result.batchId;
    if (pendingGeneration.value?.id === snapshot.id) pendingGeneration.value = null;
    await refreshQuota();
    result.entries.forEach((entry) => {
      addPublicGalleryRecord(entry.record);
    });
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
  isPublicGeneration.value = batch.entries.some((entry) => entry.record.isPublic);
  const first = batch.entries[0];
  if (first?.record.aspectRatio) aspectRatio.value = first.record.aspectRatio;
  count.value = Math.min(MAX_COUNT, Math.max(MIN_COUNT, batch.entries.length));
  syncReferenceInputFromBatch(batch);
}

function handleSelectRecentEntry(entry: HistoryEntry): void {
  selectedRecentEntry.value = entry;
}

function handlePreviewGeneratedEntry(entry: HistoryEntry): void {
  selectedRecentEntry.value = entry;
}

function handleCloseRecentDetail(): void {
  selectedRecentEntry.value = null;
}

async function handleDeleteGalleryEntry(entry: HistoryEntry): Promise<void> {
  if (!isAdmin.value || deletingGalleryEntryId.value) return;
  deletingGalleryEntryId.value = entry.record.id;
  try {
    await removePublicGalleryRecordAsAdmin(entry.record.id);
    if (selectedRecentEntry.value?.record.id === entry.record.id) {
      selectedRecentEntry.value = null;
    }
    ElMessage.success('已从画廊删除。');
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败，请稍后重试。');
  } finally {
    deletingGalleryEntryId.value = null;
  }
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
  isPublicGeneration.value = false;
  clearReferenceInput();
  clearLastBatch();
}

async function handleDeleteBatch(batchId: string): Promise<boolean> {
  if (deletingBatchId.value !== null) return false;
  deletingBatchId.value = batchId;
  try {
    await removeBatch(batchId);
    if (activeBatchId.value === batchId) activeBatchId.value = null;
    if (lastBatch.value?.batchId === batchId) clearLastBatch();
    if (confirmingDeleteBatchId.value === batchId) confirmingDeleteBatchId.value = null;
    ElMessage.success('已删除该批次。');
    return true;
  } catch {
    ElMessage.error('删除失败，请稍后重试。');
    return false;
  } finally {
    deletingBatchId.value = null;
  }
}

async function handleDeleteCurrent(): Promise<void> {
  const batch = displayedBatch.value;
  if (!batch) return;
  await handleDeleteBatch(batch.batchId);
}

function openUploadPicker(): void {
  if (isLoading.value) return;
  fileInput.value?.click();
}

function handleInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const files = Array.from(target.files ?? []);
  if (files.length > 0) addReferenceFiles(files);
  target.value = '';
}

function handleComposerDrop(event: DragEvent): void {
  isComposerDragging.value = false;
  if (isLoading.value) return;
  const files = imageFiles(event.dataTransfer?.files ?? null);
  if (files.length > 0) addReferenceFiles(files);
}

function handlePaste(event: ClipboardEvent): void {
  if (isLoading.value) return;
  const files = clipboardImageFiles(event.clipboardData);
  if (files.length === 0) return;
  event.preventDefault();
  addReferenceFiles(files);
}

function handleHeroPromptKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  void handleSubmit();
}

function handleHeroPromptFocus(): void {
  isHeroPromptFocused.value = true;
}

function handleHeroPromptBlur(): void {
  isHeroPromptFocused.value = false;
}

function handleDragEnter(): void {
  if (!isLoading.value) isComposerDragging.value = true;
}

function handleDragLeave(): void {
  isComposerDragging.value = false;
}

function addReferenceFiles(files: readonly File[]): void {
  reusedReferenceId.value = null;
  const result = selectFiles(files);
  if (result.added === 0) return;
  ElMessage.success(result.added > 1 ? `已添加 ${result.added} 张参考图。` : '参考图已添加到输入框。');
}

function imageFiles(files: FileList | null): File[] {
  if (!files) return [];
  const result: File[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files.item(index);
    if (file && file.type.startsWith('image/')) result.push(file);
  }
  return result.length > 0 ? result : Array.from(files).filter(Boolean);
}

function clipboardImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const directFiles = imageFiles(data.files);
  if (directFiles.length > 0) return directFiles.filter((file) => file.type.startsWith('image/'));

  const result: File[] = [];
  for (let index = 0; index < data.items.length; index += 1) {
    const item = data.items[index];
    if (item?.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) result.push(file);
  }

  return result;
}

async function handleDownload(entry: HistoryEntry): Promise<void> {
  await downloadUrl(entry.imageUrl, entry.record.id);
}

async function handleEditPrompt(
  item: GenerationFeedItem | PendingGeneration | GroupedBatch | null = null,
): Promise<void> {
  const snapshot = snapshotFromEditableTarget(item ?? pendingGeneration.value ?? displayedBatch.value);
  if (!snapshot) return;
  prompt.value = snapshot.prompt;
  model.value = snapshot.model;
  count.value = snapshot.count;
  aspectRatio.value = snapshot.aspectRatio;
  isPublicGeneration.value = snapshot.isPublic;
  syncReferenceInputFromSnapshot(snapshot);
  await nextTick();
  composerTextareaRef.value?.focus();
}

async function handleRegenerate(
  item: GenerationFeedItem | PendingGeneration | GroupedBatch | null = null,
): Promise<void> {
  if (isLoading.value) return;
  const snapshot = snapshotFromEditableTarget(item ?? pendingGeneration.value ?? displayedBatch.value);
  if (!snapshot) return;
  const nextSnapshot = createSnapshotFromPending(snapshot);
  await runGeneration(nextSnapshot);
}

function snapshotFromEditableTarget(
  target: GenerationFeedItem | PendingGeneration | GroupedBatch | null,
): PendingGeneration | null {
  if (!target) return null;
  if ('type' in target) {
    if (target.type === 'pending') return target.snapshot;
    return createSnapshotFromDisplayedBatch(target.batch);
  }
  if ('batchId' in target) return createSnapshotFromDisplayedBatch(target);
  return target;
}

function itemHasSavedImages(item: GenerationFeedItem): boolean {
  return item.entries.length > 0;
}

function itemIsGenerating(item: GenerationFeedItem): boolean {
  return item.type === 'pending' && isLoading.value && item.errorMessage === undefined;
}

function itemErrorMessage(item: GenerationFeedItem): string | null {
  return item.type === 'pending' ? (item.errorMessage ?? null) : null;
}

function itemStatusMeta(item: GenerationFeedItem): string {
  const imageCount = item.type === 'pending' ? item.snapshot.count : item.entries.length;
  return [modelDisplayName(item.model), item.statusLabel, `${imageCount} 张图`].join(' · ');
}

function isFeedItemDeleting(item: GenerationFeedItem): boolean {
  return item.type === 'batch' && deletingBatchId.value === item.batch.batchId;
}

function isFeedItemConfirmingDelete(item: GenerationFeedItem): boolean {
  return item.type === 'batch' && confirmingDeleteBatchId.value === item.batch.batchId;
}

async function handleSaveFeedItem(item: GenerationFeedItem): Promise<void> {
  if (!itemHasSavedImages(item)) return;
  try {
    await Promise.all(item.entries.map((entry) => handleDownload(entry)));
    ElMessage.success(
      item.entries.length > 1 ? `已开始下载 ${item.entries.length} 张图片。` : '下载已开始。',
    );
  } catch {
    ElMessage.error('下载失败，请稍后重试。');
  }
}

async function handleDeleteFeedItem(item: GenerationFeedItem): Promise<void> {
  if (item.type !== 'batch' || !itemHasSavedImages(item)) return;
  const batchId = item.batch.batchId;
  if (confirmingDeleteBatchId.value !== batchId) {
    confirmingDeleteBatchId.value = batchId;
    return;
  }
  await handleDeleteBatch(batchId);
}

function createSnapshotFromPending(snapshot: PendingGeneration): PendingGeneration {
  pendingGenerationId += 1;
  const next: PendingGeneration = {
    id: pendingGenerationId,
    prompt: snapshot.prompt,
    model: snapshot.model,
    count: snapshot.count,
    aspectRatio: snapshot.aspectRatio,
    isPublic: snapshot.isPublic,
    submittedAt: new Date().toISOString(),
  };
  const referenceFiles = normalizeReferenceFiles(snapshot.referenceFiles, snapshot.referenceFile);
  const referenceIds = normalizeReferenceIds(snapshot.referenceIds, snapshot.referenceId);
  if (referenceFiles.length > 0) next.referenceFiles = referenceFiles;
  if (referenceIds.length > 0) next.referenceIds = referenceIds;
  if (snapshot.demoPresetId !== undefined) next.demoPresetId = snapshot.demoPresetId;
  return next;
}

function syncReferenceInputFromSnapshot(snapshot: PendingGeneration): void {
  const referenceFiles = normalizeReferenceFiles(snapshot.referenceFiles, snapshot.referenceFile);
  if (referenceFiles.length > 0) {
    reusedReferenceId.value = null;
    replaceFiles(referenceFiles);
    return;
  }
  const referenceIds = normalizeReferenceIds(snapshot.referenceIds, snapshot.referenceId);
  if (referenceIds.length > 0) {
    clear();
    reusedReferenceId.value = referenceIds.join(',');
    return;
  }
  clearReferenceInput();
}

function syncReferenceInputFromBatch(batch: GroupedBatch): void {
  const referenceIds = referenceIdsFromBatch(batch);
  if (referenceIds.length > 0) {
    clear();
    reusedReferenceId.value = referenceIds.join(',');
    return;
  }
  clearReferenceInput();
}

function referenceIdsFromBatch(batch: GroupedBatch): string[] {
  const ids = batch.entries.flatMap((entry) =>
    normalizeReferenceIds(entry.record.referenceIds, entry.record.referenceId),
  );
  return Array.from(new Set(ids));
}

function clearReferenceInput(): void {
  clear();
  reusedReferenceId.value = null;
}

function normalizeReferenceFiles(
  referenceFiles: File[] | undefined,
  referenceFile: File | undefined,
): File[] {
  return referenceFiles ?? (referenceFile !== undefined ? [referenceFile] : []);
}

function normalizeReferenceIds(
  referenceIds: readonly string[] | undefined,
  referenceId: string | undefined,
): string[] {
  const raw = referenceIds ?? (referenceId !== undefined ? [referenceId] : []);
  return Array.from(new Set(raw.map((id) => id.trim()).filter((id) => id.length > 0)));
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

function togglePublicGeneration(): void {
  if (!isLoading.value) isPublicGeneration.value = !isPublicGeneration.value;
}

function handleDocumentClick(event: MouseEvent): void {
  if (!aspectMenuOpen.value && !modelMenuOpen.value) return;
  const target = event.target;
  if (
    target instanceof Element &&
    target.closest('.prompt-showcase__select, .prompt-showcase__aspect')
  ) {
    return;
  }
  aspectMenuOpen.value = false;
  modelMenuOpen.value = false;
}

function initializeHeroSuggestion(): void {
  heroSuggestionIndex = randomSuggestionIndex();
  setActiveHeroSuggestion(
    HERO_PROMPT_SUGGESTIONS[heroSuggestionIndex] ?? DEFAULT_HERO_PROMPT_SUGGESTION,
  );
}

function randomSuggestionIndex(): number {
  return Math.floor(Math.random() * HERO_PROMPT_SUGGESTIONS.length);
}

function setActiveHeroSuggestion(suggestion: string): void {
  activeHeroSuggestion.value = suggestion;
  if (hasReducedMotion.value) {
    streamedHeroSuggestion.value = suggestion;
    heroSuggestionCharIndex = suggestion.length;
  } else {
    heroSuggestionCharIndex = Math.min(1, suggestion.length);
    streamedHeroSuggestion.value = suggestion.slice(0, heroSuggestionCharIndex);
  }
}

function scheduleHeroSuggestionTick(delay = 120): void {
  if (!isHeroSuggestionReady || !shouldShowHeroSuggestion.value) return;
  stopHeroSuggestionTimer();
  heroSuggestionTimer = window.setTimeout(runHeroSuggestionTick, delay);
}

function runHeroSuggestionTick(): void {
  if (hasReducedMotion.value) {
    stopHeroSuggestionTimer();
    streamedHeroSuggestion.value = activeHeroSuggestion.value;
    return;
  }

  if (heroSuggestionCharIndex < activeHeroSuggestion.value.length) {
    heroSuggestionCharIndex += 1;
    streamedHeroSuggestion.value = activeHeroSuggestion.value.slice(0, heroSuggestionCharIndex);
    scheduleHeroSuggestionTick(72 + Math.round(Math.random() * 58));
    return;
  }

  scheduleNextHeroSuggestion();
}

function scheduleNextHeroSuggestion(): void {
  if (!isHeroSuggestionReady || !shouldShowHeroSuggestion.value) return;
  stopHeroSuggestionTimer();
  heroSuggestionTimer = window.setTimeout(() => {
    heroSuggestionIndex = nextSuggestionIndex(heroSuggestionIndex);
    setActiveHeroSuggestion(
      HERO_PROMPT_SUGGESTIONS[heroSuggestionIndex] ?? DEFAULT_HERO_PROMPT_SUGGESTION,
    );
    scheduleHeroSuggestionTick(220);
  }, 2400 + Math.round(Math.random() * 900));
}

function nextSuggestionIndex(currentIndex: number): number {
  if (HERO_PROMPT_SUGGESTIONS.length <= 1) return 0;
  let nextIndex = randomSuggestionIndex();
  if (nextIndex === currentIndex) nextIndex = (nextIndex + 1) % HERO_PROMPT_SUGGESTIONS.length;
  return nextIndex;
}

function stopHeroSuggestionTimer(): void {
  if (heroSuggestionTimer === null) return;
  window.clearTimeout(heroSuggestionTimer);
  heroSuggestionTimer = null;
}

function handleReducedMotionChange(event: MediaQueryListEvent): void {
  hasReducedMotion.value = event.matches;
  if (event.matches) {
    stopHeroSuggestionTimer();
    streamedHeroSuggestion.value = activeHeroSuggestion.value;
    heroSuggestionCharIndex = activeHeroSuggestion.value.length;
  } else {
    setActiveHeroSuggestion(activeHeroSuggestion.value);
    if (shouldShowHeroSuggestion.value) scheduleHeroSuggestionTick(180);
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  isHeroSuggestionReady = true;
  initializeHeroSuggestion();
  if (typeof window.matchMedia === 'function') {
    reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    hasReducedMotion.value = reducedMotionMediaQuery.matches;
    if (hasReducedMotion.value) {
      streamedHeroSuggestion.value = activeHeroSuggestion.value;
      heroSuggestionCharIndex = activeHeroSuggestion.value.length;
    } else {
      heroSuggestionCharIndex = Math.min(1, activeHeroSuggestion.value.length);
      streamedHeroSuggestion.value = activeHeroSuggestion.value.slice(0, heroSuggestionCharIndex);
      if (shouldShowHeroSuggestion.value) scheduleHeroSuggestionTick(180);
    }
    reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
  } else {
    if (shouldShowHeroSuggestion.value) scheduleHeroSuggestionTick(180);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  isHeroSuggestionReady = false;
  stopHeroSuggestionTimer();
  reducedMotionMediaQuery?.removeEventListener('change', handleReducedMotionChange);
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
      multiple
      :disabled="isLoading"
      @change="handleInput"
    />

    <aside class="studio__sidebar" aria-label="生成历史">
      <div class="sidebar-actions">
        <button
          type="button"
          class="sidebar-new claude-button claude-button--primary"
          @click="handleNewConversation"
        >
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
          class="sidebar-delete icon-button"
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
                <img
                  v-if="batchThumb(batch)"
                  :src="batchThumb(batch)"
                  alt="批次缩略图"
                  loading="lazy"
                  decoding="async"
                />
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

      <button type="button" class="sidebar-all claude-button claude-button--secondary" @click="goToHistoryPage">
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
          <article v-if="shouldShowWorkspaceEmpty" class="generation-item generation-item--empty">
            <p class="generation-item__date">生成工作区</p>
            <h1 class="generation-item__prompt">从下方输入框开始生成图片</h1>
            <span class="generation-item__model">✦ {{ modelDisplayName(model) }}</span>
          </article>

          <div v-else class="generation-feed" aria-label="生成结果记录">
            <article
              v-for="item in generationFeedItems"
              :key="item.key"
              class="generation-item"
              :class="{
                'generation-item--loading': itemIsGenerating(item),
                'generation-item--error': itemErrorMessage(item),
                'generation-item--active': item.type === 'batch' && item.isActive,
              }"
            >
              <p class="generation-item__date">{{ formatStageDate(item.createdAt) }}</p>
              <h2 class="generation-item__prompt" :title="item.prompt">{{ item.prompt }}</h2>
              <span class="generation-item__model">✦ {{ itemStatusMeta(item) }}</span>

              <div class="generation-visual" :aria-busy="itemIsGenerating(item)">
                <div
                  v-if="itemHasSavedImages(item)"
                  class="generation-result-grid"
                  :class="{ 'generation-result-grid--multiple': item.entries.length > 1 }"
                >
                  <figure
                    v-for="(entry, index) in item.entries"
                    :key="entry.record.id"
                    class="generated-figure"
                  >
                    <button
                      type="button"
                      class="generated-figure__frame"
                      :aria-label="`预览生成结果图片 ${index + 1}`"
                      @click="handlePreviewGeneratedEntry(entry)"
                    >
                      <img
                        :src="entry.imageUrl"
                        :alt="`生成结果图片 ${index + 1}`"
                        loading="lazy"
                        decoding="async"
                        :width="entry.record.width"
                        :height="entry.record.height"
                      />
                    </button>
                  </figure>
                </div>

                <div v-else-if="itemIsGenerating(item)" class="generation-placeholder" role="status">
                  <span class="generation-badge">生成中...</span>
                  <span class="generation-placeholder__status">{{ statusMessage }}</span>
                </div>

                <div v-else class="generation-error-card" role="alert">
                  <span>生成失败</span>
                  <p>{{ itemErrorMessage(item) ?? error?.message ?? '生成失败，请稍后重试。' }}</p>
                </div>
              </div>

              <div class="generation-actions" aria-label="生成操作">
                <button
                  type="button"
                  class="generation-action claude-button claude-button--secondary"
                  :disabled="isLoading || isFeedItemDeleting(item)"
                  @click="handleEditPrompt(item)"
                >
                  ✎ 重新编辑
                </button>
                <button
                  type="button"
                  class="generation-action claude-button claude-button--secondary"
                  :disabled="isLoading || isFeedItemDeleting(item)"
                  @click="handleRegenerate(item)"
                >
                  ↻ 再次生成
                </button>
                <button
                  v-if="itemHasSavedImages(item)"
                  type="button"
                  class="generation-action claude-button claude-button--secondary"
                  :disabled="isLoading || isFeedItemDeleting(item)"
                  @click="handleSaveFeedItem(item)"
                >
                  ↓ 保存
                </button>
                <button
                  v-if="itemHasSavedImages(item)"
                  type="button"
                  class="generation-action generation-action--delete claude-button claude-button--danger"
                  :class="{ 'generation-action--confirm': isFeedItemConfirmingDelete(item) }"
                  :disabled="isLoading || isFeedItemDeleting(item)"
                  :aria-label="
                    isFeedItemConfirmingDelete(item)
                      ? `确认删除该批次：${item.prompt}`
                      : `删除该批次：${item.prompt}`
                  "
                  @click="handleDeleteFeedItem(item)"
                >
                  {{ isFeedItemDeleting(item) ? '删除中' : isFeedItemConfirmingDelete(item) ? '确认删除' : '删除' }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <template v-else>
          <section class="canvas-hero" aria-live="polite">
            <p class="canvas-hero__kicker hero-rise hero-rise--1">贝尔灵画</p>
            <h2 class="canvas-hero__title hero-rise hero-rise--2">
              Turn your idea <span>into images</span>
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
                class="prompt-showcase__add icon-button"
                aria-label="添加参考图"
                :disabled="isLoading"
                @click="openUploadPicker"
              >
                +
              </button>
              <div class="prompt-showcase__input-wrap">
                <p
                  v-if="shouldShowHeroSuggestion"
                  class="prompt-showcase__suggestion"
                  aria-hidden="true"
                >
                  <span>{{ heroSuggestionText }}</span>
                  <i v-if="!hasReducedMotion" aria-hidden="true" />
                </p>
                <textarea
                  v-model="prompt"
                  class="prompt-showcase__input"
                  name="heroPrompt"
                  aria-label="描述你想生成的画面"
                  :placeholder="
                    shouldShowHeroSuggestion ? '' : '请输入你的创意（按 Enter 发送，Shift+Enter 换行）'
                  "
                  :disabled="isLoading"
                  @focus="handleHeroPromptFocus"
                  @blur="handleHeroPromptBlur"
                  @keydown="handleHeroPromptKeydown"
                  @paste="handlePaste"
                />
              </div>
              <div v-if="hasReferenceContext" class="prompt-showcase__attachment">
                <span>{{ referenceAttachmentTitle }}</span>
                <button type="button" :disabled="isLoading" @click="clearReferenceInput">移除</button>
              </div>
              <div class="prompt-showcase__bar">
                <span class="prompt-showcase__model">✦ GPT-IMAGE-2</span>
                <span class="prompt-showcase__grid">{{ quotaLabel }}</span>
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
                <div class="prompt-showcase__aspect">
                  <button
                    type="button"
                    class="prompt-showcase__smart"
                    :aria-expanded="aspectMenuOpen"
                    aria-label="选择图片比例"
                    @click.stop="toggleAspectMenu"
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
                        @click.stop="chooseAspect(value)"
                      >
                        {{ aspectLabel(value) }}
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  class="prompt-showcase__public"
                  :class="{ 'prompt-showcase__public--active': isPublicGeneration }"
                  :aria-pressed="isPublicGeneration"
                  :disabled="isLoading"
                  @click="togglePublicGeneration"
                >
                  公开 <i aria-hidden="true" />
                </button>
                <button type="submit" class="prompt-showcase__generate claude-button claude-button--primary" :disabled="!canGenerate">
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

          <RecentCreationsMasonry
            :entries="galleryEntries"
            :can-delete="isAdmin"
            :deleting-id="deletingGalleryEntryId"
            @select="handleSelectRecentEntry"
            @delete="handleDeleteGalleryEntry"
          />
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
        class="prompt-showcase__add icon-button"
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
        v-if="hasReferenceContext"
        class="prompt-showcase__attachment prompt-showcase__attachment--rich"
      >
        <img
          v-if="primarySelectedFile?.previewUrl"
          class="prompt-showcase__attachment-preview"
          :src="primarySelectedFile.previewUrl"
          alt="已添加参考图预览"
          decoding="async"
        />
        <span v-else class="prompt-showcase__attachment-fallback" aria-hidden="true">图</span>
        <span class="prompt-showcase__attachment-meta">
          <strong>{{ referenceAttachmentTitle }}</strong>
          <span v-if="attachmentWarning" class="prompt-showcase__attachment-warning">{{
            attachmentWarning
          }}</span>
        </span>
        <button type="button" :disabled="isLoading" @click="clearReferenceInput">移除</button>
      </div>

      <div class="prompt-showcase__bar">
        <div class="prompt-showcase__select prompt-showcase__model-control">
          <button
            ref="modelButtonRef"
            type="button"
            class="prompt-showcase__smart prompt-showcase__smart--model"
            :aria-expanded="modelMenuOpen"
            aria-label="选择生成模型"
            @click.stop="toggleModelMenu"
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
                @click.stop="chooseModel(value)"
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
            @click.stop="toggleAspectMenu"
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
                @click.stop="chooseAspect(value)"
              >
                {{ aspectLabel(value) }}
              </button>
            </li>
          </ul>
        </div>
        <span class="prompt-showcase__mode" aria-live="polite">{{ modeLabel }}</span>
        <button
          type="button"
          class="prompt-showcase__public"
          :class="{ 'prompt-showcase__public--active': isPublicGeneration }"
          :aria-pressed="isPublicGeneration"
          :disabled="isLoading"
          @click="togglePublicGeneration"
        >
          公开 <i aria-hidden="true" />
        </button>
        <button
          type="button"
          class="prompt-showcase__generate claude-button claude-button--primary"
          :disabled="!canGenerate"
          @click="handleSubmit"
        >
          {{ isLoading ? '生成中' : '生成' }}
        </button>
      </div>
    </form>

    <RecentCreationDetailModal
      :entry="selectedRecentEntry"
      :can-delete="isAdmin"
      :is-deleting="selectedRecentEntry?.record.id === deletingGalleryEntryId"
      @close="handleCloseRecentDetail"
      @copy-prompt="handleCopyPrompt"
      @delete="handleDeleteGalleryEntry"
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
  min-height: 0;
  flex-direction: column;
  gap: var(--space-lg);
  border-right: 1px solid var(--color-hairline-soft);
  background: var(--color-surface-sidebar);
  padding: 28px 20px 22px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
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
  flex: 1;
  min-height: var(--control-height-lg);
}

.sidebar-delete {
  width: var(--control-height-lg);
  height: var(--control-height-lg);
  flex: 0 0 auto;
}

.sidebar-delete:not(:disabled):hover {
  background: var(--button-secondary-bg-hover);
  color: var(--color-error);
}

.sidebar-delete:disabled {
  color: var(--color-muted-soft);
  cursor: not-allowed;
  opacity: 0.5;
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
  content-visibility: auto;
  contain-intrinsic-size: 244px 70px;
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
  color: var(--color-body);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-item__meta {
  color: var(--color-muted);
  font-size: 12px;
}

.sidebar-item__more {
  border: 0;
  background: transparent;
  color: var(--color-body-strong);
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
  min-height: var(--control-height-lg);
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
  --stage-rail-width: min(
    calc(100vw - var(--app-sidebar-width) - var(--sidebar-width) - 92px),
    960px
  );
  --generation-card-width: 304px;
  --generation-feed-align-offset: 8px;

  display: grid;
  min-height: calc(100vh - var(--topbar-height));
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  align-items: stretch;
  overflow-x: hidden;
  isolation: isolate;
}

.studio--stage::before,
.studio--stage::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.studio--stage::before {
  background:
    radial-gradient(circle at 18% 0%, rgba(116, 184, 255, 0.36), transparent 34%),
    radial-gradient(circle at 76% 5%, rgba(235, 136, 226, 0.3), transparent 35%),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.76) 0%,
      rgba(255, 255, 255, 0.62) 34%,
      rgba(255, 255, 255, 0.2) 72%,
      rgba(255, 255, 255, 0.08) 100%
    );
  opacity: 0.9;
}

.studio--stage::after {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.58) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.58) 1px, transparent 1px);
  background-size: 112px 112px;
  mask-image: linear-gradient(to bottom, black 0%, black 42%, transparent 92%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, black 42%, transparent 92%);
  opacity: 0.46;
}

.studio--stage .studio__sidebar {
  display: none;
}

.studio--stage .studio__main {
  z-index: 1;
  grid-column: 1 / -1;
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
  padding: 68px 0 0;
}

.generation-feed {
  display: flex;
  width: min(100%, var(--generation-card-width));
  flex-direction: column;
  gap: 48px;
  transform: translateX(var(--generation-feed-align-offset));
}

.generation-item {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: stretch;
  color: var(--color-ink);
  scroll-margin: 96px;
  text-align: left;
  content-visibility: auto;
  contain-intrinsic-size: 304px 440px;
}

.generation-item__date {
  width: 100%;
  margin: 0 0 10px;
  color: var(--color-muted);
  font-size: var(--text-caption-size);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.generation-item__prompt {
  display: -webkit-box;
  width: 100%;
  max-height: 4.4em;
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--color-body-strong);
  cursor: help;
  font-size: 15px;
  font-weight: var(--font-weight-title);
  line-height: 1.48;
  overflow-wrap: anywhere;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.generation-item__model {
  display: inline-flex;
  width: 100%;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  margin-bottom: 14px;
  color: var(--color-muted);
  font-size: var(--text-caption-size);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.generation-item--active .generation-item__date::after {
  content: ' · 当前';
  color: var(--color-body);
  font-weight: 800;
}

.generation-visual {
  display: grid;
  width: 100%;
  justify-items: stretch;
}

.generation-placeholder,
.generation-error-card,
.generated-figure__frame {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--radius-image-lg);
  box-shadow: var(--shadow-surface);
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
  color: var(--color-on-dark);
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
  width: 100%;
  gap: 12px;
}

.generation-result-grid--multiple {
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.generated-figure {
  margin: 0;
}

.generated-figure__frame {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-color: var(--color-hairline-soft);
  background: var(--color-surface-glass);
  animation: result-reveal 240ms ease-out both;
  cursor: zoom-in;
  padding: 0;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.generated-figure__frame:hover {
  border-color: var(--color-hairline);
  box-shadow: var(--shadow-panel);
  transform: translateY(-1px);
}

.generated-figure__frame:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 3px;
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
  gap: var(--space-sm);
  background: var(--color-overlay);
  color: var(--color-error);
  padding: var(--space-lg);
  text-align: center;
}

.generation-error-card span {
  color: var(--color-error);
  font-size: 15px;
  font-weight: 800;
}

.generation-error-card p {
  margin: 0;
  color: var(--color-body);
  font-size: 13px;
  line-height: 1.7;
}

.generation-item--empty .generation-item__prompt {
  cursor: default;
}

.generation-actions {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.generation-action {
  width: 100%;
  min-height: 34px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 800;
  padding: 0 14px;
  box-shadow: var(--shadow-button-soft);
}

.generation-action:not(:disabled):hover {
  transform: translateY(-1px);
}

.generation-action--delete {
  color: var(--button-danger-fg);
}

.generation-action--delete:not(:disabled):hover,
.generation-action--confirm {
  background: var(--button-danger-bg-hover);
}

.generation-action--confirm {
  border-color: oklch(55% 0.17 28deg / 0.18);
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
  position: relative;
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  max-width: calc(100vw - 48px);
  margin: 0 0 2px;
  padding: 9px 18px 10px;
  border: 1px solid oklch(24% 0.012 78deg / 0.14);
  border-radius: 8px;
  background: oklch(99% 0.004 88deg / 0.58);
  box-shadow:
    inset 0 0 0 1px oklch(99% 0.004 88deg / 0.68),
    0 14px 32px oklch(24% 0.012 78deg / 0.06);
  color: oklch(24% 0.018 78deg);
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 0 oklch(99% 0.004 88deg / 0.9);
  white-space: nowrap;
}

.canvas-hero__kicker::before,
.canvas-hero__kicker::after {
  content: '';
  position: absolute;
  width: 7px;
  height: 7px;
  border-color: oklch(24% 0.012 78deg / 0.3);
  pointer-events: none;
}

.canvas-hero__kicker::before {
  top: 6px;
  left: 6px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.canvas-hero__kicker::after {
  right: 6px;
  bottom: 6px;
  border-right: 1px solid;
  border-bottom: 1px solid;
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
  color: var(--color-body);
  font-size: 18px;
  line-height: 1.72;
  opacity: 0.8;
}

.prompt-showcase {
  position: relative;
  display: grid;
  width: min(100%, var(--content-width-narrow));
  min-height: 172px;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
  overflow: visible;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-panel);
  background: var(--color-overlay);
  box-shadow: var(--shadow-composer);
  column-gap: var(--space-sm);
  text-align: left;
}

.prompt-showcase__add {
  width: var(--control-height-lg);
  height: var(--control-height-lg);
  margin: 20px 0 0 20px;
  border-style: dashed;
  color: var(--color-muted);
  font-size: 24px;
  font-weight: 500;
}

.prompt-showcase__input-wrap {
  position: relative;
  min-width: 0;
}

.prompt-showcase__input {
  position: relative;
  z-index: 1;
  width: 100%;
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
  color: var(--field-placeholder);
  opacity: 0.82;
}

.prompt-showcase__suggestion {
  position: absolute;
  top: 28px;
  right: 24px;
  left: 0;
  z-index: 0;
  display: block;
  margin: 0;
  overflow: hidden;
  color: var(--field-placeholder);
  font-size: 15px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  pointer-events: none;
  white-space: pre-wrap;
}

.prompt-showcase__suggestion i {
  display: inline-block;
  width: 1px;
  height: 1.1em;
  margin-left: 2px;
  background: currentColor;
  opacity: 0.58;
  transform: translateY(0.18em);
  animation: suggestion-caret 1200ms steps(1, end) infinite;
}

@keyframes suggestion-caret {
  0%,
  45% {
    opacity: 0.58;
  }

  46%,
  100% {
    opacity: 0;
  }
}

.prompt-showcase__attachment {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 20px 12px;
  border-radius: var(--radius-sm);
  background: var(--pill-bg);
  color: var(--pill-fg);
  font-size: var(--text-label-size);
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
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--color-hairline-soft);
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
  height: var(--control-height-sm);
  align-items: center;
  border-radius: var(--radius-pill);
  background: var(--pill-bg);
  color: var(--pill-fg);
  font-size: var(--text-label-size);
  font-weight: 800;
  padding: 0 var(--space-sm);
}

.prompt-showcase__aspect {
  position: relative;
}

.prompt-showcase__smart {
  display: inline-flex;
  height: var(--control-height-sm);
  align-items: center;
  gap: var(--space-xs);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--pill-bg);
  color: var(--pill-fg);
  cursor: pointer;
  font-size: var(--text-label-size);
  padding: 0 var(--space-sm);
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
  border-radius: var(--radius-md);
  background: var(--color-overlay);
  box-shadow: none;
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
  gap: var(--space-xs);
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--color-body);
  cursor: pointer;
  font-size: var(--text-label-size);
  font-weight: 700;
  padding: 0;
}

.prompt-showcase__public i {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: var(--color-chip-strong);
}

.prompt-showcase__public i::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-overlay);
  transition: transform 160ms ease;
}

.prompt-showcase__public--active {
  color: var(--color-ink);
}

.prompt-showcase__public--active i {
  background: var(--color-success);
}

.prompt-showcase__public--active i::after {
  transform: translateX(14px);
}

.prompt-showcase__public:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.prompt-showcase__generate {
  min-width: 72px;
  border-radius: var(--radius-pill);
  font-size: var(--text-label-size);
  font-weight: 800;
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
  z-index: 4;
  bottom: var(--space-lg);
  left: calc(var(--app-sidebar-width) + 28px + (100vw - var(--app-sidebar-width) - 28px) / 2);
  width: var(--stage-rail-width);
  min-height: 152px;
  margin: 0;
  background: var(--color-overlay);
  box-shadow: var(--shadow-composer);
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.prompt-showcase--dragging {
  border-color: var(--color-accent);
  box-shadow:
    var(--shadow-composer),
    var(--field-focus-ring);
}

.composer-file {
  display: none;
}

.prompt-showcase--dock .prompt-showcase__input {
  height: 86px;
  padding-top: 24px;
}

.prompt-showcase--dock .prompt-showcase__input-wrap {
  display: contents;
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
  height: var(--control-height-sm);
  align-items: center;
  gap: var(--space-xxs);
  border-radius: var(--radius-pill);
  background: var(--pill-bg);
  color: var(--pill-fg);
  font-size: var(--text-label-size);
  font-weight: 800;
  padding: 0 var(--space-xs);
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
  background: var(--color-overlay);
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

.sidebar-item__select:focus-visible,
.sidebar-item__more:focus-visible,
.sidebar-all:focus-visible,
.prompt-showcase__add:focus-visible,
.prompt-showcase__attachment button:focus-visible,
.prompt-showcase__smart:focus-visible,
.prompt-showcase__menu button:focus-visible,
.prompt-showcase__public:focus-visible,
.prompt-showcase__stepper button:focus-visible,
.prompt-showcase__generate:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.prompt-showcase__mode {
  display: inline-flex;
  height: var(--control-height-sm);
  align-items: center;
  margin-left: auto;
  color: var(--color-body);
  font-size: var(--text-label-size);
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .hero-rise,
  .generation-placeholder::before,
  .generation-placeholder::after,
  .generated-figure__frame,
  .prompt-showcase__suggestion i {
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
    --generation-card-width: min(100%, 300px);
    --generation-feed-align-offset: 0px;
  }

  .prompt-showcase--dock {
    left: 50%;
  }

  .studio--stage .studio__main {
    padding-right: 12px;
    padding-left: 12px;
  }

  .generation-stage {
    padding: 42px 0 0;
  }

  .generation-feed {
    gap: 44px;
  }

  .generation-item__date,
  .generation-item__prompt,
  .generation-item__model,
  .generation-visual,
  .generation-placeholder,
  .generation-error-card,
  .generated-figure__frame,
  .generation-result-grid {
    width: 100%;
  }

  .generation-result-grid--multiple {
    grid-template-columns: 1fr;
  }

  .prompt-showcase--dock .prompt-showcase__bar {
    align-items: flex-start;
  }

  .prompt-showcase--dock .prompt-showcase__generate {
    width: 100%;
    margin-left: 0;
  }

  .prompt-showcase:not(.prompt-showcase--dock) .prompt-showcase__public {
    margin-left: 0;
  }

  .prompt-showcase:not(.prompt-showcase--dock) .prompt-showcase__generate {
    margin-left: auto;
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

@media (max-width: 560px) {
  .studio--home .studio__main {
    padding-bottom: calc(108px + env(safe-area-inset-bottom));
  }

  .studio--stage {
    --stage-rail-width: min(calc(100vw - 20px), 420px);
    --generation-card-width: min(100%, 320px);
  }

  .studio--stage .studio__main {
    min-height: 100dvh;
    padding: 0 10px calc(292px + env(safe-area-inset-bottom));
  }

  .generation-stage {
    justify-content: center;
    min-height: auto;
    padding-top: 28px;
  }

  .generation-feed {
    width: min(100%, var(--generation-card-width));
    gap: 34px;
  }

  .generation-actions {
    gap: 8px;
  }

  .generation-action {
    min-width: 0;
    padding: 0 10px;
  }

  .canvas-hero,
  .studio--home .canvas-hero {
    gap: 14px;
    padding: 72px 14px 0;
  }

  .canvas-hero__kicker {
    min-height: 40px;
    max-width: calc(100vw - 28px);
    padding: 7px 13px 8px;
    font-size: 20px;
    letter-spacing: 0.06em;
  }

  .canvas-hero__title {
    font-size: 34px;
    line-height: 0.98;
  }

  .canvas-hero__title span {
    font-size: 42px;
  }

  .canvas-hero__subtitle {
    margin-bottom: 8px;
    font-size: 15px;
    line-height: 1.62;
  }

  .hero-daily {
    max-width: calc(100vw - 32px);
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 12px;
    font-size: 12px;
  }

  .prompt-showcase {
    width: min(100%, calc(100vw - 24px));
    min-height: 0;
    grid-template-columns: 44px minmax(0, 1fr);
    border-radius: 20px;
    column-gap: 8px;
  }

  .prompt-showcase__add {
    width: 34px;
    height: 34px;
    margin: 14px 0 0 14px;
    font-size: 20px;
  }

  .prompt-showcase__input {
    height: 96px;
    min-height: 96px;
    font-size: 16px;
    padding: 18px 14px 12px 0;
  }

  .prompt-showcase__suggestion {
    top: 18px;
    right: 14px;
    font-size: 14px;
    line-height: 1.55;
  }

  .prompt-showcase__attachment {
    margin: 0 14px 10px;
  }

  .prompt-showcase__bar {
    gap: 8px;
    padding: 9px 14px 12px;
  }

  .prompt-showcase__grid,
  .prompt-showcase__model,
  .prompt-showcase__smart,
  .prompt-showcase__stepper,
  .prompt-showcase__public {
    min-height: 34px;
  }

  .prompt-showcase__public {
    padding: 0 2px;
  }

  .prompt-showcase:not(.prompt-showcase--dock) .prompt-showcase__generate {
    flex: 1 1 100%;
    width: 100%;
    margin-left: 0;
  }

  .prompt-showcase--dock {
    bottom: calc(88px + env(safe-area-inset-bottom));
    left: 50%;
    width: min(calc(100vw - 20px), 420px);
    min-height: 0;
  }

  .prompt-showcase--dock .prompt-showcase__input {
    height: 74px;
    min-height: 74px;
    padding-top: 18px;
  }

  .prompt-showcase--dock .prompt-showcase__bar {
    max-height: 118px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .prompt-showcase--dock .prompt-showcase__generate {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>
