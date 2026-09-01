import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { AppError } from '../errors/AppError.js';

const ONE_MINUTE_MS = 60_000;
const FIFTEEN_MINUTES_MS = 15 * ONE_MINUTE_MS;

export interface AppRateLimiters {
  auth: RequestHandler;
  signUp: RequestHandler;
  upload: RequestHandler;
  generation: RequestHandler;
  openAICompat: RequestHandler;
}

export function createAppRateLimiters(): AppRateLimiters {
  return {
    auth: createLimiter({ windowMs: FIFTEEN_MINUTES_MS, limit: 20 }),
    signUp: createLimiter({ windowMs: FIFTEEN_MINUTES_MS, limit: 5 }),
    upload: createLimiter({ windowMs: ONE_MINUTE_MS, limit: 30, preferUserId: true }),
    generation: createLimiter({ windowMs: ONE_MINUTE_MS, limit: 10, preferUserId: true }),
    openAICompat: createLimiter({ windowMs: ONE_MINUTE_MS, limit: 30 }),
  };
}

function createLimiter(input: {
  windowMs: number;
  limit: number;
  preferUserId?: boolean;
}): RequestHandler {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (input.preferUserId === true && req.user?.id) return `user:${req.user.id}`;
      return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown');
    },
    handler: (_req, _res, next) => {
      next(new AppError('RATE_LIMITED', '请求过于频繁，请稍后重试。', 429));
    },
  });
}
