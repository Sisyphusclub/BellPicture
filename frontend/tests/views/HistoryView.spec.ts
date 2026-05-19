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
    createEntry('before.png', '2026-05-09T12:00:00.000Z', '筛选前的作品'),
    createEntry('range-start.png', '2026-05-10T12:00:00.000Z', '范围起始日作品'),
    createEntry('range-end.png', '2026-05-11T12:00:00.000Z', '范围结束日作品'),
    createEntry('after.png', '2026-05-12T12:00:00.000Z', '筛选后的作品'),
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
  const isHydrating = ref(false);
  const hydrateError = ref<Error | null>(null);
  const refresh = vi.fn<() => Promise<void>>(() => Promise.resolve());
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
      isHydrating,
      hydrateError,
      refresh,
      remove,
    }),
  }));

  const HistoryView = (await import('@/views/HistoryView.vue')).default;
  const wrapper = mount(HistoryView);

  return { wrapper, remove, refresh };
}

describe('HistoryView layout and quick actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a calmer page title and a flattened history card surface', () => {
    const titleRule = extractStyleRules('.history-page__title')[0] ?? '';
    const cardRule = extractStyleRules('.history-card')[0] ?? '';

    expect(titleRule).not.toContain('clamp(44px, 6vw, 80px)');
    expectStyleDeclaration(titleRule, 'font-size', 'clamp(34px, 4.2vw, 56px)');
    expectStyleDeclaration(cardRule, 'border', '1px solid var(--color-hairline)');
    expectStyleDeclaration(cardRule, 'background', 'oklch(99.1% 0.004 88deg / 0.94)');
    expectStyleDeclaration(cardRule, 'box-shadow', 'none');
    expect(cardRule).not.toMatch(/backdrop-filter/i);
    expect(cardRule).not.toMatch(/blur\(/i);
  });

  it('opens quick enlarge directly in the expanded history detail modal', async () => {
    const entry = createEntry('quick-expand.png', '2026-05-18T08:00:00.000Z', '放大预览作品');
    const { wrapper } = await mountHistoryView([entry]);

    await wrapper.get('.history-tile__action--expand').trigger('click');
    await nextTick();

    expect(wrapper.get('.history-modal__panel').classes()).toContain(
      'history-modal__panel--expanded',
    );
    expect(wrapper.get('.history-modal__panel').attributes('aria-labelledby')).toBe(
      'history-detail-expanded-title',
    );
    expect(wrapper.get('.history-modal__close').attributes('aria-label')).toBe(
      '关闭历史图片放大预览',
    );
    expect(wrapper.find('.detail-panel__viewer').exists()).toBe(true);
    expect(wrapper.text()).toContain('返回详情');
  });

  it('uses the existing remove path from the quick delete action without opening detail', async () => {
    const entry = createEntry('quick-delete.png', '2026-05-18T08:00:00.000Z', '待删除作品');
    const { wrapper, remove } = await mountHistoryView([entry]);

    await wrapper.get('.history-tile__action--remove').trigger('click');

    expect(remove).toHaveBeenCalledWith(entry.record.id);
    expect(wrapper.find('.history-modal').exists()).toBe(false);
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
    expect(picker.attributes('data-range-separator')).toBe('—');
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
      'before.png',
      'range-start.png',
      'range-end.png',
      'after.png',
    ]);

    await getButtonByText(wrapper, '选择日期范围').trigger('click');
    expect(renderedEntryIds(wrapper)).toEqual([
      'before.png',
      'range-start.png',
      'range-end.png',
      'after.png',
    ]);

    await wrapper.get('form.history-page__filters').trigger('submit');

    expect(renderedEntryIds(wrapper)).toEqual(['range-start.png', 'range-end.png']);
  });

  it('clears the pending range and applied date filter from the filter action', async () => {
    const { wrapper } = await mountHistoryView();

    await getButtonByText(wrapper, '选择日期范围').trigger('click');
    await wrapper.get('form.history-page__filters').trigger('submit');
    expect(renderedEntryIds(wrapper)).toEqual(['range-start.png', 'range-end.png']);

    await getButtonByText(wrapper, '清除筛选条件').trigger('click');

    expect(wrapper.get('[data-testid="date-range-picker"]').attributes('data-value')).toBe('null');
    expect(renderedEntryIds(wrapper)).toEqual([
      'before.png',
      'range-start.png',
      'range-end.png',
      'after.png',
    ]);
  });
});
