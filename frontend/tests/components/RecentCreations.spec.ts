import { enableAutoUnmount, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import RecentCreationDetailModal from '@/components/gallery/RecentCreationDetailModal.vue';
import recentCreationDetailModalSource from '@/components/gallery/RecentCreationDetailModal.vue?raw';
import RecentCreationsMasonry from '@/components/gallery/RecentCreationsMasonry.vue';
import type { HistoryEntry } from '@/types/image';

enableAutoUnmount(afterEach);

function createEntry(overrides: Partial<HistoryEntry['record']> = {}): HistoryEntry {
  return {
    record: {
      id: 'recent-1.png',
      createdAt: '2026-05-12T08:00:00.000Z',
      prompt: '一只橙色猫坐在复古相机旁边',
      model: 'gpt-image-2',
      width: 1024,
      height: 1536,
      aspectRatio: '2:3',
      isPublic: true,
      ...overrides,
    },
    imageUrl: 'blob:recent-1',
    size: 2048,
  };
}

function createEntries(count: number): HistoryEntry[] {
  return Array.from({ length: count }, (_value, index) =>
    createEntry({
      id: `recent-${index + 1}.png`,
      prompt: `公开作品 ${index + 1}`,
      width: 1000,
      height: 1000,
    }),
  );
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function extractStyleRules(selector: string): string[] {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rulePattern = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, 'g');
  return Array.from(
    recentCreationDetailModalSource.matchAll(rulePattern),
    (match) => match[1] ?? '',
  );
}

function expectStyleDeclaration(rule: string, property: string, value: string): void {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(rule).toMatch(new RegExp(`(?:^|[;\\s])${escapedProperty}\\s*:\\s*${escapedValue}\\s*;`));
}

afterEach(() => {
  setViewportWidth(1024);
  document.body.innerHTML = '';
});

describe('RecentCreationsMasonry', () => {
  it('renders an empty gallery state when there are no public entries', () => {
    const wrapper = mount(RecentCreationsMasonry, {
      props: {
        entries: [],
      },
    });

    expect(wrapper.text()).toContain('画廊');
    expect(wrapper.text()).toContain('从画廊中预览灵感，点击图片查看提示词细节。');
    expect(wrapper.text()).not.toContain('本地灵感');
    expect(wrapper.text()).toContain('画廊还是空的');
    expect(wrapper.text()).toContain('开启公开后生成图片');
  });

  it('distributes desktop images across every masonry column', () => {
    setViewportWidth(1024);
    const wrapper = mount(RecentCreationsMasonry, {
      props: {
        entries: createEntries(5),
      },
    });

    const columnCardCounts = wrapper
      .findAll('.recent-creations__column')
      .map((column) => column.findAll('.recent-card').length);

    expect(columnCardCounts).toEqual([2, 1, 1, 1]);
  });

  it('uses fewer masonry columns on mobile viewports', () => {
    setViewportWidth(520);
    const wrapper = mount(RecentCreationsMasonry, {
      props: {
        entries: createEntries(5),
      },
    });

    const columnCardCounts = wrapper
      .findAll('.recent-creations__column')
      .map((column) => column.findAll('.recent-card').length);

    expect(columnCardCounts).toEqual([3, 2]);
  });

  it('emits the selected history entry when a masonry image is clicked', async () => {
    const entry = createEntry();
    const wrapper = mount(RecentCreationsMasonry, {
      props: {
        entries: [entry],
      },
    });

    await wrapper.get('button').trigger('click');

    expect(wrapper.emitted('select')?.[0]).toEqual([entry]);
  });
});

describe('RecentCreationDetailModal', () => {
  it('renders selected image metadata and prompt copy action', async () => {
    const entry = createEntry();
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry,
      },
    });

    expect(wrapper.text()).toContain('一只橙色猫坐在复古相机旁边');
    expect(wrapper.text()).toContain('gpt-image-2');
    expect(wrapper.text()).toContain('1024 × 1536');
    expect(wrapper.find('.recent-detail__prompt-panel').exists()).toBe(true);
    expect(wrapper.find('.recent-detail__prompt-panel .recent-detail__prompt').exists()).toBe(true);

    await wrapper.get('.recent-detail__copy').trigger('click');

    expect(wrapper.emitted('copy-prompt')?.[0]).toEqual([entry]);
  });

  it('keeps dialog semantics on the detail panel and focuses the close control', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      attachTo: document.body,
      props: {
        entry: createEntry(),
      },
    });

    await nextTick();
    await nextTick();

    const dialog = wrapper.get('.recent-detail__panel');
    expect(dialog.attributes('role')).toBe('dialog');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-labelledby')).toBe('recent-detail-title');
    expect(wrapper.get('#recent-detail-title').text()).toBe('最近创作提示词');
    expect(document.activeElement).toBe(wrapper.get('.recent-detail__close').element);
  });

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry: createEntry(),
      },
    });

    await wrapper.get('.recent-detail').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close when Escape is pressed', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry: createEntry(),
      },
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('opens an enlarged image view from the accessible image control', async () => {
    const entry = createEntry();
    const wrapper = mount(RecentCreationDetailModal, {
      attachTo: document.body,
      props: {
        entry,
      },
    });

    const imageButton = wrapper.get('.recent-detail__image-button');
    expect(imageButton.attributes('aria-label')).toBe('放大查看选中的图片');

    await imageButton.trigger('click');
    await nextTick();

    expect(wrapper.find('.recent-detail__viewer').exists()).toBe(true);
    expect(wrapper.get('.recent-detail__viewer img').attributes('src')).toBe(entry.imageUrl);
    expect(wrapper.text()).toContain('返回详情');
    expect(document.activeElement).toBe(wrapper.get('.recent-detail__back').element);
  });

  it('bounds the enlarged image inside the modal stage', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry: createEntry(),
      },
    });

    await wrapper.get('.recent-detail__image-button').trigger('click');

    const stageRule = extractStyleRules('.recent-detail__viewer-stage')[0] ?? '';
    const imageRules = extractStyleRules('.recent-detail__viewer-stage img');
    const imageRule = imageRules[0] ?? '';

    expect(wrapper.get('.recent-detail__panel').classes()).toContain(
      'recent-detail__panel--expanded',
    );
    expect(wrapper.find('.recent-detail__viewer-stage').exists()).toBe(true);
    expect(stageRule).not.toBe('');
    expect(imageRule).not.toBe('');
    expectStyleDeclaration(stageRule, 'height', '100%');
    expectStyleDeclaration(stageRule, 'min-height', '0');
    expectStyleDeclaration(stageRule, 'max-height', '100%');
    expectStyleDeclaration(stageRule, 'overflow', 'hidden');
    expectStyleDeclaration(imageRule, 'position', 'absolute');
    expectStyleDeclaration(imageRule, 'inset', 'var(--recent-detail-viewer-stage-padding)');
    expect(imageRule).toMatch(/width:\s*calc\(/);
    expect(imageRule).toMatch(/height:\s*calc\(/);
    expectStyleDeclaration(imageRule, 'max-height', '100%');
    expectStyleDeclaration(imageRule, 'object-fit', 'contain');
    expect(imageRules.join('\n')).not.toMatch(/100d?vh/);
  });

  it('returns from enlarged image view to the detail view', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry: createEntry(),
      },
    });

    await wrapper.get('.recent-detail__image-button').trigger('click');
    await wrapper.get('.recent-detail__back').trigger('click');

    expect(wrapper.find('.recent-detail__viewer').exists()).toBe(false);
    expect(wrapper.find('.recent-detail__content').exists()).toBe(true);
  });

  it('resets enlarged image view after close and reopen', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry: createEntry(),
      },
    });

    await wrapper.get('.recent-detail__image-button').trigger('click');
    await wrapper.get('.recent-detail__close').trigger('click');
    await wrapper.setProps({ entry: null });
    await wrapper.setProps({ entry: createEntry({ id: 'recent-2.png' }) });

    expect(wrapper.find('.recent-detail__viewer').exists()).toBe(false);
    expect(wrapper.find('.recent-detail__image-button').exists()).toBe(true);
  });

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(RecentCreationDetailModal, {
      props: {
        entry: createEntry(),
      },
    });

    await wrapper.get('.recent-detail__close').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
