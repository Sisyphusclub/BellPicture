import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GenerationHistoryFlyout } from '@/components/generation/GenerationHistoryFlyout';
import type { GroupedBatch } from '@/hooks/useImageHistory';

const batch: GroupedBatch = {
  batchId: 'history-batch',
  createdAt: '2026-08-04T08:00:00.000Z',
  prompt: '雾港灯塔',
  model: 'gpt-image-2',
  entries: [],
  settings: {
    prompt: '雾港灯塔',
    model: 'gpt-image-2',
    count: 1,
    aspectRatio: '1:1',
    resolution: 'standard',
    isPublic: false,
    referenceIds: [],
  },
};

const olderBatch: GroupedBatch = {
  ...batch,
  batchId: 'older-batch',
  createdAt: '2026-08-03T08:00:00.000Z',
  prompt: '雨夜列车',
  settings: {
    ...batch.settings,
    prompt: '雨夜列车',
    count: 2,
    aspectRatio: '16:9',
  },
};

describe('GenerationHistoryFlyout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows one contextual preview without opening the searchable history panel', () => {
    vi.useFakeTimers();
    render(
      <GenerationHistoryFlyout
        batches={[olderBatch, batch]}
        activeBatchId={batch.batchId}
        hoveredBatchId={olderBatch.batchId}
        onSelectBatch={vi.fn()}
      />,
    );

    const panelTrigger = screen.getByRole('button', { name: '展开生成历史' });
    const currentTick = screen.getByRole('button', { name: '查看生成记录：雾港灯塔' });
    const hoveredTick = screen.getByRole('button', { name: '查看生成记录：雨夜列车' });
    const panel = screen.getByRole('complementary', { hidden: true });

    expect(currentTick).toHaveClass('is-current');
    expect(currentTick).toHaveAttribute('aria-current', 'true');
    expect(hoveredTick).toHaveClass('is-hovered');

    fireEvent.mouseEnter(hoveredTick);

    const preview = document.querySelector<HTMLElement>('.generation-history-preview');
    expect(preview).toHaveClass('is-visible');
    expect(preview).toHaveAttribute('aria-hidden', 'false');
    expect(preview).toHaveTextContent('雨夜列车');
    expect(preview).toHaveTextContent('gpt-image-2');
    expect(preview).toHaveTextContent('16:9（宽屏） · 2 张');
    expect(hoveredTick).toHaveClass('is-previewed');
    expect(panelTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('aria-hidden', 'true');

    const root = document.querySelector<HTMLElement>('.generation-history-dock');
    fireEvent.mouseLeave(root!);
    fireEvent.mouseEnter(preview!);
    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(preview).toHaveClass('is-visible');
  });

  it('loads a batch immediately when its tick is clicked', () => {
    const onSelectBatch = vi.fn();
    render(<GenerationHistoryFlyout batches={[batch]} onSelectBatch={onSelectBatch} />);

    const tick = screen.getByRole('button', { name: '查看生成记录：雾港灯塔' });
    expect(document.querySelector('.generation-history-track')).toHaveStyle({ height: '36px' });
    fireEvent.mouseEnter(tick);
    fireEvent.click(tick);

    expect(onSelectBatch).toHaveBeenCalledOnce();
    expect(onSelectBatch).toHaveBeenCalledWith(batch);
    expect(document.querySelector('.generation-history-preview')).not.toHaveClass('is-visible');
    expect(screen.getByRole('button', { name: '展开生成历史' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps the calculated rail height inside a short mobile viewport', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 620 });

    const manyBatches = Array.from({ length: 20 }, (_, index) => ({
      ...batch,
      batchId: `history-batch-${index}`,
    }));
    render(<GenerationHistoryFlyout batches={manyBatches} onSelectBatch={vi.fn()} />);

    expect(document.querySelector('.generation-history-track')).toHaveStyle({ height: '68px' });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });

  it('opens the complete searchable panel only through a secondary action', () => {
    render(<GenerationHistoryFlyout batches={[batch]} onSelectBatch={vi.fn()} />);

    const tick = screen.getByRole('button', { name: '查看生成记录：雾港灯塔' });
    fireEvent.mouseEnter(tick);
    fireEvent.click(screen.getByRole('button', { name: '查看全部历史' }));

    const panelTrigger = screen.getByRole('button', { name: '收起生成历史' });
    const panel = screen.getByRole('complementary', { name: '生成历史' });
    const hiddenTick = document.querySelector<HTMLButtonElement>(
      '[data-history-batch-id="history-batch"]',
    );
    expect(panelTrigger).toBeVisible();
    expect(document.querySelector('.generation-history-track__all')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('searchbox', { name: '搜索生成历史' })).toHaveFocus();
    expect(hiddenTick).toHaveAttribute('tabindex', '-1');
    expect(hiddenTick?.parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the complete panel open while crossing its safety corridor', () => {
    vi.useFakeTimers();
    render(<GenerationHistoryFlyout batches={[batch]} onSelectBatch={vi.fn()} />);

    const panelTrigger = screen.getByRole('button', { name: '展开生成历史' });
    fireEvent.click(panelTrigger);

    const root = document.querySelector<HTMLElement>('.generation-history-dock');
    const safe = document.querySelector<HTMLElement>('.generation-history-hover-safe');
    const panel = screen.getByRole('complementary', { name: '生成历史' });
    expect(root).not.toBeNull();
    expect(safe).not.toBeNull();

    fireEvent.mouseLeave(root!);
    fireEvent.mouseEnter(safe!);
    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(panelTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(safe!);
    fireEvent.mouseEnter(panel);
    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(panelTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(root!);
    act(() => {
      vi.advanceTimersByTime(360);
    });
    expect(panelTrigger).toHaveAttribute('aria-expanded', 'true');

    const search = screen.getByRole('searchbox', { name: '搜索生成历史' });
    search.blur();
    fireEvent.mouseLeave(root!);
    act(() => {
      vi.advanceTimersByTime(359);
    });
    expect(panelTrigger).toHaveAttribute('aria-expanded', 'true');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', { name: '展开生成历史' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('supports keyboard previews and returns focus on Escape', () => {
    render(<GenerationHistoryFlyout batches={[batch]} onSelectBatch={vi.fn()} />);

    const tick = screen.getByRole('button', { name: '查看生成记录：雾港灯塔' });
    fireEvent.focus(tick);
    expect(document.querySelector('.generation-history-preview')).toHaveClass('is-visible');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.querySelector('.generation-history-preview')).not.toHaveClass('is-visible');
    expect(tick).toHaveFocus();

    const panelTrigger = screen.getByRole('button', { name: '展开生成历史' });
    fireEvent.click(panelTrigger);
    expect(screen.getByRole('searchbox', { name: '搜索生成历史' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: '展开生成历史' })).toHaveFocus();
  });
});
