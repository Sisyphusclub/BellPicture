import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { user, userQuota } from '../../src/db/schema.js';
import { AppError } from '../../src/errors/AppError.js';
import { isUserAdmin } from '../../src/services/adminUser.service.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { productDateKey } from '../../src/utils/date.js';

const fakeProvider: ImageGenerationProvider = {
  generate: vi.fn(async () => ({
    images: [{ outputPath: '/dev/null/never.png', width: 1024, height: 1024 }],
    aspectRatio: '1:1' as const,
  })),
};

function createDbUser(input: { username: string; isAdmin?: boolean }): string {
  const now = new Date();
  const id = `user-${randomUUID()}`;
  db.insert(user)
    .values({
      id,
      name: input.username,
      email: `${input.username}-${randomUUID()}@test.local`,
      emailVerified: false,
      username: input.username,
      displayUsername: input.username,
      isAdmin: input.isAdmin ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function createAdminUser(): string {
  return createDbUser({ username: `admin_${randomUUID().slice(0, 8)}`, isAdmin: true });
}

function stubAuth(userId: string): RequestHandler {
  return (req, _res, next) => {
    req.user = { id: userId, email: `${userId}@test.local` };
    next();
  };
}

function allowAdmin(): RequestHandler {
  return (req, _res, next) => {
    req.user = { ...req.user!, isAdmin: true };
    next();
  };
}

describe('/api/admin/users', () => {
  it('does not grant admin access based on the blur username', async () => {
    db.delete(user).where(eq(user.username, 'blur')).run();
    const blurId = createDbUser({ username: 'blur', isAdmin: false });

    try {
      const app = createApp({ provider: fakeProvider, authMiddleware: stubAuth(blurId) });

      expect(isUserAdmin(blurId)).toBe(false);
      const res = await request(app).get('/api/admin/users');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      const blur = db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, blurId)).get();
      expect(blur?.isAdmin).toBe(false);
    } finally {
      db.delete(user).where(eq(user.id, blurId)).run();
    }
  });

  it('returns 403 for ordinary users calling admin APIs directly', async () => {
    const ordinaryId = createDbUser({ username: `ordinary_${randomUUID().slice(0, 8)}` });
    const app = createApp({ provider: fakeProvider, authMiddleware: stubAuth(ordinaryId) });

    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lists users with admin flag and effective quota state', async () => {
    const adminId = createAdminUser();
    const memberId = createDbUser({ username: `member_${randomUUID().slice(0, 8)}` });
    db.insert(userQuota)
      .values({ userId: memberId, usedToday: 3, quotaDate: productDateKey(), dailyTotal: 7 })
      .run();
    const app = createApp({ provider: fakeProvider, authMiddleware: stubAuth(adminId) });

    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(200);
    const member = res.body.users.find((u: { id: string }) => u.id === memberId);
    expect(member).toMatchObject({
      id: memberId,
      username: expect.stringContaining('member_'),
      isAdmin: false,
      quota: { total: 7, usedToday: 3, remainingToday: 4 },
    });
    const admin = res.body.users.find((u: { id: string }) => u.id === adminId);
    expect(admin).toMatchObject({ id: adminId, isAdmin: true });
  });

  it('creates a username/password user and rejects duplicates', async () => {
    const adminId = createAdminUser();
    const app = createApp({ provider: fakeProvider, authMiddleware: stubAuth(adminId) });
    const username = `created_${randomUUID().slice(0, 8)}`;

    const created = await request(app)
      .post('/api/admin/users')
      .send({ username: username.toUpperCase(), password: 'password123', dailyTotal: 5 });

    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ username, isAdmin: false });
    expect(created.body.user.quota).toMatchObject({ total: 5, usedToday: 0, remainingToday: 5 });

    const duplicate = await request(app)
      .post('/api/admin/users')
      .send({ username, password: 'password123' });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error.message).toBe('该用户名已被占用，请换一个。');
  });

  it('deletes a non-admin user and prevents deleting the current admin account', async () => {
    const adminId = createAdminUser();
    const memberId = createDbUser({ username: `delete_${randomUUID().slice(0, 8)}` });
    const app = createApp({ provider: fakeProvider, authMiddleware: stubAuth(adminId) });

    const selfDelete = await request(app).delete(`/api/admin/users/${adminId}`);
    expect(selfDelete.status).toBe(400);
    expect(selfDelete.body.error.message).toBe('不能删除当前管理员账号。');

    const deleted = await request(app).delete(`/api/admin/users/${memberId}`);
    expect(deleted.status).toBe(204);
    expect(db.select().from(user).where(eq(user.id, memberId)).all()).toHaveLength(0);
  });

  it('updates daily total quota and image quota uses the override', async () => {
    const adminId = createAdminUser();
    const memberId = createDbUser({ username: `quota_${randomUUID().slice(0, 8)}` });
    const adminApp = createApp({ provider: fakeProvider, authMiddleware: stubAuth(adminId) });

    const updated = await request(adminApp)
      .patch(`/api/admin/users/${memberId}/quota`)
      .send({ dailyTotal: 3 });
    expect(updated.status).toBe(200);
    expect(updated.body.user.quota).toMatchObject({ total: 3, usedToday: 0, remainingToday: 3 });

    db.update(userQuota)
      .set({ usedToday: 2, quotaDate: productDateKey() })
      .where(eq(userQuota.userId, memberId))
      .run();
    const memberApp = createApp({ provider: fakeProvider, authMiddleware: stubAuth(memberId), adminMiddleware: allowAdmin() });
    const quota = await request(memberApp).get('/api/images/quota');

    expect(quota.status).toBe(200);
    expect(quota.body).toEqual({
      total: 3,
      remaining: 1,
      checkedInToday: false,
      dailyCheckInReward: 5,
    });
  });

  it('returns 401 before admin authorization when auth is missing', async () => {
    const denyAuth: RequestHandler = (_req, _res, next) => {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    };
    const app = createApp({ provider: fakeProvider, authMiddleware: denyAuth });

    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
