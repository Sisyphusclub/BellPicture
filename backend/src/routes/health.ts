import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { Router } from 'express';

import { env } from '../config/env.js';
import { sqlite } from '../db/sqlite.js';

export const healthRouter = Router();

function liveResponse() {
  return {
    status: 'ok',
    uptimeSec: Math.round(process.uptime()),
    version: env.APP_VERSION,
  };
}

healthRouter.get(['/health', '/health/live'], (_req, res) => {
  res.json(liveResponse());
});

healthRouter.get('/health/ready', (_req, res) => {
  void checkReadiness().then((ready) => {
    if (!ready) {
      res.status(503).json({ status: 'not_ready' });
      return;
    }
    res.json({
      ...liveResponse(),
      checks: { database: 'ok', uploads: 'writable', outputs: 'writable' },
    });
  });
});

async function checkReadiness(): Promise<boolean> {
  try {
    sqlite.prepare('SELECT 1').get();
    await Promise.all([
      assertWritableDirectory(path.dirname(path.resolve(env.SQLITE_PATH))),
      assertWritableDirectory(path.resolve(env.UPLOAD_DIR)),
      assertWritableDirectory(path.resolve(env.OUTPUT_DIR)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function assertWritableDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await access(directory, constants.W_OK);
}
