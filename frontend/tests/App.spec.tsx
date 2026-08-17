import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
    batches: [],
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
import { resetGenerationSessionsForTests } from '@/hooks/useGenerationSessions';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  );
}

// Radix menu teardown and Motion modal exit keep React's jsdom act queue alive indefinitely.
async function clickDuringMotionHandoff(element: HTMLElement): Promise<void> {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false);
  try {
    element.click();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  } finally {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  resetGenerationSessionsForTests();
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
  it('renders the local six-image vertical gallery without hydrating the public gallery', () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const { container } = renderRoute('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Turn your idea into images' }),
    ).toBeInTheDocument();
    const shinyHeadline = screen.getByText('into images');
    expect(shinyHeadline).toHaveClass('animate-shiny');
    expect(shinyHeadline.style.backgroundSize).toBe('200% auto');
    expect(shinyHeadline.style.color).toBe('transparent');
    expect(shinyHeadline.style.backgroundImage).toContain('linear-gradient(110deg');
    expect(screen.queryByRole('heading', { level: 2, name: '今日创作' })).not.toBeInTheDocument();
    expect(container.querySelector('video.landing-hero__video')).toBeInTheDocument();
    expect(container.querySelector('.landing-hero')).toHaveAttribute('data-layout', 'media-stage');
    const creationCards = container.querySelectorAll('.image-gallery-vertical__image-button');
    const creationImages = container.querySelectorAll(
      '.landing-creations .image-gallery-vertical__columns img',
    );
    const animatedGalleryTracks = container.querySelectorAll(
      '.landing-creations [style*="animation-name"]',
    );
    const desktopGallery = container.querySelector<HTMLElement>(
      '.landing-creations [style*="--gallery-columns"]',
    );
    expect(desktopGallery?.style.getPropertyValue('--gallery-columns')).toBe('4');
    const creationSources = new Set(
      Array.from(creationCards).map((card) => card.querySelector('img')?.getAttribute('src')),
    );
    expect(creationSources).toHaveLength(6);
    expect(creationImages).toHaveLength(12);
    expect(animatedGalleryTracks).toHaveLength(0);
    expect(container.querySelector('.landing-creations style')).not.toBeInTheDocument();
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
    expect(
      fetchSpy.mock.calls.some(([input]) =>
        (input instanceof Request ? input.url : String(input)).includes('/api/history/public'),
      ),
    ).toBe(false);
    expect(screen.queryByRole('button', { name: '上一张作品' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一张作品' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '首页创作提示词' })).toBeInTheDocument();
    const landingComposer = container.querySelector('[data-slot="agent-chat-input"]');
    expect(landingComposer).toHaveAttribute('data-liquid-glass', 'true');
    expect(landingComposer).toHaveStyle({ '--border-radius': '30px' });
    expect(landingComposer?.querySelector('.border-glow-liquid-glass__effect')).toBeInTheDocument();
    expect(landingComposer?.querySelector('.border-glow-liquid-glass__chrome')).toBeInTheDocument();
    expect(landingComposer?.querySelector('feDisplacementMap')).toHaveAttribute('scale', '-150');
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

    await user.click(screen.getByRole('textbox', { name: '首页创作提示词' }));
    expect(anchor).toHaveAttribute('data-expanded', 'true');
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
    expect(submit).toHaveTextContent('15');
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '增加生成张数' }));
    expect(submit).toHaveTextContent('30');

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
  });

  it('activates the ReactBits border glow while the homepage prompt is focused', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');

    await user.click(screen.getByRole('textbox', { name: '首页创作提示词' }));

    await waitFor(() => {
      expect(container.querySelector('.border-glow-card')).toHaveAttribute(
        'data-glow-active',
        'true',
      );
    });
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

    expect(screen.getByRole('region', { name: '图像生成工作区' })).toBeInTheDocument();
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

  it('creates a generation session and supports inline renaming from the sidebar', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/generate');

    expect(screen.getByRole('region', { name: '最近会话' })).toHaveTextContent(
      '生成后会自动记录在这里',
    );
    await user.click(screen.getByRole('link', { name: '新建生成' }));

    const untitledSession = screen.getByRole('link', { name: '未命名会话' });
    expect(untitledSession).toHaveAttribute('href', expect.stringMatching(/^\/generate\?session=/));
    expect(container.querySelector('.sidebar-session')).toHaveClass('is-active');

    await user.click(screen.getByRole('button', { name: '会话选项：未命名会话' }));
    await user.click(screen.getByRole('menuitem', { name: '重命名' }));
    await user.type(screen.getByRole('textbox', { name: '会话名称' }), '霓虹城市方案');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('link', { name: '霓虹城市方案' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '会话名称' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '新建生成' }));
    expect(screen.getByRole('link', { name: '霓虹城市方案' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /会话选项/ })).toHaveLength(2);
  });

  it('keeps generated results when switching between recent sessions repeatedly', async () => {
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

    await user.click(screen.getByRole('link', { name: '新建生成' }));
    await user.type(screen.getByRole('textbox', { name: '图像提示词' }), '橙色机械城市');
    await user.click(screen.getByRole('button', { name: '生成图片' }));
    expect(await screen.findByRole('button', { name: '查看图片：橙色机械城市' })).toBeVisible();

    await user.click(screen.getByRole('link', { name: '新建生成' }));
    await user.type(screen.getByRole('textbox', { name: '图像提示词' }), '蓝色玻璃森林');
    await user.click(screen.getByRole('button', { name: '生成图片' }));
    expect(await screen.findByRole('button', { name: '查看图片：蓝色玻璃森林' })).toBeVisible();

    await user.click(screen.getByRole('link', { name: '橙色机械城市' }));
    expect(await screen.findByRole('button', { name: '查看图片：橙色机械城市' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '查看图片：蓝色玻璃森林' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '蓝色玻璃森林' }));
    expect(await screen.findByRole('button', { name: '查看图片：蓝色玻璃森林' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '查看图片：橙色机械城市' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '橙色机械城市' }));
    expect(await screen.findByRole('button', { name: '查看图片：橙色机械城市' })).toBeVisible();
  });

  it('confirms deleting the active generation session without deleting image assets', async () => {
    const user = userEvent.setup();
    renderRoute('/generate');

    await user.click(screen.getByRole('link', { name: '新建生成' }));
    await user.click(screen.getByRole('button', { name: '会话选项：未命名会话' }));
    await user.click(screen.getByRole('menuitem', { name: '删除' }));

    expect(screen.getByRole('alertdialog', { name: '删除历史会话' })).toHaveTextContent(
      '已生成的图片资产会保留',
    );
    await clickDuringMotionHandoff(screen.getByRole('button', { name: '删除会话' }));

    expect(screen.getByRole('region', { name: '最近会话' })).toHaveTextContent(
      '生成后会自动记录在这里',
    );
    expect(screen.queryByRole('link', { name: '未命名会话' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '图像生成工作区' })).toHaveClass('is-empty');
  });

  it('automatically names a new session from its first generation prompt', async () => {
    const user = userEvent.setup();
    renderRoute('/generate');

    await user.click(screen.getByRole('link', { name: '新建生成' }));
    await user.type(screen.getByRole('textbox', { name: '图像提示词' }), '薄雾中的未来海港');
    await user.click(screen.getByRole('button', { name: '生成图片' }));

    await waitFor(() =>
      expect(screen.getByRole('link', { name: '薄雾中的未来海港' })).toBeInTheDocument(),
    );
    expect(generation.generate).toHaveBeenCalledTimes(1);
  });

  it('opens the creation template library and carries a template into generation', async () => {
    const user = userEvent.setup();
    renderRoute('/templates');

    expect(screen.getByRole('region', { name: '创作模板' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索创作模板' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(12);
    const templateImages = within(screen.getByRole('region', { name: '创作模板' })).getAllByRole(
      'img',
    );
    expect(templateImages).toHaveLength(12);
    expect(new Set(templateImages.map((image) => image.getAttribute('src'))).size).toBe(12);
    templateImages.forEach((image) => {
      expect(image).toHaveAttribute('src', expect.stringMatching(/^\/media\/templates\//));
    });

    await user.click(screen.getByRole('button', { name: '使用模板 动感运动海报' }));
    expect(screen.getByRole('region', { name: '图像生成工作区' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '图像提示词' })).toHaveTextContent(
      '一张当代运动杂志封面',
    );
    expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('2:3');
    expect(screen.getByRole('status', { name: '2 张' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '私有模式' })).toBeChecked();
    expect(generation.generate).not.toHaveBeenCalled();
  });

  it('keeps history and admin routes', () => {
    const history = renderRoute('/history');
    expect(screen.getByRole('region', { name: '个人资产' })).toBeInTheDocument();
    history.unmount();
    renderRoute('/admin/users');
    expect(screen.getByRole('heading', { name: '用户管理' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: '创建新用户' })).toBeInTheDocument();
  });
});
