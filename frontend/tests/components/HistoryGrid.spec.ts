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
  it('preserves thumbnail selection and copy interactions', async () => {
    const entry = createEntry();
    const wrapper = mount(HistoryGrid, {
      props: {
        entries: [entry],
      },
    });

    await wrapper.get('.history-tile__thumb').trigger('click');
    await wrapper.get('.history-tile__copy').trigger('click');

    expect(wrapper.emitted('select')).toEqual([[entry]]);
    expect(wrapper.emitted('copy-id')).toEqual([[entry]]);
  });

  it('keeps thumbnail images close to a flat smaller-radius frame', () => {
    const thumbRule = extractStyleRules('.history-tile__thumb')[0] ?? '';
    const imageRule = extractStyleRules('.history-tile__thumb img')[0] ?? '';

    expectStyleDeclaration(thumbRule, 'padding', 'var(--space-xs)');
    expectStyleDeclaration(thumbRule, 'border-radius', 'var(--radius-sm)');
    expectStyleDeclaration(thumbRule, 'background', 'var(--color-surface-card-solid)');
    expect(thumbRule).not.toMatch(/(?:linear|radial)-gradient/);
    expectStyleDeclaration(imageRule, 'padding', '0');
    expectStyleDeclaration(imageRule, 'border-radius', 'calc(var(--radius-sm) - 2px)');
    expect(imageRule).not.toMatch(/padding:\s*12%/);
  });
});
