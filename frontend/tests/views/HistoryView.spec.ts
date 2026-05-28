import { enableAutoUnmount, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { h, nextTick, ref, type PropType, type SetupContext } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import historyViewSource from '@/views/HistoryView.vue?raw';
import type { HistoryEntry } from '@/types/image';

enableAutoUnmount(afterEach);

type DateRange = [string, string];

interface ConfigProviderStubProps {
  locale?: object;
}

interface DatePickerStubProps {
  modelValue: DateRange | null;
  type: string;
  format: string;
  valueFormat: string;
  rangeSeparator: string;
  startPlaceholder: string;
  endPlaceholder: string;
  popperClass: string;
  unlinkPanels: boolean;
}

function createEntry(id: string, createdAt: string, prompt: string): HistoryEntry {
  return {
    record: {
      id,
      batchId: `batch-${id}`,
      createdAt,
      prompt,
      model: 'gpt-image-2',
      width: 1024,
      height: 1024,
      aspectRatio: '1:1',
      isPublic: false,
    },
    imageUrl: `http://localhost:3000/api/outputs/${id}`,
  };
}

function defaultEntries(): HistoryEntry[] {
  return [
    createEntry('before', '2026-05-09T12:00:00.000Z', '筛选前的作品'),
    createEntry('range-start', '2026-05-10T12:00:00.000Z', '范围起始日作品'),
    createEntry('range-end', '2026-05-11T12:00:00.000Z', '范围结束日作品'),
    createEntry('after', '2026-05-12T12:00:00.000Z', '筛选后的作品'),
  ];
}

function getButtonByText(wrapper: VueWrapper, text: string): DOMWrapper<Element> {
  const button = wrapper.findAll('button').find((item) => item.text().includes(text));
  if (!button) throw new Error(`未找到 ${text} 按钮。`);
  return button;
}

function renderedEntryIds(wrapper: VueWrapper): string[] {
  return wrapper
    .findAll('.history-tile__thumb img')
    .map((item) => item.attributes('src')?.split('/').pop() ?? '');
}

function getSearchInput(wrapper: VueWrapper): HTMLInputElement {
  return wrapper.get('input[name="assetSearch"]').element as HTMLInputElement;
}

function bodyGet(selector: string): Element {
  const element = document.body.querySelector(selector);
  if (!element) throw new Error(`Unable to get ${selector} within document.body`);
  return element;
}

function extractStyleRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rulePattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return Array.from(historyViewSource.matchAll(rulePattern), (match) => match[1] ?? '');
}

function expectStyleDeclaration(rule: string, property: string, value: string): void {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(rule).toMatch(new RegExp(`(?:^|[;\\s])${escapedProperty}\\s*:\\s*${escapedValue}\\s*;`));
}

async function mountHistoryView(initialEntries: HistoryEntry[] = defaultEntries()) {
  vi.resetModules();

  const entries = ref(initialEntries);
  const hydrateError = ref<Error | null>(null);
  const remove = vi.fn<(id: string) => Promise<void>>(() => Promise.resolve());
  vi.doMock('element-plus/es/locale/lang/zh-cn', () => ({
    default: { name: 'zh-cn' },
  }));

  vi.doMock('element-plus', () => ({
    ElConfigProvider: {
      name: 'ElConfigProvider',
      props: {
        locale: {
          type: Object,
          default: undefined,
        },
      },
      setup(_props: ConfigProviderStubProps, { slots }: SetupContext) {
        return () => h('div', { 'data-testid': 'element-plus-config-provider' }, slots.default?.());
      },
    },
    ElDatePicker: {
      name: 'ElDatePicker',
      props: {
        modelValue: {
          type: Array as unknown as PropType<DateRange | null>,
          default: null,
        },
        type: {
          type: String,
          required: true,
        },
        format: {
          type: String,
          required: true,
        },
        valueFormat: {
          type: String,
          required: true,
        },
        rangeSeparator: {
          type: String,
          required: true,
        },
        startPlaceholder: {
          type: String,
          required: true,
        },
        endPlaceholder: {
          type: String,
          required: true,
        },
        popperClass: {
          type: String,
          required: true,
        },
        unlinkPanels: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['update:modelValue'],
      setup(props: DatePickerStubProps, { attrs, emit }: SetupContext) {
        return () =>
          h(
            'div',
            {
              'data-testid': 'date-range-picker',
              'data-value': JSON.stringify(props.modelValue),
              'data-type': props.type,
              'data-format': props.format,
              'data-value-format': props.valueFormat,
              'data-range-separator': props.rangeSeparator,
              'data-start-placeholder': props.startPlaceholder,
              'data-end-placeholder': props.endPlaceholder,
              'data-popper-class': props.popperClass,
              'data-unlink-panels': String(props.unlinkPanels),
              'aria-label': attrs['aria-label'],
            },
            [
              h(
                'button',
                {
                  type: 'button',
                  onClick: () => emit('update:modelValue', ['2026-05-10', '2026-05-11']),
                },
                '选择日期范围',
              ),
              h(
                'button',
                {
                  type: 'button',
                  onClick: () => emit('update:modelValue', null),
                },
                '清空日期范围',
              ),
            ],
          );
      },
    },
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }));

  vi.doMock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
  }));

  vi.doMock('@/composables/useImageHistory', () => ({
    useImageHistory: () => ({
      entries,
      hydrateError,
      remove,
    }),
  }));

  const HistoryView = (await import('@/views/HistoryView.vue')).default;
  const wrapper = mount(HistoryView);

  return { wrapper, remove };
}

describe('HistoryView layout and quick actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the personal assets title and a flattened asset console surface', async () => {
    const { wrapper } = await mountHistoryView();
    const titleRule = extractStyleRules('.history-page__title')[0] ?? '';
    const consoleRule = extractStyleRules('.asset-console')[0] ?? '';

    expect(wrapper.get('.history-page__title').text()).toBe('个人资产');
    expect(wrapper.find('.asset-console__summary').exists()).toBe(false);
    expect(wrapper.find('.asset-console__eyebrow').exists()).toBe(false);
    expect(wrapper.find('.asset-stats').exists()).toBe(false);
    expect(wrapper.find('.asset-tab').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('创作记录');
    expect(wrapper.text()).not.toContain('喜欢收藏');
    expect(wrapper.text()).not.toContain('上传素材');
    expect(wrapper.text()).not.toContain('全部 4');
    expect(wrapper.text()).not.toContain('已发布 0');
    expect(wrapper.text()).not.toContain('未发布 4');
    expect(wrapper.find('.history-page__add').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('添加内容');
    expect(wrapper.text()).not.toContain('资产库');
    expect(wrapper.text()).not.toContain('本地与云端历史保持同步');
    expect(wrapper.text()).not.toContain('刷新');
    expect(titleRule).not.toContain('clamp(44px, 6vw, 80px)');
    expectStyleDeclaration(titleRule, 'font-size', 'clamp(34px, 4.2vw, 56px)');
    expectStyleDeclaration(consoleRule, 'border', '0');
    expectStyleDeclaration(consoleRule, 'background', 'transparent');
    expectStyleDeclaration(consoleRule, 'box-shadow', 'none');
    expect(consoleRule).not.toMatch(/backdrop-filter/i);
    expect(consoleRule).not.toMatch(/blur\(/i);
  });

  it('opens the gallery detail viewer from an asset thumbnail and removes from the hover action', async () => {
    const entry = createEntry('quick-expand', '2026-05-18T08:00:00.000Z', '放大预览作品');
    const { wrapper, remove } = await mountHistoryView([entry]);

    await wrapper.get('.history-tile__thumb').trigger('click');
    await nextTick();

    expect(wrapper.find('.history-modal').exists()).toBe(false);
    expect(bodyGet('.recent-detail__stage img').getAttribute('src')).toContain('quick-expand');
    expect(bodyGet('.recent-detail__prompt').textContent).toBe(entry.record.prompt);
    expect(bodyGet('.recent-detail__close').getAttribute('aria-label')).toBe('关闭图片详情');

    await wrapper.get('.history-tile__remove').trigger('click');
    await nextTick();

    expect(remove).toHaveBeenCalledWith(entry.record.id);
    expect(document.body.querySelector('.recent-detail')).toBeNull();
  });
});

describe('HistoryView date range filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the styled Element Plus range picker instead of native date inputs', async () => {
    const { wrapper } = await mountHistoryView();
    const picker = wrapper.get('[data-testid="date-range-picker"]');

    expect(historyViewSource).not.toMatch(/type\s*=\s*["']date["']/);
    expect(picker.attributes('data-type')).toBe('daterange');
    expect(picker.attributes('data-format')).toBe('YYYY/MM/DD');
    expect(picker.attributes('data-value-format')).toBe('YYYY-MM-DD');
    expect(picker.attributes('data-range-separator')).toBe('至');
    expect(picker.attributes('data-start-placeholder')).toBe('起始日期');
    expect(picker.attributes('data-end-placeholder')).toBe('结束日期');
    expect(picker.attributes('data-popper-class')).toBe('history-date-range-popper');
    expect(picker.attributes('aria-label')).toBe('历史日期范围');
    expect(historyViewSource).toMatch(
      /history-date-range-popper\.el-popper[\s\S]*box-shadow:\s*none !important/,
    );
    expect(historyViewSource).toMatch(
      /@media \(max-width: 720px\)[\s\S]*history-date-range-popper\.el-popper[\s\S]*max-width:\s*calc\(100vw - 24px\)/,
    );
  });

  it('applies the selected date range only after querying', async () => {
    const { wrapper } = await mountHistoryView();

    expect(renderedEntryIds(wrapper)).toEqual([
      'after',
      'range-end',
      'range-start',
      'before',
    ]);

    await getButtonByText(wrapper, '选择日期范围').trigger('click');
    expect(renderedEntryIds(wrapper)).toEqual([
      'after',
      'range-end',
      'range-start',
      'before',
    ]);

    await wrapper.get('form.history-page__filters').trigger('submit');

    expect(renderedEntryIds(wrapper)).toEqual(['range-end', 'range-start']);
  });

  it('applies search only after querying and shows the active filter chip', async () => {
    const { wrapper } = await mountHistoryView();
    const input = getSearchInput(wrapper);

    await wrapper.get('input[name="assetSearch"]').setValue('范围起始');
    expect(input.value).toBe('范围起始');
    expect(renderedEntryIds(wrapper)).toEqual([
      'after',
      'range-end',
      'range-start',
      'before',
    ]);

    await wrapper.get('form.history-page__filters').trigger('submit');

    expect(renderedEntryIds(wrapper)).toEqual(['range-start']);
    expect(wrapper.get('.asset-filter-chips').text()).toContain('搜索：范围起始');
  });

  it('clears the pending range, search, and applied filters from the filter action', async () => {
    const { wrapper } = await mountHistoryView();

    await wrapper.get('input[name="assetSearch"]').setValue('范围起始');
    await getButtonByText(wrapper, '选择日期范围').trigger('click');
    await wrapper.get('form.history-page__filters').trigger('submit');
    expect(renderedEntryIds(wrapper)).toEqual(['range-start']);

    await getButtonByText(wrapper, '清除筛选').trigger('click');

    expect(getSearchInput(wrapper).value).toBe('');
    expect(wrapper.find('.asset-filter-chips').exists()).toBe(false);
    expect(wrapper.get('[data-testid="date-range-picker"]').attributes('data-value')).toBe('null');
    expect(renderedEntryIds(wrapper)).toEqual([
      'after',
      'range-end',
      'range-start',
      'before',
    ]);
  });
});
