import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';

const generation = vi.hoisted(() => ({
  generate: vi.fn(),
  cancel: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
  isAdmin: true,
}));

const historyMocks = vi.hoisted(() => ({
  removeBatch: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMocks,
}));

vi.mock('@/hooks/useImageQuota', () => ({
  useImageQuota: () => ({
    quota: { total: 20, remaining: 18 },
    isLoading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useImageGeneration', () => ({
  useImageGeneration: () => ({
    isLoading: false,
    error: null,
    statusMessage: '准备生成',
    generate: generation.generate,
    cancel: generation.cancel,
  }),
}));

vi.mock('@/hooks/useImageHistory', () => ({
  useImageHistory: () => ({
    removeBatch: historyMocks.removeBatch,
    remove: historyMocks.remove,
    update: historyMocks.update,
  }),
}));

vi.mock('@/hooks/usePublicGallery', () => ({ addPublicRecord: vi.fn() }));

import { ToastProvider } from '@/components/common/ToastProvider';
import { GenerateView } from '@/views/GenerateView';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.isAuthenticated = true;
  authMocks.isLoading = false;
  authMocks.isAdmin = true;
  historyMocks.removeBatch.mockResolvedValue(undefined);
  historyMocks.remove.mockResolvedValue(undefined);
  generation.generate.mockResolvedValue({
    batchId: 'batch-one',
    aspectRatio: '16:9',
    generationMode: 'image-to-image',
    entries: [
      {
        record: {
          id: 'result-one.png',
          batchId: 'batch-one',
          createdAt: '2026-07-30T08:00:00.000Z',
          prompt: '雨夜建筑',
          model: 'gpt-image-2',
          referenceId: 'uploaded-reference.png',
          referenceIds: ['uploaded-reference.png'],
          aspectRatio: '16:9',
          width: 1792,
          height: 1024,
          count: 2,
          resolution: '2k',
          isPublic: true,
          isFavorite: false,
        },
        imageUrl: '/result-one.png',
      },
    ],
  });
});

it('shows admins the clarity selector and constrains 4K generation to a supported ratio', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate?prompt=夜空']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  expect(screen.getByRole('radiogroup', { name: '清晰度' })).toBeVisible();
  await user.click(screen.getByRole('radio', { name: '4K' }));

  expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('16:9');
  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await waitFor(() =>
    expect(generation.generate).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: '4k', aspectRatio: '16:9' }),
    ),
  );
});

it('does not render or submit high-resolution settings for non-admin users', async () => {
  authMocks.isAdmin = false;
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate?prompt=晨雾']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  expect(screen.queryByRole('radiogroup', { name: '清晰度' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
  expect(generation.generate.mock.calls[0]?.[0]).not.toHaveProperty('resolution');
});

it('restores the complete generated settings snapshot including uploaded reference ids', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter
      initialEntries={[
        '/generate?prompt=%E9%9B%A8%E5%A4%9C%E5%BB%BA%E7%AD%91&aspect=16%3A9&count=2&resolution=2k&isPublic=true',
      ]}
    >
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '复用完整设置' })).toBeInTheDocument(),
  );

  expect(generation.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: '雨夜建筑',
      aspectRatio: '16:9',
      count: 2,
      resolution: '2k',
      isPublic: true,
    }),
  );

  await user.click(screen.getByRole('button', { name: '复用完整设置' }));
  expect(screen.getByText('沿用 1 张历史参考图')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('16:9');
  expect(screen.getByRole('status', { name: '2 张' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '高级生成设置' })).toHaveTextContent('公开');
});

it('confirms single-image deletion with the beUI modal and supports cancel', async () => {
  const pendingDelete = deferred<void>();
  historyMocks.remove.mockReturnValueOnce(pendingDelete.promise);
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate?prompt=雨夜建筑']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  const deleteTrigger = await screen.findByRole('button', { name: '删除图片' });
  await user.click(deleteTrigger);

  let dialog = screen.getByRole('alertdialog', { name: '删除图片' });
  expect(historyMocks.remove).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole('button', { name: '取消' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  await waitFor(() => expect(deleteTrigger).toHaveFocus());
  expect(historyMocks.remove).not.toHaveBeenCalled();

  await user.click(deleteTrigger);
  dialog = screen.getByRole('alertdialog', { name: '删除图片' });
  await user.click(within(dialog).getByRole('button', { name: '删除图片' }));

  await waitFor(() => expect(historyMocks.remove).toHaveBeenCalledWith('result-one.png'));
  await waitFor(() => {
    expect(within(dialog).getByRole('button', { name: '取消' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '处理中' })).toBeDisabled();
  });

  await act(async () => {
    pendingDelete.resolve(undefined);
    await pendingDelete.promise;
  });
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByText('暂无本次会话结果。')).toBeInTheDocument();
});

it('keeps a failed batch confirmation open and supports retry', async () => {
  historyMocks.removeBatch.mockRejectedValueOnce(new Error('整组删除失败'));
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate?prompt=雨夜建筑']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await screen.findByRole('button', { name: '删除整组' });
  await user.click(screen.getByRole('button', { name: '删除整组' }));

  let dialog = screen.getByRole('alertdialog', { name: '删除整组图片' });
  expect(dialog).toHaveTextContent('将永久删除这组中的 1 张图片。');
  await user.click(within(dialog).getByRole('button', { name: '删除整组' }));

  await waitFor(() => expect(historyMocks.removeBatch).toHaveBeenNthCalledWith(1, 'batch-one'));
  expect(await screen.findByText('整组删除失败')).toBeInTheDocument();
  dialog = screen.getByRole('alertdialog', { name: '删除整组图片' });
  expect(within(dialog).getByRole('button', { name: '删除整组' })).toBeEnabled();

  await user.click(within(dialog).getByRole('button', { name: '删除整组' }));
  await waitFor(() => expect(historyMocks.removeBatch).toHaveBeenNthCalledWith(2, 'batch-one'));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByText('暂无本次会话结果。')).toBeInTheDocument();
});
