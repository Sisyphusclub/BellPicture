import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import promptsViewSource from '@/views/PromptsView.vue?raw';

const routerPush = vi.fn();
let clipboardWriteText: ReturnType<typeof vi.fn<Clipboard['writeText']>>;

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

function getButtonByText(wrapper: VueWrapper, text: string): DOMWrapper<Element> {
  const button = wrapper.findAll('button').find((item) => item.text().includes(text));
  if (!button) throw new Error(`未找到 ${text} 按钮。`);
  return button;
}

function extractStyleRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rulePattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return Array.from(promptsViewSource.matchAll(rulePattern), (match) => match[1] ?? '');
}

function readStyleDeclaration(rule: string, property: string): string {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[;\\s])${escapedProperty}\\s*:\\s*([^;]+);`).exec(rule)?.[1]?.trim() ?? '';
}

function expectStyleDeclaration(rule: string, property: string, value: string): void {
  expect(readStyleDeclaration(rule, property)).toBe(value);
}

function expectClampMaxAtMost(rule: string, property: string, maxPx: number): void {
  const value = readStyleDeclaration(rule, property);
  const match = /^clamp\([^,]+,[^,]+,\s*(\d+(?:\.\d+)?)px\)$/.exec(value);
  expect(match?.[1] ? Number(match[1]) : Number.POSITIVE_INFINITY).toBeLessThanOrEqual(maxPx);
}

describe('PromptsView', () => {
  beforeEach(() => {
    routerPush.mockClear();
    vi.mocked(ElMessage.info).mockClear();
    vi.mocked(ElMessage.success).mockClear();
    vi.mocked(ElMessage.error).mockClear();
    clipboardWriteText = vi.fn<Clipboard['writeText']>(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    });
  });

  it('renders built-in prompt templates with generated static images inside one library panel', async () => {
    const PromptsView = (await import('@/views/PromptsView.vue')).default;
    const wrapper = mount(PromptsView);

    expect(wrapper.text()).toContain('精选提示词库 · 内置静态模板');
    expect(wrapper.text()).toContain('快速检索模板');
    expect(wrapper.text()).toContain('移动应用仪表盘界面');
    expect(wrapper.text()).toContain('复制提示词');
    expect(wrapper.text()).toContain('去生成');

    const panel = wrapper.get('.prompt-library-panel');
    expect(panel.find('.prompt-search').exists()).toBe(true);
    expect(panel.find('.category-cloud').exists()).toBe(true);
    expect(panel.find('.prompt-card-grid').exists()).toBe(true);

    const cards = panel.findAll('.prompt-card');
    expect(cards.length).toBeGreaterThan(4);
    expect(cards[0]?.find('img').attributes('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('uses a product-tool title scale and flattened warm card surfaces', () => {
    const titleRule = extractStyleRules('.prompt-library-hero h1')[0] ?? '';
    const panelRule = extractStyleRules('.prompt-library-panel')[0] ?? '';
    const cardRule = extractStyleRules('.prompt-card')[0] ?? '';
    const mobileTitleRule = extractStyleRules('.prompt-library-hero h1')[1] ?? '';

    expect(promptsViewSource).not.toContain('clamp(52px, 8.8vw, 104px)');
    expectClampMaxAtMost(titleRule, 'font-size', 60);
    expectClampMaxAtMost(mobileTitleRule, 'font-size', 48);
    expectStyleDeclaration(panelRule, 'border', '1px solid var(--color-hairline)');
    expectStyleDeclaration(panelRule, 'box-shadow', 'none');
    expect(readStyleDeclaration(panelRule, 'background')).toContain('oklch(');
    expectStyleDeclaration(cardRule, 'border', '1px solid var(--color-hairline)');
    expectStyleDeclaration(cardRule, 'background', 'var(--color-surface-card-solid)');
    expectStyleDeclaration(cardRule, 'box-shadow', 'none');
    expect(cardRule).not.toMatch(/backdrop-filter/i);
    expect(cardRule).not.toMatch(/blur\(/i);
    expect(panelRule).not.toMatch(/backdrop-filter/i);
    expect(panelRule).not.toMatch(/blur\(/i);
  });

  it('keeps search and category filters grouped above the prompt card grid', () => {
    const panelIndex = promptsViewSource.indexOf('class="prompt-library-panel"');
    const controlsIndex = promptsViewSource.indexOf('class="prompt-library-controls"');
    const searchIndex = promptsViewSource.indexOf('class="prompt-search"');
    const categoryIndex = promptsViewSource.indexOf('class="category-cloud"');
    const gridIndex = promptsViewSource.indexOf('class="prompt-card-grid"');

    expect(panelIndex).toBeGreaterThan(-1);
    expect(controlsIndex).toBeGreaterThan(panelIndex);
    expect(searchIndex).toBeGreaterThan(controlsIndex);
    expect(categoryIndex).toBeGreaterThan(searchIndex);
    expect(gridIndex).toBeGreaterThan(categoryIndex);
  });

  it('filters templates by search keyword and category while preserving the empty state', async () => {
    const PromptsView = (await import('@/views/PromptsView.vue')).default;
    const wrapper = mount(PromptsView);

    await wrapper.get('input[type="search"]').setValue('Logo');

    expect(wrapper.text()).toContain('抽象标志设计系统');
    expect(wrapper.text()).not.toContain('雨后动漫城市傍晚');

    await wrapper.get('input[type="search"]').setValue('');
    await getButtonByText(wrapper, '建筑').trigger('click');

    expect(wrapper.text()).toContain('有机现代山坡别墅');
    expect(wrapper.text()).not.toContain('移动应用仪表盘界面');

    await wrapper.get('input[type="search"]').setValue('没有结果的关键词');

    expect(wrapper.find('.prompt-card-grid').exists()).toBe(false);
    expect(wrapper.get('.prompt-empty').text()).toContain('没有找到匹配的提示词');
  });

  it('copies the selected prompt with Simplified Chinese feedback', async () => {
    const PromptsView = (await import('@/views/PromptsView.vue')).default;
    const wrapper = mount(PromptsView);

    await wrapper.get('.prompt-card__copy').trigger('click');

    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('移动应用仪表盘界面'));
    expect(ElMessage.success).toHaveBeenCalledWith('提示词已复制。');
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
