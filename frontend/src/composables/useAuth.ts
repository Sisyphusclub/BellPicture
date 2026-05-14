import { computed } from 'vue';

import { authClient, signIn, signOut, useSession } from '@/lib/authClient';

const NETWORK_ERROR_MESSAGE = '无法连接到服务器，请检查网络或稍后重试。';

interface SignInEmailInput {
  email: string;
  password: string;
}

interface SignUpEmailInput {
  email: string;
  password: string;
  name: string;
}

interface BetterAuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

interface BetterAuthResultLike {
  error?: BetterAuthErrorLike | null;
}

function extractError(result: unknown): BetterAuthErrorLike | null {
  if (!result || typeof result !== 'object') return null;
  const maybe = result as BetterAuthResultLike;
  return maybe.error ?? null;
}

function codeToSignInMessage(error: BetterAuthErrorLike | null | undefined): string {
  const code = error?.code;
  if (!code) return error?.message || '登录失败，请稍后再试。';
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'INVALID_EMAIL':
    case 'USER_NOT_FOUND':
      return '邮箱或密码错误。';
    case 'EMAIL_NOT_VERIFIED':
      return '该邮箱尚未验证，请验证后再登录。';
    default:
      return error?.message || '登录失败，请稍后再试。';
  }
}

function codeToSignUpMessage(error: BetterAuthErrorLike | null | undefined): string {
  const code = error?.code;
  if (!code) return error?.message || '注册失败，请稍后再试。';
  switch (code) {
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
    case 'USER_ALREADY_EXISTS':
    case 'USER_EXISTS':
    case 'EMAIL_ALREADY_EXISTS':
      return '该邮箱已注册，请直接登录。';
    case 'PASSWORD_TOO_SHORT':
    case 'INVALID_PASSWORD':
      return '密码至少需要 8 个字符。';
    case 'INVALID_EMAIL':
      return '邮箱地址无效。';
    default:
      return error?.message || '注册失败，请稍后再试。';
  }
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

export function useAuth() {
  const session = useSession();

  const user = computed(() => session.value.data?.user ?? null);
  const isAuthenticated = computed(() => user.value !== null);
  const isLoading = computed(() => session.value.isPending);

  async function signInWithGoogle(): Promise<void> {
    try {
      await signIn.social({ provider: 'google' });
    } catch (err) {
      if (isNetworkError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw err instanceof Error ? err : new Error('登录失败，请稍后再试。');
    }
  }

  async function signInWithEmail({ email, password }: SignInEmailInput): Promise<void> {
    let result: unknown;
    try {
      result = await signIn.email({ email, password });
    } catch (err) {
      if (isNetworkError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw new Error(err instanceof Error ? err.message : '登录失败，请稍后再试。');
    }
    const error = extractError(result);
    if (error) {
      throw new Error(codeToSignInMessage(error));
    }
  }

  async function signUpWithEmail({ email, password, name }: SignUpEmailInput): Promise<void> {
    let result: unknown;
    try {
      result = await authClient.signUp.email({ email, password, name });
    } catch (err) {
      if (isNetworkError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw new Error(err instanceof Error ? err.message : '注册失败，请稍后再试。');
    }
    const error = extractError(result);
    if (error) {
      throw new Error(codeToSignUpMessage(error));
    }
  }

  async function logout(): Promise<void> {
    await signOut();
  }

  return {
    authClient,
    session,
    user,
    isAuthenticated,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
  };
}
