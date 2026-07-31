import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

import type { SelectedReferenceFile } from '@/hooks/useFileUpload';
import { IconTooltip } from '@/components/ui/icon-tooltip';

interface ReferenceUploaderProps {
  files: readonly SelectedReferenceFile[];
  disabled?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}

export function ReferenceUploader({
  files,
  disabled = false,
  onAdd,
  onRemove,
}: ReferenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const change = (event: ChangeEvent<HTMLInputElement>): void => {
    onAdd(Array.from(event.target.files ?? []));
    event.target.value = '';
  };
  const drop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) onAdd(Array.from(event.dataTransfer.files));
  };
  return (
    <div
      className={`reference-uploader${dragging ? ' is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        disabled={disabled}
        onChange={change}
      />
      <button
        type="button"
        className="reference-uploader__add"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus aria-hidden="true" />
        <span>添加参考图</span>
        <small>PNG、JPEG 或 WebP，最多 4 张</small>
      </button>
      {files.length ? (
        <div className="reference-list">
          {files.map((item) => (
            <figure key={item.id}>
              {item.previewUrl ? (
                <img src={item.previewUrl} alt={item.file.name} />
              ) : (
                <span>{item.file.name}</span>
              )}
              <IconTooltip label="移除参考图">
                <button
                  type="button"
                  aria-label={`移除参考图 ${item.file.name}`}
                  onClick={() => onRemove(item.id)}
                >
                  <X aria-hidden="true" />
                </button>
              </IconTooltip>
              {item.validationMessage ? <figcaption>{item.validationMessage}</figcaption> : null}
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
