import { mount } from '@vue/test-utils';
import type * as ElementPlus from 'element-plus';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

const signInWithUsername = vi.fn();
const signUpWithUsername = vi.fn();
const signInWithGoogle = vi.fn();
const logout = vi.fn();

const isOpen = ref(true);
const close = vi.fn(() => {
  isOpen.value = false;
});
const open = vi.fn(() => {
  isOpen.value = true;
});

const isAuthenticated = ref(false);

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: computed(() => null),
    isAuthenticated,
    isLoading: computed(() => false),
    signInWithUsername,
    signUpWithUsername,
    signInWithGoogle,
    logout,
    session: ref({ data: null, isPending: false }),
    authClient: {},
  }),
}));

vi.mock('@/composables/useAuthModal', () => ({
  useAuthModal: () => ({ isOpen, open, close }),
}));

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof ElementPlus>('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

import LoginModal from '@/components/auth/LoginModal.vue';

async function nextTick(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function queryTabs(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[role="tab"]'));
}

function queryFields(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.login-modal__field'));
}

function querySubmit(): HTMLButtonElement | null {
  return document.body.querySelector<HTMLButtonElement>('.login-modal__submit');
}

function queryForm(): HTMLFormElement | null {
  return document.body.querySelector<HTMLFormElement>('.login-modal__form');
}

function queryInputs(): HTMLInputElement[] {
  return Array.from(document.body.querySelectorAll<HTMLInputElement>('.login-modal__form input'));
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('LoginModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    isOpen.value = true;
    isAuthenticated.value = false;
    signInWithUsername.mockReset();
    signUpWithUsername.mockReset();
    signInWithGoogle.mockReset();
    close.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the 登录 tab by default with username + password fields', async () => {
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    const tabs = queryTabs();
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.textContent?.trim()).toBe('登录');
    expect(tabs[1]!.textContent?.trim()).toBe('注册');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');

    expect(queryFields()).toHaveLength(2);
    expect(querySubmit()?.textContent?.trim()).toBe('登录');

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('用户名');
    expect(bodyText).not.toContain('邮箱');
    expect(bodyText).not.toContain('Continue with Google');

    wrapper.unmount();
  });

  it('switches to the 注册 tab with username + password fields when clicked', async () => {
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    const tabs = queryTabs();
    tabs[1]!.click();
    await nextTick();

    expect(queryTabs()[1]!.getAttribute('aria-selected')).toBe('true');
    expect(queryFields()).toHaveLength(2);
    expect(querySubmit()?.textContent?.trim()).toBe('注册');
    expect(queryInputs()[0]?.getAttribute('placeholder')).toBe('3-32 位小写字母、数字或下划线');

    wrapper.unmount();
  });

  it('keeps registration submit disabled until the password has at least 8 characters', async () => {
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    queryTabs()[1]!.click();
    await nextTick();

    const inputs = queryInputs();
    setInputValue(inputs[0]!, 'admin_user');
    setInputValue(inputs[1]!, 'short');
    await nextTick();

    expect(querySubmit()?.disabled).toBe(true);

    wrapper.unmount();
  });

  it('calls signUpWithUsername with the form payload on submit', async () => {
    signUpWithUsername.mockResolvedValueOnce(undefined);
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    queryTabs()[1]!.click();
    await nextTick();

    const inputs = queryInputs();
    // Field order: username, password. ElInput's show-password may render an
    // extra interactive element, but the actual <input> count should be 2.
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    setInputValue(inputs[0]!, 'admin_user');
    setInputValue(inputs[1]!, 'password123');
    await nextTick();

    const form = queryForm();
    expect(form).not.toBeNull();
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    expect(signUpWithUsername).toHaveBeenCalledTimes(1);
    expect(signUpWithUsername).toHaveBeenCalledWith({
      username: 'admin_user',
      password: 'password123',
    });

    wrapper.unmount();
  });

  it('calls signInWithUsername when submitting the 登录 tab', async () => {
    signInWithUsername.mockResolvedValueOnce(undefined);
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    const inputs = queryInputs();
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    setInputValue(inputs[0]!, 'admin');
    setInputValue(inputs[1]!, 'admin123');
    await nextTick();

    const form = queryForm();
    expect(form).not.toBeNull();
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    expect(signInWithUsername).toHaveBeenCalledTimes(1);
    expect(signInWithUsername).toHaveBeenCalledWith({
      username: 'admin',
      password: 'admin123',
    });

    wrapper.unmount();
  });
});
