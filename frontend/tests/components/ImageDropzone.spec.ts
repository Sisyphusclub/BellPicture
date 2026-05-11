import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ImageDropzone from '@/components/upload/ImageDropzone.vue';

describe('ImageDropzone', () => {
  it('renders the empty browse prompt', () => {
    const wrapper = mount(ImageDropzone, {
      props: {
        file: null,
        previewUrl: null,
      },
    });

    expect(wrapper.text()).toContain('拖入参考图');
    expect(wrapper.text()).toContain('提示词生成可不添加');
  });

  it('renders selected file metadata and a clear action', () => {
    const wrapper = mount(ImageDropzone, {
      props: {
        file: new File(['pixels'], 'reference.png', { type: 'image/png' }),
        previewUrl: 'blob:reference',
      },
    });

    expect(wrapper.text()).toContain('参考图已就绪');
    expect(wrapper.text()).toContain('reference.png');
    expect(wrapper.text()).toContain('移除参考图');
  });
});
