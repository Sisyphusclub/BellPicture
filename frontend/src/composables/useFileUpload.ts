import { onUnmounted, readonly, ref } from 'vue';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function useFileUpload() {
  const selectedFile = ref<File | null>(null);
  const previewUrl = ref<string | null>(null);
  const validationMessage = ref<string | null>(null);

  function selectFile(file: File): void {
    clear();
    selectedFile.value = file;
    validationMessage.value = validateFile(file);
    if (file.type.startsWith('image/')) {
      previewUrl.value = URL.createObjectURL(file);
    }
  }

  function clear(): void {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    selectedFile.value = null;
    previewUrl.value = null;
    validationMessage.value = null;
  }

  onUnmounted(clear);

  return {
    selectedFile: readonly(selectedFile),
    previewUrl: readonly(previewUrl),
    validationMessage: readonly(validationMessage),
    selectFile,
    clear,
  };
}

function validateFile(file: File): string | null {
  if (file.type.length > 0 && !ACCEPTED_TYPES.includes(file.type)) {
    return '此文件会发送到后端校验。建议使用 PNG、JPEG 或 WebP。';
  }
  return null;
}
