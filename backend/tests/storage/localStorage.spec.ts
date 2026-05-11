import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { env } from '../../src/config/env.js';
import { AppError } from '../../src/errors/AppError.js';
import {
  readOutput,
  readUpload,
  resolveUploadPath,
  saveOutput,
  saveUpload,
  sniffImageExt,
} from '../../src/storage/localStorage.js';

// Real magic-byte prefixes for each supported format. Sufficient for
// sniffImageExt; the rest of the buffer can be arbitrary bytes.
const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_PREFIX = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_PREFIX = Buffer.concat([
  Buffer.from([0x52, 0x49, 0x46, 0x46]), // "RIFF"
  Buffer.from([0x00, 0x00, 0x00, 0x00]), // size — irrelevant
  Buffer.from([0x57, 0x45, 0x42, 0x50]), // "WEBP"
]);

function pad(prefix: Buffer, totalBytes: number): Buffer {
  const tail = Buffer.alloc(Math.max(0, totalBytes - prefix.length), 0);
  return Buffer.concat([prefix, tail]);
}

describe('storage/localStorage', () => {
  it('saveOutput writes under OUTPUT_DIR and returns paths inside that root', async () => {
    const result = await saveOutput(Buffer.from('hello'), 'png');

    expect(result.ext).toBe('png');
    expect(result.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(result.absolutePath.endsWith(result.filename)).toBe(true);

    const root = path.resolve(env.OUTPUT_DIR);
    expect(result.absolutePath.startsWith(root)).toBe(true);

    const written = await fs.readFile(result.absolutePath);
    expect(written.toString()).toBe('hello');
  });

  it('saveOutput rejects unsupported extensions', async () => {
    await expect(saveOutput(Buffer.from(''), 'exe')).rejects.toBeInstanceOf(AppError);
    await expect(saveOutput(Buffer.from(''), 'exe')).rejects.toMatchObject({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      status: 415,
    });
  });

  it('saveOutput rejects extensions containing path-traversal characters', async () => {
    await expect(saveOutput(Buffer.from(''), '../png')).rejects.toMatchObject({
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
    await expect(saveOutput(Buffer.from(''), '/png')).rejects.toMatchObject({
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  });

  it('saveOutput + readOutput round-trip', async () => {
    const saved = await saveOutput(Buffer.from('roundtrip-payload'), 'png');
    const back = await readOutput(saved.filename);
    expect(back.toString()).toBe('roundtrip-payload');
  });

  it('readOutput rejects filenames containing path-traversal chars', async () => {
    await expect(readOutput('../escape.png')).rejects.toMatchObject({
      code: 'STORAGE_ERROR',
    });
    await expect(readOutput('a/b.png')).rejects.toMatchObject({
      code: 'STORAGE_ERROR',
    });
  });

  describe('sniffImageExt', () => {
    it('detects PNG magic bytes', () => {
      expect(sniffImageExt(pad(PNG_PREFIX, 32))).toBe('png');
    });
    it('detects JPEG magic bytes', () => {
      expect(sniffImageExt(pad(JPEG_PREFIX, 32))).toBe('jpeg');
    });
    it('detects WebP magic bytes', () => {
      expect(sniffImageExt(pad(WEBP_PREFIX, 32))).toBe('webp');
    });
    it('throws UNSUPPORTED_MEDIA_TYPE on non-image bytes', () => {
      const txt = Buffer.from('not-an-image-just-text-bytes');
      expect(() => sniffImageExt(txt)).toThrow(AppError);
      try {
        sniffImageExt(txt);
      } catch (err) {
        expect((err as AppError).code).toBe('UNSUPPORTED_MEDIA_TYPE');
        expect((err as AppError).status).toBe(415);
      }
    });
    it('rejects a forged Content-Type (text body with image MIME) by checking bytes', () => {
      const txt = Buffer.from('GIF89a-not-allowed');
      expect(() => sniffImageExt(txt)).toThrow(AppError);
    });
  });

  describe('saveUpload', () => {
    it('writes a PNG-sniffed file under UPLOAD_DIR with proper metadata', async () => {
      const buf = pad(PNG_PREFIX, 256);
      const saved = await saveUpload(buf);
      expect(saved.ext).toBe('png');
      expect(saved.mime).toBe('image/png');
      expect(saved.size).toBe(buf.length);
      expect(saved.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
      const root = path.resolve(env.UPLOAD_DIR);
      expect(saved.absolutePath.startsWith(root)).toBe(true);

      const onDisk = await fs.readFile(saved.absolutePath);
      expect(onDisk.equals(buf)).toBe(true);
    });

    it('rejects forged non-image bytes regardless of any (absent) header MIME', async () => {
      await expect(saveUpload(Buffer.from('plain text data'))).rejects.toMatchObject({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        status: 415,
      });
    });

    it('writes a JPEG and a WebP correctly', async () => {
      const jpeg = await saveUpload(pad(JPEG_PREFIX, 128));
      expect(jpeg.ext).toBe('jpeg');
      expect(jpeg.mime).toBe('image/jpeg');

      const webp = await saveUpload(pad(WEBP_PREFIX, 128));
      expect(webp.ext).toBe('webp');
      expect(webp.mime).toBe('image/webp');
    });
  });

  describe('readUpload', () => {
    it('round-trips with saveUpload', async () => {
      const buf = pad(PNG_PREFIX, 64);
      const saved = await saveUpload(buf);
      const back = await readUpload(saved.filename);
      expect(back.ext).toBe('png');
      expect(back.buffer.equals(buf)).toBe(true);
      expect(back.absolutePath).toBe(saved.absolutePath);
    });

    it('rejects filenames that are not `<uuid>.<ext>`', async () => {
      await expect(readUpload('not-a-uuid.png')).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        status: 400,
      });
      await expect(readUpload('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.exe')).rejects.toMatchObject({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        status: 415,
      });
    });

    it('rejects path-traversal attempts before reading anything', async () => {
      await expect(readUpload('../escape.png')).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      await expect(readUpload('a/b.png')).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });

  describe('resolveUploadPath', () => {
    it('builds an absolute path under UPLOAD_DIR for valid reference ids', () => {
      const { absolutePath, ext } = resolveUploadPath('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp');
      const root = path.resolve(env.UPLOAD_DIR);
      expect(absolutePath.startsWith(root)).toBe(true);
      expect(ext).toBe('webp');
    });

    it('rejects malformed reference ids without touching the filesystem', () => {
      expect(() => resolveUploadPath('totally-bogus')).toThrow(AppError);
      expect(() => resolveUploadPath('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toThrow(AppError);
      expect(() => resolveUploadPath('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.gif')).toThrow(AppError);
    });
  });
});
