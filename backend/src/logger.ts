import pino, { type Logger } from 'pino';

import { env } from './config/env.js';

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'ref2image-backend' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'apiKey',
      'IMAGE_API_KEY',
      'GOOGLE_CLIENT_SECRET',
      'BETTER_AUTH_SECRET',
      '*.apiKey',
      '*.IMAGE_API_KEY',
      '*.GOOGLE_CLIENT_SECRET',
      '*.BETTER_AUTH_SECRET',
      'env.IMAGE_API_KEY',
      'env.GOOGLE_CLIENT_SECRET',
      'env.BETTER_AUTH_SECRET',
    ],
    censor: '[REDACTED]',
  },
});
