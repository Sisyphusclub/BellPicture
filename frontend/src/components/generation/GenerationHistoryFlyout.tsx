import { ChevronRight, Search, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GroupedBatch } from '@/hooks/useImageHistory';
import { ASPECT_RATIO_LABELS } from '@/types/image';
import { formatClockTime } from '@/utils/format';

type HistoryGroupKey = 'today' | 'yesterday' | 'week' | 'earlier';

const HISTORY_CLOSE_DELAY_MS = 360;

interface ViewportSize {
  height: number;
  width: number;
}

const HISTORY_GROUPS: readonly { key: HistoryGroupKey; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'week', label: '过去 7 天' },
  { key: 'earlier', label: '更早' },
];

interface GenerationHistoryFlyoutProps {
  batches: readonly GroupedBatch[];
  trackBatchIds?: readonly string[];
  activeBatchId?: string | null;
  hoveredBatchId?: string | null;
  isHydrating?: boolean;
  hydrateError?: Error | null;
  isGenerating?: boolean;
  pendingPrompt?: string;
  onSelectBatch: (batch: GroupedBatch) => void;
  onNavigateBatch?: (batch: GroupedBatch) => void;
  onInteractionLeave?: () => void;
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

function getMaxTrackHeight({ height, width }: ViewportSize): number {
  if (width <= 560) return Math.min(268, Math.max(36, height - 552));
  if (width <= 860) return Math.min(388, Math.max(36, height - 392));
  return Math.min(528, Math.max(36, height - 352));
}

export function GenerationHistoryFlyout({
  batches,
  trackBatchIds,
  activeBatchId,
  hoveredBatchId = null,
  isHydrating = false,
  hydrateError = null,
  isGenerating = false,
  pendingPrompt = '',
  onSelectBatch,
  onNavigateBatch = onSelectBatch,
  onInteractionLeave,
}: GenerationHistoryFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewBatchId, setPreviewBatchId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => ({
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
  }));
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelOpenerRef = useRef<HTMLButtonElement | null>(null);
  const suppressPreviewFocusRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const getPanelTrigger = useCallback(
    () =>
      rootRef.current?.querySelector<HTMLButtonElement>('.generation-history-track__all') ?? null,
    [],
  );

  const getTickButton = useCallback(
    (batchId: string) =>
      Array.from(
        rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-history-batch-id]') ?? [],
      ).find((button) => button.dataset.historyBatchId === batchId) ?? null,
    [],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closeSoon = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) {
        closeTimerRef.current = null;
        return;
      }
      setPreviewBatchId(null);
      setIsOpen(false);
      closeTimerRef.current = null;
    }, HISTORY_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openPanel = useCallback(
    (opener: HTMLButtonElement | null) => {
      clearCloseTimer();
      panelOpenerRef.current = opener;
      setPreviewBatchId(null);
      setIsOpen(true);
    },
    [clearCloseTimer],
  );

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ height: window.innerHeight, width: window.innerWidth });
    };
    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && !previewBatchId) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      clearCloseTimer();
      const focusTarget = isOpen
        ? (panelOpenerRef.current ?? getPanelTrigger())
        : (getTickButton(previewBatchId ?? '') ?? getPanelTrigger());
      setPreviewBatchId(null);
      setIsOpen(false);
      if (focusTarget && document.activeElement !== focusTarget) {
        suppressPreviewFocusRef.current = Boolean(focusTarget.dataset.historyBatchId);
        focusTarget.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearCloseTimer, getPanelTrigger, getTickButton, isOpen, previewBatchId]);

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
  const trackBatches = useMemo(() => {
    if (!trackBatchIds) return [...batches].reverse();
    const byId = new Map(batches.map((batch) => [batch.batchId, batch]));
    return trackBatchIds
      .map((batchId) => byId.get(batchId))
      .filter((batch): batch is GroupedBatch => batch !== undefined);
  }, [batches, trackBatchIds]);
  const trackHeight = Math.min(
    360,
    getMaxTrackHeight(viewportSize),
    Math.max(36, trackBatches.length * 20 + 12),
  );
  const previewBatch = previewBatchId
    ? (trackBatches.find((batch) => batch.batchId === previewBatchId) ?? null)
    : null;
  const previewIndex = previewBatch
    ? trackBatches.findIndex((batch) => batch.batchId === previewBatch.batchId)
    : -1;
  const previewOffset =
    previewIndex < 0 || trackBatches.length <= 1
      ? trackHeight / 2
      : 8 + (previewIndex / (trackBatches.length - 1)) * (trackHeight - 16);

  const closeTransientHistory = () => {
    clearCloseTimer();
    setPreviewBatchId(null);
    setIsOpen(false);
  };

  const handleNavigate = (batch: GroupedBatch) => {
    closeTransientHistory();
    onNavigateBatch(batch);
  };

  const handleSelect = (batch: GroupedBatch) => {
    closeTransientHistory();
    onSelectBatch(batch);
  };

  const handlePanelClose = () => {
    clearCloseTimer();
    setIsOpen(false);
    (panelOpenerRef.current ?? getPanelTrigger())?.focus();
  };

  const showPreview = (batchId: string) => {
    clearCloseTimer();
    if (!isOpen) setPreviewBatchId(batchId);
  };

  return (
    <div
      ref={rootRef}
      className={`generation-history-dock${isOpen ? ' is-open' : ''}${previewBatch ? ' has-preview' : ''}`}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={() => {
        onInteractionLeave?.();
        closeSoon();
      }}
      onFocusCapture={clearCloseTimer}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!rootRef.current?.contains(nextTarget)) {
          onInteractionLeave?.();
          closeSoon();
        }
      }}
    >
      <div className="generation-history-track" style={{ height: trackHeight }}>
        <Button
          type="button"
          variant="ghost"
          className="generation-history-track__all"
          aria-label="展开生成历史"
          aria-hidden={isOpen}
          aria-expanded={isOpen}
          aria-controls="generation-history-panel"
          tabIndex={isOpen ? -1 : 0}
          onClick={(event) => {
            openPanel(event.currentTarget);
          }}
        >
          <Search aria-hidden="true" />
        </Button>

        <div
          className={`generation-history-track__marks${trackBatches.length === 1 ? ' is-single' : ''}`}
          aria-hidden={isOpen}
        >
          {trackBatches.map((batch) => (
            <Button
              type="button"
              variant="ghost"
              className={`generation-history-track__mark${batch.batchId === activeBatchId ? ' is-current' : ''}${batch.batchId === hoveredBatchId ? ' is-hovered' : ''}${batch.batchId === previewBatchId ? ' is-previewed' : ''}`}
              key={batch.batchId}
              data-history-batch-id={batch.batchId}
              aria-label={`查看生成记录：${batch.prompt.trim() || '未命名任务'}`}
              aria-current={batch.batchId === activeBatchId ? 'true' : undefined}
              tabIndex={isOpen ? -1 : 0}
              onMouseEnter={() => showPreview(batch.batchId)}
              onFocus={() => {
                if (suppressPreviewFocusRef.current) {
                  suppressPreviewFocusRef.current = false;
                  return;
                }
                showPreview(batch.batchId);
              }}
              onClick={() => handleNavigate(batch)}
            />
          ))}
        </div>
      </div>

      <section
        className={`generation-history-preview${previewBatch && !isOpen ? ' is-visible' : ''}`}
        aria-label="生成记录预览"
        aria-hidden={!previewBatch || isOpen}
        style={{ top: `calc(50% - ${trackHeight / 2}px + ${previewOffset}px)` }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={closeSoon}
      >
        {previewBatch ? (
          <Button
            type="button"
            variant="ghost"
            className="generation-history-preview__jump"
            aria-label={`定位到生成记录：${previewBatch.prompt.trim() || '未命名任务'}`}
            tabIndex={previewBatch && !isOpen ? 0 : -1}
            onClick={() => handleNavigate(previewBatch)}
          >
            <span className="generation-history-preview__content">
              <strong>{previewBatch.prompt.trim() || '未命名任务'}</strong>
              <span className="generation-history-preview__summary">
                {previewBatch.model} · {formatClockTime(previewBatch.createdAt)}
                <br />
                {ASPECT_RATIO_LABELS[previewBatch.settings.aspectRatio]} ·{' '}
                {previewBatch.settings.count} 张 ·
                {previewBatch.settings.isPublic ? ' 公开' : ' 私有'}
              </span>
            </span>
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : null}
      </section>

      <span
        className="generation-history-hover-safe"
        aria-hidden="true"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={closeSoon}
      />

      <aside
        id="generation-history-panel"
        className="generation-history-panel"
        aria-label="生成历史"
        aria-hidden={!isOpen}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={closeSoon}
      >
        <header className="generation-history-panel__header">
          <div>
            <span className="generation-history-panel__eyebrow">WORKSPACE MEMORY</span>
            <h2>生成历史</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="generation-history-panel__close"
            aria-label="收起生成历史"
            aria-hidden={!isOpen}
            tabIndex={isOpen ? 0 : -1}
            onClick={handlePanelClose}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <label className="generation-history-search">
          <Search aria-hidden="true" />
          <Input
            ref={searchInputRef}
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
