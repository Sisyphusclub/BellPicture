import { eq } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { user, account } from '../../src/db/schema.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';

const fakeProvider: ImageGenerationProvider = {
  generate: vi.fn(async () => ({
    images: [{ outputPath: '/dev/null/never.png', width: 1024, height: 1024 }],
    aspectRatio: '1:1' as const,
  })),
};

function uniqueEmail(): string {
  return `auth-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@test.local`;
}

describe('email/password auth', () => {
  it('POST /api/auth/sign-up/email creates a user and a credential account', async () => {
    const app = createApp({ provider: fakeProvider });
    const email = uniqueEmail();

    const res = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({ email, password: 'password123', name: '测试用户' });

    expect(res.status).toBeLessThan(400);

    const users = db.select().from(user).where(eq(user.email, email)).all();
    expect(users).toHaveLength(1);
    const createdUser = users[0]!;
    expect(createdUser.name).toBe('测试用户');

    const accounts = db.select().from(account).where(eq(account.userId, createdUser.id)).all();
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    const credentialAccount = accounts.find((a) => a.providerId === 'credential');
    expect(credentialAccount).toBeDefined();
    expect(credentialAccount?.password).toBeTruthy();
  });

  it('POST /api/auth/sign-in/email with valid credentials returns a session cookie', async () => {
    const app = createApp({ provider: fakeProvider });
    const email = uniqueEmail();
    const password = 'password123';

    const signUp = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({ email, password, name: '测试登录' });
    expect(signUp.status).toBeLessThan(400);

    const signIn = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Content-Type', 'application/json')
      .send({ email, password });

    expect(signIn.status).toBeLessThan(400);
    const setCookie = signIn.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    expect(cookies.some((c: string) => /session/i.test(c))).toBe(true);
  });

  it('POST /api/auth/sign-up/email with a duplicate email fails', async () => {
    const app = createApp({ provider: fakeProvider });
    const email = uniqueEmail();

    const first = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({ email, password: 'password123', name: '第一次' });
    expect(first.status).toBeLessThan(400);

    const second = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({ email, password: 'password123', name: '重复' });

    expect(second.status).toBeGreaterThanOrEqual(400);
  });
});
