import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const generation = vi.hoisted(() => ({
  generate: vi.fn(),
  cancel: vi.fn(),
  error: null as Error | null,
  isLoading: false,
}));

const authMocks = vi.hoisted(() => ({
  user: { id: 'user-a', username: 'user-a' },
  isAuthenticated: true,
  isLoading: false,
  isAdmin: true,
}));

const publicGalleryMocks = vi.hoisted(() => ({ addPublicRecord: vi.fn() }));

const historyMocks = vi.hoisted(() => ({
  batches: [] as Array<{
    batchId: string;
    createdAt: string;
    prompt: string;
    model: string;
    entries: Array<{
      record: {
        id: string;
        batchId: string;
        createdAt: string;
        prompt: string;
        model: string;
        aspectRatio: '16:9';
        width: number;
        height: number;
        count: number;
        resolution: 'standard';
        isPublic: boolean;
      };
      imageUrl: string;
    }>;
    settings: {
      prompt: string;
      model: string;
      count: number;
      aspectRatio: '16:9';
      resolution: 'standard';
      isPublic: boolean;
      referenceIds: string[];
    };
  }>,
  removeBatch: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authMocks,
}));

vi.mock('@/hooks/useImageQuota', () => ({
  useImageQuota: () => ({
    quota: { total: 20, remaining: 18, checkedInToday: false, dailyCheckInReward: 5 },
    isLoading: false,
    refresh: vi.fn(),
    checkIn: vi.fn(),
  }),
}));

vi.mock('@/hooks/useImageGeneration', () => ({
  useImageGeneration: () => ({
    isLoading: generation.isLoading,
    error: generation.error,
    statusMessage: '准备生成',
    generate: generation.generate,
    cancel: generation.cancel,
  }),
}));

vi.mock('@/hooks/useImageHistory', () => ({
  useImageHistory: () => ({
    batches: historyMocks.batches,
    isHydrating: false,
    hydrateError: null,
    removeBatch: historyMocks.removeBatch,
    remove: historyMocks.remove,
    update: historyMocks.update,
  }),
}));

vi.mock('@/hooks/usePublicGallery', () => publicGalleryMocks);

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
  authMocks.user = { id: 'user-a', username: 'user-a' };
  historyMocks.removeBatch.mockResolvedValue(undefined);
  historyMocks.remove.mockResolvedValue(undefined);
  historyMocks.batches = [];
  generation.error = null;
  generation.isLoading = false;
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

it('keeps the generation workspace prompt plain and focused', () => {
  render(
    <MemoryRouter initialEntries={['/generate']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  expect(
    document.querySelector('.agent-chat-input__streaming-placeholder'),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '开始你的创作' })).toBeInTheDocument();
  expect(
    screen.getByText('在下方输入描述，或提供参考图，让 AI 帮你生成想象中的画面'),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '图像提示词' })).toHaveAttribute(
    'data-placeholder',
    '描述你想生成的画面…',
  );
  expect(screen.queryByText('描述你想生成的画面…')).not.toBeInTheDocument();
  expect(document.querySelectorAll('.generation-history-track__mark')).toHaveLength(0);
});

it('keeps the composer neutral when a retryable result error is present', () => {
  generation.error = new Error('请求内容无效，请检查提示词和参考图。（请求编号：req-123）');
  const { container } = render(
    <MemoryRouter initialEntries={['/generate']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  expect(container.querySelector('.studio-create-bar__error')).not.toBeInTheDocument();
  expect(container.querySelector('[data-slot="agent-chat-input"]')).toHaveAttribute(
    'data-status',
    'ready',
  );
});

it('supports up to four images per generation', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter
      initialEntries={['/generate?prompt=%E5%9B%9B%E5%BC%A0%E6%A6%82%E5%BF%B5%E5%9B%BE']}
    >
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  const increase = screen.getByRole('button', { name: '增加生成张数' });
  expect(screen.getByRole('button', { name: '生成图片' })).toHaveTextContent('1');
  await user.click(increase);
  await user.click(increase);
  await user.click(increase);

  expect(screen.getByRole('status', { name: '4 张' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '生成图片' })).toHaveTextContent('4');
  expect(increase).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await waitFor(() =>
    expect(generation.generate).toHaveBeenCalledWith(expect.objectContaining({ count: 4 })),
  );
});

it('uses the compact beUI stop action while generation is pending', async () => {
  generation.isLoading = true;
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={['/generate']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  const stop = screen.getByRole('button', { name: '停止生成' });
  expect(stop).toBeEnabled();
  expect(stop).toHaveClass('agent-chat-input__submit--stop');
  expect(stop).not.toHaveTextContent('1');
  expect(stop.querySelector('svg')).toHaveClass('lucide-square', 'size-3.5', 'fill-current');
  expect(container.querySelector('.generation-submit-cost')).not.toBeInTheDocument();

  await user.click(stop);
  expect(generation.cancel).toHaveBeenCalledTimes(1);
});

it('discards a completed response when the authenticated account changes', async () => {
  const pending = deferred<Awaited<ReturnType<typeof generation.generate>>>();
  generation.generate.mockReturnValueOnce(pending.promise);
  const user = userEvent.setup();
  const { container, rerender } = render(
    <MemoryRouter initialEntries={['/generate?prompt=account-a-result&isPublic=true']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await waitFor(() => expect(generation.generate).toHaveBeenCalledOnce());

  authMocks.user = { id: 'user-b', username: 'user-b' };
  rerender(
    <MemoryRouter initialEntries={['/generate?prompt=account-a-result&isPublic=true']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );
  await act(async () => {
    pending.resolve({
      batchId: 'account-a-batch',
      aspectRatio: '1:1',
      generationMode: 'text-to-image',
      entries: [
        {
          record: {
            id: 'account-a.png',
            batchId: 'account-a-batch',
            createdAt: '2026-08-28T00:00:00.000Z',
            prompt: 'account-a-result',
            model: 'gpt-image-2',
            aspectRatio: '1:1',
            width: 1024,
            height: 1024,
            count: 1,
            resolution: 'standard',
            isPublic: true,
            isFavorite: false,
          },
          imageUrl: '/account-a.png',
        },
      ],
    });
    await pending.promise;
  });

  await waitFor(() => expect(container.querySelectorAll('.session-batch')).toHaveLength(0));
  expect(publicGalleryMocks.addPublicRecord).not.toHaveBeenCalled();
});

it('keeps earlier batches above a newly submitted generation', async () => {
  const pending = deferred<Awaited<ReturnType<typeof generation.generate>>>();
  generation.generate.mockResolvedValueOnce({
    batchId: 'first-batch',
    aspectRatio: '16:9',
    generationMode: 'text-to-image',
    entries: [
      {
        record: {
          id: 'first-result.png',
          batchId: 'first-batch',
          createdAt: '2026-08-05T08:00:00.000Z',
          prompt: '第一幅提示',
          model: 'gpt-image-2',
          aspectRatio: '16:9',
          width: 1792,
          height: 1024,
          count: 1,
          resolution: '2k',
          isPublic: false,
          isFavorite: false,
        },
        imageUrl: '/first-result.png',
      },
    ],
  });
  generation.generate.mockReturnValueOnce(pending.promise);
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={['/generate']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  const promptInput = screen.getByRole('textbox', { name: '图像提示词' });
  await user.type(promptInput, '第一幅提示');
  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await screen.findByRole('button', { name: '查看图片：第一幅提示' });

  await user.type(promptInput, '第二幅提示');
  await user.click(screen.getByRole('button', { name: '生成图片' }));

  await waitFor(() => {
    expect(
      Array.from(container.querySelectorAll('.session-batch__prompt p')).map(
        (element) => element.textContent,
      ),
    ).toEqual(['第一幅提示', '第二幅提示']);
  });

  await act(async () => {
    pending.resolve({
      batchId: 'second-batch',
      aspectRatio: '16:9',
      generationMode: 'text-to-image',
      entries: [],
    });
    await pending.promise;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('starts generation once when discovery navigation requests it', async () => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/generate',
          search:
            '?prompt=%E9%9B%A8%E5%A4%9C%E5%9F%8E%E5%B8%82&aspect=16%3A9&count=2&isPublic=true',
          state: { autoGenerate: true },
        },
      ]}
    >
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
  expect(generation.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      prompt: '雨夜城市',
      aspectRatio: '16:9',
      count: 2,
      isPublic: true,
    }),
  );
});

it('opens the right history flyout, searches, and loads a selected batch', async () => {
  const resizeObserve = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserverMock {
      constructor() {}
      observe(target: Element): void {
        resizeObserve(target);
      }
      unobserve(): void {}
      disconnect(): void {}
    },
  );
  historyMocks.batches = [
    {
      batchId: 'history-batch',
      createdAt: new Date().toISOString(),
      prompt: '海边灯塔',
      model: 'gpt-image-2',
      entries: [
        {
          record: {
            id: 'history-result.png',
            batchId: 'history-batch',
            createdAt: new Date().toISOString(),
            prompt: '海边灯塔',
            model: 'gpt-image-2',
            aspectRatio: '16:9',
            width: 1792,
            height: 1024,
            count: 1,
            resolution: 'standard',
            isPublic: false,
          },
          imageUrl: '/history-result.png',
        },
      ],
      settings: {
        prompt: '海边灯塔',
        model: 'gpt-image-2',
        count: 1,
        aspectRatio: '16:9',
        resolution: 'standard',
        isPublic: false,
        referenceIds: [],
      },
    },
  ];
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  const rail = screen.getByRole('button', { name: '展开生成历史' });
  expect(document.querySelectorAll('.generation-history-track__mark')).toHaveLength(0);
  await user.click(rail);
  const panel = await screen.findByRole('complementary', { name: '生成历史' });
  expect(panel).toBeVisible();
  await user.type(within(panel).getByRole('searchbox'), '灯塔');
  expect(within(panel).getByRole('button', { name: /海边灯塔/ })).toBeVisible();
  await user.click(within(panel).getByRole('button', { name: /海边灯塔/ }));

  expect(screen.queryByRole('complementary', { name: '生成历史' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: '本次创作结果' })).toHaveTextContent('海边灯塔');
  const resultBatch = document.querySelector<HTMLElement>(
    '[data-generation-batch="history-batch"]',
  );
  const resultOrderBefore = Array.from(document.querySelectorAll('[data-generation-batch]'));
  const scrollIntoView = vi.fn();
  Object.defineProperty(resultBatch, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  const historyTick = screen.getByRole('button', { name: '查看生成记录：海边灯塔' });
  expect(historyTick).toHaveClass('is-current');

  await user.click(historyTick);

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  expect(Array.from(document.querySelectorAll('[data-generation-batch]'))).toEqual(
    resultOrderBefore,
  );

  fireEvent.mouseLeave(document.querySelector('.generation-history-dock')!);
  expect(historyTick).not.toHaveClass('is-current');
  fireEvent.mouseEnter(resultBatch!);
  expect(historyTick).toHaveClass('is-hovered');
  fireEvent.mouseLeave(resultBatch!);

  const composer = document.querySelector<HTMLElement>('.studio-create-bar');
  const sessionFeed = document.querySelector<HTMLElement>('.session-feed');
  expect(resizeObserve).toHaveBeenCalledWith(sessionFeed);
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300);
  const batchRect = vi
    .spyOn(resultBatch!, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(0, 700, 620, 320));
  vi.spyOn(composer!, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 560, 1060, 160));
  fireEvent.scroll(window);

  const jumpToLatest = await screen.findByRole('button', { name: '回到最新图片' });
  await user.click(jumpToLatest);
  expect(window.scrollTo).toHaveBeenLastCalledWith({ behavior: 'smooth', top: 784 });
  expect(Array.from(document.querySelectorAll('[data-generation-batch]'))).toEqual(
    resultOrderBefore,
  );

  batchRect.mockReturnValue(new DOMRect(0, 240, 620, 320));
  fireEvent.scroll(window);
  expect(screen.getByRole('button', { name: '回到最新图片' })).toBeInTheDocument();

  batchRect.mockReturnValue(new DOMRect(0, -240, 620, 320));
  fireEvent.scroll(window);
  expect(screen.getByRole('button', { name: '回到最新图片' })).toBeInTheDocument();

  batchRect.mockReturnValue(new DOMRect(0, 180, 620, 320));
  fireEvent.scroll(window);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: '回到最新图片' })).not.toBeInTheDocument(),
  );

  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  batchRect.mockReturnValue(new DOMRect(0, 700, 620, 320));
  fireEvent.scroll(window);
  await user.click(await screen.findByRole('button', { name: '回到最新图片' }));
  expect(window.scrollTo).toHaveBeenLastCalledWith({ behavior: 'auto', top: 784 });
});

it('matches pending skeleton count and aspect ratio to the requested results', async () => {
  const pendingGeneration = deferred<Awaited<ReturnType<typeof generation.generate>>>();
  generation.generate.mockReturnValueOnce(pendingGeneration.promise);
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={['/generate?prompt=%E6%99%A8%E9%9B%BE&aspect=16%3A9&count=2']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));

  await waitFor(() =>
    expect(container.querySelectorAll('.generation-skeleton__card')).toHaveLength(2),
  );
  container.querySelectorAll<HTMLElement>('.generation-skeleton__card').forEach((card) => {
    expect(card).toHaveStyle({ aspectRatio: '16 / 9' });
    expect(card).toHaveAttribute('data-orientation', 'landscape');
    expect(card).toHaveTextContent('16:9 · 1K');
    expect(card).toHaveTextContent('正在生成图片');
  });

  await act(async () => {
    pendingGeneration.resolve({
      batchId: 'pending-batch',
      aspectRatio: '16:9',
      generationMode: 'text-to-image',
      entries: [],
    });
    await pendingGeneration.promise;
  });
});

it('reveals a completed image only after its load event', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate?prompt=%E9%9B%A8%E5%A4%9C%E5%BB%BA%E7%AD%91']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  const preview = await screen.findByRole('button', { name: '查看图片：雨夜建筑' });
  const image = within(preview).getByRole('img', { name: '雨夜建筑' });
  const batch = preview.closest<HTMLElement>('.session-batch');

  expect(batch).not.toBeNull();
  expect(batch).toHaveAttribute('data-count', '1');
  expect(batch?.querySelector('.session-batch__prompt')).toHaveTextContent('雨夜建筑');
  const batchActions = within(batch!).getByRole('toolbar', { name: '整组操作' });
  expect(within(batchActions).getByRole('button', { name: '复用完整设置' })).toBeInTheDocument();
  expect(within(batchActions).getByRole('button', { name: '再次生成' })).toBeInTheDocument();
  expect(
    within(batchActions).queryByRole('button', { name: '下载整组图片' }),
  ).not.toBeInTheDocument();
  expect(within(batchActions).queryByRole('button', { name: '删除整组' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '查看图片' })).not.toBeInTheDocument();
  expect(within(batch!).getByRole('button', { name: '用作参考图' })).toBeInTheDocument();
  expect(within(batch!).getByRole('button', { name: '下载图片' })).toBeInTheDocument();
  expect(within(batch!).getByRole('button', { name: '设为私有' })).toBeInTheDocument();
  expect(within(batch!).getByRole('button', { name: '删除图片' })).toBeInTheDocument();
  expect(batch?.querySelector('.session-batch__header .session-batch__actions')).toBeNull();
  expect(preview).toHaveStyle({ aspectRatio: '1792 / 1024' });
  expect(preview).not.toHaveClass('is-loaded');
  expect(preview.querySelector('.session-result__loading')).toBeInTheDocument();
  fireEvent.load(image);
  expect(preview).toHaveClass('is-loaded');
  await user.click(preview);
  expect(screen.getByRole('dialog', { name: '图片详情' })).toBeInTheDocument();
});

it('edits a completed prompt and replaces the original generation batch', async () => {
  const replacement = deferred<Awaited<ReturnType<typeof generation.generate>>>();
  generation.generate.mockReturnValueOnce(
    Promise.resolve({
      batchId: 'batch-one',
      aspectRatio: '16:9',
      generationMode: 'text-to-image',
      entries: [
        {
          record: {
            id: 'original-result.png',
            batchId: 'batch-one',
            createdAt: '2026-08-04T08:00:00.000Z',
            prompt: '雨夜建筑',
            model: 'gpt-image-2',
            referenceIds: ['reference-one.png'],
            aspectRatio: '16:9',
            width: 1792,
            height: 1024,
            count: 1,
            resolution: '2k',
            isPublic: true,
            isFavorite: false,
          },
          imageUrl: '/original-result.png',
        },
      ],
    }),
  );
  generation.generate.mockReturnValueOnce(replacement.promise);
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter
      initialEntries={[
        '/generate?prompt=%E9%9B%A8%E5%A4%9C%E5%BB%BA%E7%AD%91&aspect=16%3A9&count=1&resolution=2k&isPublic=true',
      ]}
    >
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await screen.findByRole('button', { name: '查看图片：雨夜建筑' });
  const editTrigger = screen.getByRole('button', { name: '编辑提示词' });
  const promptBubble = container.querySelector('.session-batch__prompt--editable');
  const promptCopy = promptBubble?.querySelector('.session-batch__prompt-copy');
  const editSlot = promptBubble?.querySelector('.session-batch__prompt-edit-slot');
  expect(promptCopy).toHaveTextContent('雨夜建筑');
  expect(editSlot).toBeTruthy();
  expect(editSlot).toContainElement(editTrigger);
  expect(editSlot?.parentElement).toBe(promptBubble);
  expect(editSlot?.previousElementSibling).toBe(promptCopy);
  await user.hover(editTrigger);
  expect(await screen.findByText('编辑提示词')).toBeInTheDocument();
  await user.click(editTrigger);
  await waitFor(() => expect(screen.queryByText('编辑提示词')).not.toBeInTheDocument());

  const editor = screen.getByRole('textbox', { name: '编辑生成提示词' });
  expect(editor).toHaveValue('雨夜建筑');
  expect(editor).toHaveAttribute('rows', '1');
  expect(editor).toHaveStyle({ height: '56px', overflowY: 'hidden' });
  let editorScrollHeight = 96;
  Object.defineProperty(editor, 'scrollHeight', {
    configurable: true,
    get: () => editorScrollHeight,
  });
  fireEvent.change(editor, { target: { value: '两行提示词\n继续补充画面细节' } });
  expect(editor).toHaveStyle({ height: '96px', overflowY: 'hidden' });
  editorScrollHeight = 220;
  fireEvent.change(editor, {
    target: { value: '很长的提示词\n第二行\n第三行\n第四行\n第五行\n第六行\n第七行' },
  });
  expect(editor).toHaveStyle({ height: '120px', overflowY: 'auto' });
  const editActions = screen.getByRole('group', { name: '提示词编辑操作' });
  expect(editActions).toContainElement(screen.getByRole('button', { name: '取消' }));
  expect(editActions).toContainElement(screen.getByRole('button', { name: '修改' }));
  expect(screen.getByRole('button', { name: '取消' })).toHaveClass(
    'button',
    'button--secondary',
    'button--compact',
    'session-batch__prompt-cancel',
  );
  expect(screen.getByRole('button', { name: '修改' })).toHaveClass(
    'button',
    'button--primary',
    'button--compact',
    'session-batch__prompt-regenerate',
  );
  expect(screen.queryByRole('button', { name: '取消编辑' })).not.toBeInTheDocument();
  editorScrollHeight = 56;
  await user.clear(editor);
  await user.type(editor, '霓虹雨夜建筑');
  await user.click(screen.getByRole('button', { name: '修改' }));

  await waitFor(() =>
    expect(container.querySelectorAll('.generation-skeleton__card')).toHaveLength(1),
  );
  expect(screen.queryByRole('img', { name: '雨夜建筑' })).not.toBeInTheDocument();
  expect(generation.generate).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      prompt: '霓虹雨夜建筑',
      aspectRatio: '16:9',
      count: 1,
      isPublic: true,
      referenceIds: ['reference-one.png'],
    }),
  );
  expect(generation.generate.mock.calls[1]?.[0]).not.toHaveProperty('resolution');

  await act(async () => {
    replacement.resolve({
      batchId: 'batch-two',
      aspectRatio: '16:9',
      generationMode: 'image-to-image',
      entries: [
        {
          record: {
            id: 'replacement-result.png',
            batchId: 'batch-two',
            createdAt: '2026-08-04T08:01:00.000Z',
            prompt: '霓虹雨夜建筑',
            model: 'gpt-image-2',
            referenceIds: ['reference-one.png'],
            aspectRatio: '16:9',
            width: 1792,
            height: 1024,
            count: 1,
            resolution: '2k',
            isPublic: true,
            isFavorite: false,
          },
          imageUrl: '/replacement-result.png',
        },
      ],
    });
    await replacement.promise;
  });

  expect(await screen.findByRole('button', { name: '查看图片：霓虹雨夜建筑' })).toBeInTheDocument();
  await waitFor(() => expect(historyMocks.removeBatch).toHaveBeenCalledWith('batch-one'));
  expect(screen.queryByRole('button', { name: '查看图片：雨夜建筑' })).not.toBeInTheDocument();
});

it('restores the original generation when an edited prompt fails', async () => {
  generation.generate
    .mockResolvedValueOnce({
      batchId: 'batch-one',
      aspectRatio: '16:9',
      generationMode: 'text-to-image',
      entries: [
        {
          record: {
            id: 'original-result.png',
            batchId: 'batch-one',
            createdAt: '2026-08-04T08:00:00.000Z',
            prompt: '雨夜建筑',
            model: 'gpt-image-2',
            referenceIds: [],
            aspectRatio: '16:9',
            width: 1792,
            height: 1024,
            count: 1,
            resolution: '2k',
            isPublic: false,
            isFavorite: false,
          },
          imageUrl: '/original-result.png',
        },
      ],
    })
    .mockRejectedValueOnce(new Error('重新生成失败'));
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter
      initialEntries={[
        '/generate?prompt=%E9%9B%A8%E5%A4%9C%E5%BB%BA%E7%AD%91&aspect=16%3A9&count=1&resolution=2k',
      ]}
    >
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await screen.findByRole('button', { name: '查看图片：雨夜建筑' });
  await user.click(screen.getByRole('button', { name: '编辑提示词' }));
  const editor = screen.getByRole('textbox', { name: '编辑生成提示词' });
  await user.clear(editor);
  await user.type(editor, '失败的替换提示词');
  await user.click(screen.getByRole('button', { name: '修改' }));

  expect(await screen.findByText('重新生成失败')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '查看图片：雨夜建筑' })).toBeInTheDocument();
  expect(container.querySelector('.generation-skeleton')).not.toBeInTheDocument();
  expect(historyMocks.removeBatch).not.toHaveBeenCalled();
});

it('replaces pending skeletons with a retryable error card on failure', async () => {
  generation.generate.mockRejectedValueOnce(new Error('上游生成失败'));
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={['/generate?prompt=%E6%99%A8%E9%9B%BE&aspect=2%3A3&count=2']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole('button', { name: '生成图片' }));
  const errorCard = await waitFor(() => {
    const card = container.querySelector<HTMLElement>('.generation-error-card');
    expect(card).toBeInTheDocument();
    return card!;
  });

  expect(container.querySelector('.generation-skeleton')).not.toBeInTheDocument();
  expect(errorCard).toHaveStyle({ aspectRatio: '2 / 3' });
  expect(errorCard).toHaveTextContent('上游生成失败');
  expect(within(errorCard).getByRole('button', { name: '重试' })).toBeEnabled();
});

it('keeps admin generation fixed to 1K and ignores legacy high-resolution URL settings', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/generate?prompt=夜空&aspect=2%3A3&resolution=4k']}>
      <ToastProvider>
        <GenerateView />
      </ToastProvider>
    </MemoryRouter>,
  );

  expect(screen.queryByRole('radiogroup', { name: '清晰度' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('2:3');
  await user.click(screen.getByRole('button', { name: '生成图片' }));
  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
  expect(generation.generate.mock.calls[0]?.[0]).toEqual(
    expect.objectContaining({ aspectRatio: '2:3' }),
  );
  expect(generation.generate.mock.calls[0]?.[0]).not.toHaveProperty('resolution');
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

it('restores supported settings and normalizes legacy high-resolution snapshots to 1K', async () => {
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
      isPublic: true,
    }),
  );
  expect(generation.generate.mock.calls[0]?.[0]).not.toHaveProperty('resolution');

  await user.click(screen.getByRole('button', { name: '复用完整设置' }));
  expect(screen.getByText('沿用 1 张历史参考图')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('16:9');
  expect(screen.getByRole('status', { name: '2 张' })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: '私有模式' })).not.toBeChecked();
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
  expect(screen.getByRole('region', { name: '图像生成工作区' })).toHaveClass('is-empty');
});

it('keeps a failed batch confirmation open and supports retry', async () => {
  generation.generate.mockResolvedValueOnce({
    batchId: 'batch-one',
    aspectRatio: '16:9',
    generationMode: 'text-to-image',
    entries: [
      {
        record: {
          id: 'result-one.png',
          batchId: 'batch-one',
          createdAt: '2026-08-04T08:00:00.000Z',
          prompt: '雨夜建筑',
          model: 'gpt-image-2',
          aspectRatio: '16:9',
          width: 1792,
          height: 1024,
          count: 2,
          resolution: 'standard',
          isPublic: false,
          isFavorite: false,
        },
        imageUrl: '/result-one.png',
      },
      {
        record: {
          id: 'result-two.png',
          batchId: 'batch-one',
          createdAt: '2026-08-04T08:00:00.000Z',
          prompt: '雨夜建筑',
          model: 'gpt-image-2',
          aspectRatio: '16:9',
          width: 1792,
          height: 1024,
          count: 2,
          resolution: 'standard',
          isPublic: false,
          isFavorite: false,
        },
        imageUrl: '/result-two.png',
      },
    ],
  });
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
  const batchActions = await screen.findByRole('toolbar', { name: '整组操作' });
  expect(within(batchActions).getByRole('button', { name: '复用完整设置' })).toBeInTheDocument();
  expect(within(batchActions).getByRole('button', { name: '再次生成' })).toBeInTheDocument();
  expect(within(batchActions).getByRole('button', { name: '下载整组图片' })).toBeInTheDocument();
  expect(within(batchActions).getByRole('button', { name: '删除整组' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '查看图片' })).not.toBeInTheDocument();
  await user.click(within(batchActions).getByRole('button', { name: '删除整组' }));

  let dialog = screen.getByRole('alertdialog', { name: '删除整组图片' });
  expect(dialog).toHaveTextContent('将永久删除这组中的 2 张图片。');
  await user.click(within(dialog).getByRole('button', { name: '删除整组' }));

  await waitFor(() => expect(historyMocks.removeBatch).toHaveBeenNthCalledWith(1, 'batch-one'));
  expect(await screen.findByText('整组删除失败')).toBeInTheDocument();
  dialog = screen.getByRole('alertdialog', { name: '删除整组图片' });
  expect(within(dialog).getByRole('button', { name: '删除整组' })).toBeEnabled();

  await user.click(within(dialog).getByRole('button', { name: '删除整组' }));
  await waitFor(() => expect(historyMocks.removeBatch).toHaveBeenNthCalledWith(2, 'batch-one'));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(screen.getByRole('region', { name: '图像生成工作区' })).toHaveClass('is-empty');
});
