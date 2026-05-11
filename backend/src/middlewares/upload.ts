import type { NextFunction, Request, Response } from 'express';
import multer, { type Multer, MulterError } from 'multer';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const UPLOAD_FIELD_NAME = 'image';

const memoryUpload: Multer = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_BYTES,
    files: 1,
  },
});

const singleHandler = memoryUpload.single(UPLOAD_FIELD_NAME);

/**
 * Express middleware accepting a single `image` multipart field, capped at
 * `env.UPLOAD_MAX_BYTES`. Translates multer's library errors into the
 * project's AppError flow so the global errorHandler can shape them.
 */
export function uploadImageMiddleware(req: Request, res: Response, next: NextFunction): void {
  singleHandler(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            'PAYLOAD_TOO_LARGE',
            `Upload exceeds ${env.UPLOAD_MAX_BYTES} bytes`,
            413,
            err,
            { field: err.field },
          ),
        );
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(
          new AppError(
            'BAD_REQUEST',
            `Unexpected upload field: ${err.field ?? '<unknown>'}. Use form field "${UPLOAD_FIELD_NAME}".`,
            400,
            err,
          ),
        );
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new AppError('BAD_REQUEST', 'Only one file allowed per upload', 400, err));
      }
      return next(new AppError('BAD_REQUEST', `Upload rejected: ${err.message}`, 400, err));
    }
    if (err) {
      return next(err);
    }
    if (!req.file) {
      return next(
        new AppError('BAD_REQUEST', `Missing "${UPLOAD_FIELD_NAME}" form field with a file`, 400),
      );
    }
    next();
  });
}
