import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, readonly, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HistoryDetailPanel from '@/components/gallery/HistoryDetailPanel.vue';
import historyDetailPanelSource from '@/components/gallery/HistoryDetailPanel.vue?raw';
import type { HistoryEntry } from '@/types/image';

interface HistoryViewHarness {
  wrapper: VueWrapper;
}

enableAutoUnmount(afterEach);

function createEntry(overrides: Partial<HistoryEntry['record']> = {}): HistoryEntry {
  return {
    record: {
      id: 'history-1.png',
      batchId: 'batch-history-1',
      createdAt: '2026-05-18T08:00:00.000Z',
      prompt: '一间暖色调的复古影像工作室',
      model: 'gpt-image-2',
      width: 1536,
      height: 1024,
      aspectRatio: '3:2',
      isPublic: false,
      ...overrides,
    },
    imageUrl: 'blob:history-1',
    size: 4096,
  };
}

function extractStyleRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rulePattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return Array.from(historyDetailPanelSource.matchAll(rulePattern), (match) => match[1] ?? '');
}

function expectStyleDeclaration(rule: string, property: string, value: string): void {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(rule).toMatch(new RegExp(`(?:^|[;\\s])${escapedProperty}\\s*:\\s*${escapedValue}\\s*;`));
}

async function mountHistoryView(entry = createEntry()): Promise<HistoryViewHarness> {
  vi.resetModules();

  const entries = ref<HistoryEntry[]>([entry]);
  const isHydrating = ref(false);
  const hydrateError = ref<Error | null>(null);

  vi.doMock('vue-router', () => ({
    useRouter: () => ({
      push: vi.fn(() => Promise.resolve()),
    }),
  }));

  vi.doMock('@/composables/useImageHistory', () => ({
    useImageHistory: () => ({
      entries: readonly(entries),
      isHydrating: readonly(isHydrating),
      hydrateError: readonly(hydrateError),
      refresh: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
    }),
  }));

  vi.doMock('@/components/gallery/HistoryGrid.vue', () => ({
    default: {
      name: 'HistoryGridStub',
      props: {
        entries: {
          type: Array,
          required: true,
        },
      },
      emits: ['select', 'expand', 'remove', 'copy-id'],
      template:
        '<div class="history-grid-stub"><button type="button" class="history-grid-stub__select" @click="$emit(\'select\', entries[0])">打开详情</button></div>',
    },
  }));

  const HistoryView = (await import('@/views/HistoryView.vue')).default;
  const wrapper = mount(HistoryView, { attachTo: document.body });

  return { wrapper };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('HistoryDetailPanel', () => {
  it('keeps exactly the three detail actions', () => {
    const entry = createEntry();
    const wrapper = mount(HistoryDetailPanel, {
      props: {
        entry,
      },
    });

    const actionLabels = wrapper
      .findAll('.detail-panel__actions button')
      .map((button) => button.text());

    expect(actionLabels).toEqual(['用此提示词再生成', '下载', '移除']);
  });

  it('shows a compact generated title and keeps the full prompt in a readonly field', () => {
    const prompt = '一间暖色调的复古影像工作室，摆放胶片灯和木质桌面，需要突出胶片颗粒';
    const wrapper = mount(HistoryDetailPanel, {
      props: {
        entry: createEntry({ prompt }),
      },
    });

    const promptField = wrapper.get('.detail-panel__prompt-field').element as HTMLTextAreaElement;
    const titleRule = extractStyleRules('.detail-panel__title')[0] ?? '';
    const promptFieldRule = extractStyleRules('.detail-panel__prompt-field')[0] ?? '';

    expect(wrapper.get('#history-detail-title').text()).toBe('一间暖色调的复古影像工作室');
    expect(wrapper.get('.detail-panel__prompt-row dt').text()).toBe('提示词');
    expect(promptField.value).toBe(prompt);
    expect(promptField.readOnly).toBe(true);
    expect(titleRule).toMatch(/font-size:\s*clamp\(23px,\s*2\.4vw,\s*28px\)/);
    expectStyleDeclaration(promptFieldRule, 'border-radius', 'var(--radius-xs)');
    expectStyleDeclaration(promptFieldRule, 'box-shadow', 'none');
  });

  it('can mount directly in enlarged image preview mode', () => {
    const entry = createEntry();
    const wrapper = mount(HistoryDetailPanel, {
      props: {
        entry,
        initialExpanded: true,
      },
    });

    expect(wrapper.get('.detail-panel').classes()).toContain('detail-panel--expanded');
    expect(wrapper.find('.detail-panel__viewer').exists()).toBe(true);
    expect(wrapper.find('.detail-panel__content').exists()).toBe(false);
    expect(wrapper.get('#history-detail-expanded-title').text()).toBe('图片放大预览');
    expect(wrapper.get('.detail-panel__viewer img').attributes('src')).toBe(entry.imageUrl);
  });

  it('opens an enlarged image preview and returns to the detail view', async () => {
    const entry = createEntry();
    const wrapper = mount(HistoryDetailPanel, {
      attachTo: document.body,
      props: {
        entry,
      },
    });

    const imageButton = wrapper.get('.detail-panel__image-button');
    expect(imageButton.attributes('aria-label')).toBe('放大查看选中的历史图片');

    await imageButton.trigger('click');
    await nextTick();

    expect(wrapper.find('.detail-panel__viewer').exists()).toBe(true);
    expect(wrapper.get('.detail-panel__viewer img').attributes('src')).toBe(entry.imageUrl);
    expect(wrapper.text()).toContain('返回详情');
    expect(document.activeElement).toBe(wrapper.get('.detail-panel__back').element);
    expect(wrapper.emitted('expanded-change')?.[0]).toEqual([true]);

    await wrapper.get('.detail-panel__back').trigger('click');
    await nextTick();

    expect(wrapper.find('.detail-panel__viewer').exists()).toBe(false);
    expect(wrapper.find('.detail-panel__content').exists()).toBe(true);
    expect(document.activeElement).toBe(wrapper.get('.detail-panel__image-button').element);
    expect(wrapper.emitted('expanded-change')?.[1]).toEqual([false]);
  });

  it('keeps expanded images contained and removes shadows from action buttons', async () => {
    const wrapper = mount(HistoryDetailPanel, {
      props: {
        entry: createEntry(),
      },
    });

    await wrapper.get('.detail-panel__image-button').trigger('click');

    const actionButtonRule = extractStyleRules('.detail-panel__actions .claude-button')[0] ?? '';
    const removeButtonRule =
      extractStyleRules('.detail-panel__actions .detail-panel__remove')[0] ?? '';
    const stageRule = extractStyleRules('.detail-panel__viewer-stage')[0] ?? '';
    const imageRule = extractStyleRules('.detail-panel__viewer-stage img')[0] ?? '';

    expect(wrapper.get('.detail-panel').classes()).toContain('detail-panel--expanded');
    expectStyleDeclaration(actionButtonRule, 'box-shadow', 'none');
    expectStyleDeclaration(actionButtonRule, 'filter', 'none');
    expectStyleDeclaration(removeButtonRule, 'box-shadow', 'none');
    expectStyleDeclaration(removeButtonRule, 'filter', 'none');
    expect(`${actionButtonRule}\n${removeButtonRule}`).not.toMatch(/drop-shadow/i);
    expectStyleDeclaration(stageRule, 'height', '100%');
    expectStyleDeclaration(stageRule, 'min-height', '0');
    expectStyleDeclaration(stageRule, 'max-height', '100%');
    expectStyleDeclaration(stageRule, 'overflow', 'hidden');
    expectStyleDeclaration(imageRule, 'position', 'absolute');
    expectStyleDeclaration(imageRule, 'inset', 'var(--history-detail-viewer-stage-padding)');
    expect(imageRule).toMatch(/width:\s*calc\(/);
    expect(imageRule).toMatch(/height:\s*calc\(/);
    expectStyleDeclaration(imageRule, 'max-height', '100%');
    expectStyleDeclaration(imageRule, 'object-fit', 'contain');
    expect(imageRule).not.toMatch(/object-fit:\s*cover/);
  });
});

describe('HistoryView detail modal', () => {
  it('renders only the panel download action after opening detail', async () => {
    const { wrapper } = await mountHistoryView();

    await wrapper.get('.history-grid-stub__select').trigger('click');
    await nextTick();

    const modal = wrapper.get('.history-modal__panel');
    const downloadButtons = modal.findAll('button').filter((button) => button.text() === '下载');

    expect(modal.attributes('aria-labelledby')).toBe('history-detail-title');
    expect(wrapper.get('.history-modal__close').attributes('aria-label')).toBe('关闭历史详情');
    expect(modal.find('.history-modal__actions').exists()).toBe(false);
    expect(modal.findAll('.detail-panel__actions button').map((button) => button.text())).toEqual([
      '用此提示词再生成',
      '下载',
      '移除',
    ]);
    expect(downloadButtons).toHaveLength(1);
  });

  it('keeps backdrop and Escape close behavior from the enlarged preview', async () => {
    const { wrapper } = await mountHistoryView();

    await wrapper.get('.history-grid-stub__select').trigger('click');
    await wrapper.get('.detail-panel__image-button').trigger('click');
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

    await wrapper.get('.history-modal').trigger('click');
    await nextTick();

    expect(wrapper.find('.history-modal').exists()).toBe(false);

    await wrapper.get('.history-grid-stub__select').trigger('click');
    await wrapper.get('.detail-panel__image-button').trigger('click');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.find('.history-modal').exists()).toBe(false);
  });
});
