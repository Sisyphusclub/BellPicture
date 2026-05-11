import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { logger } from '../logger.js';

import '../types/express.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  const start = Date.now();

  logger.info(
    { requestId: req.requestId, method: req.method, path: req.path, ip: req.ip },
    'request: inbound',
  );

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info(
      { requestId: req.requestId, status: res.statusCode, durationMs },
      'request: outbound',
    );
  });

  next();
}
