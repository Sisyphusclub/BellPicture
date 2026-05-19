import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import HistoryGrid from '@/components/gallery/HistoryGrid.vue';
import historyGridSource from '@/components/gallery/HistoryGrid.vue?raw';
import type { HistoryEntry } from '@/types/image';

enableAutoUnmount(afterEach);

function createEntry(overrides: Partial<HistoryEntry['record']> = {}): HistoryEntry {
  return {
    record: {
      id: 'history-grid-1.png',
      batchId: 'batch-history-grid-1',
      createdAt: '2026-05-18T08:00:00.000Z',
      prompt: '一间暖色调的复古影像工作室',
      model: 'gpt-image-2',
      width: 1536,
      height: 1024,
      aspectRatio: '3:2',
      isPublic: false,
      ...overrides,
    },
    imageUrl: 'blob:history-grid-1',
    size: 4096,
  };
}

function extractStyleRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rulePattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return Array.from(historyGridSource.matchAll(rulePattern), (match) => match[1] ?? '');
}

function expectStyleDeclaration(rule: string, property: string, value: string): void {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(rule).toMatch(new RegExp(`(?:^|[;\\s])${escapedProperty}\\s*:\\s*${escapedValue}\\s*;`));
}

describe('HistoryGrid', () => {
  it('emits selection, copy, quick enlarge, and quick remove from separate controls', async () => {
    const entry = createEntry();
    const wrapper = mount(HistoryGrid, {
      props: {
        entries: [entry],
      },
    });

    const expandButton = wrapper.get('.history-tile__action--expand');
    const removeButton = wrapper.get('.history-tile__action--remove');

    expect(expandButton.text()).toBe('放大');
    expect(removeButton.text()).toBe('删除');
    expect(expandButton.attributes('aria-label')).toBe(`放大查看图片：${entry.record.prompt}`);
    expect(removeButton.attributes('aria-label')).toBe(`删除历史图片：${entry.record.prompt}`);

    await expandButton.trigger('click');
    await removeButton.trigger('click');

    expect(wrapper.emitted('expand')).toEqual([[entry]]);
    expect(wrapper.emitted('remove')).toEqual([[entry]]);
    expect(wrapper.emitted('select')).toBeUndefined();

    await wrapper.get('.history-tile__thumb').trigger('click');
    await wrapper.get('.history-tile__copy').trigger('click');

    expect(wrapper.emitted('select')).toEqual([[entry]]);
    expect(wrapper.emitted('copy-id')).toEqual([[entry]]);
  });

  it('keeps quick actions as sibling hover and focus controls on a flat thumbnail frame', () => {
    const wrapper = mount(HistoryGrid, {
      props: {
        entries: [createEntry()],
      },
    });
    const mediaRule = extractStyleRules('.history-tile__media')[0] ?? '';
    const thumbRule = extractStyleRules('.history-tile__thumb')[0] ?? '';
    const imageRule = extractStyleRules('.history-tile__thumb img')[0] ?? '';
    const quickActionsRule = extractStyleRules('.history-tile__quick-actions')[0] ?? '';
    const actionRule = extractStyleRules('.history-tile__action')[0] ?? '';

    expect(wrapper.find('.history-tile__media > .history-tile__thumb').exists()).toBe(true);
    expect(wrapper.find('.history-tile__media > .history-tile__quick-actions').exists()).toBe(true);
    expect(wrapper.find('.history-tile__thumb .history-tile__action').exists()).toBe(false);
    expect(historyGridSource).toMatch(
      /history-tile__media:hover \.history-tile__quick-actions,[\s\S]*history-tile__media:focus-within \.history-tile__quick-actions[\s\S]*opacity:\s*1/,
    );
    expect(wrapper.get('.history-tile__quick-actions').attributes('role')).toBe('group');
    expect(historyGridSource).toContain('aria-label="图片快捷操作"');

    expectStyleDeclaration(mediaRule, 'border-radius', 'var(--radius-sm)');
    expectStyleDeclaration(mediaRule, 'background', 'var(--color-surface-card-solid)');
    expectStyleDeclaration(thumbRule, 'padding', 'var(--space-xs)');
    expectStyleDeclaration(thumbRule, 'border', '0');
    expectStyleDeclaration(thumbRule, 'background', 'transparent');
    expectStyleDeclaration(thumbRule, 'box-shadow', 'none');
    expectStyleDeclaration(imageRule, 'padding', '0');
    expectStyleDeclaration(imageRule, 'border-radius', 'calc(var(--radius-sm) - 2px)');
    expectStyleDeclaration(quickActionsRule, 'opacity', '0');
    expectStyleDeclaration(quickActionsRule, 'pointer-events', 'none');
    expectStyleDeclaration(actionRule, 'box-shadow', 'none');
    expect(thumbRule).not.toMatch(/(?:linear|radial)-gradient/);
    expect(imageRule).not.toMatch(/padding:\s*12%/);
  });
});
