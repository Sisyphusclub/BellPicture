import { onUnmounted, readonly, ref } from 'vue';

import { MAX_REFERENCE_IMAGES } from '@/types/image';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface SelectedReferenceFile {
  id: string;
  file: File;
  previewUrl: string | null;
  validationMessage: string | null;
}

export interface SelectFilesResult {
  added: number;
  skipped: number;
}

export interface ReplaceReferenceFilesResult extends SelectFilesResult {
  selected: SelectedReferenceFile[];
}

let referenceFileCounter = 0;

export function useFileUpload() {
  const selectedFiles = ref<SelectedReferenceFile[]>([]);

  function selectFiles(files: readonly File[], options: { replace?: boolean } = {}): SelectFilesResult {
    if (options.replace) clear();

    const remainingSlots = Math.max(0, MAX_REFERENCE_IMAGES - selectedFiles.value.length);
    const nextFiles = files.slice(0, remainingSlots);
    const nextItems = nextFiles.map(createReferenceFile);
    selectedFiles.value = [...selectedFiles.value, ...nextItems];

    return {
      added: nextItems.length,
      skipped: Math.max(0, files.length - nextItems.length),
    };
  }

  function selectFile(file: File): SelectFilesResult {
    return selectFiles([file]);
  }

  function replaceFiles(files: readonly File[]): ReplaceReferenceFilesResult {
    const result = selectFiles(files, { replace: true });
    return {
      ...result,
      selected: selectedFiles.value,
    };
  }

  function removeFile(id: string): void {
    const item = selectedFiles.value.find((candidate) => candidate.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    selectedFiles.value = selectedFiles.value.filter((candidate) => candidate.id !== id);
  }

  function clear(): void {
    for (const item of selectedFiles.value) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    selectedFiles.value = [];
  }

  onUnmounted(clear);

  return {
    selectedFiles: readonly(selectedFiles),
    selectFile,
    selectFiles,
    replaceFiles,
    removeFile,
    clear,
  };
}

function createReferenceFile(file: File): SelectedReferenceFile {
  referenceFileCounter += 1;
  return {
    id: `${Date.now()}-${referenceFileCounter}`,
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    validationMessage: validateFile(file),
  };
}

function validateFile(file: File): string | null {
  if (file.type.length > 0 && !ACCEPTED_TYPES.includes(file.type)) {
    return '此文件会发送到后端校验。建议使用 PNG、JPEG 或 WebP。';
  }
  return null;
}
