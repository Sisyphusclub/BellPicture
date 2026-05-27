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
  it('opens the gallery-style viewer from the asset thumbnail only', async () => {
    const entry = createEntry();
    const wrapper = mount(HistoryGrid, {
      props: {
        entries: [entry],
      },
    });

    const thumbButton = wrapper.get('.history-tile__thumb');

    expect(wrapper.get('.history-grid').attributes('aria-label')).toBe('资产列表');
    expect(wrapper.get('.history-group__header').text()).toContain('2026年5月18日周一');
    expect(wrapper.get('.history-tile__badge').text()).toBe('私有');
    expect(wrapper.find('.history-tile__title').exists()).toBe(false);
    expect(wrapper.find('.history-tile__prompt').exists()).toBe(false);
    expect(wrapper.find('.history-tile__action').exists()).toBe(false);
    expect(wrapper.find('.history-tile__copy').exists()).toBe(false);
    expect(wrapper.find('.history-tile__quick-actions').exists()).toBe(false);
    expect(wrapper.get('.history-tile__remove').attributes('aria-label')).toBe(`删除资产：${entry.record.prompt}`);
    expect(wrapper.get('.history-tile__meta').text()).toContain('16:00');
    expect(thumbButton.attributes('aria-label')).toBe(`查看资产详情：${entry.record.prompt}`);

    await thumbButton.trigger('click');

    expect(wrapper.emitted('expand')).toEqual([[entry]]);
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.emitted('remove')).toBeUndefined();
    expect(wrapper.emitted('copy-id')).toBeUndefined();

    await wrapper.get('.history-tile__remove').trigger('click');

    expect(wrapper.emitted('remove')).toEqual([[entry]]);
  });

  it('uses grouped square visual thumbnails for landscape, portrait, and square assets', () => {
    const wrapper = mount(HistoryGrid, {
      props: {
        entries: [
          createEntry({ id: 'landscape', width: 1536, height: 1024, aspectRatio: '3:2' }),
          createEntry({ id: 'portrait', width: 1024, height: 1536, aspectRatio: '2:3' }),
          createEntry({ id: 'square', width: 1024, height: 1024, aspectRatio: '1:1' }),
        ],
      },
    });
    const assetsRule = extractStyleRules('.history-group__assets')[0] ?? '';
    const tileRule = extractStyleRules('.history-tile')[0] ?? '';
    const headingRule = extractStyleRules('.history-group__header h2')[0] ?? '';
    const thumbRule = extractStyleRules('.history-tile__thumb')[0] ?? '';
    const imageRule = extractStyleRules('.history-tile__thumb img')[0] ?? '';
    const badgeRule = extractStyleRules('.history-tile__badge')[0] ?? '';
    const removeRule = extractStyleRules('.history-tile__remove')[0] ?? '';
    const metaRule = extractStyleRules('.history-tile__meta')[0] ?? '';

    expect(wrapper.find('.history-group__assets > .history-tile').exists()).toBe(true);
    expect(wrapper.find('.history-tile__quick-actions').exists()).toBe(false);
    expect(wrapper.find('.history-tile__action').exists()).toBe(false);
    expect(wrapper.find('.history-tile__copy').exists()).toBe(false);
    expect(wrapper.findAll('.history-tile')).toHaveLength(3);
    expect(wrapper.findAll('.history-tile--landscape')).toHaveLength(0);
    expect(wrapper.findAll('.history-tile--portrait')).toHaveLength(0);
    expect(wrapper.findAll('.history-tile--square')).toHaveLength(0);
    expect(historyGridSource).not.toContain('aria-label="资产快捷操作"');

    expectStyleDeclaration(assetsRule, 'display', 'flex');
    expectStyleDeclaration(assetsRule, 'flex-wrap', 'wrap');
    expectStyleDeclaration(assetsRule, 'gap', '18px');
    expectStyleDeclaration(headingRule, 'font-size', '14px');
    expectStyleDeclaration(headingRule, 'font-weight', '750');
    expectStyleDeclaration(tileRule, 'width', '196px');
    expectStyleDeclaration(thumbRule, 'aspect-ratio', '1 / 1');
    expectStyleDeclaration(thumbRule, 'box-shadow', 'none');
    expectStyleDeclaration(imageRule, 'position', 'absolute');
    expectStyleDeclaration(imageRule, 'inset', '0');
    expectStyleDeclaration(imageRule, 'width', '100%');
    expectStyleDeclaration(imageRule, 'height', '100%');
    expectStyleDeclaration(imageRule, 'object-fit', 'contain');
    expectStyleDeclaration(badgeRule, 'font-size', '11px');
    expectStyleDeclaration(removeRule, 'right', '8px');
    expectStyleDeclaration(removeRule, 'bottom', '8px');
    expectStyleDeclaration(removeRule, 'width', '30px');
    expectStyleDeclaration(removeRule, 'background', 'oklch(50% 0.006 88deg / 0.78)');
    expectStyleDeclaration(metaRule, 'font-size', '11px');
    expect(thumbRule).not.toMatch(/(?:linear|radial)-gradient/);
  });
});
