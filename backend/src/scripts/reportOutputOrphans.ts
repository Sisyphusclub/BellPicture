import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { db } from '../db/drizzle.js';
import { imageRecords } from '../db/schema.js';

const OUTPUT_FILENAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpeg|webp)$/i;

const outputRoot = path.resolve(env.OUTPUT_DIR);
const entries = await readdir(outputRoot, { withFileTypes: true }).catch((error: unknown) => {
  if (isNodeErrorCode(error, 'ENOENT')) return [];
  throw error;
});
const diskFiles = entries
  .filter((entry) => entry.isFile() && OUTPUT_FILENAME_RE.test(entry.name))
  .map((entry) => entry.name)
  .sort();
const recordedFiles = new Set(
  db
    .select({ filename: imageRecords.filename })
    .from(imageRecords)
    .all()
    .map((row) => row.filename),
);
const orphanFiles = diskFiles.filter((filename) => !recordedFiles.has(filename));

process.stdout.write(
  `${JSON.stringify(
    {
      outputRoot,
      diskFileCount: diskFiles.length,
      recordedFileCount: recordedFiles.size,
      orphanFileCount: orphanFiles.length,
      orphanFiles,
    },
    null,
    2,
  )}\n`,
);

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
