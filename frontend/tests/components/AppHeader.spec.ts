import { mount, RouterLinkStub } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockUser {
  username?: string;
  name?: string;
  image?: string;
}

const user = ref<MockUser | null>(null);
const openLoginModal = vi.fn();
const logout = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock('@/assets/ref2image-logo-mark.svg', () => ({
  default: '/mock-logo.svg',
}));

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user,
    isAuthenticated: computed(() => user.value !== null),
    logout,
  }),
}));

vi.mock('@/composables/useAuthModal', () => ({
  useAuthModal: () => ({
    open: openLoginModal,
  }),
}));

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}));

describe('AppHeader', () => {
  beforeEach(() => {
    user.value = null;
    openLoginModal.mockClear();
    logout.mockClear();
    logout.mockResolvedValue();
  });

  it('renders the left navigation items in the requested order', async () => {
    const AppHeader = (await import('@/components/common/AppHeader.vue')).default;
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links.map((link) => link.props('to'))).toEqual(['/', '/', '/generate', '/history']);
    expect(wrapper.findAll('.sidebar-nav__link').map((link) => link.text())).toEqual(['发现', '生图', '图片管理']);
    expect(wrapper.find('.sidebar-account').text()).toContain('登录');
  });

  it('opens login modal for anonymous users and shows logout for signed-in users', async () => {
    const AppHeader = (await import('@/components/common/AppHeader.vue')).default;
    const wrapper = mount(AppHeader, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    await wrapper.get('.sidebar-account').trigger('click');
    expect(openLoginModal).toHaveBeenCalledTimes(1);

    user.value = { username: 'blur' };
    await wrapper.vm.$nextTick();
    await wrapper.get('.sidebar-account').trigger('click');

    expect(wrapper.find('.sidebar-account-menu').exists()).toBe(true);
    expect(wrapper.find('.sidebar-account-menu').text()).toContain('退出登录');
  });
});
