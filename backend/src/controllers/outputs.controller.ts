import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import { mimeFromExt, readOutput } from '../storage/localStorage.js';

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
    const ext = (filename.split('.').pop() ?? '').toLowerCase();
    let buffer: Buffer;
    try {
      buffer = await readOutput(filename);
    } catch (err) {
      if (err instanceof AppError && err.code === 'STORAGE_ERROR') {
        // readOutput returns STORAGE_ERROR 500 for both invalid filenames
        // and missing files; we've already filtered invalid filenames
        // above, so this branch means "not found on disk".
        throw new AppError('NOT_FOUND', `Output not found: ${filename}`, 404, err, { filename });
      }
      throw err;
    }
    res.status(200);
    res.setHeader('Content-Type', mimeFromExt(ext === 'jpg' ? 'jpeg' : ext));
    res.setHeader('Content-Length', buffer.byteLength.toString());
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.end(buffer);
  } catch (err) {
    next(err);
  }
}
