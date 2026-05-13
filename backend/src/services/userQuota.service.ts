import { env } from '../config/env.js';
import { sqlite } from '../db/sqlite.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';

import type { QuotaPool, QuotaSnapshot } from './quota.service.js';

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS user_quota (
    user_id    TEXT PRIMARY KEY,
    used_today INTEGER NOT NULL DEFAULT 0,
    quota_date TEXT    NOT NULL
  );
`);

const selectRow = sqlite.prepare<
  [string],
  { used_today: number; quota_date: string }
>('SELECT used_today, quota_date FROM user_quota WHERE user_id = ?');

const upsertRow = sqlite.prepare<[string, number, string]>(
  `INSERT INTO user_quota (user_id, used_today, quota_date)
   VALUES (?, ?, ?)
   ON CONFLICT(user_id) DO UPDATE SET used_today = excluded.used_today, quota_date = excluded.quota_date`,
);

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readEffective(userId: string): { used: number; date: string } {
  const row = selectRow.get(userId);
  const today = todayISO();
  if (!row || row.quota_date !== today) {
    return { used: 0, date: today };
  }
  return { used: row.used_today, date: row.quota_date };
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

    const applyConsume = sqlite.transaction((n: number): QuotaSnapshot => {
      const { used, date } = readEffective(userId);
      if (used + n > env.DAILY_USER_QUOTA) {
        throw new AppError('QUOTA_EXHAUSTED', 'Daily user quota is exhausted', 429, undefined, {
          requested: n,
          remaining: Math.max(0, env.DAILY_USER_QUOTA - used),
          total: env.DAILY_USER_QUOTA,
        });
      }
      const nextUsed = used + n;
      upsertRow.run(userId, nextUsed, date);
      return {
        total: env.DAILY_USER_QUOTA,
        remaining: Math.max(0, env.DAILY_USER_QUOTA - nextUsed),
      };
    });

    function consume(count: number): QuotaSnapshot {
      const result = applyConsume(count);
      logger.debug(
        { userId, consumed: count, remaining: result.remaining },
        'user quota: consumed',
      );
      return result;
    }

    return { snapshot, ensureAvailable, consume };
  }

  return { forUser };
}
