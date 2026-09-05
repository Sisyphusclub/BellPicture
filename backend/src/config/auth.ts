import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins/username';

import { db } from '../db/drizzle.js';
import * as schema from '../db/schema.js';
import { normalizeUsername } from '../utils/username.js';

import { env } from './env.js';

const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  trustedOrigins: [env.FRONTEND_ORIGIN],
  user: {
    additionalFields: {
      isAdmin: {
        type: 'boolean',
        defaultValue: false,
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 32,
      usernameNormalization: normalizeUsername,
      // In Better Auth's username plugin, this path normalizes before sign-in validation.
      validationOrder: { username: 'pre-normalization' },
      usernameValidator: (value) => /^[a-z0-9_]+$/.test(value),
      displayUsernameNormalization: normalizeUsername,
    }),
  ],
  ...(socialProviders ? { socialProviders } : {}),
});
