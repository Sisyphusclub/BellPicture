import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { db } from '../../src/db/drizzle.js';
import { user, userQuota } from '../../src/db/schema.js';
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
});
