import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('exports a typed env with defaults applied for optional vars', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.IMAGE_MODEL;
    delete process.env.PORT;
    delete process.env.IMAGE_API_TIMEOUT_MS;
    delete process.env.GPT_POOL_QUOTA;
    delete process.env.UPLOAD_DIR;
    delete process.env.OUTPUT_DIR;
    delete process.env.LOG_LEVEL;
    delete process.env.CORS_ORIGIN;
    delete process.env.BETTER_AUTH_URL;
    delete process.env.FRONTEND_ORIGIN;
    delete process.env.SQLITE_PATH;
    delete process.env.DAILY_USER_QUOTA;

    const { env } = await import('../../src/config/env.js');

    expect(env.IMAGE_API_BASE_URL).toBe('https://api.example.com');
    expect(env.IMAGE_API_KEY).toBe('sk-test');
    expect(env.IMAGE_MODEL).toBe('gpt-image-2');
    expect(env.PORT).toBe(3000);
    expect(env.IMAGE_API_TIMEOUT_MS).toBe(120_000);
    expect(env.GPT_POOL_QUOTA).toBe(100);
    expect(env.UPLOAD_DIR).toBe('./tmp/uploads');
    expect(env.OUTPUT_DIR).toBe('./tmp/outputs');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3000');
    expect(env.FRONTEND_ORIGIN).toBe('http://localhost:5173');
    expect(env.SQLITE_PATH).toBe('./data/app.sqlite');
    expect(env.DAILY_USER_QUOTA).toBe(20);
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it('throws on import when IMAGE_API_KEY is missing', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    delete process.env.IMAGE_API_KEY;

    await expect(import('../../src/config/env.js')).rejects.toThrow(/IMAGE_API_KEY/);
  });

  it('rejects non-positive integer for IMAGE_API_TIMEOUT_MS', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'k';
    process.env.IMAGE_API_TIMEOUT_MS = 'oops';

    await expect(import('../../src/config/env.js')).rejects.toThrow(/IMAGE_API_TIMEOUT_MS/);
  });
});
