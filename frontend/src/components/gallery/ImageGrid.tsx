import { Check, Copy, Download, Globe2, Heart, Lock, RefreshCw, Trash2 } from 'lucide-react';

import { MorphicCard } from '@/components/premium/morphic-card-modal';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/image';
import { formatClockTime } from '@/utils/format';

interface ImageGridProps {
  entries: readonly HistoryEntry[];
  emptyMessage?: string;
  selectedIds?: ReadonlySet<string>;
  onSelect: (entry: HistoryEntry) => void;
  onToggleSelection?: (entry: HistoryEntry) => void;
  onToggleFavorite?: (entry: HistoryEntry) => void;
  onCopyPrompt?: (entry: HistoryEntry) => void;
  onReuse?: (entry: HistoryEntry) => void;
  onDownload?: (entry: HistoryEntry) => void;
  onToggleVisibility?: (entry: HistoryEntry) => void;
  onRemove?: (entry: HistoryEntry) => void;
}

export function ImageGrid({
  entries,
  emptyMessage = '暂无符合条件的资产。',
  selectedIds = new Set(),
  onSelect,
  onToggleSelection,
  onToggleFavorite,
  onCopyPrompt,
  onReuse,
  onDownload,
  onToggleVisibility,
  onRemove,
}: ImageGridProps) {
  if (!entries.length) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="image-grid">
      {entries.map((entry) => {
        const selected = selectedIds.has(entry.record.id);
        return (
          <article className={cn('image-tile', selected && 'is-selected')} key={entry.record.id}>
            <MorphicCard id={entry.record.id} className="image-tile__morph">
              <button
                type="button"
                className="image-tile__preview"
                aria-label={`查看图片：${entry.record.prompt}`}
                onClick={() => onSelect(entry)}
              >
                <img src={entry.imageUrl} alt={entry.record.prompt || '生成图片'} loading="lazy" />
              </button>
            </MorphicCard>
            {onToggleSelection ? (
              <button
                type="button"
                className="image-tile__select"
                aria-label={selected ? `取消选择 ${entry.record.id}` : `选择 ${entry.record.id}`}
                aria-pressed={selected}
                onClick={() => onToggleSelection(entry)}
              >
                {selected ? <Check aria-hidden="true" /> : null}
              </button>
            ) : null}
            {onToggleFavorite ? (
              <IconTooltip label={entry.record.isFavorite ? '取消收藏' : '收藏'}>
                <button
                  type="button"
                  className="image-tile__favorite"
                  aria-label={entry.record.isFavorite ? '取消收藏图片' : '收藏图片'}
                  aria-pressed={entry.record.isFavorite === true}
                  onClick={() => onToggleFavorite(entry)}
                >
                  <Heart
                    aria-hidden="true"
                    fill={entry.record.isFavorite ? 'currentColor' : 'none'}
                  />
                </button>
              </IconTooltip>
            ) : null}
            <div className="image-tile__meta">
              <p>{entry.record.prompt}</p>
              <span>
                {formatClockTime(entry.record.createdAt)} · {entry.record.aspectRatio ?? '1:1'}
              </span>
              <span>{entry.record.collection ?? '未分类'}</span>
            </div>
            <div className="image-tile__actions">
              {onCopyPrompt ? (
                <IconTooltip label="复制提示词">
                  <button type="button" aria-label="复制提示词" onClick={() => onCopyPrompt(entry)}>
                    <Copy aria-hidden="true" />
                  </button>
                </IconTooltip>
              ) : null}
              {onReuse ? (
                <IconTooltip label="复用设置">
                  <button type="button" aria-label="复用设置" onClick={() => onReuse(entry)}>
                    <RefreshCw aria-hidden="true" />
                  </button>
                </IconTooltip>
              ) : null}
              {onDownload ? (
                <IconTooltip label="下载图片">
                  <button type="button" aria-label="下载图片" onClick={() => onDownload(entry)}>
                    <Download aria-hidden="true" />
                  </button>
                </IconTooltip>
              ) : null}
              {onToggleVisibility ? (
                <IconTooltip label={entry.record.isPublic ? '设为私有' : '设为公开'}>
                  <button
                    type="button"
                    aria-label={entry.record.isPublic ? '设为私有' : '设为公开'}
                    onClick={() => onToggleVisibility(entry)}
                  >
                    {entry.record.isPublic ? (
                      <Globe2 aria-hidden="true" />
                    ) : (
                      <Lock aria-hidden="true" />
                    )}
                  </button>
                </IconTooltip>
              ) : null}
              {onRemove ? (
                <IconTooltip label="删除图片">
                  <button
                    type="button"
                    aria-label={`删除图片 ${entry.record.id}`}
                    onClick={() => onRemove(entry)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </IconTooltip>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
