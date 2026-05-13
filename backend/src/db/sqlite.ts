import { mkdirSync } from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { env } from '../config/env.js';
import { logger } from '../logger.js';

mkdirSync(path.dirname(env.SQLITE_PATH), { recursive: true });

export const sqlite = new Database(env.SQLITE_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

logger.info({ path: env.SQLITE_PATH }, 'sqlite: opened with WAL + foreign_keys');
