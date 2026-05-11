import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function normalizeExt(ext: string): string {
  const clean = ext.toLowerCase().replace(/^\./, '');
  if (!ALLOWED_EXTS.has(clean)) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      `Unsupported file extension: ${ext}`,
      415,
      undefined,
      { ext },
    );
  }
  return clean === 'jpg' ? 'jpeg' : clean;
}

function assertWithinRoot(absPath: string, root: string): void {
  const normalizedRoot = path.resolve(root);
  const normalizedPath = path.resolve(absPath);
  const rel = path.relative(normalizedRoot, normalizedPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new AppError('STORAGE_ERROR', 'Path traversal attempt detected', 500, undefined, {
      absPath,
      root: normalizedRoot,
    });
  }
}

export interface SavedFile {
  id: string;
  ext: string;
  /** Filename relative to OUTPUT_DIR (`<uuid>.<ext>`). */
  filename: string;
  /** Absolute filesystem path. */
  absolutePath: string;
}

export async function saveOutput(buffer: Buffer, ext: string): Promise<SavedFile> {
  const cleanExt = normalizeExt(ext);
  const root = path.resolve(env.OUTPUT_DIR);
  await mkdir(root, { recursive: true });
  const id = randomUUID();
  const filename = `${id}.${cleanExt}`;
  const absolutePath = path.join(root, filename);
  assertWithinRoot(absolutePath, root);
  await writeFile(absolutePath, buffer);
  return { id, ext: cleanExt, filename, absolutePath };
}

export async function readOutput(filename: string): Promise<Buffer> {
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    path.isAbsolute(filename)
  ) {
    throw new AppError('STORAGE_ERROR', 'Invalid filename', 500, undefined, { filename });
  }
  const root = path.resolve(env.OUTPUT_DIR);
  const absolutePath = path.resolve(root, filename);
  assertWithinRoot(absolutePath, root);
  try {
    return await readFile(absolutePath);
  } catch (err) {
    throw new AppError('STORAGE_ERROR', `Failed to read output: ${filename}`, 500, err);
  }
}
