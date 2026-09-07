import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import type { HistoryEntry } from '@/types/image';

const baseEntry: HistoryEntry = {
  record: {
    id: 'detail.png',
    createdAt: '2026-09-06T08:30:00.000Z',
    prompt: '图片详情测试',
    model: 'gpt-image-2',
    width: 1024,
    height: 1024,
    isPublic: true,
  },
  imageUrl: '/detail.png',
};

describe('ImageDetailModal media framing', () => {
  it.each([
    ['square', 1024, 1024],
    ['landscape', 1792, 1024],
    ['portrait', 1024, 1792],
  ])('passes %s source dimensions to the intrinsic media layout', (_label, width, height) => {
    const entry: HistoryEntry = {
      ...baseEntry,
      record: { ...baseEntry.record, width, height },
    };

    render(<ImageDetailModal entry={entry} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '图片详情' });
    const media = dialog.querySelector<HTMLElement>('.image-detail__media');
    const image = media?.querySelector('img');

    expect(dialog).toHaveStyle(`--image-detail-image-ratio: ${width / height}`);
    expect(media).toHaveClass('image-detail__media');
    expect(image).toHaveAttribute('width', String(width));
    expect(image).toHaveAttribute('height', String(height));
  });

  it('distinguishes the current discovery scope from the next visibility action', () => {
    const onToggleVisibility = vi.fn();
    const { rerender } = render(
      <ImageDetailModal
        entry={baseEntry}
        onClose={vi.fn()}
        onToggleVisibility={onToggleVisibility}
      />,
    );

    expect(screen.getByText('可见范围')).toBeInTheDocument();
    expect(screen.getByText('发现页可见')).toBeInTheDocument();
    const removeButton = screen.getByRole('button', { name: '从发现页移除' });
    expect(removeButton.querySelector('.lucide-eye-off')).toBeInTheDocument();
    fireEvent.click(removeButton);
    expect(onToggleVisibility).toHaveBeenCalledWith(baseEntry);

    const privateEntry: HistoryEntry = {
      ...baseEntry,
      record: { ...baseEntry.record, isPublic: false },
    };
    rerender(
      <ImageDetailModal
        entry={privateEntry}
        onClose={vi.fn()}
        onToggleVisibility={onToggleVisibility}
      />,
    );

    expect(screen.getByText('仅自己可见')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '发布到发现页' }).querySelector('.lucide-earth'),
    ).toBeInTheDocument();
  });
});
