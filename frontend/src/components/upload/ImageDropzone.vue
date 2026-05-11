<script setup lang="ts">
import { computed, ref } from 'vue';

import { formatBytes } from '@/utils/format';

interface Props {
  file: File | null;
  previewUrl: string | null;
  validationMessage?: string | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  validationMessage: null,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'select', file: File): void;
  (e: 'clear'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const hasFile = computed(() => props.file !== null);
const fileMeta = computed(() => {
  if (!props.file) return '';
  return `${props.file.name} · ${formatBytes(props.file.size)}`;
});

function openFilePicker(): void {
  if (props.disabled) return;
  fileInput.value?.click();
}

function handleInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const file = target.files?.item(0);
  if (file) emit('select', file);
  target.value = '';
}

function handleDrop(event: DragEvent): void {
  if (props.disabled) return;
  isDragging.value = false;
  const file = event.dataTransfer?.files.item(0);
  if (file) emit('select', file);
}

function handleDragEnter(): void {
  if (!props.disabled) isDragging.value = true;
}

function handleDragLeave(): void {
  isDragging.value = false;
}
</script>

<template>
  <section
    class="dropzone"
    :class="{ 'dropzone--active': isDragging, 'dropzone--disabled': disabled }"
  >
    <input
      ref="fileInput"
      class="dropzone__input"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      :disabled="disabled"
      @change="handleInput"
    />

    <button
      type="button"
      class="dropzone__target"
      :disabled="disabled"
      @click="openFilePicker"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <span v-if="!hasFile" class="dropzone__empty">
        <span class="dropzone__icon" aria-hidden="true">↥</span>
        <span class="dropzone__title">拖入参考图</span>
        <span class="dropzone__text">或浏览选择 PNG、JPEG、WebP；提示词生成可不添加。</span>
      </span>
      <span v-else class="dropzone__preview">
        <img v-if="previewUrl" :src="previewUrl" alt="已选择的参考图预览" />
        <span v-else class="dropzone__fallback" aria-hidden="true">图</span>
        <span class="dropzone__file">
          <span class="dropzone__title">参考图已就绪</span>
          <span class="dropzone__text">{{ fileMeta }}</span>
        </span>
      </span>
    </button>

    <div class="dropzone__footer">
      <p v-if="validationMessage" class="dropzone__warning">{{ validationMessage }}</p>
      <button
        v-if="hasFile"
        type="button"
        class="dropzone__clear"
        :disabled="disabled"
        @click="emit('clear')"
      >
        移除参考图
      </button>
    </div>
  </section>
</template>

<style scoped>
.dropzone {
  display: grid;
  gap: var(--space-sm);
}

.dropzone__input {
  display: none;
}

.dropzone__target {
  width: 100%;
  min-height: 180px;
  border: 1px dashed var(--color-primary);
  border-radius: var(--radius-lg);
  background: rgba(239, 233, 222, 0.66);
  color: var(--color-body);
  cursor: pointer;
  padding: var(--space-lg);
  text-align: left;
}

.dropzone--active .dropzone__target {
  border-color: var(--color-primary-active);
  box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.16);
}

.dropzone--disabled .dropzone__target {
  cursor: not-allowed;
  opacity: 0.72;
}

.dropzone__empty,
.dropzone__preview {
  display: grid;
  gap: var(--space-sm);
  justify-items: center;
  text-align: center;
}

.dropzone__icon {
  display: inline-grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-primary-active);
  color: var(--color-on-primary);
  font-size: 24px;
}

.dropzone__title {
  display: block;
  color: var(--color-ink);
  font-weight: 500;
}

.dropzone__text {
  display: block;
  color: var(--color-muted);
  font-size: 14px;
}

.dropzone__preview {
  grid-template-columns: 112px 1fr;
  justify-items: start;
  text-align: left;
}

.dropzone__preview img,
.dropzone__fallback {
  width: 112px;
  height: 112px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.dropzone__fallback {
  display: grid;
  place-items: center;
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  font-family: var(--font-code);
}

.dropzone__file {
  align-self: center;
}

.dropzone__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.dropzone__warning {
  margin: 0;
  color: var(--color-warning);
  font-size: 13px;
}

.dropzone__clear {
  border: 0;
  background: transparent;
  color: var(--color-primary-active);
  cursor: pointer;
  font-weight: 500;
  padding: 0;
}

@media (max-width: 520px) {
  .dropzone__preview {
    grid-template-columns: 1fr;
  }
}
</style>
