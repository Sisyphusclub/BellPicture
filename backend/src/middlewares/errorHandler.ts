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
    res.status(err.status).json({
      error: { code: err.code, message: err.message, requestId },
    });
    return;
  }

  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error', requestId },
  });
};
