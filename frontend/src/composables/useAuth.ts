import { computed } from 'vue';

import { authClient, signIn, signOut, useSession } from '@/lib/authClient';

export function useAuth() {
  const session = useSession();

  const user = computed(() => session.value.data?.user ?? null);
  const isAuthenticated = computed(() => user.value !== null);
  const isLoading = computed(() => session.value.isPending);

  async function signInWithGoogle(): Promise<void> {
    await signIn.social({ provider: 'google' });
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
    logout,
  };
}
