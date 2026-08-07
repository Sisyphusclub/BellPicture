import { Copy, Download, Globe2, ImagePlus, Lock, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { MorphicCardModal } from '@/components/premium/morphic-card-modal';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { useImageDetailModalState } from '@/hooks/useImageDetailModalState';
import type { HistoryEntry } from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatDateTime } from '@/utils/format';

interface ImageDetailModalProps {
  entry: HistoryEntry | null;
  canDelete?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onCopyPrompt?: (entry: HistoryEntry) => void;
  onReuse?: (entry: HistoryEntry) => void;
  onUseAsReference?: (entry: HistoryEntry) => void;
  onToggleVisibility?: (entry: HistoryEntry) => void;
  onDelete?: (entry: HistoryEntry) => void;
}

export function ImageDetailModal({
  entry,
  canDelete = false,
  isDeleting = false,
  onClose,
  onCopyPrompt,
  onReuse,
  onUseAsReference,
  onToggleVisibility,
  onDelete,
}: ImageDetailModalProps) {
  const id = useRef(Symbol('image-detail'));
  const { openImageDetailModal, closeImageDetailModal } = useImageDetailModalState();

  useEffect(() => {
    const currentId = id.current;
    if (!entry) {
      closeImageDetailModal(currentId);
      return;
    }
    openImageDetailModal(currentId);
    return () => {
      closeImageDetailModal(currentId);
    };
  }, [closeImageDetailModal, entry, openImageDetailModal]);

  if (!entry) return null;
  const filename = entry.record.id.includes('.') ? entry.record.id : `${entry.record.id}.png`;

  return (
    <MorphicCardModal
      id={entry.record.id}
      open
      onClose={onClose}
      className="!max-w-[1080px] !rounded-2xl !bg-card !text-card-foreground !shadow-[var(--shadow-modal)]"
    >
      <section
        className="dialog image-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-detail-title"
      >
        <IconTooltip label="关闭图片详情" side="left">
          <Button
            className="icon-button dialog__close"
            type="button"
            variant="ghost"
            size="icon"
            aria-label="关闭图片详情"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </IconTooltip>
        <div className="image-detail__media">
          <img src={entry.imageUrl} alt={entry.record.prompt || '生成图片'} />
        </div>
        <div className="image-detail__body">
          <p className="eyebrow">NEBULENS OUTPUT</p>
          <h2 id="image-detail-title">图片详情</h2>
          <p className="image-detail__prompt">{entry.record.prompt}</p>
          <dl className="metadata-grid">
            <div>
              <dt>模型</dt>
              <dd>{entry.record.model}</dd>
            </div>
            <div>
              <dt>尺寸</dt>
              <dd>
                {entry.record.width} × {entry.record.height}
              </dd>
            </div>
            <div>
              <dt>比例</dt>
              <dd>{entry.record.aspectRatio ?? '智能'}</dd>
            </div>
            <div>
              <dt>时间</dt>
              <dd>{formatDateTime(entry.record.createdAt)}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{entry.record.isPublic ? '公开' : '私有'}</dd>
            </div>
          </dl>
          <div className="detail-actions">
            <Button type="button" onClick={() => void downloadUrl(entry.imageUrl, filename)}>
              <Download aria-hidden="true" />
              保存图片
            </Button>
            {onCopyPrompt ? (
              <Button type="button" variant="secondary" onClick={() => onCopyPrompt(entry)}>
                <Copy aria-hidden="true" />
                复制提示词
              </Button>
            ) : null}
            {onReuse ? (
              <Button type="button" variant="secondary" onClick={() => onReuse(entry)}>
                <Copy aria-hidden="true" />
                复用设置
              </Button>
            ) : null}
            {onUseAsReference ? (
              <Button type="button" variant="secondary" onClick={() => onUseAsReference(entry)}>
                <ImagePlus aria-hidden="true" />
                用作参考图
              </Button>
            ) : null}
            {onToggleVisibility ? (
              <Button type="button" variant="ghost" onClick={() => onToggleVisibility(entry)}>
                {entry.record.isPublic ? (
                  <Lock aria-hidden="true" />
                ) : (
                  <Globe2 aria-hidden="true" />
                )}
                {entry.record.isPublic ? '设为私有' : '设为公开'}
              </Button>
            ) : null}
            {canDelete && onDelete ? (
              <Button
                type="button"
                variant="danger"
                disabled={isDeleting}
                onClick={() => onDelete(entry)}
              >
                <Trash2 aria-hidden="true" />
                {isDeleting ? '删除中…' : '删除'}
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </MorphicCardModal>
  );
}
