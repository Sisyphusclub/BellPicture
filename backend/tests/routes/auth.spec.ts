import { eq } from 'drizzle-orm';
import request, { type Response } from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { db } from '../../src/db/drizzle.js';
import { account, user } from '../../src/db/schema.js';
import { seedDefaultAdminIfEnabled } from '../../src/services/defaultAdminSeed.service.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { internalEmailForUsername } from '../../src/utils/username.js';

const fakeProvider: ImageGenerationProvider = {
  generate: vi.fn(async () => ({
    images: [{ outputPath: '/dev/null/never.png', width: 1024, height: 1024 }],
    aspectRatio: '1:1' as const,
  })),
};

function uniqueUsername(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function cookiesFrom(response: Response): string[] {
  const setCookie = response.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
}

describe('username/password auth', () => {
  it('GET /api/auth/providers reports optional social providers without secrets', async () => {
    const app = createApp({ provider: fakeProvider });

    const res = await request(app).get('/api/auth/providers');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ providers: { google: false } });
    expect(JSON.stringify(res.body)).not.toContain('GOOGLE_CLIENT_SECRET');
  });

  it('POST /api/auth/sign-up/username creates a user and a credential account', async () => {
    const app = createApp({ provider: fakeProvider });
    const rawUsername = `User_${uniqueUsername('signup')}`;
    const username = rawUsername.toLowerCase();
    const password = 'password123';

    const res = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username: rawUsername, password });

    expect(res.status).toBeLessThan(400);
    expect(cookiesFrom(res).some((c) => /session/i.test(c))).toBe(true);

    const users = db.select().from(user).where(eq(user.username, username)).all();
    expect(users).toHaveLength(1);
    const createdUser = users[0]!;
    expect(createdUser.name).toBe(username);
    expect(createdUser.email).toBe(internalEmailForUsername(username));

    const accounts = db.select().from(account).where(eq(account.userId, createdUser.id)).all();
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    const credentialAccount = accounts.find((a) => a.providerId === 'credential');
    expect(credentialAccount).toBeDefined();
    expect(credentialAccount?.password).toBeTruthy();
    expect(credentialAccount?.password).not.toBe(password);
  });

  it('keeps a self-registered blur user as a non-admin account', async () => {
    const app = createApp({ provider: fakeProvider });
    db.delete(user).where(eq(user.username, 'blur')).run();

    const signUp = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username: 'Blur', password: 'password123' });

    expect(signUp.status).toBeLessThan(400);
    const cookie = cookiesFrom(signUp);
    expect(cookie.some((c) => /session/i.test(c))).toBe(true);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({
      username: 'blur',
      isAdmin: false,
    });

    const admin = await request(app).get('/api/admin/users').set('Cookie', cookie);
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe('FORBIDDEN');

    const blur = db
      .select({ isAdmin: user.isAdmin })
      .from(user)
      .where(eq(user.username, 'blur'))
      .get();
    expect(blur?.isAdmin).toBe(false);
  });

  it('POST /api/auth/sign-in/username with valid credentials returns a session cookie', async () => {
    const app = createApp({ provider: fakeProvider });
    const username = uniqueUsername('login');
    const password = 'password123';

    const signUp = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username, password });
    expect(signUp.status).toBeLessThan(400);

    const signIn = await request(app)
      .post('/api/auth/sign-in/username')
      .set('Content-Type', 'application/json')
      .send({ username: username.toUpperCase(), password });

    expect(signIn.status).toBeLessThan(400);
    expect(cookiesFrom(signIn).some((c) => /session/i.test(c))).toBe(true);
  });

  it('POST /api/auth/sign-up/username rejects duplicate usernames with Chinese copy', async () => {
    const app = createApp({ provider: fakeProvider });
    const username = uniqueUsername('duplicate');

    const first = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username, password: 'password123' });
    expect(first.status).toBeLessThan(400);

    const second = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username: username.toUpperCase(), password: 'password123' });

    expect(second.status).toBe(400);
    expect(second.body).toMatchObject({
      error: { code: 'BAD_REQUEST', message: '该用户名已被占用，请换一个。' },
    });
  });

  it('POST /api/auth/sign-up/username rejects usernames outside the normalized rule', async () => {
    const app = createApp({ provider: fakeProvider });

    const res = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username: 'bad-name!', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: '用户名需为 3-32 位小写字母、数字或下划线。',
      },
    });
  });

  it('POST /api/auth/sign-up/username rejects short passwords with Chinese copy', async () => {
    const app = createApp({ provider: fakeProvider });

    const res = await request(app)
      .post('/api/auth/sign-up/username')
      .set('Content-Type', 'application/json')
      .send({ username: uniqueUsername('shortpass'), password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: '密码至少需要 8 个字符。',
      },
    });
  });

  it('rejects public email/password auth routes with Chinese copy', async () => {
    const app = createApp({ provider: fakeProvider });

    const signUp = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({ email: 'user@example.com', password: 'password123', name: 'user' });
    const signIn = await request(app)
      .post('/api/auth/sign-in/email')
      .set('Content-Type', 'application/json')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(signUp.status).toBe(400);
    expect(signUp.body).toMatchObject({
      error: { code: 'BAD_REQUEST', message: '请使用用户名和密码登录或注册。' },
    });
    expect(signIn.status).toBe(400);
    expect(signIn.body).toMatchObject({
      error: { code: 'BAD_REQUEST', message: '请使用用户名和密码登录或注册。' },
    });
  });

  it('seeds admin/admin123 only when the explicit gate is enabled', async () => {
    const app = createApp({ provider: fakeProvider });
    db.delete(user).where(eq(user.username, 'admin')).run();

    const disabled = await seedDefaultAdminIfEnabled(false);
    expect(disabled).toMatchObject({ created: false, reason: 'disabled', username: 'admin' });
    expect(db.select().from(user).where(eq(user.username, 'admin')).all()).toHaveLength(0);

    const enabled = await seedDefaultAdminIfEnabled(true);
    expect(enabled).toMatchObject({ created: true, reason: 'created', username: 'admin' });

    const adminUsers = db.select().from(user).where(eq(user.username, 'admin')).all();
    expect(adminUsers).toHaveLength(1);
    const adminUser = adminUsers[0]!;
    expect(adminUser.isAdmin).toBe(true);
    const adminAccounts = db.select().from(account).where(eq(account.userId, adminUser.id)).all();
    const credentialAccount = adminAccounts.find((a) => a.providerId === 'credential');
    expect(credentialAccount?.password).toBeTruthy();
    expect(credentialAccount?.password).not.toBe('admin123');

    const signIn = await request(app)
      .post('/api/auth/sign-in/username')
      .set('Content-Type', 'application/json')
      .send({ username: 'admin', password: 'admin123' });

    expect(signIn.status).toBeLessThan(400);
    expect(cookiesFrom(signIn).some((c) => /session/i.test(c))).toBe(true);

    const secondSeed = await seedDefaultAdminIfEnabled(true);
    expect(secondSeed).toMatchObject({ created: false, reason: 'exists', username: 'admin' });
  });
});
