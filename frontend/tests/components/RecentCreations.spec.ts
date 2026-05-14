import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import RecentCreationDetailModal from '@/components/gallery/RecentCreationDetailModal.vue';
import RecentCreationsMasonry from '@/components/gallery/RecentCreationsMasonry.vue';
import type { HistoryEntry } from '@/types/image';

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
      ...overrides,
    },
    imageUrl: 'blob:recent-1',
    size: 2048,
  };
}

describe('RecentCreationsMasonry', () => {
  it('renders an empty state when there is no local history', () => {
    const wrapper = mount(RecentCreationsMasonry, {
      props: {
        entries: [],
      },
    });

    expect(wrapper.text()).toContain('还没有最近创作');
    expect(wrapper.text()).toContain('生成第一组图片后');
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

    await wrapper.get('.recent-detail__copy').trigger('click');

    expect(wrapper.emitted('copy-prompt')?.[0]).toEqual([entry]);
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
