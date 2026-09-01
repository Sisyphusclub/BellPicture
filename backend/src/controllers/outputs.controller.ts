import { pipeline } from 'node:stream/promises';

import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { findImageRecordAccess } from '../services/history.service.js';
import { isValidSignedOutputRequest } from '../services/outputAccess.service.js';
import { createOutputReadStream, mimeFromExt, statOutput } from '../storage/localStorage.js';

const OUTPUT_FILENAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpeg|webp)$/i;

export async function getOutput(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filename = req.params['filename'] ?? '';
    if (!OUTPUT_FILENAME_RE.test(filename)) {
      throw new AppError(
        'BAD_REQUEST',
        'Filename must be `<uuid>.<png|jpeg|webp>`',
        400,
        undefined,
        { filename },
      );
    }
    authorizeOutput(req, filename);
    const ext = (filename.split('.').pop() ?? '').toLowerCase();
    let size: number;
    try {
      size = (await statOutput(filename)).size;
    } catch (err) {
      if (
        err instanceof AppError &&
        err.code === 'STORAGE_ERROR' &&
        isNodeErrorCode(err.cause, 'ENOENT')
      ) {
        throw new AppError('NOT_FOUND', `Output not found: ${filename}`, 404, err, { filename });
      }
      throw err;
    }
    res.status(200);
    res.setHeader('Content-Type', mimeFromExt(ext === 'jpg' ? 'jpeg' : ext));
    res.setHeader('Content-Length', size.toString());
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    const controller = new AbortController();
    const abortOnClose = (): void => {
      if (!res.writableEnded) controller.abort();
    };
    res.once('close', abortOnClose);
    try {
      await pipeline(createOutputReadStream(filename), res, { signal: controller.signal });
    } finally {
      res.off('close', abortOnClose);
    }
  } catch (err) {
    if (!res.destroyed && !res.headersSent) next(err);
  }
}

function authorizeOutput(req: Request, filename: string): void {
  const access = findImageRecordAccess(filename);
  if (access?.isPublic === true) return;
  if (access !== null && (req.user?.id === access.userId || req.user?.isAdmin === true)) return;
  if (
    isValidSignedOutputRequest({
      filename,
      expires: req.query['expires'],
      signature: req.query['signature'],
    })
  ) {
    return;
  }
  throw new AppError('NOT_FOUND', `Output not found: ${filename}`, 404);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
