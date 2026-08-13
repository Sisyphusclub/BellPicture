import { eq, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { userQuota } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { productDateKey } from '../utils/date.js';

import type { DailyCheckInResult, QuotaPool, QuotaSnapshot } from './quota.service.js';

interface EffectiveQuota {
  used: number;
  baseTotal: number;
  bonus: number;
  checkedInToday: boolean;
}

function readEffective(userId: string): EffectiveQuota {
  const row = db
    .select({
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
      checkInDate: userQuota.checkInDate,
      bonusToday: userQuota.bonusToday,
    })
    .from(userQuota)
    .where(eq(userQuota.userId, userId))
    .get();
  const today = productDateKey();
  const checkedInToday = row?.checkInDate === today;
  return {
    used: row?.quotaDate === today ? row.usedToday : 0,
    baseTotal: row?.dailyTotal ?? env.DAILY_USER_QUOTA,
    bonus: checkedInToday ? row.bonusToday : 0,
    checkedInToday,
  };
}

function snapshotFromEffective(quota: EffectiveQuota): QuotaSnapshot {
  const total = quota.baseTotal + quota.bonus;
  return {
    total,
    remaining: Math.max(0, total - quota.used),
    checkedInToday: quota.checkedInToday,
    dailyCheckInReward: env.DAILY_CHECK_IN_REWARD,
  };
}

export interface UserQuotaService {
  forUser: (userId: string) => QuotaPool;
}

export function createUserQuotaService(): UserQuotaService {
  function forUser(userId: string): QuotaPool {
    function snapshot(): QuotaSnapshot {
      return snapshotFromEffective(readEffective(userId));
    }

    function ensureAvailable(count: number): void {
      const quota = readEffective(userId);
      const total = quota.baseTotal + quota.bonus;
      const { used } = quota;
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
        const row = tx
          .select({
            usedToday: userQuota.usedToday,
            quotaDate: userQuota.quotaDate,
            dailyTotal: userQuota.dailyTotal,
            checkInDate: userQuota.checkInDate,
            bonusToday: userQuota.bonusToday,
          })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .get();
        const today = productDateKey();
        const used = !row || row.quotaDate !== today ? 0 : row.usedToday;
        const checkedInToday = row?.checkInDate === today;
        const bonus = checkedInToday ? row.bonusToday : 0;
        const total = (row?.dailyTotal ?? env.DAILY_USER_QUOTA) + bonus;
        if (used + count > total) {
          throw new AppError('QUOTA_EXHAUSTED', 'Daily user quota is exhausted', 429, undefined, {
            requested: count,
            remaining: Math.max(0, total - used),
            total,
          });
        }
        const nextUsed = used + count;
        tx.insert(userQuota)
          .values({
            userId,
            usedToday: nextUsed,
            quotaDate: today,
            dailyTotal: row?.dailyTotal ?? null,
          })
          .onConflictDoUpdate({
            target: userQuota.userId,
            set: { usedToday: sql`excluded.used_today`, quotaDate: sql`excluded.quota_date` },
          })
          .run();
        return {
          total,
          remaining: Math.max(0, total - nextUsed),
          checkedInToday,
          dailyCheckInReward: env.DAILY_CHECK_IN_REWARD,
        };
      });
      logger.debug(
        { userId, consumed: count, remaining: result.remaining },
        'user quota: consumed',
      );
      return result;
    }

    function checkIn(): DailyCheckInResult {
      const result = db.transaction((tx): DailyCheckInResult => {
        const row = tx
          .select({
            usedToday: userQuota.usedToday,
            quotaDate: userQuota.quotaDate,
            dailyTotal: userQuota.dailyTotal,
            checkInDate: userQuota.checkInDate,
            bonusToday: userQuota.bonusToday,
          })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .get();
        const today = productDateKey();
        const used = row?.quotaDate === today ? row.usedToday : 0;
        const baseTotal = row?.dailyTotal ?? env.DAILY_USER_QUOTA;

        if (row?.checkInDate === today) {
          const snapshot = snapshotFromEffective({
            used,
            baseTotal,
            bonus: row.bonusToday,
            checkedInToday: true,
          });
          return { ...snapshot, claimed: false };
        }

        tx.insert(userQuota)
          .values({
            userId,
            usedToday: used,
            quotaDate: today,
            dailyTotal: row?.dailyTotal ?? null,
            checkInDate: today,
            bonusToday: env.DAILY_CHECK_IN_REWARD,
          })
          .onConflictDoUpdate({
            target: userQuota.userId,
            set: {
              usedToday: sql`excluded.used_today`,
              quotaDate: sql`excluded.quota_date`,
              checkInDate: sql`excluded.check_in_date`,
              bonusToday: sql`excluded.bonus_today`,
            },
          })
          .run();

        const snapshot = snapshotFromEffective({
          used,
          baseTotal,
          bonus: env.DAILY_CHECK_IN_REWARD,
          checkedInToday: true,
        });
        return { ...snapshot, claimed: true };
      });
      logger.info(
        { userId, claimed: result.claimed, remaining: result.remaining },
        'user quota: daily check-in',
      );
      return result;
    }

    return { snapshot, ensureAvailable, consume, checkIn };
  }

  return { forUser };
}
