import { Clock3, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GroupedBatch } from '@/hooks/useImageHistory';
import { ASPECT_RATIO_LABELS } from '@/types/image';
import { formatClockTime } from '@/utils/format';

type HistoryGroupKey = 'today' | 'yesterday' | 'week' | 'earlier';

const HISTORY_OPEN_DELAY_MS = 180;
const HISTORY_CLOSE_DELAY_MS = 560;

const HISTORY_GROUPS: readonly { key: HistoryGroupKey; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'week', label: '过去 7 天' },
  { key: 'earlier', label: '更早' },
];

interface GenerationHistoryFlyoutProps {
  batches: readonly GroupedBatch[];
  activeBatchId?: string | null;
  hoveredBatchId?: string | null;
  isHydrating?: boolean;
  hydrateError?: Error | null;
  isGenerating?: boolean;
  pendingPrompt?: string;
  onSelectBatch: (batch: GroupedBatch) => void;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getHistoryGroup(iso: string, reference: Date): HistoryGroupKey {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return 'earlier';
  const today = startOfDay(reference);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;
  if (timestamp >= today) return 'today';
  if (timestamp >= yesterday) return 'yesterday';
  if (timestamp >= sevenDaysAgo) return 'week';
  return 'earlier';
}

function formatHistoryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-');
}

function matchesQuery(batch: GroupedBatch, query: string, groupLabel: string): boolean {
  if (!query) return true;
  const searchable = [
    batch.prompt,
    batch.batchId,
    batch.model,
    groupLabel,
    formatHistoryDate(batch.createdAt),
    formatClockTime(batch.createdAt),
  ]
    .join(' ')
    .toLocaleLowerCase();
  return searchable.includes(query);
}

export function GenerationHistoryFlyout({
  batches,
  activeBatchId,
  hoveredBatchId = null,
  isHydrating = false,
  hydrateError = null,
  isGenerating = false,
  pendingPrompt = '',
  onSelectBatch,
}: GenerationHistoryFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = null;
    closeTimerRef.current = null;
  };

  const openSoon = () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    if (isOpen) return;
    openTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
      openTimerRef.current = null;
    }, HISTORY_OPEN_DELAY_MS);
  };

  const closeSoon = () => {
    if (openTimerRef.current !== null) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, HISTORY_CLOSE_DELAY_MS);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearTimers();
      setIsOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>('.generation-history-track')?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const groupedBatches = useMemo(() => {
    const reference = new Date();
    const groups = new Map<HistoryGroupKey, GroupedBatch[]>();
    HISTORY_GROUPS.forEach(({ key }) => groups.set(key, []));
    batches.forEach((batch) => {
      const key = getHistoryGroup(batch.createdAt, reference);
      const label = HISTORY_GROUPS.find((group) => group.key === key)?.label ?? '';
      if (matchesQuery(batch, query.trim().toLocaleLowerCase(), label)) {
        groups.get(key)?.push(batch);
      }
    });
    return HISTORY_GROUPS.map((group) => ({
      ...group,
      batches: groups.get(group.key) ?? [],
    })).filter((group) => group.batches.length > 0);
  }, [batches, query]);

  const hasSearchResults = groupedBatches.length > 0;
  const hasHistory = batches.length > 0;
  const trackBatches = [...batches].reverse();
  const trackHeight = Math.min(360, Math.max(96, trackBatches.length * 14));

  const handleSelect = (batch: GroupedBatch) => {
    clearTimers();
    setIsOpen(false);
    onSelectBatch(batch);
  };

  return (
    <div
      ref={rootRef}
      className={`generation-history-dock${isOpen ? ' is-open' : ''}`}
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
      onFocusCapture={openSoon}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!rootRef.current?.contains(nextTarget)) closeSoon();
      }}
    >
      <Button
        type="button"
        variant="ghost"
        className={`generation-history-track${activeBatchId || hoveredBatchId ? ' is-active' : ''}`}
        aria-label={isOpen ? '收起生成历史' : '展开生成历史'}
        aria-expanded={isOpen}
        style={{ height: trackHeight }}
        onClick={() => {
          clearTimers();
          setIsOpen((open) => !open);
        }}
        onFocus={(event) => {
          if (!event.currentTarget.matches(':focus-visible')) return;
          clearTimers();
          setIsOpen(true);
        }}
      >
        <span
          className={`generation-history-track__marks${trackBatches.length === 1 ? ' is-single' : ''}`}
          aria-hidden="true"
        >
          {trackBatches.map((batch) => (
            <span
              className={`generation-history-track__mark${batch.batchId === activeBatchId ? ' is-current' : ''}${batch.batchId === hoveredBatchId ? ' is-hovered' : ''}`}
              key={batch.batchId}
            />
          ))}
        </span>
      </Button>

      <span
        className="generation-history-hover-safe"
        aria-hidden="true"
        onMouseEnter={openSoon}
        onMouseLeave={closeSoon}
      />

      <aside
        className="generation-history-panel"
        aria-label="生成历史"
        aria-hidden={!isOpen}
        onMouseEnter={openSoon}
        onMouseLeave={closeSoon}
      >
        <header className="generation-history-panel__header">
          <div>
            <span className="generation-history-panel__eyebrow">WORKSPACE MEMORY</span>
            <h2>生成历史</h2>
          </div>
          <Clock3 aria-hidden="true" />
        </header>

        <label className="generation-history-search">
          <Search aria-hidden="true" />
          <Input
            type="search"
            value={query}
            tabIndex={isOpen ? 0 : -1}
            placeholder="搜索提示词、任务、模型或日期"
            aria-label="搜索生成历史"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="generation-history-panel__body">
          {isGenerating ? (
            <div className="generation-history-pending" role="status" aria-live="polite">
              <span className="generation-history-pending__icon" aria-hidden="true">
                <Sparkles />
              </span>
              <span>
                <strong>正在生成</strong>
                <small>{pendingPrompt.trim() || '当前任务'}</small>
              </span>
            </div>
          ) : null}

          {isHydrating ? (
            <p className="generation-history-message">正在同步历史记录…</p>
          ) : hydrateError ? (
            <p className="generation-history-message">历史记录暂时无法加载，请稍后重试。</p>
          ) : !hasHistory ? (
            <p className="generation-history-message">暂无生成记录，完成第一次创作后将在这里显示</p>
          ) : !hasSearchResults ? (
            <p className="generation-history-message">没有匹配的生成记录。</p>
          ) : (
            groupedBatches.map((group) => (
              <section className="generation-history-group" key={group.key}>
                <h3>{group.label}</h3>
                <div className="generation-history-list">
                  {group.batches.map((batch) => {
                    const thumbnail = batch.entries[0];
                    const aspectRatio = batch.settings.aspectRatio;
                    const isActive = activeBatchId === batch.batchId;
                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        className={`generation-history-item${isActive ? ' is-active' : ''}`}
                        key={batch.batchId}
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => handleSelect(batch)}
                      >
                        <span className="generation-history-item__thumb" aria-hidden="true">
                          {thumbnail ? (
                            <img src={thumbnail.imageUrl} alt="" loading="lazy" />
                          ) : (
                            <Sparkles />
                          )}
                        </span>
                        <span className="generation-history-item__content">
                          <strong>{batch.prompt.trim() || '未命名任务'}</strong>
                          <small>
                            {formatClockTime(batch.createdAt)} · {batch.model}
                          </small>
                          <small>
                            {ASPECT_RATIO_LABELS[aspectRatio]} · {batch.settings.count} 张
                          </small>
                        </span>
                        <span className="generation-history-item__date">
                          {formatHistoryDate(batch.createdAt)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
