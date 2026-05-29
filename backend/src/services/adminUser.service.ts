import { asc, eq, sql } from 'drizzle-orm';

import { auth } from '../config/auth.js';
import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { user, userQuota } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';
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
  };
}

export interface CreateAdminUserInput {
  username: string;
  password: string;
  dailyTotal?: number;
}

export interface UpdateUserQuotaInput {
  dailyTotal: number;
}

interface EffectiveQuotaState {
  total: number;
  usedToday: number;
  remainingToday: number;
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

function assertValidDailyTotal(dailyTotal: number): void {
  if (!Number.isInteger(dailyTotal) || dailyTotal < 0 || dailyTotal > 10_000) {
    throw new AppError('BAD_REQUEST', '每日额度需为 0 到 10000 之间的整数。', 400, undefined, {
      field: 'dailyTotal',
    });
  }
}

function quotaState(row: { usedToday: number | null; quotaDate: string | null; dailyTotal: number | null }): EffectiveQuotaState {
  const total = row.dailyTotal ?? env.DAILY_USER_QUOTA;
  const usedToday = row.quotaDate === todayISO() ? (row.usedToday ?? 0) : 0;
  return {
    total,
    usedToday,
    remainingToday: Math.max(0, total - usedToday),
  };
}

function toAdminUserDTO(row: {
  id: string;
  username: string | null;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  usedToday: number | null;
  quotaDate: string | null;
  dailyTotal: number | null;
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
  const row = db
    .select({ isAdmin: user.isAdmin })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  return row?.isAdmin === true;
}

export function listAdminUsers(): AdminUserDTO[] {
  const rows = db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
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
  if (input.dailyTotal !== undefined) {
    assertValidDailyTotal(input.dailyTotal);
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

  const created = db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .get();
  if (!created) {
    throw new AppError('INTERNAL', '用户创建后未能读取，请稍后重试。', 500);
  }

  if (input.dailyTotal !== undefined) {
    setUserDailyQuota(created.id, input.dailyTotal);
  }

  return getAdminUser(created.id);
}

export function getAdminUser(userId: string): AdminUserDTO {
  const row = db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      usedToday: userQuota.usedToday,
      quotaDate: userQuota.quotaDate,
      dailyTotal: userQuota.dailyTotal,
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

export function setUserDailyQuota(userId: string, dailyTotal: number): AdminUserDTO {
  assertValidDailyTotal(dailyTotal);
  const exists = db.select({ id: user.id }).from(user).where(eq(user.id, userId)).get();
  if (!exists) {
    throw new AppError('NOT_FOUND', '用户不存在。', 404, undefined, { userId });
  }

  const existingQuota = db
    .select({ usedToday: userQuota.usedToday, quotaDate: userQuota.quotaDate })
    .from(userQuota)
    .where(eq(userQuota.userId, userId))
    .get();
  const today = todayISO();
  const usedToday = existingQuota?.quotaDate === today ? existingQuota.usedToday : 0;

  db.insert(userQuota)
    .values({ userId, usedToday, quotaDate: today, dailyTotal })
    .onConflictDoUpdate({
      target: userQuota.userId,
      set: {
        usedToday: sql`excluded.used_today`,
        quotaDate: sql`excluded.quota_date`,
        dailyTotal: sql`excluded.daily_total`,
      },
    })
    .run();

  return getAdminUser(userId);
}

export async function deleteAdminManagedUser(targetUserId: string, currentAdminId: string): Promise<void> {
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
