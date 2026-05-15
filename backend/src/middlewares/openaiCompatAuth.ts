import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const BEARER_RE = /^Bearer\s+(.+)$/i;

/** Requires Authorization: Bearer <OPENAI_COMPAT_API_KEY> for OpenAI-compatible /v1 routes. */
export function openaiCompatAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.get('authorization');
  if (!header) {
    next(new AppError('UNAUTHORIZED', 'Missing Authorization bearer token', 401));
    return;
  }

  const match = BEARER_RE.exec(header);
  const token = match?.[1]?.trim();
  if (!token) {
    next(new AppError('UNAUTHORIZED', 'Authorization must use Bearer scheme', 401));
    return;
  }

  if (!matchesOpenAICompatToken(token)) {
    next(new AppError('UNAUTHORIZED', 'Invalid Authorization bearer token', 401));
    return;
  }

  next();
}

function matchesOpenAICompatToken(token: string): boolean {
  const expected = env.OPENAI_COMPAT_API_KEY;
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return (
    tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer)
  );
}
