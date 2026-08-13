import process from 'node:process';

export interface Env {
  PORT: number;
  IMAGE_API_BASE_URL: string;
  HIGH_RES_IMAGE_API_BASE_URL: string | undefined;
  IMAGE_API_KEY: string;
  HIGH_RES_IMAGE_API_KEY: string | undefined;
  OPENAI_COMPAT_API_KEY: string;
  IMAGE_MODEL: string;
  HIGH_RES_IMAGE_MODEL: string | undefined;
  IMAGE_API_TIMEOUT_MS: number;
  GPT_POOL_QUOTA: number;
  UPLOAD_DIR: string;
  UPLOAD_MAX_BYTES: number;
  OUTPUT_DIR: string;
  LOG_LEVEL: string;
  CORS_ORIGIN: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: string | undefined;
  FRONTEND_ORIGIN: string;
  SQLITE_PATH: string;
  DAILY_USER_QUOTA: number;
  DAILY_CHECK_IN_REWARD: number;
  SEED_DEFAULT_ADMIN: boolean;
  DEMO_PROMPTS: string[];
  DEMO_PROMPT_CACHE_DELAY_MS: number;
}

function readString(name: string, fallback?: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    if (fallback === undefined) {
      throw new Error(
        `Missing required environment variable: ${name}. ` +
          `Copy backend/.env.example to backend/.env and fill in the value.`,
      );
    }
    return fallback;
  }
  return raw;
}

function readOptionalString(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return undefined;
  return raw;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(
      `Environment variable ${name} must be a positive integer, got: ${JSON.stringify(raw)}`,
    );
  }
  return n;
}

function readNonNegativeInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `Environment variable ${name} must be a non-negative integer, got: ${JSON.stringify(raw)}`,
    );
  }
  return n;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(
    `Environment variable ${name} must be either "true" or "false", got: ${JSON.stringify(raw)}`,
  );
}

function readDelimitedStrings(name: string, delimiter: string): string[] {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return [];
  return Array.from(
    new Set(
      raw
        .split(delimiter)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function loadEnv(): Env {
  return {
    PORT: readInt('PORT', 3000),
    IMAGE_API_BASE_URL: readString('IMAGE_API_BASE_URL'),
    HIGH_RES_IMAGE_API_BASE_URL: readOptionalString('HIGH_RES_IMAGE_API_BASE_URL'),
    IMAGE_API_KEY: readString('IMAGE_API_KEY'),
    HIGH_RES_IMAGE_API_KEY: readOptionalString('HIGH_RES_IMAGE_API_KEY'),
    OPENAI_COMPAT_API_KEY: readString('OPENAI_COMPAT_API_KEY'),
    IMAGE_MODEL: readString('IMAGE_MODEL', 'gpt-image-2'),
    HIGH_RES_IMAGE_MODEL: readOptionalString('HIGH_RES_IMAGE_MODEL'),
    IMAGE_API_TIMEOUT_MS: readInt('IMAGE_API_TIMEOUT_MS', 120_000),
    GPT_POOL_QUOTA: readInt('GPT_POOL_QUOTA', 100),
    UPLOAD_DIR: readString('UPLOAD_DIR', './tmp/uploads'),
    UPLOAD_MAX_BYTES: readInt('UPLOAD_MAX_BYTES', 10_485_760),
    OUTPUT_DIR: readString('OUTPUT_DIR', './tmp/outputs'),
    LOG_LEVEL: readString('LOG_LEVEL', 'info'),
    CORS_ORIGIN: readString('CORS_ORIGIN', 'http://localhost:5173'),
    BETTER_AUTH_URL: readString('BETTER_AUTH_URL', 'http://localhost:3000'),
    BETTER_AUTH_SECRET: readString('BETTER_AUTH_SECRET'),
    GOOGLE_CLIENT_ID: readOptionalString('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: readOptionalString('GOOGLE_CLIENT_SECRET'),
    FRONTEND_ORIGIN: readString('FRONTEND_ORIGIN', 'http://localhost:5173'),
    SQLITE_PATH: readString('SQLITE_PATH', './data/app.sqlite'),
    DAILY_USER_QUOTA: readInt('DAILY_USER_QUOTA', 20),
    DAILY_CHECK_IN_REWARD: readInt('DAILY_CHECK_IN_REWARD', 5),
    SEED_DEFAULT_ADMIN: readBool('SEED_DEFAULT_ADMIN', false),
    DEMO_PROMPTS: readDelimitedStrings('DEMO_PROMPTS', '|||'),
    DEMO_PROMPT_CACHE_DELAY_MS: readNonNegativeInt('DEMO_PROMPT_CACHE_DELAY_MS', 4_000),
  };
}

export const env: Env = loadEnv();
