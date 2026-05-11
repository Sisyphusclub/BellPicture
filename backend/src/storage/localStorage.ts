import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp']);
const ALLOWED_UPLOAD_EXTS = new Set(['png', 'jpeg', 'webp']);

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export type UploadExt = 'png' | 'jpeg' | 'webp';

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
  ext: UploadExt | 'png';
  /** Filename relative to its directory (`<uuid>.<ext>`). */
  filename: string;
  /** MIME type (`image/png` | `image/jpeg` | `image/webp`). */
  mime: string;
  /** Absolute filesystem path. */
  absolutePath: string;
  /** Byte length on disk. */
  size: number;
}

export function mimeFromExt(ext: string): string {
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', `No MIME mapping for ext: ${ext}`, 415);
  }
  return mime;
}

/**
 * Sniff an image extension from the first bytes of a buffer.
 *
 * Recognized signatures:
 * - PNG  : 89 50 4E 47 0D 0A 1A 0A
 * - JPEG : FF D8 FF
 * - WebP : bytes 0..3 == "RIFF" AND bytes 8..11 == "WEBP"
 *
 * Throws AppError(UNSUPPORTED_MEDIA_TYPE, 415) on no match.
 */
export function sniffImageExt(buf: Buffer): UploadExt {
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  throw new AppError(
    'UNSUPPORTED_MEDIA_TYPE',
    'Uploaded bytes are not PNG, JPEG, or WebP',
    415,
    undefined,
    { firstBytes: Array.from(buf.subarray(0, Math.min(buf.length, 12))) },
  );
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
  return {
    id,
    ext: cleanExt as UploadExt | 'png',
    filename,
    mime: mimeFromExt(cleanExt),
    absolutePath,
    size: buffer.byteLength,
  };
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

/**
 * Save an uploaded reference image. The extension is sniffed from buffer
 * magic bytes — the multipart-declared MIME is ignored, since clients can
 * forge it.
 */
export async function saveUpload(buffer: Buffer): Promise<SavedFile> {
  const ext = sniffImageExt(buffer);
  const root = path.resolve(env.UPLOAD_DIR);
  await mkdir(root, { recursive: true });
  const id = randomUUID();
  const filename = `${id}.${ext}`;
  const absolutePath = path.join(root, filename);
  assertWithinRoot(absolutePath, root);
  await writeFile(absolutePath, buffer);
  return {
    id,
    ext,
    filename,
    mime: mimeFromExt(ext),
    absolutePath,
    size: buffer.byteLength,
  };
}

/**
 * Read an uploaded reference image. `filename` MUST be `<uuid>.<ext>`
 * (no path components).
 */
export async function readUpload(
  filename: string,
): Promise<{ buffer: Buffer; absolutePath: string; ext: UploadExt }> {
  const ext = assertReferenceFilename(filename);
  const root = path.resolve(env.UPLOAD_DIR);
  const absolutePath = path.resolve(root, filename);
  assertWithinRoot(absolutePath, root);
  try {
    const buffer = await readFile(absolutePath);
    return { buffer, absolutePath, ext };
  } catch (err) {
    throw new AppError('STORAGE_ERROR', `Failed to read upload: ${filename}`, 500, err);
  }
}

/**
 * Translate a `referenceId` (the value clients send to /api/images/generate)
 * into an absolute path under UPLOAD_DIR, with traversal guard. Does NOT
 * verify the file exists — callers do that themselves with `fs.stat` so
 * they can return BAD_REQUEST instead of STORAGE_ERROR for the missing
 * case.
 */
export function resolveUploadPath(referenceId: string): { absolutePath: string; ext: UploadExt } {
  const ext = assertReferenceFilename(referenceId);
  const root = path.resolve(env.UPLOAD_DIR);
  const absolutePath = path.resolve(root, referenceId);
  assertWithinRoot(absolutePath, root);
  return { absolutePath, ext };
}

/**
 * Reference id format: `<uuid-v4>.<png|jpeg|webp>`. Anything else throws
 * BAD_REQUEST (NOT a STORAGE_ERROR — bad client input, not internal
 * failure).
 */
function assertReferenceFilename(filename: string): UploadExt {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z]+)$/i.exec(
    filename,
  );
  if (!match) {
    throw new AppError(
      'BAD_REQUEST',
      'referenceId must be `<uuid>.<png|jpeg|webp>`',
      400,
      undefined,
      { filename },
    );
  }
  const ext = match[2]!.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      `Unsupported reference extension: .${ext}`,
      415,
      undefined,
      { filename },
    );
  }
  return ext as UploadExt;
}
