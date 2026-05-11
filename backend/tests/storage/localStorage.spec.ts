import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { env } from '../../src/config/env.js';
import { AppError } from '../../src/errors/AppError.js';
import { readOutput, saveOutput } from '../../src/storage/localStorage.js';

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
});
