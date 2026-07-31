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
    width: 1024,
    height: 1024,
    isPublic: false,
  },
  imageUrl: '/one.png',
};

it('exposes preview and deletion actions for an asset', () => {
  const select = vi.fn();
  const remove = vi.fn();
  render(<ImageGrid entries={[entry]} onSelect={select} onRemove={remove} />);
  fireEvent.click(screen.getByRole('button', { name: '查看图片：雨夜城市街角' }));
  fireEvent.click(screen.getByRole('button', { name: '删除图片 one.png' }));
  expect(select).toHaveBeenCalledWith(entry);
  expect(remove).toHaveBeenCalledWith(entry);
  expect(screen.getByText('未分类')).toBeInTheDocument();
});
