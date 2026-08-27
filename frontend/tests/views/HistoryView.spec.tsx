import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HistoryEntry } from '@/types/image';

const historyMocks = vi.hoisted(() => ({
  entries: [] as HistoryEntry[],
  update: vi.fn(),
  updateMany: vi.fn(),
  remove: vi.fn(),
  removeMany: vi.fn(),
  refresh: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
}));

const entries: HistoryEntry[] = [
  {
    record: {
      id: 'image-one.png',
      batchId: 'batch-one',
      createdAt: '2026-07-30T08:00:00.000Z',
      prompt: '雨夜城市',
      model: 'gpt-image-2',
      aspectRatio: '1:1',
      width: 1024,
      height: 1024,
      count: 1,
      resolution: 'standard',
      isPublic: false,
      isFavorite: false,
    },
    imageUrl: '/image-one.png',
  },
  {
    record: {
      id: 'image-two.png',
      batchId: 'batch-two',
      createdAt: '2026-07-29T08:00:00.000Z',
      prompt: '森林建筑',
      model: 'gpt-image-2',
      aspectRatio: '16:9',
      width: 1792,
      height: 1024,
      count: 2,
      resolution: 'standard',
      isPublic: true,
      isFavorite: true,
      collection: '灵感库',
    },
    imageUrl: '/image-two.png',
  },
];

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMocks,
}));

vi.mock('@/hooks/useImageHistory', () => ({
  useImageHistory: () => ({
    records: historyMocks.entries.map((entry) => entry.record),
    entries: historyMocks.entries,
    isHydrating: false,
    hydrateError: null,
    update: historyMocks.update,
    updateMany: historyMocks.updateMany,
    remove: historyMocks.remove,
    removeMany: historyMocks.removeMany,
    refresh: historyMocks.refresh,
  }),
}));

import { ToastProvider } from '@/components/common/ToastProvider';
import { HistoryView } from '@/views/HistoryView';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/history']}>
      <ToastProvider>
        <Routes>
          <Route path="/history" element={<HistoryView />} />
          <Route path="/generate" element={<p>生成路线</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.isAuthenticated = true;
  authMocks.isLoading = false;
  historyMocks.entries = entries;
  historyMocks.update.mockImplementation((id: string, updates: Record<string, unknown>) =>
    Promise.resolve({
      ...entries.find((entry) => entry.record.id === id)!.record,
      ...updates,
    }),
  );
  historyMocks.updateMany.mockResolvedValue([]);
  historyMocks.remove.mockResolvedValue(undefined);
  historyMocks.removeMany.mockResolvedValue(1);
});

describe('HistoryView asset workflows', () => {
  it('uses the beUI Archive drawer for a truly empty asset library', async () => {
    historyMocks.entries = [];
    const user = userEvent.setup();
    const { container } = renderView();

    expect(screen.getByRole('heading', { name: '还没有资产' })).toBeInTheDocument();
    expect(container.querySelector('[data-beui-empty-state="archive"]')).toBeInTheDocument();
    expect(screen.queryByText('暂无符合条件的资产。')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '选择当前结果' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '开始创作' }));
    expect(screen.getByText('生成路线')).toBeInTheDocument();
  });

  it('keeps the filtered no-results state distinct from an empty library', async () => {
    const user = userEvent.setup();
    const { container } = renderView();

    await user.type(screen.getByRole('searchbox', { name: '搜索资产' }), '不存在的资产');

    expect(screen.getByText('暂无符合条件的资产。')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '还没有资产' })).not.toBeInTheDocument();
    expect(container.querySelector('[data-beui-empty-state="archive"]')).not.toBeInTheDocument();
  });

  it('keeps asset controls hidden while the authentication state is pending', () => {
    authMocks.isAuthenticated = false;
    authMocks.isLoading = true;
    renderView();

    expect(screen.getByRole('status', { name: '正在确认登录状态' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: '搜索资产' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '登录后查看资产' })).not.toBeInTheDocument();
  });

  it('filters assets immediately and switches to compact list mode', async () => {
    const user = userEvent.setup();
    renderView();

    expect(screen.getAllByRole('button', { name: /查看图片：/ })).toHaveLength(2);
    await user.type(screen.getByRole('searchbox', { name: '搜索资产' }), '森林');
    expect(screen.getAllByRole('button', { name: /查看图片：/ })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '列表视图' }));
    const table = screen.getByRole('table', { name: '资产紧凑列表' });
    expect(table).toBeInTheDocument();
    expect(screen.getByText('森林建筑')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '可见性' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '公开' })).toBeInTheDocument();
  });

  it('persists favorite changes and bulk collection assignment', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: '收藏图片' }));
    await waitFor(() => {
      expect(historyMocks.update).toHaveBeenCalledWith('image-one.png', { isFavorite: true });
    });

    await user.click(screen.getByRole('button', { name: '选择 image-one.png' }));
    await user.click(screen.getByRole('button', { name: '批量分配收藏集' }));
    await user.click(screen.getByRole('menuitemradio', { name: '灵感库' }));
    await waitFor(() => {
      expect(historyMocks.updateMany).toHaveBeenCalledWith(['image-one.png'], {
        collection: '灵感库',
      });
    });
  });

  it('confirms single deletion with the beUI modal and supports cancel', async () => {
    const pendingDelete = deferred<void>();
    historyMocks.remove.mockReturnValueOnce(pendingDelete.promise);
    const user = userEvent.setup();
    renderView();

    const deleteTrigger = screen.getByRole('button', { name: '删除图片 image-one.png' });
    await user.click(deleteTrigger);
    let dialog = screen.getByRole('alertdialog', { name: '删除图片' });
    expect(historyMocks.remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(deleteTrigger).toHaveFocus());
    expect(historyMocks.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '查看图片：雨夜城市' }));
    const detail = screen.getByRole('dialog', { name: '图片详情' });
    await user.click(within(detail).getByRole('button', { name: '删除' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '图片详情' })).not.toBeInTheDocument(),
    );

    dialog = screen.getByRole('alertdialog', { name: '删除图片' });
    await user.click(within(dialog).getByRole('button', { name: '删除图片' }));

    await waitFor(() => expect(historyMocks.remove).toHaveBeenCalledWith('image-one.png'));
    await waitFor(() => {
      expect(within(dialog).getByRole('button', { name: '取消' })).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: '处理中' })).toBeDisabled();
    });

    await act(async () => {
      pendingDelete.resolve(undefined);
      await pendingDelete.promise;
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('preserves the bulk target and selection across cancel and a failed attempt', async () => {
    historyMocks.removeMany.mockRejectedValueOnce(new Error('所选图片删除失败'));
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: '选择 image-one.png' }));
    await user.click(screen.getByRole('button', { name: '选择 image-two.png' }));
    const deleteTrigger = screen.getByRole('button', { name: '删除' });
    await user.click(deleteTrigger);

    let dialog = screen.getByRole('alertdialog', { name: '删除所选图片' });
    expect(dialog).toHaveTextContent('将永久删除所选的 2 张图片。');
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(deleteTrigger).toHaveFocus());
    expect(
      within(screen.getByRole('toolbar', { name: '已选资产操作' })).getByText('2 项'),
    ).toBeInTheDocument();

    await user.click(deleteTrigger);
    dialog = screen.getByRole('alertdialog', { name: '删除所选图片' });
    await user.click(within(dialog).getByRole('button', { name: '删除所选' }));

    await waitFor(() =>
      expect(historyMocks.removeMany).toHaveBeenNthCalledWith(1, [
        'image-one.png',
        'image-two.png',
      ]),
    );
    expect(await screen.findByText('所选图片删除失败')).toBeInTheDocument();
    dialog = screen.getByRole('alertdialog', { name: '删除所选图片' });
    expect(within(dialog).getByRole('button', { name: '删除所选' })).toBeEnabled();
    expect(
      within(screen.getByRole('toolbar', { name: '已选资产操作' })).getByText('2 项'),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '删除所选' }));
    await waitFor(() =>
      expect(historyMocks.removeMany).toHaveBeenNthCalledWith(2, [
        'image-one.png',
        'image-two.png',
      ]),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('toolbar', { name: '已选资产操作' })).not.toBeInTheDocument();
  });
});
