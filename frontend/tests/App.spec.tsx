import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generation = vi.hoisted(() => ({
  generate: vi.fn(),
  cancel: vi.fn(),
}));

const quotaMocks = vi.hoisted(() => ({
  checkIn: vi.fn().mockResolvedValue({
    total: 25,
    remaining: 21,
    checkedInToday: true,
    dailyCheckInReward: 5,
    claimed: true,
  }),
}));

const historyMocks = vi.hoisted(() => ({
  batches: [] as unknown[],
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin', email: 'admin@example.com', username: 'admin', isAdmin: true },
    isAuthenticated: true,
    isLoading: false,
    isAdmin: true,
    refreshProfile: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithUsername: vi.fn(),
    signUpWithUsername: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/useImageQuota', () => ({
  useImageQuota: () => ({
    quota: { total: 20, remaining: 16, checkedInToday: false, dailyCheckInReward: 5 },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    checkIn: quotaMocks.checkIn,
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
    records: [],
    entries: [],
    batches: historyMocks.batches,
    isHydrating: false,
    hydrateError: null,
    refresh: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    removeBatch: vi.fn(),
    getEntry: vi.fn(),
    getBatch: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePublicGallery', () => ({
  usePublicGallery: () => ({
    entries: [],
    isHydrating: false,
    hydrateError: null,
    hasMore: false,
    refresh: vi.fn(),
    loadMore: vi.fn(),
    add: vi.fn(),
    removeAsAdmin: vi.fn(),
  }),
  addPublicRecord: vi.fn(),
}));

vi.mock('@/hooks/useAdminUsers', () => ({
  useAdminUsers: () => ({
    users: [],
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    createUser: vi.fn(),
    updateQuota: vi.fn(),
    removeUser: vi.fn(),
  }),
}));

import { App } from '@/App';
import { ToastProvider } from '@/components/common/ToastProvider';
import {
  attachGenerationBatch,
  createGenerationSession,
  rememberGenerationSession,
  resetGenerationSessionsForTests,
} from '@/hooks/useGenerationSessions';

type TestRouteEntry =
  | string
  | { pathname: string; search?: string; state?: Record<string, unknown> | null };

function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="当前路由" data-has-state={location.state === null ? 'false' : 'true'}>
      {`${location.pathname}${location.search}`}
    </output>
  );
}

function mockHistoryBatch(batchId: string, prompt: string) {
  return {
    batchId,
    createdAt: '2026-08-29T08:00:00.000Z',
    prompt,
    model: 'gpt-image-2',
    entries: [
      {
        record: {
          id: `${batchId}.png`,
          batchId,
          createdAt: '2026-08-29T08:00:00.000Z',
          prompt,
          model: 'gpt-image-2',
          aspectRatio: '16:9',
          width: 1792,
          height: 1024,
          count: 1,
          resolution: 'standard',
          isPublic: false,
          isFavorite: false,
        },
        imageUrl: `/${batchId}.png`,
      },
    ],
    settings: {
      prompt,
      model: 'gpt-image-2',
      count: 1,
      aspectRatio: '16:9',
      resolution: 'standard',
      isPublic: false,
      referenceIds: [],
    },
  };
}

function renderRoute(entry: TestRouteEntry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetGenerationSessionsForTests();
  historyMocks.batches = [];
  generation.generate.mockResolvedValue({
    batchId: 'landing-batch',
    aspectRatio: '16:9',
    generationMode: 'text-to-image',
    entries: [
      {
        record: {
          id: 'landing-result.png',
          batchId: 'landing-batch',
          createdAt: '2026-08-03T08:00:00.000Z',
          prompt: '雨夜的未来城市',
          model: 'gpt-image-2',
          aspectRatio: '16:9',
          width: 1792,
          height: 1024,
          count: 2,
          resolution: 'standard',
          isPublic: true,
          isFavorite: false,
        },
        imageUrl: '/landing-result.png',
      },
    ],
  });
});

describe('React application routes', () => {
  it('renders one progressive GPT Image 2 gallery and keeps the full library reachable', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Turn your idea into images' }),
    ).toBeInTheDocument();
    const shinyHeadline = screen.getByText('into images');
    expect(shinyHeadline).toHaveClass('animate-shiny');
    expect(shinyHeadline.style.backgroundSize).toBe('200% auto');
    expect(shinyHeadline.style.color).toBe('transparent');
    expect(shinyHeadline.style.backgroundImage).toContain('linear-gradient(110deg');
    expect(screen.queryByRole('heading', { level: 2, name: '今日创作' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: '画廊' })).not.toBeInTheDocument();
    expect(container.querySelector('video.landing-hero__video')).toBeInTheDocument();
    expect(container.querySelector('.landing-hero')).toHaveAttribute('data-layout', 'media-stage');
    const initialCreationCards = container.querySelectorAll(
      '.image-gallery-vertical__image-button',
    );
    const initialCreationImages = container.querySelectorAll(
      '.landing-creations .image-gallery-vertical__columns img',
    );
    const animatedGalleryTracks = container.querySelectorAll(
      '.landing-creations [style*="animation-name"]',
    );
    const desktopGallery = container.querySelector<HTMLElement>(
      '.landing-creations [style*="--gallery-columns"]',
    );
    expect(desktopGallery?.style.getPropertyValue('--gallery-columns')).toBe('6');
    expect(initialCreationCards).toHaveLength(30);
    expect(initialCreationImages).toHaveLength(30);
    expect(container.querySelectorAll('.image-gallery-vertical__columns')).toHaveLength(1);
    expect(initialCreationCards[0]).toHaveAccessibleName(
      '查看图片：雾中的混凝土运动场与奔跑者，冷灰建筑、湿润空气与柔和晨光',
    );
    expect(animatedGalleryTracks).toHaveLength(0);
    expect(container.querySelector('.landing-creations style')).not.toBeInTheDocument();
    while (screen.queryByRole('button', { name: '加载更多' })) {
      await user.click(screen.getByRole('button', { name: '加载更多' }));
    }
    const creationCards = container.querySelectorAll('.image-gallery-vertical__image-button');
    const creationImages = container.querySelectorAll(
      '.landing-creations .image-gallery-vertical__columns img',
    );
    const creationSources = new Set(
      Array.from(creationCards).map((card) => card.querySelector('img')?.getAttribute('src')),
    );
    expect(creationSources).toHaveLength(169);
    expect(creationImages).toHaveLength(169);
    expect(Array.from(creationSources)).toEqual(
      expect.arrayContaining([
        '/media/hero-card-left.jpg',
        '/media/hero-card-center.jpg',
        '/media/hero-card-right.jpg',
        '/media/hero-card-runner-detail.jpg',
        '/media/hero-card-piano-detail.jpg',
        '/media/hero-card-plants-detail.jpg',
      ]),
    );
    const templateSources = Array.from(creationCards)
      .slice(6)
      .map((card) => card.querySelector('img')?.getAttribute('src'));
    expect(templateSources.slice(0, 6).every((source) => !source?.includes('/anime-'))).toBe(true);
    expect(templateSources.slice(-6).some((source) => source?.includes('/anime-'))).toBe(true);
    expect(screen.queryByRole('button', { name: '上一张作品' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一张作品' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '首页创作提示词' })).toBeInTheDocument();
    const landingAnchor = container.querySelector('.landing-composer-anchor');
    const landingComposers = landingAnchor?.querySelectorAll('[data-slot="agent-chat-input"]');
    const landingComposer = landingComposers?.item(0);
    expect(landingAnchor).toBeInTheDocument();
    expect(landingComposers).toHaveLength(1);
    expect(landingAnchor?.querySelector('.landing-composer-layout')).not.toBeInTheDocument();
    expect(landingAnchor?.querySelectorAll(':scope > .landing-composer-content')).toHaveLength(1);
    expect(landingAnchor?.querySelector('.landing-liquidglass-target')).not.toBeInTheDocument();
    expect(landingAnchor?.querySelector('.landing-liquidglass-backdrop')).not.toBeInTheDocument();
    expect(landingAnchor?.querySelector('canvas')).not.toBeInTheDocument();
    expect(landingComposer).not.toHaveAttribute('data-liquid-glass');
    expect(
      landingComposer?.querySelector('.border-glow-liquid-glass__effect'),
    ).not.toBeInTheDocument();
    expect(landingComposer?.querySelector('feDisplacementMap')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /选择智能体/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加参考图或技能' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /选择模型和推理强度/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择首页画面尺寸' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '生成张数' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '公开作品' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '剩余额度 16，总额度 20' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '正在发生的想象' })).not.toBeInTheDocument();
  });

  it('docks the landing composer while browsing the gallery and expands it on focus', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    const anchor = container.querySelector<HTMLElement>('.landing-composer-anchor');
    expect(anchor).toHaveAttribute('data-docked', 'false');
    expect(anchor).toHaveAttribute('data-expanded', 'false');

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(520);
    vi.spyOn(anchor!, 'getBoundingClientRect').mockReturnValue(new DOMRect(250, -220, 940, 137));
    void act(() => window.dispatchEvent(new Event('scroll')));

    await waitFor(() => expect(anchor).toHaveAttribute('data-docked', 'true'));
    expect(anchor).toHaveAttribute('data-expanded', 'false');

    const promptInput = screen.getByRole('textbox', { name: '首页创作提示词' });
    await user.click(promptInput);
    expect(anchor).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByRole('textbox', { name: '首页创作提示词' })).toBe(promptInput);

    act(() => promptInput.blur());
    await waitFor(() => expect(anchor).toHaveAttribute('data-expanded', 'false'));

    await user.click(promptInput);
    expect(anchor).toHaveAttribute('data-expanded', 'true');

    await user.type(promptInput, '冷白背景产品摄影');
    expect(promptInput).toHaveTextContent('冷白背景产品摄影');
    expect(anchor).toHaveAttribute('data-expanded', 'true');
  });

  it('keeps dock focus and collapse behavior with reduced motion enabled', async () => {
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
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    const anchor = container.querySelector<HTMLElement>('.landing-composer-anchor');

    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(520);
    vi.spyOn(anchor!, 'getBoundingClientRect').mockReturnValue(new DOMRect(250, -220, 940, 137));
    void act(() => window.dispatchEvent(new Event('scroll')));
    await waitFor(() => expect(anchor).toHaveAttribute('data-docked', 'true'));

    const promptInput = screen.getByRole('textbox', { name: '首页创作提示词' });
    await user.click(promptInput);
    expect(promptInput).toHaveFocus();
    expect(anchor).toHaveAttribute('data-expanded', 'true');

    act(() => promptInput.blur());
    await waitFor(() => expect(anchor).toHaveAttribute('data-expanded', 'false'));
  });

  it('places creation templates between generation and assets in the landing navigation', () => {
    const { container } = renderRoute('/');
    const navigation = within(screen.getByRole('navigation', { name: '首页导航' }));
    const productLinks = navigation
      .getAllByRole('link')
      .map((link) => link.textContent)
      .filter((label) => ['发现', '生图', '创作模板', '资产'].includes(label ?? ''));

    expect(productLinks).toEqual(['发现', '生图', '创作模板', '资产']);
    expect(navigation.getByRole('link', { name: '创作模板' })).toHaveAttribute(
      'href',
      '/templates',
    );
    expect(container.querySelector('.landing-navigation-shell')).toHaveStyle({
      '--sidebar-width-icon': '6.875rem',
    });
    expect(container.querySelector(".landing-sidebar [data-sidebar='separator']")).toBeNull();
  });

  it('hides non-functional homepage model settings', () => {
    renderRoute('/');
    expect(screen.queryByRole('button', { name: /选择模型和推理强度/ })).not.toBeInTheDocument();
  });

  it('shows the current generation credit cost in the homepage submit action', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    const submit = screen.getByRole('button', { name: '带着提示词开始创作' });
    expect(submit).toHaveTextContent('1');
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '增加生成张数' }));
    expect(submit).toHaveTextContent('2');

    await user.type(screen.getByRole('textbox', { name: '首页创作提示词' }), '玻璃城市');
    expect(submit).toBeEnabled();
  });

  it('opens the daily check-in surface and claims the reward', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    await user.click(screen.getByRole('button', { name: '个人积分 16，可签到' }));
    expect(screen.getByText('赢取每日灵感值！')).toBeInTheDocument();
    expect(screen.getByText('每日签到可得 5 积分')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '签到' }));

    await waitFor(() => expect(quotaMocks.checkIn).toHaveBeenCalledTimes(1));
    expect(quotaMocks.checkIn).toHaveReturned();
    expect(screen.queryByText(/签到成功/)).not.toBeInTheDocument();
    expect(screen.queryByText('今日已签到。')).not.toBeInTheDocument();
  });

  it('does not show a success toast when checking in from the mobile sidebar', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const user = userEvent.setup();
    renderRoute('/');

    await user.click(screen.getByRole('button', { name: '打开首页菜单' }));
    await user.click(screen.getByRole('button', { name: '签到领 5 积分' }));

    await waitFor(() => expect(quotaMocks.checkIn).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/签到成功/)).not.toBeInTheDocument();
    expect(screen.queryByText('今日已签到。')).not.toBeInTheDocument();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('keeps the React Bits border glow independent from homepage prompt focus', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    const prompt = screen.getByRole('textbox', { name: '首页创作提示词' });

    await user.click(prompt);

    expect(prompt).toHaveFocus();
    const borderGlow = container.querySelector<HTMLElement>('.border-glow-card');
    expect(borderGlow).not.toHaveAttribute('data-glow-active');
    expect(borderGlow?.style.getPropertyValue('--fill-opacity')).toBe('0');
  });

  it('carries a homepage prompt into the generation workspace and starts generation', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    const referenceFiles = Array.from(
      { length: 5 },
      (_, index) =>
        new File([`reference-${index + 1}`], `reference-${index + 1}.png`, { type: 'image/png' }),
    );

    await user.click(screen.getByRole('button', { name: '添加参考图或技能' }));
    await user.click(screen.getByRole('menuitem', { name: '添加参考图' }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');
    await user.upload(fileInput!, referenceFiles);
    expect(screen.getByText('参考图最多支持 4 张，已保留前 4 张。')).toBeInTheDocument();
    expect(screen.getByText('reference-4.png')).toBeInTheDocument();
    expect(screen.queryByText('reference-5.png')).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: '首页创作提示词' }), '雨夜的未来城市');
    await user.click(screen.getByRole('button', { name: '选择首页画面尺寸' }));
    await user.click(screen.getByRole('menuitemradio', { name: /16:9/ }));
    await user.click(screen.getByRole('button', { name: '增加生成张数' }));
    await user.click(screen.getByRole('switch', { name: '公开作品' }));
    await user.click(screen.getByRole('button', { name: '带着提示词开始创作' }));

    expect(await screen.findByRole('region', { name: '图像生成工作区' })).toBeInTheDocument();
    await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
    expect(generation.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '雨夜的未来城市',
        aspectRatio: '16:9',
        count: 2,
        isPublic: true,
        referenceFiles: referenceFiles.slice(0, 4),
      }),
    );
    expect(screen.getByRole('region', { name: '本次创作结果' })).toHaveTextContent(
      '雨夜的未来城市',
    );
    expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('16:9');
    expect(screen.getByRole('status', { name: '2 张' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '私有模式' })).not.toBeChecked();
  });

  it('opens and closes the shadcn mobile sidebar', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const user = userEvent.setup();
    renderRoute('/');

    const openMenu = screen.getByRole('button', { name: '打开首页菜单' });
    await user.click(openMenu);

    expect(screen.getByRole('navigation', { name: '首页导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭首页菜单' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭首页菜单' }));
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: '首页导航' })).not.toBeInTheDocument();
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('opens a vertical gallery image without entering a modal state loop', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    const creationCard = container.querySelector<HTMLButtonElement>(
      '.image-gallery-vertical__image-button',
    );

    expect(creationCard).not.toBeNull();
    await user.click(creationCard!);

    const dialog = screen.getByRole('dialog', { name: '图片详情' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.querySelector(':scope > .image-detail__close')).toBeInTheDocument();
    expect(dialog.querySelector(':scope > .image-detail__media')).toBeInTheDocument();
    expect(dialog.querySelector(':scope > .image-detail__body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭图片详情' })).toBeInTheDocument();
  });

  it('keeps the generation route and its operational controls', () => {
    renderRoute('/generate');
    const workspace = screen.getByRole('region', { name: '图像生成工作区' });
    const generate = within(workspace);
    expect(generate.getByLabelText('当前模型 gpt-image-2')).toHaveTextContent('gpt-image-2');
    expect(generate.getByLabelText('今日生成额度')).toBeInTheDocument();
    expect(generate.getByLabelText('选择画面比例')).toBeInTheDocument();
    expect(generate.getByRole('button', { name: /生成图片/ })).toBeInTheDocument();
    expect(workspace).toHaveClass('is-empty');
    expect(generate.queryByRole('region', { name: '本次创作结果' })).not.toBeInTheDocument();
  });

  it('uses the discovery navigation state without the workspace session controls', () => {
    renderRoute('/generate');

    const navigation = screen.getByRole('navigation', { name: '首页导航' });
    expect(within(navigation).getByRole('link', { name: '生图' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('region', { name: '最近会话' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '新建生成' })).not.toBeInTheDocument();
  });

  it('keeps generated results when submitting multiple prompts in the active session', async () => {
    generation.generate
      .mockResolvedValueOnce({
        batchId: 'session-a-batch',
        aspectRatio: '1:1',
        generationMode: 'text-to-image',
        entries: [
          {
            record: {
              id: 'session-a.png',
              batchId: 'session-a-batch',
              createdAt: '2026-08-04T09:00:00.000Z',
              prompt: '橙色机械城市',
              model: 'gpt-image-2',
              aspectRatio: '1:1',
              width: 1024,
              height: 1024,
              count: 1,
              resolution: 'standard',
              isPublic: false,
              isFavorite: false,
            },
            imageUrl: '/session-a.png',
          },
        ],
      })
      .mockResolvedValueOnce({
        batchId: 'session-b-batch',
        aspectRatio: '1:1',
        generationMode: 'text-to-image',
        entries: [
          {
            record: {
              id: 'session-b.png',
              batchId: 'session-b-batch',
              createdAt: '2026-08-04T09:01:00.000Z',
              prompt: '蓝色玻璃森林',
              model: 'gpt-image-2',
              aspectRatio: '1:1',
              width: 1024,
              height: 1024,
              count: 1,
              resolution: 'standard',
              isPublic: false,
              isFavorite: false,
            },
            imageUrl: '/session-b.png',
          },
        ],
      });
    const user = userEvent.setup();
    renderRoute('/generate');

    await user.type(screen.getByRole('textbox', { name: '图像提示词' }), '橙色机械城市');
    await user.click(screen.getByRole('button', { name: '生成图片' }));
    expect(await screen.findByRole('button', { name: '查看图片：橙色机械城市' })).toBeVisible();

    const promptInput = screen.getByRole('textbox', { name: '图像提示词' });
    await user.clear(promptInput);
    await user.type(promptInput, '蓝色玻璃森林');
    await user.click(screen.getByRole('button', { name: '生成图片' }));
    expect(await screen.findByRole('button', { name: '查看图片：蓝色玻璃森林' })).toBeVisible();
    expect(screen.getByRole('button', { name: '查看图片：橙色机械城市' })).toBeVisible();
  });

  it('restores the last viewed generation session after navigating away and back', async () => {
    const session = createGenerationSession('雾中的未来车站');
    attachGenerationBatch(session.id, 'route-return-batch', '雾中的未来车站');
    createGenerationSession('另一个更晚创建的会话');
    historyMocks.batches = [mockHistoryBatch('route-return-batch', '雾中的未来车站')];
    const user = userEvent.setup();
    renderRoute(`/generate?session=${session.id}`);

    expect(await screen.findByRole('button', { name: '查看图片：雾中的未来车站' })).toBeVisible();

    await user.click(
      within(screen.getByRole('navigation', { name: '首页导航' })).getByRole('link', {
        name: '创作模板',
      }),
    );
    expect(await screen.findByRole('region', { name: '创作模板' })).toBeVisible();

    await user.click(
      within(screen.getByRole('navigation', { name: '首页导航' })).getByRole('link', {
        name: '生图',
      }),
    );

    expect(await screen.findByRole('button', { name: '查看图片：雾中的未来车站' })).toBeVisible();
    expect(screen.getByLabelText('当前路由')).toHaveTextContent(`/generate?session=${session.id}`);
  });

  it('does not replace a prompt handoff with a remembered session', () => {
    const session = createGenerationSession('旧会话');
    attachGenerationBatch(session.id, 'old-batch', '旧会话');
    rememberGenerationSession('admin', session.id);
    historyMocks.batches = [mockHistoryBatch('old-batch', '旧会话')];

    renderRoute('/generate?prompt=%E6%96%B0%E7%9A%84%E5%88%9B%E4%BD%9C');

    expect(screen.getByLabelText('当前路由')).toHaveTextContent(
      '/generate?prompt=%E6%96%B0%E7%9A%84%E5%88%9B%E4%BD%9C',
    );
    expect(screen.getByRole('textbox', { name: '图像提示词' })).toHaveTextContent('新的创作');
    expect(screen.queryByRole('button', { name: '查看图片：旧会话' })).not.toBeInTheDocument();
  });

  it('starts a real automatic generation entry instead of restoring a remembered session', async () => {
    const session = createGenerationSession('旧会话');
    attachGenerationBatch(session.id, 'old-batch', '旧会话');
    rememberGenerationSession('admin', session.id);
    historyMocks.batches = [mockHistoryBatch('old-batch', '旧会话')];

    renderRoute({
      pathname: '/generate',
      search:
        '?prompt=%E8%87%AA%E5%8A%A8%E7%94%9F%E6%88%90%E7%9A%84%E6%96%B0%E7%94%BB%E9%9D%A2&aspect=16%3A9&count=1&isPublic=false',
      state: { autoGenerate: true },
    });

    await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
    expect(generation.generate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: '自动生成的新画面' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('当前路由').textContent).toMatch(/^\/generate\?session=/),
    );
    expect(screen.getByLabelText('当前路由')).not.toHaveTextContent(session.id);
    expect(screen.queryByRole('button', { name: '查看图片：旧会话' })).not.toBeInTheDocument();
  });

  it('does not restore a remembered session for a state-only automatic entry', async () => {
    const session = createGenerationSession('旧会话');
    attachGenerationBatch(session.id, 'old-batch', '旧会话');
    rememberGenerationSession('admin', session.id);
    historyMocks.batches = [mockHistoryBatch('old-batch', '旧会话')];

    renderRoute({ pathname: '/generate', state: { autoGenerate: true } });

    await waitFor(() =>
      expect(screen.getByLabelText('当前路由')).toHaveAttribute('data-has-state', 'false'),
    );
    expect(screen.getByLabelText('当前路由')).toHaveTextContent(/^\/generate$/);
    expect(generation.generate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '查看图片：旧会话' })).not.toBeInTheDocument();
  });

  it('does not restore after the bare route has already been initialized', async () => {
    historyMocks.batches = [mockHistoryBatch('late-batch', '另一标签页的会话')];
    renderRoute('/generate');

    act(() => {
      const session = createGenerationSession('另一标签页的会话');
      attachGenerationBatch(session.id, 'late-batch', '另一标签页的会话');
      rememberGenerationSession('admin', session.id);
    });

    await waitFor(() =>
      expect(screen.getByLabelText('当前路由')).toHaveTextContent(/^\/generate$/),
    );
    expect(
      screen.queryByRole('button', { name: '查看图片：另一标签页的会话' }),
    ).not.toBeInTheDocument();
  });

  it('does not restore a session remembered by another account', () => {
    const session = createGenerationSession('账号 A 的会话');
    attachGenerationBatch(session.id, 'account-a-batch', '账号 A 的会话');
    rememberGenerationSession('account-a', session.id);
    historyMocks.batches = [mockHistoryBatch('account-a-batch', '账号 A 的会话')];

    renderRoute('/generate');

    expect(screen.getByLabelText('当前路由')).toHaveTextContent(/^\/generate$/);
    expect(
      screen.queryByRole('button', { name: '查看图片：账号 A 的会话' }),
    ).not.toBeInTheDocument();
  });

  it('keeps session management hidden while preserving the generation workspace', () => {
    renderRoute('/generate');

    expect(screen.queryByRole('alertdialog', { name: '删除历史会话' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '最近会话' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '新建生成' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '图像生成工作区' })).toHaveClass('is-empty');
  });

  it('automatically names a new session from its first generation prompt', async () => {
    const user = userEvent.setup();
    renderRoute('/generate');

    await user.type(screen.getByRole('textbox', { name: '图像提示词' }), '薄雾中的未来海港');
    await user.click(screen.getByRole('button', { name: '生成图片' }));

    await screen.findByRole('button', { name: '生成图片' });
    expect(generation.generate).toHaveBeenCalledTimes(1);
  });

  it('opens the creation template library and carries a template into generation', async () => {
    const user = userEvent.setup();
    renderRoute('/templates');

    expect(await screen.findByRole('region', { name: '创作模板' })).toHaveClass('workspace-page');
    const templatesTitle = screen.getByRole('heading', { level: 1, name: '创作模板' });
    expect(templatesTitle.closest('header')).toHaveClass('operational-page-header');
    expect(within(templatesTitle.closest('header')!).getByText('163 个模板')).toHaveClass(
      'operational-page-header__meta',
    );
    expect(screen.queryByText('NEBULENS / LIBRARY')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索创作模板' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(24);
    while (screen.queryByRole('button', { name: '加载更多' })) {
      await user.click(screen.getByRole('button', { name: '加载更多' }));
    }
    expect(screen.getAllByRole('article')).toHaveLength(163);
    const templateImages = within(screen.getByRole('region', { name: '创作模板' })).getAllByRole(
      'img',
    );
    expect(templateImages).toHaveLength(163);
    expect(new Set(templateImages.map((image) => image.getAttribute('src'))).size).toBe(163);
    templateImages.forEach((image) => {
      expect(image).toHaveAttribute(
        'src',
        expect.stringMatching(/^\/media\/templates\/gpt-image2\//),
      );
    });
    const templateCategories = screen
      .getAllByRole('article')
      .map((card) => card.querySelector('small')?.textContent);
    expect(templateCategories.slice(0, 12).every((value) => value !== '动漫漫画')).toBe(true);
    expect(templateCategories.slice(-12).every((value) => value === '动漫漫画')).toBe(true);

    await user.click(screen.getByRole('button', { name: '模板排序' }));
    await user.click(screen.getByRole('menuitemradio', { name: '名称排序' }));
    expect(screen.getAllByRole('button', { name: /预览模板：/ })[0]).toHaveAccessibleName(
      '预览模板：16-panel anime expression grid',
    );
    await user.click(screen.getByRole('button', { name: '模板排序' }));
    await user.click(screen.getByRole('menuitemradio', { name: '精选排序' }));

    await user.click(screen.getAllByRole('button', { name: /使用模板 / })[0]!);
    expect(screen.getByRole('region', { name: '图像生成工作区' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '图像提示词' })).toHaveTextContent(
      'Generate a high-end photorealistic render of a future-facing biotech laboratory',
    );
    expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('16:9');
    expect(screen.getByRole('status', { name: '1 张' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '私有模式' })).toBeChecked();
    expect(generation.generate).not.toHaveBeenCalled();
  });

  it('keeps history and admin routes', async () => {
    const history = renderRoute('/history');
    expect(await screen.findByRole('region', { name: '个人资产' })).toHaveClass('workspace-page');
    expect(screen.getByRole('heading', { level: 1, name: '资产' }).closest('header')).toHaveClass(
      'operational-page-header',
    );
    history.unmount();
    renderRoute('/admin/users');
    await screen.findByRole('region', { name: '用户管理' });
    expect(
      screen.getByRole('heading', { level: 1, name: '用户管理' }).closest('header'),
    ).toHaveClass('operational-page-header');
    expect(screen.getByRole('region', { name: '用户管理' })).toHaveClass('workspace-page');
    expect(screen.getByRole('button', { name: '创建用户' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('form', { name: '创建新用户' })).not.toBeInTheDocument();
  });
});
