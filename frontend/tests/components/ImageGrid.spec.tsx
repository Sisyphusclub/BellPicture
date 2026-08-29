import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { ImageGrid } from '@/components/gallery/ImageGrid';
import type { HistoryEntry } from '@/types/image';

const entry: HistoryEntry = {
  record: {
    id: 'one.png',
    createdAt: '2026-07-28T08:30:00.000Z',
    prompt: '雨夜城市街角',
    model: 'gpt-image-2',
    width: 1792,
    height: 1024,
    isPublic: false,
  },
  imageUrl: '/one.png',
};

it('exposes preview and deletion actions for an asset', () => {
  const select = vi.fn();
  const toggleSelection = vi.fn();
  const remove = vi.fn();
  render(
    <ImageGrid
      entries={[entry]}
      onSelect={select}
      onToggleSelection={toggleSelection}
      onToggleFavorite={vi.fn()}
      onRemove={remove}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '查看图片：雨夜城市街角' }));
  const selection = screen.getByRole('button', { name: '选择 one.png' });
  expect(selection.querySelector('.lucide-square')).toBeInTheDocument();
  fireEvent.click(selection);
  fireEvent.click(screen.getByRole('button', { name: '删除图片 one.png' }));
  expect(select).toHaveBeenCalledWith(entry);
  expect(toggleSelection).toHaveBeenCalledWith(entry);
  expect(remove).toHaveBeenCalledWith(entry);
  expect(screen.queryByText('未分类')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '删除图片 one.png' }).closest('.image-tile__actions'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '删除图片 one.png' }).closest('.image-tile__morph'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '查看图片：雨夜城市街角' }).parentElement).toHaveStyle({
    aspectRatio: '1792 / 1024',
  });
  expect(screen.getByRole('button', { name: '收藏图片' }).parentElement).toHaveClass(
    'image-tile__favorite-trigger',
  );
});

it('binds square, landscape, and portrait media containers to their source dimensions', () => {
  const square: HistoryEntry = {
    ...entry,
    record: {
      ...entry.record,
      id: 'square.png',
      prompt: '方形资产',
      width: 1024,
      height: 1024,
    },
  };
  const portrait: HistoryEntry = {
    ...entry,
    record: {
      ...entry.record,
      id: 'portrait.png',
      prompt: '纵向资产',
      width: 1024,
      height: 1792,
    },
  };

  render(<ImageGrid entries={[square, entry, portrait]} onSelect={vi.fn()} />);

  expect(screen.getByRole('button', { name: '查看图片：方形资产' }).parentElement).toHaveStyle({
    aspectRatio: '1024 / 1024',
  });
  expect(screen.getByRole('button', { name: '查看图片：雨夜城市街角' }).parentElement).toHaveStyle({
    aspectRatio: '1792 / 1024',
  });
  expect(screen.getByRole('button', { name: '查看图片：纵向资产' }).parentElement).toHaveStyle({
    aspectRatio: '1024 / 1792',
  });
});
