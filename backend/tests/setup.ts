import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = mkdtempSync(path.join(tmpdir(), 'ref2image-test-'));

process.env.IMAGE_API_BASE_URL ??= 'https://test.example.com';
process.env.IMAGE_API_KEY ??= 'test-key';
process.env.LOG_LEVEL ??= 'silent';
process.env.UPLOAD_DIR ??= path.join(root, 'uploads');
process.env.OUTPUT_DIR ??= path.join(root, 'outputs');
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-32-chars-min-padding-padding';
process.env.GOOGLE_CLIENT_ID ??= 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET ??= 'test-google-secret';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
process.env.SQLITE_PATH ??= path.join(root, 'app.sqlite');
process.env.DAILY_USER_QUOTA ??= '20';

// Run drizzle migrations once for the test process. Subsequent test files share
// the same SQLite file via the better-sqlite3 module-level singleton.
const { runMigrations } = await import('../src/db/drizzle.js');
runMigrations();
