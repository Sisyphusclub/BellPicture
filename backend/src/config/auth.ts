import { betterAuth } from 'better-auth';

import { sqlite } from '../db/sqlite.js';

import { env } from './env.js';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: sqlite,
  trustedOrigins: [env.FRONTEND_ORIGIN],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});
