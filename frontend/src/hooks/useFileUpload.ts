import { useCallback, useEffect, useState } from 'react';

import { MAX_REFERENCE_IMAGES } from '@/types/image';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
let counter = 0;

export interface SelectedReferenceFile {
  id: string;
  file: File;
  previewUrl: string | null;
  validationMessage: string | null;
}

function createItem(file: File): SelectedReferenceFile {
  counter += 1;
  return {
    id: `${Date.now()}-${counter}`,
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    validationMessage:
      file.type && !ACCEPTED_TYPES.includes(file.type)
        ? '此文件会发送到后端校验。建议使用 PNG、JPEG 或 WebP。'
        : null,
  };
}

export function useFileUpload() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedReferenceFile[]>([]);
  const clear = useCallback(() => {
    setSelectedFiles((current) => {
      current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }, []);
  useEffect(() => clear, [clear]);
  const selectFiles = useCallback((files: readonly File[], replace = false) => {
    let result = { added: 0, skipped: 0 };
    setSelectedFiles((current) => {
      const base = replace ? [] : current;
      if (replace)
        current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      const nextFiles = files.slice(0, Math.max(0, MAX_REFERENCE_IMAGES - base.length));
      const next = nextFiles.map(createItem);
      result = { added: next.length, skipped: Math.max(0, files.length - next.length) };
      return [...base, ...next];
    });
    return result;
  }, []);
  const removeFile = useCallback((id: string) => {
    setSelectedFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }, []);
  return {
    selectedFiles,
    selectFiles,
    selectFile: (file: File) => selectFiles([file]),
    replaceFiles: (files: readonly File[]) => ({ ...selectFiles(files, true), selected: [] }),
    removeFile,
    clear,
  };
}
