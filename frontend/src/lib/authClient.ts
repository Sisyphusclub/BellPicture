import { createAuthClient } from 'better-auth/vue';

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signOut, useSession } = authClient;
