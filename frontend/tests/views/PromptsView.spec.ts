import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock('element-plus', () => ({
  ElMessage: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PromptsView', () => {
  beforeEach(() => {
    routerPush.mockClear();
  });

  it('renders built-in prompt templates with generated static images', async () => {
    const PromptsView = (await import('@/views/PromptsView.vue')).default;
    const wrapper = mount(PromptsView);

    expect(wrapper.text()).toContain('精选提示词库 · 内置静态模板');
    expect(wrapper.text()).toContain('移动应用仪表盘界面');
    expect(wrapper.text()).toContain('复制提示词');
    expect(wrapper.text()).toContain('去生成');

    const cards = wrapper.findAll('.prompt-card');
    expect(cards.length).toBeGreaterThan(4);
    expect(cards[0]?.find('img').attributes('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('routes to the generate workspace with the selected prompt', async () => {
    const PromptsView = (await import('@/views/PromptsView.vue')).default;
    const wrapper = mount(PromptsView);

    await wrapper.get('.prompt-card__generate').trigger('click');

    expect(routerPush).toHaveBeenCalledWith({
      path: '/generate',
      query: {
        prompt: expect.stringContaining('移动应用仪表盘界面'),
      },
    });
  });
});
