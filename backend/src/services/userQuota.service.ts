import { eq, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { userQuota } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';

import type { QuotaPool, QuotaSnapshot } from './quota.service.js';

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readEffective(userId: string): { used: number; date: string } {
  const rows = db
    .select({ usedToday: userQuota.usedToday, quotaDate: userQuota.quotaDate })
    .from(userQuota)
    .where(eq(userQuota.userId, userId))
    .all();
  const today = todayISO();
  const row = rows[0];
  if (!row || row.quotaDate !== today) {
    return { used: 0, date: today };
  }
  return { used: row.usedToday, date: row.quotaDate };
}

export interface UserQuotaService {
  forUser: (userId: string) => QuotaPool;
}

export function createUserQuotaService(): UserQuotaService {
  function forUser(userId: string): QuotaPool {
    function snapshot(): QuotaSnapshot {
      const { used } = readEffective(userId);
      return { total: env.DAILY_USER_QUOTA, remaining: Math.max(0, env.DAILY_USER_QUOTA - used) };
    }

    function ensureAvailable(count: number): void {
      const { used } = readEffective(userId);
      if (used + count > env.DAILY_USER_QUOTA) {
        throw new AppError('QUOTA_EXHAUSTED', 'Daily user quota is exhausted', 429, undefined, {
          requested: count,
          remaining: Math.max(0, env.DAILY_USER_QUOTA - used),
          total: env.DAILY_USER_QUOTA,
        });
      }
    }

    function consume(count: number): QuotaSnapshot {
      const result = db.transaction((tx): QuotaSnapshot => {
        const rows = tx
          .select({ usedToday: userQuota.usedToday, quotaDate: userQuota.quotaDate })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .all();
        const today = todayISO();
        const row = rows[0];
        const used = !row || row.quotaDate !== today ? 0 : row.usedToday;
        if (used + count > env.DAILY_USER_QUOTA) {
          throw new AppError('QUOTA_EXHAUSTED', 'Daily user quota is exhausted', 429, undefined, {
            requested: count,
            remaining: Math.max(0, env.DAILY_USER_QUOTA - used),
            total: env.DAILY_USER_QUOTA,
          });
        }
        const nextUsed = used + count;
        tx.insert(userQuota)
          .values({ userId, usedToday: nextUsed, quotaDate: today })
          .onConflictDoUpdate({
            target: userQuota.userId,
            set: { usedToday: sql`excluded.used_today`, quotaDate: sql`excluded.quota_date` },
          })
          .run();
        return {
          total: env.DAILY_USER_QUOTA,
          remaining: Math.max(0, env.DAILY_USER_QUOTA - nextUsed),
        };
      });
      logger.debug({ userId, consumed: count, remaining: result.remaining }, 'user quota: consumed');
      return result;
    }

    return { snapshot, ensureAvailable, consume };
  }

  return { forUser };
}
