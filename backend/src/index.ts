import process from 'node:process';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/drizzle.js';
import { logger } from './logger.js';
import { seedDefaultAdminIfEnabled } from './services/defaultAdminSeed.service.js';
import { TwoApiImageProvider } from './services/providers/TwoApiImageProvider.js';

runMigrations();
await seedDefaultAdminIfEnabled();

const provider = new TwoApiImageProvider({
  baseUrl: env.IMAGE_API_BASE_URL,
  ...(env.HIGH_RES_IMAGE_API_BASE_URL !== undefined
    ? { highResBaseUrl: env.HIGH_RES_IMAGE_API_BASE_URL }
    : {}),
  apiKey: env.IMAGE_API_KEY,
  defaultModel: env.IMAGE_MODEL,
  ...(env.HIGH_RES_IMAGE_MODEL !== undefined ? { highResModel: env.HIGH_RES_IMAGE_MODEL } : {}),
  timeoutMs: env.IMAGE_API_TIMEOUT_MS,
});

const app = createApp({ provider });

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server: listening');
});

function shutdown(sig: string): void {
  logger.info({ sig }, 'shutdown: closing server');
  server.close((err) => {
    if (err) {
      logger.error({ sig, err }, 'shutdown: error while closing server');
      process.exit(1);
      return;
    }
    logger.info({ sig }, 'shutdown: server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn({ sig }, 'shutdown: force-exit after timeout');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
