import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';

import { authClient, signIn, signOut, useSession } from '@/lib/authClient';
import { fetchAuthProfile, type AuthUserProfile } from '@/services/api/authApi';

const NETWORK_ERROR_MESSAGE = '无法连接到服务器，请检查网络或稍后重试。';
const USERNAME_REQUIREMENTS_MESSAGE = '用户名需为 3-32 位小写字母、数字或下划线。';
const PASSWORD_REQUIREMENTS_MESSAGE = '密码至少需要 8 个字符。';
const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

interface Credentials {
  username: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithUsername: (credentials: Credentials) => Promise<void>;
  signUpWithUsername: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
}

interface BetterAuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function toBetterAuthErrorLike(value: unknown): BetterAuthErrorLike | null {
  if (!isRecord(value)) return null;
  const nested = toBetterAuthErrorLike(value['error']);
  if (nested) {
    const status = typeof value['status'] === 'number' ? value['status'] : nested.status;
    return status === undefined ? nested : { ...nested, status };
  }
  const code = typeof value['code'] === 'string' ? value['code'] : undefined;
  const message = typeof value['message'] === 'string' ? value['message'] : undefined;
  const status = typeof value['status'] === 'number' ? value['status'] : undefined;
  if (code === undefined && message === undefined && status === undefined) return null;
  return {
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message }),
    ...(status === undefined ? {} : { status }),
  };
}

function extractError(value: unknown): BetterAuthErrorLike | null {
  return isRecord(value) ? toBetterAuthErrorLike(value['error']) : null;
}

function safeChineseMessage(error: BetterAuthErrorLike | null, fallback: string): string {
  return error?.message && /[一-鿿]/.test(error.message) ? error.message : fallback;
}

function signInMessage(error: BetterAuthErrorLike | null): string {
  switch (error?.code) {
    case 'INVALID_USERNAME_OR_PASSWORD':
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
    case 'USER_NOT_FOUND':
      return '用户名或密码错误。';
    case 'USERNAME_TOO_SHORT':
    case 'USERNAME_TOO_LONG':
    case 'INVALID_USERNAME':
      return USERNAME_REQUIREMENTS_MESSAGE;
    default:
      return safeChineseMessage(error, '登录失败，请稍后再试。');
  }
}

function signUpMessage(error: BetterAuthErrorLike | null): string {
  switch (error?.code) {
    case 'USERNAME_IS_ALREADY_TAKEN':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
    case 'USER_ALREADY_EXISTS':
    case 'USER_EXISTS':
    case 'EMAIL_ALREADY_EXISTS':
      return '该用户名已被占用，请换一个。';
    case 'PASSWORD_TOO_SHORT':
    case 'INVALID_PASSWORD':
      return PASSWORD_REQUIREMENTS_MESSAGE;
    default:
      return safeChineseMessage(error, '注册失败，请稍后再试。');
  }
}

function normalizeSessionUser(value: unknown): AuthUserProfile | null {
  if (!isRecord(value) || typeof value['id'] !== 'string' || typeof value['email'] !== 'string') {
    return null;
  }
  const profile: AuthUserProfile = {
    id: value['id'],
    email: value['email'],
    isAdmin: false,
  };
  if (typeof value['name'] === 'string') profile.name = value['name'];
  if (typeof value['image'] === 'string' || value['image'] === null) profile.image = value['image'];
  return profile;
}

function normalizeUsername(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) throw new Error(USERNAME_REQUIREMENTS_MESSAGE);
  return normalized;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const session = useSession();
  const sessionUser = normalizeSessionUser(session.data?.user);
  const [profile, setProfile] = useState<AuthUserProfile | null>(null);
  const requestId = useRef(0);
  const isAuthenticated = sessionUser !== null;

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!session.data?.user) {
      setProfile(null);
      requestId.current += 1;
      return;
    }
    const current = requestId.current + 1;
    requestId.current = current;
    try {
      const next = await fetchAuthProfile();
      if (requestId.current === current) setProfile(next);
    } catch {
      if (requestId.current === current) setProfile(null);
    }
  }, [session.data?.user]);

  useEffect(() => {
    if (session.isPending) return;
    if (isAuthenticated) {
      void refreshProfile();
      return;
    }
    setProfile(null);
    requestId.current += 1;
  }, [isAuthenticated, refreshProfile, session.isPending]);

  const refetchSession = session.refetch;
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      const result: unknown = await signIn.social({ provider: 'google' });
      const error = extractError(result);
      if (error) throw new Error(safeChineseMessage(error, 'Google 登录暂不可用，请稍后再试。'));
      await refetchSession();
    } catch (error) {
      if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE);
      if (error instanceof Error) throw error;
      throw new Error('Google 登录暂不可用，请稍后再试。');
    }
  }, [refetchSession]);

  const signInWithUsername = useCallback(
    async ({ username, password }: Credentials): Promise<void> => {
      const normalized = normalizeUsername(username);
      try {
        const result: unknown = await signIn.username({ username: normalized, password });
        const error = extractError(result);
        if (error) throw new Error(signInMessage(error));
        await refetchSession();
      } catch (error) {
        if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE);
        if (error instanceof Error && /[一-鿿]/.test(error.message)) throw error;
        throw new Error(signInMessage(toBetterAuthErrorLike(error)));
      }
    },
    [refetchSession],
  );

  const signUpWithUsername = useCallback(
    async ({ username, password }: Credentials): Promise<void> => {
      const normalized = normalizeUsername(username);
      if (password.length < 8) throw new Error(PASSWORD_REQUIREMENTS_MESSAGE);
      try {
        const result: unknown = await authClient.$fetch('/sign-up/username', {
          method: 'POST',
          body: { username: normalized, password },
        });
        const error = extractError(result);
        if (error) throw new Error(signUpMessage(error));
        await refetchSession();
      } catch (error) {
        if (error instanceof TypeError) throw new Error(NETWORK_ERROR_MESSAGE);
        if (error instanceof Error && /[一-鿿]/.test(error.message)) throw error;
        throw new Error(signUpMessage(toBetterAuthErrorLike(error)));
      }
    },
    [refetchSession],
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut();
    setProfile(null);
    requestId.current += 1;
    await refetchSession();
  }, [refetchSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profile ?? sessionUser,
      isAuthenticated,
      isLoading: session.isPending,
      isAdmin: profile?.isAdmin === true,
      refreshProfile,
      signInWithGoogle,
      signInWithUsername,
      signUpWithUsername,
      logout,
    }),
    [
      profile,
      sessionUser,
      isAuthenticated,
      session.isPending,
      refreshProfile,
      signInWithGoogle,
      signInWithUsername,
      signUpWithUsername,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用。');
  return value;
}
