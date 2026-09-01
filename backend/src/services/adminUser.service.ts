import { and, asc, eq, gt, sql } from 'drizzle-orm';

import { auth } from '../config/auth.js';
import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { quotaGrants, user, userQuota } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
import { productDateKey } from '../utils/date.js';
import { internalEmailForUsername, isValidUsername, normalizeUsername } from '../utils/username.js';

const USERNAME_REQUIREMENTS_MESSAGE = '用户名需为 3-32 位小写字母、数字或下划线。';
const PASSWORD_REQUIREMENTS_MESSAGE = '密码至少需要 8 个字符。';

export interface AdminUserDTO {
  id: string;
  username: string | null;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  quota: {
    total: number;
    usedToday: number;
    remainingToday: number;
    permanentTotal: number;
    permanentUsed: number;
    permanentRemaining: number;
    bonusRemaining: number;
    bonusExpiresAt: string | null;
  };
}

export interface CreateAdminUserInput {
  username: string;
  password: string;
  permanentTotal?: number;
  dailyTotal?: number;
}

export interface UpdateUserQuotaInput {
  permanentTotal?: number;
  dailyTotal: number;
}

interface EffectiveQuotaState {
  total: number;
  usedToday: number;
  remainingToday: number;
  permanentTotal: number;
  permanentUsed: number;
  permanentRemaining: number;
  bonusRemaining: number;
  bonusExpiresAt: string | null;
}

function normalizeAndValidateUsername(raw: string): string {
  const username = normalizeUsername(raw.trim());
  if (!isValidUsername(username)) {
    throw new AppError('BAD_REQUEST', USERNAME_REQUIREMENTS_MESSAGE, 400, undefined, {
      field: 'username',
    });
  }
  return username;
}

function assertValidPermanentTotal(permanentTotal: number): void {
  if (!Number.isInteger(permanentTotal) || permanentTotal < 0 || permanentTotal > 10_000) {
    throw new AppError('BAD_REQUEST', '永久额度需为 0 到 10000 之间的整数。', 400, undefined, {
      field: 'permanentTotal',
    });
  }
}

function quotaState(row: {
  userId: string;
  usedToday: number | null;
  quotaDate: string | null;
  dailyTotal: number | null;
  checkInDate: string | null;
  bonusToday: number | null;
  permanentTotal: number | null;
  permanentUsed: number | null;
}): EffectiveQuotaState {
  const today = productDateKey();
  const permanentTotal = row.permanentTotal ?? row.dailyTotal ?? env.DAILY_USER_QUOTA;
  const useLegacyCounter =
    row.permanentUsed === null ||
    row.permanentUsed === undefined ||
    (row.permanentUsed === 0 && (row.usedToday ?? 0) > 0 && row.checkInDate === null);
  const permanentUsed = useLegacyCounter
    ? Math.max(0, row.quotaDate === today ? (row.usedToday ?? 0) : 0)
    : Math.max(0, row.permanentUsed ?? 0);
  const grants = db
    .select({
      remaining: quotaGrants.remaining,
      amount: quotaGrants.amount,
      expiresAt: quotaGrants.expiresAt,
    })
    .from(quotaGrants)
    .where(and(eq(quotaGrants.userId, row.userId), gt(quotaGrants.expiresAt, new Date())))
    .orderBy(asc(quotaGrants.expiresAt))
    .all();
  const bonusRemaining = grants.reduce((sum, grant) => sum + grant.remaining, 0);
  const total = permanentTotal + grants.reduce((sum, grant) => sum + grant.amount, 0);
  const remaining = Math.max(0, permanentTotal - permanentUsed) + bonusRemaining;
  return {
    total,
    usedToday: row.quotaDate === today ? (row.usedToday ?? 0) : 0,
    remainingToday: remaining,
    permanentTotal,
    permanentUsed,
    permanentRemaining: Math.max(0, permanentTotal - permanentUsed),
    bonusRemaining,
    bonusExpiresAt: grants[0]?.expiresAt.toISOString() ?? null,
  };
}

function toAdminUserDTO(row: {
  id: string;
  userId: string;
  username: string | null;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  usedToday: number | null;
  quotaDate: string | null;
  dailyTotal: number | null;
  checkInDate: string | null;
  bonusToday: number | null;
  permanentTotal: number | null;
  permanentUsed: number | null;
}): AdminUserDTO {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    isAdmin: row.isAdmin,
    createdAt: row.createdAt.toISOString(),
    quota: quotaState(row),
  };
}

export function isUserAdmin(userId: string): boolean {
  const row = db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, userId)).get();
  return row?.isAdmin === true;
}

export function listAdminUsers(): AdminUserDTO[] {
  const rows = db
    .select({
      id: user.id,
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
      checkInDate: userQuota.checkInDate,
      bonusToday: userQuota.bonusToday,
      permanentTotal: userQuota.permanentTotal,
      permanentUsed: userQuota.permanentUsed,
    })
    .from(user)
    .leftJoin(userQuota, eq(user.id, userQuota.userId))
    .orderBy(asc(user.createdAt))
    .all();
  return rows.map(toAdminUserDTO);
}

export async function createAdminManagedUser(input: CreateAdminUserInput): Promise<AdminUserDTO> {
  const username = normalizeAndValidateUsername(input.username);
  if (input.password.length < 8) {
    throw new AppError('BAD_REQUEST', PASSWORD_REQUIREMENTS_MESSAGE, 400, undefined, {
      field: 'password',
    });
  }
  const configuredTotal = input.permanentTotal ?? input.dailyTotal;
  if (configuredTotal !== undefined) {
    assertValidPermanentTotal(configuredTotal);
  }

  const existingUser = db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .get();
  if (existingUser) {
    throw new AppError('BAD_REQUEST', '该用户名已被占用，请换一个。', 400, undefined, {
      field: 'username',
    });
  }

  await auth.api.signUpEmail({
    body: {
      email: internalEmailForUsername(username),
      password: input.password,
      name: username,
      username,
      displayUsername: username,
      rememberMe: false,
    },
  });

  const created = db.select({ id: user.id }).from(user).where(eq(user.username, username)).get();
  if (!created) {
    throw new AppError('INTERNAL', '用户创建后未能读取，请稍后重试。', 500);
  }

  if (configuredTotal !== undefined) {
    setUserPermanentQuota(created.id, configuredTotal);
  }

  return getAdminUser(created.id);
}

export function getAdminUser(userId: string): AdminUserDTO {
  const row = db
    .select({
      id: user.id,
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
      checkInDate: userQuota.checkInDate,
      bonusToday: userQuota.bonusToday,
      permanentTotal: userQuota.permanentTotal,
      permanentUsed: userQuota.permanentUsed,
    })
    .from(user)
    .leftJoin(userQuota, eq(user.id, userQuota.userId))
    .where(eq(user.id, userId))
    .get();

  if (!row) {
    throw new AppError('NOT_FOUND', '用户不存在。', 404, undefined, { userId });
  }
  return toAdminUserDTO(row);
}

export function setUserPermanentQuota(userId: string, permanentTotal: number): AdminUserDTO {
  assertValidPermanentTotal(permanentTotal);
  const exists = db.select({ id: user.id }).from(user).where(eq(user.id, userId)).get();
  if (!exists) {
    throw new AppError('NOT_FOUND', '用户不存在。', 404, undefined, { userId });
  }

  const existingQuota = db
    .select({
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      permanentUsed: userQuota.permanentUsed,
      dailyTotal: userQuota.dailyTotal,
      permanentTotal: userQuota.permanentTotal,
      checkInDate: userQuota.checkInDate,
      bonusToday: userQuota.bonusToday,
    })
    .from(userQuota)
    .where(eq(userQuota.userId, userId))
    .get();
  const today = productDateKey();
  const usedToday = existingQuota?.quotaDate === today ? existingQuota.usedToday : 0;
  const legacyUsageFallback =
    existingQuota?.permanentUsed === null ||
    existingQuota?.permanentUsed === undefined ||
    (existingQuota.permanentUsed === 0 && usedToday > 0 && existingQuota.checkInDate === null);
  const permanentUsed = legacyUsageFallback
    ? Math.max(0, usedToday)
    : Math.max(0, existingQuota?.permanentUsed ?? 0);

  db.insert(userQuota)
    .values({
      userId,
      usedToday,
      quotaDate: today,
      dailyTotal: permanentTotal,
      checkInDate: existingQuota?.checkInDate ?? null,
      bonusToday: existingQuota?.bonusToday ?? 0,
      permanentTotal,
      permanentUsed,
    })
    .onConflictDoUpdate({
      target: userQuota.userId,
      set: {
        usedToday: sql`excluded.used_today`,
        quotaDate: sql`excluded.quota_date`,
        dailyTotal: sql`excluded.daily_total`,
        permanentTotal: sql`excluded.permanent_total`,
        permanentUsed: sql`COALESCE(${userQuota.permanentUsed}, excluded.permanent_used)`,
      },
    })
    .run();

  return getAdminUser(userId);
}

/** @deprecated Kept for older callers while the API transitions to permanentTotal. */
export const setUserDailyQuota = setUserPermanentQuota;

export async function deleteAdminManagedUser(
  targetUserId: string,
  currentAdminId: string,
): Promise<void> {
  const target = db
    .select({ id: user.id, username: user.username, isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, targetUserId))
    .get();
  if (!target) {
    throw new AppError('NOT_FOUND', '用户不存在。', 404, undefined, { userId: targetUserId });
  }
  if (target.id === currentAdminId) {
    throw new AppError('BAD_REQUEST', '不能删除当前管理员账号。', 400, undefined, {
      userId: targetUserId,
    });
  }
  if (target.isAdmin) {
    throw new AppError('BAD_REQUEST', '不能删除受保护的管理员账号。', 400, undefined, {
      userId: targetUserId,
    });
  }

  const context = await auth.$context;
  await context.internalAdapter.deleteUser(targetUserId);
}
