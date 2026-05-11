import type { ErrorRequestHandler } from 'express';

import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';

import '../types/express.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        status: err.status,
        cause: err.cause,
        details: err.details,
      },
      err.message,
    );
    const body: {
      error: {
        code: string;
        message: string;
        requestId: string;
        details?: Record<string, unknown>;
      };
    } = {
      error: { code: err.code, message: err.message, requestId },
    };
    if (err.details !== undefined) {
      body.error.details = err.details;
    }
    res.status(err.status).json(body);
    return;
  }

  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error', requestId },
  });
};
