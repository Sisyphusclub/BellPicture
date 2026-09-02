import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  isGoogleEnabled: true,
  signInWithGoogle: vi.fn(),
  signInWithUsername: vi.fn(),
  signUpWithUsername: vi.fn(),
  complete: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isGoogleEnabled: auth.isGoogleEnabled,
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
  auth.isGoogleEnabled = true;
});

describe('LoginModal', () => {
  it('disables Google sign-in when the backend provider is not configured', () => {
    auth.isGoogleEnabled = false;
    render(<LoginModal />);

    expect(screen.getByRole('button', { name: 'Google 登录未配置' })).toBeDisabled();
  });

  it('validates credentials inline and exposes password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginModal />);

    const username = screen.getByLabelText('用户名');
    const password = screen.getByLabelText('密码');
    await waitFor(() => expect(username).toHaveFocus());

    expect(username).toHaveAttribute('placeholder', '3-32 位小写字母、数字或下划线');
    expect(password).toHaveAttribute('placeholder', '至少 8 个字符');
    await user.click(password);
    expect(screen.queryByText('请输入用户名。')).not.toBeInTheDocument();
    expect(screen.queryByText('仅支持 3-32 位小写字母、数字或下划线。')).not.toBeInTheDocument();

    await user.click(username);
    await user.type(username, 'creator@example.com');
    await user.tab();
    expect(screen.getByText('仅支持 3-32 位小写字母、数字或下划线。')).toBeInTheDocument();

    await user.type(password, '123');
    await user.tab();
    expect(screen.getByText('密码至少为 8 个字符。')).toBeInTheDocument();

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: '显示密码' }));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('shows required errors only after an invalid submit', async () => {
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(screen.getByText('请输入用户名。')).toBeInTheDocument();
    expect(screen.getByText('请输入密码。')).toBeInTheDocument();
    expect(auth.signInWithUsername).not.toHaveBeenCalled();
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

  it('keeps authentication failures inside the dialog as an accessible alert', async () => {
    auth.signInWithUsername.mockRejectedValueOnce(new Error('用户名或密码不正确。'));
    const user = userEvent.setup();
    render(<LoginModal />);

    await user.type(screen.getByLabelText('用户名'), 'studio_user');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('用户名或密码不正确。');
    expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('alert'));
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<LoginModal />);
    await user.keyboard('{Escape}');
    expect(auth.close).toHaveBeenCalledTimes(1);
  });
});
