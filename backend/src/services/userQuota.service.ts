import { randomUUID } from 'node:crypto';

import { and, asc, eq, gt, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { quotaGrants, userQuota } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { productDateKey } from '../utils/date.js';

import type {
  DailyCheckInResult,
  QuotaPool,
  QuotaReservation,
  QuotaSnapshot,
} from './quota.service.js';

const CHECK_IN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

type QuotaRow = {
  userId: string;
  usedToday: number;
  quotaDate: string;
  dailyTotal: number | null;
  checkInDate: string | null;
  bonusToday: number;
  permanentTotal: number | null;
  permanentUsed: number | null;
};

type GrantRow = {
  id: string;
  userId: string;
  source: string;
  amount: number;
  remaining: number;
  grantedAt: Date;
  expiresAt: Date;
  checkInDate: string;
};

interface QuotaSnapshotParts {
  total: number;
  remaining: number;
  checkedInToday: boolean;
  permanentTotal: number;
  permanentUsed: number;
  permanentRemaining: number;
  bonusRemaining: number;
  bonusExpiresAt: string | null;
}

function permanentTotal(row: QuotaRow | undefined): number {
  return row?.permanentTotal ?? row?.dailyTotal ?? env.DAILY_USER_QUOTA;
}

function permanentUsed(row: QuotaRow | undefined, today = productDateKey()): number {
  if (
    row?.permanentUsed !== null &&
    row?.permanentUsed !== undefined &&
    !(row.permanentUsed === 0 && row.usedToday > 0 && row.checkInDate === null)
  ) {
    return Math.max(0, row.permanentUsed);
  }
  const legacyUsed = row?.quotaDate === today ? row.usedToday : 0;
  return Math.max(0, legacyUsed);
}

function buildSnapshot(
  row: QuotaRow | undefined,
  grants: readonly GrantRow[],
  today = productDateKey(),
): QuotaSnapshotParts {
  const baseTotal = permanentTotal(row);
  const baseUsed = permanentUsed(row, today);
  const activeBonusTotal = grants.reduce((sum, grant) => sum + grant.amount, 0);
  const activeBonusRemaining = grants.reduce((sum, grant) => sum + grant.remaining, 0);
  return {
    total: baseTotal + activeBonusTotal,
    remaining: Math.max(0, baseTotal - baseUsed) + activeBonusRemaining,
    checkedInToday:
      grants.some((grant) => grant.checkInDate === today) || row?.checkInDate === today,
    permanentTotal: baseTotal,
    permanentUsed: baseUsed,
    permanentRemaining: Math.max(0, baseTotal - baseUsed),
    bonusRemaining: activeBonusRemaining,
    bonusExpiresAt: grants[0]?.expiresAt.toISOString() ?? null,
  };
}

function toQuotaSnapshot(parts: QuotaSnapshotParts): QuotaSnapshot {
  return {
    total: parts.total,
    remaining: parts.remaining,
    checkedInToday: parts.checkedInToday,
    dailyCheckInReward: env.DAILY_CHECK_IN_REWARD,
  };
}

function selectQuotaRow(userId: string): QuotaRow | undefined {
  return db
    .select({
      userId: userQuota.userId,
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
      checkInDate: userQuota.checkInDate,
      bonusToday: userQuota.bonusToday,
      permanentTotal: userQuota.permanentTotal,
      permanentUsed: userQuota.permanentUsed,
    })
    .from(userQuota)
    .where(eq(userQuota.userId, userId))
    .get();
}

function selectActiveGrants(userId: string, now = new Date()): GrantRow[] {
  return db
    .select({
      id: quotaGrants.id,
      userId: quotaGrants.userId,
      source: quotaGrants.source,
      amount: quotaGrants.amount,
      remaining: quotaGrants.remaining,
      grantedAt: quotaGrants.grantedAt,
      expiresAt: quotaGrants.expiresAt,
      checkInDate: quotaGrants.checkInDate,
    })
    .from(quotaGrants)
    .where(and(eq(quotaGrants.userId, userId), gt(quotaGrants.expiresAt, now)))
    .orderBy(asc(quotaGrants.expiresAt), asc(quotaGrants.grantedAt), asc(quotaGrants.id))
    .all();
}

export interface UserQuotaService {
  forUser: (userId: string) => QuotaPool;
}

export function createUserQuotaService(): UserQuotaService {
  function forUser(userId: string): QuotaPool {
    function snapshot(): QuotaSnapshot {
      return toQuotaSnapshot(buildSnapshot(selectQuotaRow(userId), selectActiveGrants(userId)));
    }

    function reserve(count: number): QuotaReservation {
      if (!Number.isInteger(count) || count <= 0) {
        throw new AppError('INTERNAL', 'Invalid quota reservation count', 500, undefined, {
          count,
        });
      }

      const result = db.transaction((tx) => {
        const row = tx
          .select({
            userId: userQuota.userId,
            usedToday: userQuota.usedToday,
            quotaDate: userQuota.quotaDate,
            dailyTotal: userQuota.dailyTotal,
            checkInDate: userQuota.checkInDate,
            bonusToday: userQuota.bonusToday,
            permanentTotal: userQuota.permanentTotal,
            permanentUsed: userQuota.permanentUsed,
          })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .get();
        const today = productDateKey();
        const now = new Date();
        const grants = tx
          .select({
            id: quotaGrants.id,
            userId: quotaGrants.userId,
            source: quotaGrants.source,
            amount: quotaGrants.amount,
            remaining: quotaGrants.remaining,
            grantedAt: quotaGrants.grantedAt,
            expiresAt: quotaGrants.expiresAt,
            checkInDate: quotaGrants.checkInDate,
          })
          .from(quotaGrants)
          .where(
            and(
              eq(quotaGrants.userId, userId),
              gt(quotaGrants.expiresAt, now),
              gt(quotaGrants.remaining, 0),
            ),
          )
          .orderBy(asc(quotaGrants.expiresAt), asc(quotaGrants.grantedAt), asc(quotaGrants.id))
          .all();
        const baseTotal = permanentTotal(row);
        const baseUsed = permanentUsed(row, today);
        const baseRemaining = Math.max(0, baseTotal - baseUsed);
        const bonusRemaining = grants.reduce((sum, grant) => sum + grant.remaining, 0);
        if (count > baseRemaining + bonusRemaining) {
          const active = buildSnapshot(row, grants, today);
          throw new AppError('QUOTA_EXHAUSTED', 'User quota is exhausted', 429, undefined, {
            requested: count,
            remaining: active.remaining,
            total: active.total,
          });
        }

        let left = count;
        const allocations: Array<{ kind: 'bonus' | 'permanent'; id?: string; amount: number }> = [];
        for (const grant of grants) {
          if (left <= 0) break;
          const amount = Math.min(left, grant.remaining);
          tx.update(quotaGrants)
            .set({ remaining: sql`${quotaGrants.remaining} - ${amount}` })
            .where(eq(quotaGrants.id, grant.id))
            .run();
          allocations.push({ kind: 'bonus', id: grant.id, amount });
          left -= amount;
        }
        if (left > 0) {
          tx.update(userQuota)
            .set({ permanentUsed: sql`COALESCE(${userQuota.permanentUsed}, 0) + ${left}` })
            .where(eq(userQuota.userId, userId))
            .run();
          allocations.push({ kind: 'permanent', amount: left });
        }

        const nextUsedToday = (row?.quotaDate === today ? row.usedToday : 0) + count;
        tx.insert(userQuota)
          .values({
            userId,
            usedToday: nextUsedToday,
            quotaDate: today,
            dailyTotal: row?.dailyTotal ?? null,
            checkInDate: row?.checkInDate ?? null,
            bonusToday: row?.bonusToday ?? 0,
            permanentTotal: row?.permanentTotal ?? row?.dailyTotal ?? env.DAILY_USER_QUOTA,
            permanentUsed: baseUsed + left,
          })
          .onConflictDoUpdate({
            target: userQuota.userId,
            set: {
              usedToday: sql`excluded.used_today`,
              quotaDate: sql`excluded.quota_date`,
              permanentTotal: sql`COALESCE(${userQuota.permanentTotal}, excluded.permanent_total)`,
              permanentUsed: sql`excluded.permanent_used`,
            },
          })
          .run();

        const nextGrants = grants.map((grant) => {
          const allocation = allocations.find((item) => item.id === grant.id);
          return allocation === undefined
            ? grant
            : { ...grant, remaining: grant.remaining - allocation.amount };
        });
        return {
          quotaDate: today,
          allocations,
          snapshot: toQuotaSnapshot(
            buildSnapshot(
              {
                ...(row ?? {
                  userId,
                  usedToday: 0,
                  quotaDate: today,
                  dailyTotal: null,
                  checkInDate: null,
                  bonusToday: 0,
                  permanentTotal: null,
                  permanentUsed: null,
                }),
                permanentUsed: baseUsed + left,
              },
              nextGrants,
              today,
            ),
          ),
        };
      });

      logger.debug(
        { userId, reserved: count, remaining: result.snapshot.remaining },
        'user quota: reserved',
      );
      let state: 'reserved' | 'committed' | 'released' = 'reserved';

      function restore(amount: number): QuotaSnapshot {
        if (amount === 0) return snapshot();
        db.transaction((tx) => {
          let left = amount;
          for (let index = result.allocations.length - 1; index >= 0 && left > 0; index -= 1) {
            const allocation = result.allocations[index];
            if (allocation === undefined) continue;
            const amountToRestore = Math.min(left, allocation.amount);
            if (allocation.kind === 'bonus' && allocation.id !== undefined) {
              const grant = tx
                .select({ remaining: quotaGrants.remaining, expiresAt: quotaGrants.expiresAt })
                .from(quotaGrants)
                .where(eq(quotaGrants.id, allocation.id))
                .get();
              if (grant !== undefined && grant.expiresAt.getTime() > Date.now()) {
                tx.update(quotaGrants)
                  .set({ remaining: sql`${quotaGrants.remaining} + ${amountToRestore}` })
                  .where(eq(quotaGrants.id, allocation.id))
                  .run();
                left -= amountToRestore;
              }
            } else {
              tx.update(userQuota)
                .set({
                  permanentUsed: sql`MAX(0, COALESCE(${userQuota.permanentUsed}, 0) - ${amountToRestore})`,
                  usedToday: sql`MAX(0, ${userQuota.usedToday} - ${amountToRestore})`,
                })
                .where(eq(userQuota.userId, userId))
                .run();
              left -= amountToRestore;
            }
          }
        });
        return snapshot();
      }

      return {
        commit(actualCount: number): QuotaSnapshot {
          if (state !== 'reserved') {
            throw new AppError('INTERNAL', 'Quota reservation is already settled', 500, undefined, {
              state,
            });
          }
          if (!Number.isInteger(actualCount) || actualCount < 0 || actualCount > count) {
            throw new AppError(
              'INTERNAL',
              'Invalid quota reservation commit count',
              500,
              undefined,
              { actualCount, reservedCount: count },
            );
          }
          const committed = restore(count - actualCount);
          state = 'committed';
          logger.debug(
            { userId, reserved: count, committed: actualCount },
            'user quota: reservation committed',
          );
          return committed;
        },
        release(): QuotaSnapshot {
          if (state !== 'reserved') {
            throw new AppError('INTERNAL', 'Quota reservation is already settled', 500, undefined, {
              state,
            });
          }
          const released = restore(count);
          state = 'released';
          logger.debug(
            { userId, released: count, remaining: released.remaining },
            'user quota: reservation released',
          );
          return released;
        },
      };
    }

    function checkIn(): DailyCheckInResult {
      const result = db.transaction((tx) => {
        const today = productDateKey();
        const row = tx
          .select({
            userId: userQuota.userId,
            usedToday: userQuota.usedToday,
            quotaDate: userQuota.quotaDate,
            dailyTotal: userQuota.dailyTotal,
            checkInDate: userQuota.checkInDate,
            bonusToday: userQuota.bonusToday,
            permanentTotal: userQuota.permanentTotal,
            permanentUsed: userQuota.permanentUsed,
          })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .get();
        const existingGrant = tx
          .select({ id: quotaGrants.id })
          .from(quotaGrants)
          .where(
            and(
              eq(quotaGrants.userId, userId),
              eq(quotaGrants.source, 'check_in'),
              eq(quotaGrants.checkInDate, today),
            ),
          )
          .get();
        const alreadyClaimed = existingGrant !== undefined || row?.checkInDate === today;
        let claimed = false;
        if (existingGrant === undefined && row?.checkInDate !== today) {
          const now = new Date();
          tx.insert(quotaGrants)
            .values({
              id: randomUUID(),
              userId,
              source: 'check_in',
              amount: env.DAILY_CHECK_IN_REWARD,
              remaining: env.DAILY_CHECK_IN_REWARD,
              grantedAt: now,
              expiresAt: new Date(now.getTime() + CHECK_IN_VALIDITY_MS),
              checkInDate: today,
            })
            .run();
          claimed = true;
        }

        const used = row?.quotaDate === today ? row.usedToday : 0;
        tx.insert(userQuota)
          .values({
            userId,
            usedToday: used,
            quotaDate: today,
            dailyTotal: row?.dailyTotal ?? null,
            checkInDate: today,
            bonusToday: row?.bonusToday ?? env.DAILY_CHECK_IN_REWARD,
            permanentTotal: row?.permanentTotal ?? row?.dailyTotal ?? env.DAILY_USER_QUOTA,
            permanentUsed: row?.permanentUsed ?? (row?.quotaDate === today ? row.usedToday : 0),
          })
          .onConflictDoUpdate({
            target: userQuota.userId,
            set: {
              usedToday: sql`excluded.used_today`,
              quotaDate: sql`excluded.quota_date`,
              checkInDate: sql`excluded.check_in_date`,
              bonusToday: sql`excluded.bonus_today`,
              permanentTotal: sql`COALESCE(${userQuota.permanentTotal}, excluded.permanent_total)`,
              permanentUsed: sql`COALESCE(${userQuota.permanentUsed}, excluded.permanent_used)`,
            },
          })
          .run();

        const nextRow = tx
          .select({
            userId: userQuota.userId,
            usedToday: userQuota.usedToday,
            quotaDate: userQuota.quotaDate,
            dailyTotal: userQuota.dailyTotal,
            checkInDate: userQuota.checkInDate,
            bonusToday: userQuota.bonusToday,
            permanentTotal: userQuota.permanentTotal,
            permanentUsed: userQuota.permanentUsed,
          })
          .from(userQuota)
          .where(eq(userQuota.userId, userId))
          .get();
        const grants = tx
          .select({
            id: quotaGrants.id,
            userId: quotaGrants.userId,
            source: quotaGrants.source,
            amount: quotaGrants.amount,
            remaining: quotaGrants.remaining,
            grantedAt: quotaGrants.grantedAt,
            expiresAt: quotaGrants.expiresAt,
            checkInDate: quotaGrants.checkInDate,
          })
          .from(quotaGrants)
          .where(and(eq(quotaGrants.userId, userId), gt(quotaGrants.expiresAt, new Date())))
          .orderBy(asc(quotaGrants.expiresAt))
          .all();
        return {
          ...toQuotaSnapshot(buildSnapshot(nextRow, grants, today)),
          claimed: claimed && !alreadyClaimed,
        };
      });
      logger.info(
        { userId, claimed: result.claimed, remaining: result.remaining },
        'user quota: daily check-in',
      );
      return result;
    }

    return { snapshot, reserve, checkIn };
  }

  return { forUser };
}
