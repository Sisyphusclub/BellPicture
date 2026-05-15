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
      'openaiCompatApiKey',
      'IMAGE_API_KEY',
      'OPENAI_COMPAT_API_KEY',
      'GOOGLE_CLIENT_SECRET',
      'BETTER_AUTH_SECRET',
      '*.apiKey',
      '*.openaiCompatApiKey',
      '*.IMAGE_API_KEY',
      '*.OPENAI_COMPAT_API_KEY',
      '*.GOOGLE_CLIENT_SECRET',
      '*.BETTER_AUTH_SECRET',
      'env.IMAGE_API_KEY',
      'env.OPENAI_COMPAT_API_KEY',
      'env.GOOGLE_CLIENT_SECRET',
      'env.BETTER_AUTH_SECRET',
    ],
    censor: '[REDACTED]',
  },
});
