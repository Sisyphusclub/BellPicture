import type { PropsWithChildren } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface SessionState {
  user: { id: string; email: string; name: string } | null;
  isPending: boolean;
  refetch: ReturnType<typeof vi.fn>;
}

const session = vi.hoisted(
  (): SessionState => ({
    user: {
      id: 'user-a',
      email: 'a@example.test',
      name: 'Session A',
    },
    isPending: false,
    refetch: vi.fn(),
  }),
);
const profileApi = vi.hoisted(() => ({ fetchAuthProfile: vi.fn() }));

vi.mock('@/lib/authClient', () => ({
  authClient: { $fetch: vi.fn() },
  signIn: { social: vi.fn(), username: vi.fn() },
  signOut: vi.fn(),
  useSession: () => ({
    data: session.user === null ? null : { user: session.user },
    isPending: session.isPending,
    refetch: session.refetch,
  }),
}));
vi.mock('@/services/api/authApi', () => profileApi);

import { AuthProvider, useAuth } from '@/hooks/useAuth';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function wrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  session.user = { id: 'user-a', email: 'a@example.test', name: 'Session A' };
  session.isPending = false;
  session.refetch.mockReset();
  profileApi.fetchAuthProfile.mockReset();
});

describe('AuthProvider', () => {
  it('does not expose the previous profile after the session switches accounts', async () => {
    const profileB = deferred<{
      id: string;
      email: string;
      username: string;
      isAdmin: boolean;
    }>();
    profileApi.fetchAuthProfile
      .mockResolvedValueOnce({
        id: 'user-a',
        email: 'a@example.test',
        username: 'alpha',
        isAdmin: true,
      })
      .mockReturnValueOnce(profileB.promise);
    const { result, rerender } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.username).toBe('alpha'));

    session.user = { id: 'user-b', email: 'b@example.test', name: 'Session B' };
    rerender();

    expect(result.current.user).toMatchObject({
      id: 'user-b',
      email: 'b@example.test',
      name: 'Session B',
      isAdmin: false,
    });
    expect(result.current.isAdmin).toBe(false);
    await waitFor(() => expect(profileApi.fetchAuthProfile).toHaveBeenCalledTimes(2));

    await act(async () => {
      profileB.resolve({
        id: 'user-b',
        email: 'b@example.test',
        username: 'beta',
        isAdmin: false,
      });
      await profileB.promise;
    });
    await waitFor(() => expect(result.current.user?.username).toBe('beta'));
  });
});
