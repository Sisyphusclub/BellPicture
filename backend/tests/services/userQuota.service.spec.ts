import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { db } from '../../src/db/drizzle.js';
import { quotaGrants, user, userQuota } from '../../src/db/schema.js';
import { createUserQuotaService } from '../../src/services/userQuota.service.js';
import { productDateKey } from '../../src/utils/date.js';

function createQuotaUser(dailyTotal: number): string {
  const userId = `quota-${randomUUID()}`;
  const now = new Date();
  db.insert(user)
    .values({
      id: userId,
      name: userId,
      email: `${userId}@test.local`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(userQuota)
    .values({ userId, usedToday: 0, quotaDate: productDateKey(), dailyTotal })
    .run();
  return userId;
}

function createUserWithoutQuota(): string {
  const userId = `quota-unassigned-${randomUUID()}`;
  const now = new Date();
  db.insert(user)
    .values({
      id: userId,
      name: userId,
      email: `${userId}@test.local`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return userId;
}

describe('user quota reservations', () => {
  afterEach(() => vi.useRealTimers());

  it('atomically blocks a second reservation when only one credit remains', () => {
    const pool = createUserQuotaService().forUser(createQuotaUser(1));

    const first = pool.reserve(1);
    expect(() => pool.reserve(1)).toThrowError(
      expect.objectContaining({ code: 'QUOTA_EXHAUSTED' }),
    );

    first.release();
    expect(pool.snapshot().remaining).toBe(1);
  });

  it('reports zero quota for a user without an assigned quota row', () => {
    const pool = createUserQuotaService().forUser(createUserWithoutQuota());

    expect(pool.snapshot()).toMatchObject({
      total: 0,
      remaining: 0,
    });
  });

  it('charges only the actual provider output count', () => {
    const pool = createUserQuotaService().forUser(createQuotaUser(4));

    const reservation = pool.reserve(4);
    expect(pool.snapshot().remaining).toBe(0);
    reservation.commit(1);

    expect(pool.snapshot().remaining).toBe(3);
    expect(() => reservation.release()).toThrowError(expect.objectContaining({ code: 'INTERNAL' }));
  });

  it('does not persist an uncommitted reservation across a service restart', () => {
    const userId = createQuotaUser(1);
    const pool = createUserQuotaService().forUser(userId);

    pool.reserve(1);

    expect(pool.snapshot().remaining).toBe(0);
    expect(createUserQuotaService().forUser(userId).snapshot().remaining).toBe(1);
    expect(db.select().from(userQuota).where(eq(userQuota.userId, userId)).get()?.usedToday).toBe(
      0,
    );
  });

  it('keeps check-in credits unavailable to permanent-only reservations', () => {
    const pool = createUserQuotaService().forUser(createQuotaUser(1));
    expect(pool.checkIn()).toMatchObject({ claimed: true, remaining: 6 });

    pool.reserve(1, { scope: 'permanent' }).commit(1);
    expect(pool.snapshot().remaining).toBe(5);
    expect(() => pool.reserve(1, { scope: 'permanent' })).toThrowError(
      expect.objectContaining({
        code: 'QUOTA_EXHAUSTED',
        details: expect.objectContaining({ remaining: 0, quotaScope: 'permanent' }),
      }),
    );

    pool.reserve(1).commit(1);
    expect(pool.snapshot().remaining).toBe(4);
  });

  it('keeps permanent credits after the product date changes', () => {
    const userId = createQuotaUser(4);
    db.update(userQuota)
      .set({ permanentTotal: 4, permanentUsed: 2, quotaDate: '2000-01-01', usedToday: 2 })
      .where(eq(userQuota.userId, userId))
      .run();
    vi.setSystemTime(new Date('2030-01-02T00:00:00.000Z'));
    expect(createUserQuotaService().forUser(userId).snapshot().remaining).toBe(2);
  });

  it('accumulates check-in grants and expires each batch independently', () => {
    const userId = createQuotaUser(0);
    const first = new Date('2030-01-01T01:00:00.000Z');
    const second = new Date('2030-01-02T01:00:00.000Z');
    db.insert(quotaGrants)
      .values([
        {
          id: randomUUID(),
          userId,
          source: 'check_in',
          amount: 5,
          remaining: 5,
          grantedAt: first,
          expiresAt: new Date(first.getTime() + 7 * 24 * 60 * 60 * 1000),
          checkInDate: '2030-01-01',
        },
        {
          id: randomUUID(),
          userId,
          source: 'check_in',
          amount: 5,
          remaining: 5,
          grantedAt: second,
          expiresAt: new Date(second.getTime() + 7 * 24 * 60 * 60 * 1000),
          checkInDate: '2030-01-02',
        },
      ])
      .run();
    vi.setSystemTime(new Date('2030-01-08T01:00:00.000Z'));
    expect(createUserQuotaService().forUser(userId).snapshot().remaining).toBe(5);
  });
});
