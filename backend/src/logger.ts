import pino, { type Logger } from 'pino';

import { env } from './config/env.js';

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'ref2image-backend' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'apiKey',
      'IMAGE_API_KEY',
      '*.apiKey',
      '*.IMAGE_API_KEY',
      'env.IMAGE_API_KEY',
    ],
    censor: '[REDACTED]',
  },
});
