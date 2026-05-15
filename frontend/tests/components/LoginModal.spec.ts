import { mount } from '@vue/test-utils';
import type * as ElementPlus from 'element-plus';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

const signInWithEmail = vi.fn();
const signUpWithEmail = vi.fn();
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
    signInWithEmail,
    signUpWithEmail,
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
    signInWithEmail.mockReset();
    signUpWithEmail.mockReset();
    signInWithGoogle.mockReset();
    close.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the 登录 tab by default with email + password fields', async () => {
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    const tabs = queryTabs();
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.textContent?.trim()).toBe('登录');
    expect(tabs[1]!.textContent?.trim()).toBe('注册');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');

    expect(queryFields()).toHaveLength(2);
    expect(querySubmit()?.textContent?.trim()).toBe('登录');

    expect(document.body.textContent ?? '').not.toContain('Continue with Google');

    wrapper.unmount();
  });

  it('switches to the 注册 tab with 3 fields when clicked', async () => {
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    const tabs = queryTabs();
    tabs[1]!.click();
    await nextTick();

    expect(queryTabs()[1]!.getAttribute('aria-selected')).toBe('true');
    expect(queryFields()).toHaveLength(3);
    expect(querySubmit()?.textContent?.trim()).toBe('注册');

    wrapper.unmount();
  });

  it('calls signUpWithEmail with the form payload on submit', async () => {
    signUpWithEmail.mockResolvedValueOnce(undefined);
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    queryTabs()[1]!.click();
    await nextTick();

    const inputs = queryInputs();
    // Field order: email, password, name. ElInput's show-password may render an
    // extra interactive element, but the actual <input> count should be 3.
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    setInputValue(inputs[0]!, 'user@test.local');
    setInputValue(inputs[1]!, 'password123');
    setInputValue(inputs[2]!, '小明');
    await nextTick();

    const form = queryForm();
    expect(form).not.toBeNull();
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    expect(signUpWithEmail).toHaveBeenCalledTimes(1);
    expect(signUpWithEmail).toHaveBeenCalledWith({
      email: 'user@test.local',
      password: 'password123',
      name: '小明',
    });

    wrapper.unmount();
  });

  it('calls signInWithEmail when submitting the 登录 tab', async () => {
    signInWithEmail.mockResolvedValueOnce(undefined);
    const wrapper = mount(LoginModal, { attachTo: document.body });
    await nextTick();

    const inputs = queryInputs();
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    setInputValue(inputs[0]!, 'user@test.local');
    setInputValue(inputs[1]!, 'password123');
    await nextTick();

    const form = queryForm();
    expect(form).not.toBeNull();
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    expect(signInWithEmail).toHaveBeenCalledTimes(1);
    expect(signInWithEmail).toHaveBeenCalledWith({
      email: 'user@test.local',
      password: 'password123',
    });

    wrapper.unmount();
  });
});
