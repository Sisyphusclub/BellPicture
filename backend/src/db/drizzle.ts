import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';

import { logger } from '../logger.js';

import * as schema from './schema.js';
import { sqlite } from './sqlite.js';

export const db = drizzle(sqlite, { schema });

export function runMigrations(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // ./drizzle is committed at backend root, two levels up from src/db/.
  const migrationsFolder = path.resolve(here, '..', '..', 'drizzle');
  drizzleMigrate(db, { migrationsFolder });
  logger.info({ migrationsFolder }, 'drizzle: migrations applied');
}

export type Database = typeof db;
