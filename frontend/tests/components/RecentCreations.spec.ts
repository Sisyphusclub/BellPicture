import { enableAutoUnmount, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import RecentCreationDetailModal from '@/components/gallery/RecentCreationDetailModal.vue';
import { useImageDetailModalState } from '@/composables/useImageDetailModalState';
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

function bodyGet(selector: string): Element {
  const element = document.body.querySelector(selector);
  if (!element) throw new Error(`Unable to get ${selector} within document.body`);
  return element;
}

function bodyText(): string {
  return document.body.textContent ?? '';
}

async function triggerBody(selector: string, event: Event): Promise<void> {
  bodyGet(selector).dispatchEvent(event);
  await nextTick();
}

function detailExists(selector = '.recent-detail'): boolean {
  return document.body.querySelector(selector) !== null;
}

async function mountDetail(entry = createEntry(), props: Record<string, unknown> = {}): Promise<VueWrapper> {
  const wrapper = mount(RecentCreationDetailModal, {
    attachTo: document.body,
    props: {
      entry,
      ...props,
    },
  });
  await nextTick();
  await nextTick();
  return wrapper;
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

  it('shows admin delete controls only when allowed and requires a second click', async () => {
    const entry = createEntry();
    const regular = mount(RecentCreationsMasonry, {
      props: {
        entries: [entry],
      },
    });
    expect(regular.find('.recent-card__delete').exists()).toBe(false);

    const admin = mount(RecentCreationsMasonry, {
      props: {
        entries: [entry],
        canDelete: true,
      },
    });

    const deleteButton = admin.get('.recent-card__delete');
    expect(deleteButton.text()).toBe('删除');

    await deleteButton.trigger('click');

    expect(admin.emitted('delete')).toBeUndefined();
    expect(deleteButton.text()).toBe('确认删除');

    await deleteButton.trigger('click');

    expect(admin.emitted('delete')?.[0]).toEqual([entry]);
  });
});

describe('RecentCreationDetailModal', () => {
  it('renders selected image metadata and prompt copy action', async () => {
    const entry = createEntry();
    const wrapper = await mountDetail(entry);

    expect(bodyText()).toContain('一只橙色猫坐在复古相机旁边');
    expect(bodyText()).toContain('gpt-image-2');
    expect(detailExists('.recent-detail__prompt-card')).toBe(true);
    expect(detailExists('.recent-detail__prompt-card .recent-detail__prompt')).toBe(true);

    await triggerBody('.recent-detail__copy', new MouseEvent('click', { bubbles: true }));

    expect(wrapper.emitted('copy-prompt')?.[0]).toEqual([entry]);
  });

  it('shows admin delete controls and emits delete from the detail modal', async () => {
    const entry = createEntry();
    const wrapper = await mountDetail(entry, { canDelete: true });

    await triggerBody('.recent-detail__delete', new MouseEvent('click', { bubbles: true }));

    expect(wrapper.emitted('delete')?.[0]).toEqual([entry]);
  });

  it('keeps dialog semantics on the detail panel and focuses the close control', async () => {
    const { isImageDetailModalOpen } = useImageDetailModalState();

    await mountDetail(createEntry());

    expect(isImageDetailModalOpen.value).toBe(true);
    const dialog = bodyGet('.recent-detail__shell');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('recent-detail-title');
    expect(bodyGet('#recent-detail-title').textContent).toBe('提示词');
    expect(document.activeElement).toBe(bodyGet('.recent-detail__close'));
  });

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = await mountDetail(createEntry());

    await triggerBody('.recent-detail', new MouseEvent('click', { bubbles: true }));

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close when Escape is pressed', async () => {
    const wrapper = await mountDetail(createEntry());

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('keeps portrait images and inspector bounded inside the desktop viewport', async () => {
    const longPrompt = '一张纵向电影海报，包含雨夜、霓虹、人物、建筑、反光地面、细密雨丝、远处灯牌与安静氛围。'.repeat(6);
    await mountDetail(createEntry({ prompt: longPrompt, width: 1024, height: 1792 }));

    const shellRule = extractStyleRules('.recent-detail__shell')[0] ?? '';
    const stageRule = extractStyleRules('.recent-detail__stage')[0] ?? '';
    const imageRule = extractStyleRules('.recent-detail__stage img')[0] ?? '';
    const inspectorRule = extractStyleRules('.recent-detail__inspector')[0] ?? '';
    const promptScrollRule = extractStyleRules('.recent-detail__prompt-scroll')[0] ?? '';

    expect(bodyGet('.recent-detail__stage img').getAttribute('src')).toBe('blob:recent-1');
    expect(bodyText()).toContain(longPrompt);
    expect(shellRule).not.toBe('');
    expect(stageRule).not.toBe('');
    expect(imageRule).not.toBe('');
    expect(inspectorRule).not.toBe('');
    expect(promptScrollRule).not.toBe('');
    expectStyleDeclaration(shellRule, '--recent-detail-shell-height', 'min(720px, calc(100dvh - clamp(36px, 7.2vw, 88px)))');
    expectStyleDeclaration(shellRule, '--recent-detail-stage-padding', 'clamp(10px, 1.6vw, 18px)');
    expectStyleDeclaration(shellRule, 'height', 'var(--recent-detail-shell-height)');
    expectStyleDeclaration(shellRule, 'max-height', 'var(--recent-detail-shell-height)');
    expectStyleDeclaration(stageRule, 'overflow', 'hidden');
    expectStyleDeclaration(stageRule, 'padding', 'var(--recent-detail-stage-padding)');
    expectStyleDeclaration(imageRule, 'max-height', 'calc(var(--recent-detail-shell-height) - (var(--recent-detail-stage-padding) * 2))');
    expectStyleDeclaration(imageRule, 'object-fit', 'contain');
    expectStyleDeclaration(inspectorRule, 'max-height', '100%');
    expectStyleDeclaration(inspectorRule, 'min-height', '0');
    expectStyleDeclaration(promptScrollRule, 'overflow', 'auto');
  });

  it('emits close when the close button is clicked', async () => {
    const { isImageDetailModalOpen } = useImageDetailModalState();
    const wrapper = await mountDetail(createEntry());

    expect(isImageDetailModalOpen.value).toBe(true);

    await triggerBody('.recent-detail__close', new MouseEvent('click', { bubbles: true }));

    expect(wrapper.emitted('close')).toHaveLength(1);

    await wrapper.setProps({ entry: null });
    await nextTick();

    expect(isImageDetailModalOpen.value).toBe(false);
  });
});
