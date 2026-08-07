import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function LoginModal() {
  const { isOpen, close, complete } = useAuthModal();
  const { isAuthenticated, signInWithGoogle, signInWithUsername, signUpWithUsername } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ username: false, password: false });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  const validation = useMemo(
    () => {
      const normalizedUsername = username.trim().toLowerCase();
      return {
        username:
          touched.username && normalizedUsername.length > 0
            ? USERNAME_PATTERN.test(normalizedUsername)
              ? null
              : '仅支持 3-32 位小写字母、数字或下划线。'
            : hasSubmitted && normalizedUsername.length === 0
              ? '请输入用户名。'
              : null,
        password:
          touched.password && password.length > 0
            ? password.length >= 8
              ? null
              : '密码至少为 8 个字符。'
            : hasSubmitted && password.length === 0
              ? '请输入密码。'
              : null,
      };
    },
    [hasSubmitted, password, touched, username],
  );

  const resetAndClose = useCallback((): void => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    setPending(false);
    setTouched({ username: false, password: false });
    setHasSubmitted(false);
    close();
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        resetAndClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => usernameRef.current?.focus());
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, resetAndClose]);

  useEffect(() => {
    if (isAuthenticated && isOpen) void complete();
  }, [complete, isAuthenticated, isOpen]);

  if (!isOpen) return null;

  const backdropClose = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget && !pending) resetAndClose();
  };
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setHasSubmitted(true);
    setTouched({ username: true, password: true });
    const normalizedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername) || password.length < 8) return;
    setPending(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signInWithUsername({ username: normalizedUsername, password });
      } else {
        await signUpWithUsername({ username: normalizedUsername, password });
      }
      await complete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作失败，请稍后重试。');
      setPending(false);
    }
  };
  const google = async (): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
      await complete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google 登录暂不可用。');
      setPending(false);
    }
  };

  return (
    <div className="dialog-backdrop auth-backdrop" onMouseDown={backdropClose}>
      <section
        ref={dialogRef}
        className="dialog login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <Button
          className="icon-button dialog__close"
          type="button"
          variant="ghost"
          size="icon"
          aria-label="关闭账户对话框"
          disabled={pending}
          onClick={resetAndClose}
        >
          <X aria-hidden="true" />
        </Button>
        <div className="auth-brand" aria-hidden="true">
          <img src="/brand/logo.png" alt="" />
          <span>Nebulens</span>
        </div>
        <h2 id="login-title">{mode === 'signin' ? '登录' : '创建账户'}</h2>
        <div className="auth-mode-tabs" role="tablist" aria-label="账户操作">
          <Button
            type="button"
            variant="ghost"
            role="tab"
            aria-selected={mode === 'signin'}
            disabled={pending}
            onClick={() => {
              setMode('signin');
              setError(null);
              setTouched({ username: false, password: false });
              setHasSubmitted(false);
            }}
          >
            登录
          </Button>
          <Button
            type="button"
            variant="ghost"
            role="tab"
            aria-selected={mode === 'signup'}
            disabled={pending}
            onClick={() => {
              setMode('signup');
              setError(null);
              setTouched({ username: false, password: false });
              setHasSubmitted(false);
            }}
          >
            注册
          </Button>
        </div>
        <form className="form-stack auth-form" noValidate onSubmit={(event) => void submit(event)}>
          <label>
            <span>用户名</span>
            <Input
              ref={usernameRef}
              value={username}
              disabled={pending}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="3-32 位小写字母、数字或下划线"
              aria-invalid={validation.username !== null}
              aria-describedby={validation.username ? 'username-error' : undefined}
              onBlur={() => setTouched((current) => ({ ...current, username: true }))}
              onChange={(event) => setUsername(event.target.value)}
            />
            {validation.username ? (
              <small id="username-error" className="field-error">
                {validation.username}
              </small>
            ) : null}
          </label>
          <label>
            <span>密码</span>
            <span className="password-field">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={pending}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="至少 8 个字符"
                aria-invalid={validation.password !== null}
                aria-describedby={validation.password ? 'password-error' : undefined}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                disabled={pending}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </span>
            {validation.password ? (
              <small id="password-error" className="field-error">
                {validation.password}
              </small>
            ) : null}
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
            {pending ? '处理中' : mode === 'signin' ? '登录' : '创建账户'}
          </Button>
        </form>
        <div className="dialog-separator">
          <span>或</span>
        </div>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void google()}>
          使用 Google 继续
        </Button>
      </section>
    </div>
  );
}
