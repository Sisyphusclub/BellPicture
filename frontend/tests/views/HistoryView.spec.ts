import { enableAutoUnmount, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { h, ref, type PropType, type SetupContext } from 'vue';
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

async function mountHistoryView(
  initialEntries: HistoryEntry[] = defaultEntries(),
): Promise<VueWrapper> {
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
  return mount(HistoryView);
}

describe('HistoryView date range filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the styled Element Plus range picker instead of native date inputs', async () => {
    const wrapper = await mountHistoryView();
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
    const wrapper = await mountHistoryView();

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
    const wrapper = await mountHistoryView();

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
