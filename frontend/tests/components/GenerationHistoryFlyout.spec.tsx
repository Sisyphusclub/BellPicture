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

describe('GenerationHistoryFlyout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the panel open while crossing the rail safety corridor', () => {
    vi.useFakeTimers();
    render(
      <GenerationHistoryFlyout
        batches={[batch]}
        hoveredBatchId={batch.batchId}
        onSelectBatch={vi.fn()}
      />,
    );

    const track = screen.getByRole('button', { name: '展开生成历史' });
    expect(document.querySelector('.generation-history-track__mark')).toHaveClass('is-hovered');
    const safe = document.querySelector<HTMLElement>('.generation-history-hover-safe');
    const panel = screen.getByRole('complementary', { hidden: true });
    expect(safe).not.toBeNull();

    fireEvent.mouseEnter(track);
    void act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(track).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(track);
    fireEvent.mouseEnter(safe!);
    void act(() => {
      vi.advanceTimersByTime(560);
    });
    expect(track).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(safe!);
    fireEvent.mouseEnter(panel);
    void act(() => {
      vi.advanceTimersByTime(560);
    });
    expect(track).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(panel);
    void act(() => {
      vi.advanceTimersByTime(559);
    });
    expect(track).toHaveAttribute('aria-expanded', 'true');
    void act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(track).toHaveAttribute('aria-expanded', 'false');
  });
});
