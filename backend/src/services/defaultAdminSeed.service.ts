import { eq } from 'drizzle-orm';

import { auth } from '../config/auth.js';
import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { user } from '../db/schema.js';
import { logger } from '../logger.js';
import { internalEmailForUsername, normalizeUsername } from '../utils/username.js';

const DEFAULT_ADMIN_USERNAME = normalizeUsername('Blur');
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export interface DefaultAdminSeedResult {
  created: boolean;
  reason: 'disabled' | 'exists' | 'created';
  username: string;
}

export async function seedDefaultAdminIfEnabled(
  enabled = env.SEED_DEFAULT_ADMIN,
): Promise<DefaultAdminSeedResult> {
  if (!enabled) {
    return { created: false, reason: 'disabled', username: DEFAULT_ADMIN_USERNAME };
  }

  const existingUser = db
    .select({ id: user.id, isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.username, DEFAULT_ADMIN_USERNAME))
    .get();
  if (existingUser) {
    if (!existingUser.isAdmin) {
      db.update(user)
        .set({ isAdmin: true, updatedAt: new Date() })
        .where(eq(user.id, existingUser.id))
        .run();
    }
    logger.info({ username: DEFAULT_ADMIN_USERNAME }, 'default-admin seed: user already exists');
    return { created: false, reason: 'exists', username: DEFAULT_ADMIN_USERNAME };
  }

  await auth.api.signUpEmail({
    body: {
      email: internalEmailForUsername(DEFAULT_ADMIN_USERNAME),
      password: DEFAULT_ADMIN_PASSWORD,
      name: DEFAULT_ADMIN_USERNAME,
      username: DEFAULT_ADMIN_USERNAME,
      displayUsername: DEFAULT_ADMIN_USERNAME,
      rememberMe: false,
    },
  });

  db.update(user)
    .set({ isAdmin: true, updatedAt: new Date() })
    .where(eq(user.username, DEFAULT_ADMIN_USERNAME))
    .run();

  logger.info({ username: DEFAULT_ADMIN_USERNAME }, 'default-admin seed: created default admin');
  return { created: true, reason: 'created', username: DEFAULT_ADMIN_USERNAME };
}
