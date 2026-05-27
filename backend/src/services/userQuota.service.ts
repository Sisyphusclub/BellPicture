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

function readEffective(userId: string): { used: number; date: string; total: number } {
  const rows = db
    .select({
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
    })
    .from(userQuota)
    .where(eq(userQuota.userId, userId))
    .all();
  const today = todayISO();
  const row = rows[0];
  const total = row?.dailyTotal ?? env.DAILY_USER_QUOTA;
  if (!row || row.quotaDate !== today) {
    return { used: 0, date: today, total };
  }
  return { used: row.usedToday, date: row.quotaDate, total };
}

export interface UserQuotaService {
  forUser: (userId: string) => QuotaPool;
}

export function createUserQuotaService(): UserQuotaService {
  function forUser(userId: string): QuotaPool {
    function snapshot(): QuotaSnapshot {
      const { used, total } = readEffective(userId);
      return { total, remaining: Math.max(0, total - used) };
    }

    function ensureAvailable(count: number): void {
      const { used, total } = readEffective(userId);
      if (used + count > total) {
        throw new AppError('QUOTA_EXHAUSTED', 'Daily user quota is exhausted', 429, undefined, {
          requested: count,
          remaining: Math.max(0, total - used),
          total,
        });
      }
    }

    function consume(count: number): QuotaSnapshot {
      const result = db.transaction((tx): QuotaSnapshot => {
        const rows = tx
          .select({
            usedToday: userQuota.usedToday,
            quotaDate: userQuota.quotaDate,
            dailyTotal: userQuota.dailyTotal,
          })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .all();
        const today = todayISO();
        const row = rows[0];
        const used = !row || row.quotaDate !== today ? 0 : row.usedToday;
        const total = row?.dailyTotal ?? env.DAILY_USER_QUOTA;
        if (used + count > total) {
          throw new AppError('QUOTA_EXHAUSTED', 'Daily user quota is exhausted', 429, undefined, {
            requested: count,
            remaining: Math.max(0, total - used),
            total,
          });
        }
        const nextUsed = used + count;
        tx.insert(userQuota)
          .values({ userId, usedToday: nextUsed, quotaDate: today, dailyTotal: row?.dailyTotal ?? null })
          .onConflictDoUpdate({
            target: userQuota.userId,
            set: { usedToday: sql`excluded.used_today`, quotaDate: sql`excluded.quota_date` },
          })
          .run();
        return {
          total,
          remaining: Math.max(0, total - nextUsed),
        };
      });
      logger.debug({ userId, consumed: count, remaining: result.remaining }, 'user quota: consumed');
      return result;
    }

    return { snapshot, ensureAvailable, consume };
  }

  return { forUser };
}
