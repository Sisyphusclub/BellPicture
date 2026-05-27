import { computed, readonly, ref, watch } from 'vue';

import { authClient, signIn, signOut, useSession } from '@/lib/authClient';
import { fetchAuthProfile, type AuthUserProfile } from '@/services/api/authApi';

const NETWORK_ERROR_MESSAGE = '无法连接到服务器，请检查网络或稍后重试。';
const USERNAME_REQUIREMENTS_MESSAGE = '用户名需为 3-32 位小写字母、数字或下划线。';
const PASSWORD_REQUIREMENTS_MESSAGE = '密码至少需要 8 个字符。';
const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

const profile = ref<AuthUserProfile | null>(null);
let profileRequestId = 0;

interface SignInUsernameInput {
  username: string;
  password: string;
}

interface SignUpUsernameInput {
  username: string;
  password: string;
}

interface BetterAuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function assertValidUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(USERNAME_REQUIREMENTS_MESSAGE);
  }
}

function assertValidSignUpPassword(password: string): void {
  if (password.length < 8) {
    throw new Error(PASSWORD_REQUIREMENTS_MESSAGE);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function toBetterAuthErrorLike(value: unknown): BetterAuthErrorLike | null {
  if (!isRecord(value)) return null;

  const nested = toBetterAuthErrorLike(value.error);
  if (nested) {
    const status = typeof value.status === 'number' ? value.status : nested.status;
    return status !== undefined ? { ...nested, status } : nested;
  }

  const code = typeof value.code === 'string' ? value.code : undefined;
  const message = typeof value.message === 'string' ? value.message : undefined;
  const status = typeof value.status === 'number' ? value.status : undefined;
  if (code === undefined && message === undefined && status === undefined) return null;

  return {
    ...(code !== undefined ? { code } : {}),
    ...(message !== undefined ? { message } : {}),
    ...(status !== undefined ? { status } : {}),
  };
}

function extractError(result: unknown): BetterAuthErrorLike | null {
  if (!isRecord(result)) return null;
  return toBetterAuthErrorLike(result.error);
}

function safeChineseMessage(
  error: BetterAuthErrorLike | null | undefined,
  fallback: string,
): string {
  const message = error?.message;
  if (message && /[一-鿿]/.test(message)) return message;
  return fallback;
}

function codeToSignInMessage(error: BetterAuthErrorLike | null | undefined): string {
  const code = error?.code;
  if (!code) return safeChineseMessage(error, '登录失败，请稍后再试。');
  switch (code) {
    case 'INVALID_USERNAME_OR_PASSWORD':
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'USER_NOT_FOUND':
      return '用户名或密码错误。';
    case 'USERNAME_TOO_SHORT':
    case 'USERNAME_TOO_LONG':
    case 'INVALID_USERNAME':
      return USERNAME_REQUIREMENTS_MESSAGE;
    case 'EMAIL_NOT_VERIFIED':
      return '该账号尚未验证，请验证后再登录。';
    default:
      return safeChineseMessage(error, '登录失败，请稍后再试。');
  }
}

function codeToSignUpMessage(error: BetterAuthErrorLike | null | undefined): string {
  const code = error?.code;
  if (!code) return safeChineseMessage(error, '注册失败，请稍后再试。');
  switch (code) {
    case 'USERNAME_IS_ALREADY_TAKEN':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
    case 'USER_ALREADY_EXISTS':
    case 'USER_EXISTS':
    case 'EMAIL_ALREADY_EXISTS':
      return '该用户名已被占用，请换一个。';
    case 'PASSWORD_TOO_SHORT':
    case 'INVALID_PASSWORD':
      return PASSWORD_REQUIREMENTS_MESSAGE;
    case 'USERNAME_TOO_SHORT':
    case 'USERNAME_TOO_LONG':
    case 'INVALID_USERNAME':
      return USERNAME_REQUIREMENTS_MESSAGE;
    default:
      return safeChineseMessage(error, '注册失败，请稍后再试。');
  }
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

export function useAuth() {
  const session = useSession();

  const sessionUser = computed(() => session.value.data?.user ?? null);
  const user = computed(() => profile.value ?? sessionUser.value ?? null);
  const isAuthenticated = computed(() => sessionUser.value !== null);
  const isLoading = computed(() => session.value.isPending);
  const isAdmin = computed(() => profile.value?.isAdmin === true);

  async function refreshProfile(): Promise<void> {
    if (!isAuthenticated.value) {
      profile.value = null;
      profileRequestId += 1;
      return;
    }
    const requestId = profileRequestId + 1;
    profileRequestId = requestId;
    try {
      const nextProfile = await fetchAuthProfile();
      if (requestId === profileRequestId) {
        profile.value = nextProfile;
      }
    } catch {
      if (requestId === profileRequestId) {
        profile.value = null;
      }
    }
  }

  watch(
    [isLoading, isAuthenticated],
    ([loading, authenticated]) => {
      if (loading) return;
      if (authenticated) {
        void refreshProfile();
        return;
      }
      profile.value = null;
      profileRequestId += 1;
    },
    { immediate: true },
  );

  async function signInWithGoogle(): Promise<void> {
    let result: unknown;
    try {
      result = await signIn.social({ provider: 'google' });
    } catch (err) {
      if (isNetworkError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw new Error('Google 登录暂不可用，请稍后再试。');
    }
    const error = extractError(result);
    if (error) {
      throw new Error(safeChineseMessage(error, 'Google 登录暂不可用，请稍后再试。'));
    }
    await session.value.refetch();
    await refreshProfile();
  }

  async function signInWithUsername({ username, password }: SignInUsernameInput): Promise<void> {
    const normalizedUsername = normalizeUsername(username);
    assertValidUsername(normalizedUsername);

    let result: unknown;
    try {
      result = await signIn.username({ username: normalizedUsername, password });
    } catch (err) {
      if (isNetworkError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw new Error(codeToSignInMessage(toBetterAuthErrorLike(err)));
    }
    const error = extractError(result);
    if (error) {
      throw new Error(codeToSignInMessage(error));
    }
    await session.value.refetch();
    await refreshProfile();
  }

  async function signUpWithUsername({ username, password }: SignUpUsernameInput): Promise<void> {
    const normalizedUsername = normalizeUsername(username);
    assertValidUsername(normalizedUsername);
    assertValidSignUpPassword(password);

    let result: unknown;
    try {
      result = await authClient.$fetch('/sign-up/username', {
        method: 'POST',
        body: { username: normalizedUsername, password },
      });
    } catch (err) {
      if (isNetworkError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw new Error(codeToSignUpMessage(toBetterAuthErrorLike(err)));
    }
    const error = extractError(result);
    if (error) {
      throw new Error(codeToSignUpMessage(error));
    }
    await session.value.refetch();
    await refreshProfile();
  }

  async function logout(): Promise<void> {
    await signOut();
    profile.value = null;
    profileRequestId += 1;
  }

  return {
    authClient,
    session,
    profile: readonly(profile),
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    refreshProfile,
    signInWithGoogle,
    signInWithUsername,
    signUpWithUsername,
    logout,
  };
}
