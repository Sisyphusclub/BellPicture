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
    process.env.OPENAI_COMPAT_API_KEY = 'compat-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.IMAGE_MODEL;
    delete process.env.HIGH_RES_IMAGE_API_BASE_URL;
    delete process.env.HIGH_RES_IMAGE_API_KEY;
    delete process.env.HIGH_RES_IMAGE_MODEL;
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
    delete process.env.DAILY_CHECK_IN_REWARD;
    delete process.env.SEED_DEFAULT_ADMIN;
    delete process.env.DEMO_PROMPTS;
    delete process.env.DEMO_PROMPT_CACHE_DELAY_MS;

    const { env } = await import('../../src/config/env.js');

    expect(env.IMAGE_API_BASE_URL).toBe('https://api.example.com');
    expect(env.HIGH_RES_IMAGE_API_BASE_URL).toBeUndefined();
    expect(env.IMAGE_API_KEY).toBe('sk-test');
    expect(env.HIGH_RES_IMAGE_API_KEY).toBeUndefined();
    expect(env.OPENAI_COMPAT_API_KEY).toBe('compat-test');
    expect(env.IMAGE_MODEL).toBe('gpt-image-2');
    expect(env.HIGH_RES_IMAGE_MODEL).toBeUndefined();
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
    expect(env.DAILY_CHECK_IN_REWARD).toBe(5);
    expect(env.SEED_DEFAULT_ADMIN).toBe(false);
    expect(env.DEMO_PROMPTS).toEqual([]);
    expect(env.DEMO_PROMPT_CACHE_DELAY_MS).toBe(4_000);
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
  });

  it('parses configured demo prompts and cache delay', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    process.env.OPENAI_COMPAT_API_KEY = 'compat-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    process.env.DEMO_PROMPTS = '  提示词 A  |||提示词 B|||提示词 A|||';
    process.env.DEMO_PROMPT_CACHE_DELAY_MS = '250';

    const { env } = await import('../../src/config/env.js');

    expect(env.DEMO_PROMPTS).toEqual(['提示词 A', '提示词 B']);
    expect(env.DEMO_PROMPT_CACHE_DELAY_MS).toBe(250);
  });

  it('parses optional high-resolution provider overrides', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.HIGH_RES_IMAGE_API_BASE_URL = 'https://codex.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    process.env.HIGH_RES_IMAGE_API_KEY = 'sk-high-res-test';
    process.env.OPENAI_COMPAT_API_KEY = 'compat-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    process.env.HIGH_RES_IMAGE_MODEL = 'codex-gpt-image-2';

    const { env } = await import('../../src/config/env.js');

    expect(env.HIGH_RES_IMAGE_API_BASE_URL).toBe('https://codex.example.com');
    expect(env.HIGH_RES_IMAGE_API_KEY).toBe('sk-high-res-test');
    expect(env.HIGH_RES_IMAGE_MODEL).toBe('codex-gpt-image-2');
  });

  it('throws on import when IMAGE_API_KEY is missing', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    delete process.env.IMAGE_API_KEY;

    await expect(import('../../src/config/env.js')).rejects.toThrow(/IMAGE_API_KEY/);
  });

  it('throws on import when OPENAI_COMPAT_API_KEY is missing', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    delete process.env.OPENAI_COMPAT_API_KEY;

    await expect(import('../../src/config/env.js')).rejects.toThrow(/OPENAI_COMPAT_API_KEY/);
  });

  it('reads SEED_DEFAULT_ADMIN only when explicitly true', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    process.env.OPENAI_COMPAT_API_KEY = 'compat-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    process.env.SEED_DEFAULT_ADMIN = 'true';

    const { env } = await import('../../src/config/env.js');

    expect(env.SEED_DEFAULT_ADMIN).toBe(true);
  });

  it('rejects invalid SEED_DEFAULT_ADMIN values', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    process.env.OPENAI_COMPAT_API_KEY = 'compat-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    process.env.SEED_DEFAULT_ADMIN = 'yes';

    await expect(import('../../src/config/env.js')).rejects.toThrow(/SEED_DEFAULT_ADMIN/);
  });

  it('rejects negative DEMO_PROMPT_CACHE_DELAY_MS values', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'sk-test';
    process.env.OPENAI_COMPAT_API_KEY = 'compat-test';
    process.env.BETTER_AUTH_SECRET = 'test-secret-padding';
    process.env.DEMO_PROMPT_CACHE_DELAY_MS = '-1';

    await expect(import('../../src/config/env.js')).rejects.toThrow(/DEMO_PROMPT_CACHE_DELAY_MS/);
  });

  it('rejects non-positive integer for IMAGE_API_TIMEOUT_MS', async () => {
    process.env.IMAGE_API_BASE_URL = 'https://api.example.com';
    process.env.IMAGE_API_KEY = 'k';
    process.env.IMAGE_API_TIMEOUT_MS = 'oops';

    await expect(import('../../src/config/env.js')).rejects.toThrow(/IMAGE_API_TIMEOUT_MS/);
  });
});
