import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VueRouter from 'vue-router';

import { useImageDetailModalState } from '@/composables/useImageDetailModalState';

const openLoginModal = vi.hoisted(() => vi.fn());
const routeName = vi.hoisted(() => ({ value: 'history' }));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router');
  return {
    ...actual,
    useRoute: () => ({ name: routeName.value }),
  };
});

vi.mock('@/composables/useAuthModal', () => ({
  useAuthModal: () => ({
    open: openLoginModal,
  }),
}));

vi.mock('@/components/common/AppHeader.vue', () => ({
  default: {
    name: 'AppHeaderStub',
    template: '<header data-testid="app-header" />',
  },
}));

vi.mock('@/components/auth/LoginModal.vue', () => ({
  default: {
    name: 'LoginModalStub',
    template: '<div data-testid="login-modal" />',
  },
}));

describe('App', () => {
  beforeEach(() => {
    openLoginModal.mockClear();
    routeName.value = 'history';
  });

  it('does not automatically open the login modal for anonymous visitors', async () => {
    const App = (await import('@/App.vue')).default;

    mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<main data-testid="router-view" />',
          },
        },
      },
    });

    expect(openLoginModal).not.toHaveBeenCalled();
  });

  it('shows the same video backdrop on generate, assets, and user management routes', async () => {
    const App = (await import('@/App.vue')).default;

    for (const name of ['generate', 'history', 'admin-users']) {
      routeName.value = name;
      const wrapper = mount(App, {
        global: {
          stubs: {
            RouterView: {
              template: '<main data-testid="router-view" />',
            },
          },
        },
      });

      expect(wrapper.find('.app-backdrop__video').exists()).toBe(true);
      wrapper.unmount();
    }
  });

  it('hides the app navigation while an image detail preview is open', async () => {
    const App = (await import('@/App.vue')).default;
    const modalId = Symbol('test-image-detail-modal');
    const { openImageDetailModal, closeImageDetailModal } = useImageDetailModalState();
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<main data-testid="router-view" />',
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true);

    openImageDetailModal(modalId);
    await nextTick();

    expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(false);

    closeImageDetailModal(modalId);
    await nextTick();

    expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true);
  });
});
