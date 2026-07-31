import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    quota: { total: 20, remaining: 16 },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
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

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
    expect(screen.queryByRole('heading', { level: 2, name: '今日创作' })).not.toBeInTheDocument();
    expect(container.querySelector('video.landing-hero__video')).toBeInTheDocument();
    const creationCards = container.querySelectorAll('.image-gallery-vertical__image-button');
    const desktopGallery = container.querySelector<HTMLElement>(
      '.landing-creations [style*="--gallery-columns"]',
    );
    expect(desktopGallery?.style.getPropertyValue('--gallery-columns')).toBe('4');
    const creationSources = new Set(
      Array.from(creationCards).map((card) => card.querySelector('img')?.getAttribute('src')),
    );
    expect(creationSources).toHaveLength(6);
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
    expect(screen.queryByRole('button', { name: /选择智能体/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '选择模型和推理强度，当前：gpt-image-2，标准',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择首页画面尺寸' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '生成张数' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '公开作品' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '剩余额度 16，总额度 20' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '正在发生的想象' })).not.toBeInTheDocument();
  });

  it('places creation templates between generation and assets in the landing navigation', () => {
    renderRoute('/');
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
  });

  it('changes the homepage reasoning setting', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    await user.click(
      screen.getByRole('button', {
        name: '选择模型和推理强度，当前：gpt-image-2，标准',
      }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: '推理强度：精细' }));
    expect(
      screen.getByRole('button', {
        name: '选择模型和推理强度，当前：gpt-image-2，精细',
      }),
    ).toBeInTheDocument();
  });

  it('activates the official border beam while the homepage prompt is focused', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');

    await user.click(screen.getByRole('textbox', { name: '首页创作提示词' }));

    await waitFor(() => {
      expect(container.querySelector('.agent-chat-input__border-beam')).toHaveAttribute(
        'data-active',
      );
    });
  });

  it('carries a homepage prompt into the generation workspace', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    await user.type(screen.getByRole('textbox', { name: '首页创作提示词' }), '雨夜的未来城市');
    await user.click(screen.getByRole('button', { name: '选择首页画面尺寸' }));
    await user.click(screen.getByRole('menuitemradio', { name: /16:9/ }));
    await user.click(screen.getByRole('button', { name: '增加生成张数' }));
    await user.click(screen.getByRole('switch', { name: '公开作品' }));
    await user.click(screen.getByRole('button', { name: '带着提示词开始创作' }));

    expect(screen.getByRole('region', { name: '图像生成工作区' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '图像提示词' })).toHaveTextContent('雨夜的未来城市');
    expect(screen.getByRole('button', { name: '选择画面比例' })).toHaveTextContent('16:9');
    expect(screen.getByRole('status', { name: '2 张' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '高级生成设置' })).toHaveTextContent('公开');
  });

  it('opens and closes the expanding pill mobile navigation', async () => {
    const user = userEvent.setup();
    renderRoute('/');

    const openMenu = screen.getByRole('button', { name: '打开首页菜单' });
    await user.click(openMenu);

    expect(screen.getByRole('navigation', { name: '移动端首页导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭首页菜单' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(screen.getByRole('button', { name: '关闭首页菜单' }));
    await waitFor(() => {
      expect(screen.queryByRole('navigation', { name: '移动端首页导航' })).not.toBeInTheDocument();
    });
  });

  it('opens a vertical gallery image without entering a modal state loop', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/');
    const creationCard = container.querySelector<HTMLButtonElement>(
      '.image-gallery-vertical__image-button',
    );

    expect(creationCard).not.toBeNull();
    await user.click(creationCard!);

    expect(screen.getByRole('dialog', { name: '图片详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭图片详情' })).toBeInTheDocument();
  });

  it('keeps the generation route and its operational controls', () => {
    renderRoute('/generate');
    expect(screen.getByRole('region', { name: '图像生成工作区' })).toBeInTheDocument();
    expect(screen.getByLabelText('选择画面比例')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /生成图片/ })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: '高级生成设置' })).toHaveTextContent('私有');
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
