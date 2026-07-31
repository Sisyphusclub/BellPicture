import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithUsername: vi.fn(),
  signUpWithUsername: vi.fn(),
  complete: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    signInWithGoogle: auth.signInWithGoogle,
    signInWithUsername: auth.signInWithUsername,
    signUpWithUsername: auth.signUpWithUsername,
  }),
}));

vi.mock('@/hooks/useAuthModal', () => ({
  useAuthModal: () => ({
    isOpen: true,
    close: auth.close,
    complete: auth.complete,
  }),
}));

import { LoginModal } from '@/components/auth/LoginModal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginModal', () => {
  it('validates credentials inline and exposes password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginModal />);

    const username = screen.getByLabelText('用户名');
    const password = screen.getByLabelText('密码');
    await waitFor(() => expect(username).toHaveFocus());

    await user.click(password);
    expect(screen.getByText('用户名需为 3-32 位小写字母、数字或下划线。')).toBeInTheDocument();
    await user.type(password, '123');
    await user.tab();
    expect(screen.getByText('密码至少需要 8 个字符。')).toBeInTheDocument();

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: '显示密码' }));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('submits sign-up credentials and completes the pending command', async () => {
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.click(screen.getByRole('tab', { name: '注册' }));
    await user.type(screen.getByLabelText('用户名'), 'studio_user');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '创建账户' }));

    await waitFor(() => {
      expect(auth.signUpWithUsername).toHaveBeenCalledWith({
        username: 'studio_user',
        password: 'password123',
      });
      expect(auth.complete).toHaveBeenCalledTimes(1);
    });
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<LoginModal />);
    await user.keyboard('{Escape}');
    expect(auth.close).toHaveBeenCalledTimes(1);
  });
});
