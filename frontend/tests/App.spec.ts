import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const openLoginModal = vi.hoisted(() => vi.fn());

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
});
