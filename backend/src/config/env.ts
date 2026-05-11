import process from 'node:process';

export interface Env {
  PORT: number;
  IMAGE_API_BASE_URL: string;
  IMAGE_API_KEY: string;
  IMAGE_MODEL: string;
  IMAGE_API_TIMEOUT_MS: number;
  UPLOAD_DIR: string;
  OUTPUT_DIR: string;
  LOG_LEVEL: string;
  CORS_ORIGIN: string;
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

function loadEnv(): Env {
  return {
    PORT: readInt('PORT', 3000),
    IMAGE_API_BASE_URL: readString('IMAGE_API_BASE_URL'),
    IMAGE_API_KEY: readString('IMAGE_API_KEY'),
    IMAGE_MODEL: readString('IMAGE_MODEL', 'gpt-image-2'),
    IMAGE_API_TIMEOUT_MS: readInt('IMAGE_API_TIMEOUT_MS', 120_000),
    UPLOAD_DIR: readString('UPLOAD_DIR', './tmp/uploads'),
    OUTPUT_DIR: readString('OUTPUT_DIR', './tmp/outputs'),
    LOG_LEVEL: readString('LOG_LEVEL', 'info'),
    CORS_ORIGIN: readString('CORS_ORIGIN', 'http://localhost:5173'),
  };
}

export const env: Env = loadEnv();
