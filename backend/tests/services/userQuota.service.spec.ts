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

  it('charges only the actual provider output count', () => {
    const pool = createUserQuotaService().forUser(createQuotaUser(4));

    const reservation = pool.reserve(4);
    reservation.commit(1);

    expect(pool.snapshot().remaining).toBe(3);
    expect(() => reservation.release()).toThrowError(expect.objectContaining({ code: 'INTERNAL' }));
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
