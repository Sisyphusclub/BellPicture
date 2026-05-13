# Database Guidelines

> **Status**: Updated for task `05-13-history-upload-to-backend`. **drizzle-orm
> + drizzle-kit now own all 6 tables.** Better Auth runs on its `drizzleAdapter`;
> `user_quota` and `image_records` are app-owned drizzle tables. Migrations
> live in `backend/drizzle/` and run on every boot.

---

## Decision: SQLite via `better-sqlite3` + drizzle-orm

| Aspect | Choice |
|---|---|
| DB engine | SQLite |
| Driver | `better-sqlite3` (synchronous, native module) |
| Journal mode | WAL (set on every boot via `db.pragma('journal_mode = WAL')`) |
| Foreign keys | Enforced (`db.pragma('foreign_keys = ON')`) |
| ORM | **`drizzle-orm`** for all schema definitions + queries (app tables AND Better Auth's 4 tables, via `drizzleAdapter`) |
| Migrations | **`drizzle-kit`** — SQL files in `backend/drizzle/`, applied at boot via `runMigrations()` in `backend/src/db/drizzle.ts` |
| File path | `SQLITE_PATH` env var (default `./data/app.sqlite`) |

### Rationale

- Single-VM / single-instance self-hosted deployment — no need for a separate DB process
- Solo dev — minimum ops surface
- One ORM owns everything → no raw-SQL vs ORM split
- See `.trellis/tasks/archive/2026-05/05-13-user-login-auth/research/db-orm.md` for the original evaluation

---

## Connection rules

A single shared `Database` instance per process. Created in
`src/db/sqlite.ts` and re-exported. **Never** instantiate a second `Database`
pointing at the same file from another module — locks and prepared-statement
caches must not be split.

```ts
// src/db/sqlite.ts
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { env } from '../config/env.js';

mkdirSync(path.dirname(env.SQLITE_PATH), { recursive: true });

export const sqlite = new Database(env.SQLITE_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
```

```ts
// src/db/drizzle.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sqlite } from './sqlite.js';
import * as schema from './schema.js';

export const db = drizzle(sqlite, { schema });
export function runMigrations(): void {
  migrate(db, { migrationsFolder: '<absolute path to backend/drizzle>' });
}
```

`runMigrations()` is called once at the top of `src/index.ts` (production boot)
and at the top of `tests/setup.ts` (test boot). It is idempotent — drizzle
tracks applied migrations via the `_migrations` table inside the same SQLite
file.

---

## Table ownership

| Table | Schema lives in | Mutation path |
|---|---|---|
| `user` | `src/db/schema.ts` | only Better Auth (`/api/auth/*` via drizzleAdapter) |
| `session` | `src/db/schema.ts` | only Better Auth |
| `account` | `src/db/schema.ts` | only Better Auth |
| `verification` | `src/db/schema.ts` | only Better Auth |
| `user_quota` | `src/db/schema.ts` | `services/userQuota.service.ts` only |
| `image_records` | `src/db/schema.ts` | `services/history.service.ts` only (insert from images.controller, list/delete from history.controller) |

App code **must not** write to Better Auth's 4 tables directly. Read-only
joins (`SELECT user.name FROM user JOIN user_quota ...`) via drizzle are fine
for display/admin features.

---

## Concurrency & transactions

- `better-sqlite3` is **synchronous** and runs in the Node main thread. Each
  statement is a microsecond-scale operation; this is well within tolerance
  for HTTP handlers whose dominant latency is the 2API provider call.
- WAL mode allows concurrent readers + one writer. The auth callback flow,
  quota deduction, and `image_records` insert all fit comfortably under this
  model.
- Use `sqlite.transaction(fn)` (better-sqlite3's wrapper) for multi-statement
  mutations that must be atomic — e.g., quota reset-and-decrement, or any
  future batched writes that need rollback semantics. drizzle queries inside
  the callback participate in the same transaction.

---

## Schema-change rules

1. Every change to `src/db/schema.ts` requires a **new migration**:
   ```bash
   npm run db:generate          # drizzle-kit generate; creates ./drizzle/NNNN_*.sql
   ```
2. Commit the generated SQL and the updated `meta/` files.
3. The next `runMigrations()` call (on boot) applies the new migration.
4. Never edit a previously-committed migration file. To fix a mistake, write a
   follow-up migration that corrects it.
5. Document the new table or column in this file's **Current schema** section
   below.

### Current schema

- **Better Auth core** — `user` / `session` / `account` / `verification` per
  Better Auth docs (sqlite + ms timestamps). See
  https://www.better-auth.com/docs/concepts/database for field semantics.
- **`user_quota`** — `(user_id PK FK → user.id cascade, used_today int, quota_date text)`.
- **`image_records`** — full schema documented in `src/db/schema.ts`. Indexes:
  `(user_id, created_at)` (history list query) and `(batch_id)` (per-batch delete).

---

## Local filesystem storage rules (unchanged)

The backend still writes two kinds of files (PR3 will introduce per-user
output directories):

1. **Uploaded reference images** → `tmp/uploads/<uuid>.<ext>`
2. **Generated output images** → `tmp/outputs/<uuid>.<ext>`

Naming and lifecycle are unchanged from previous task; see the prior version
of this file in git history. Key points still in force:

- `crypto.randomUUID()` for filenames; never user-supplied
- Magic-bytes sniffing decides extension (not Content-Type)
- All filesystem helpers in `src/storage/localStorage.ts`; no direct `fs` use
  elsewhere
- `OUTPUT_DIR/<filename>` files are **not** deleted when the matching
  `image_records` row is deleted; PR3 will tie file lifecycle to user
  isolation

---

## Forbidden patterns

- ❌ Instantiating a second `better-sqlite3 Database` pointing at the same
  file. Always go through the singleton in `src/db/sqlite.ts`.
- ❌ Writing to Better Auth's 4 tables from app code (only `/api/auth/*`
  handlers via the Better Auth library may mutate them).
- ❌ Writing raw SQL `CREATE TABLE` / `ALTER TABLE` in service modules. All
  schema changes go through `drizzle-kit generate` → committed migrations.
- ❌ `fs.writeFileSync` / `fs.readFileSync` in request handlers (sync I/O
  blocks the event loop). Always use `fs/promises`. **Exception**:
  `better-sqlite3` is synchronous by design and is allowed — its operations
  are microsecond-level and much cheaper than the awaited HTTP work that
  dominates each request.
- ❌ Constructing file paths via string concatenation. Always go through
  `path.resolve` + the storage helpers.
- ❌ Adding a second database driver / ORM / migration tool to
  `package.json` without an explicit task and PRD update.
- ❌ Persisting cross-request state on the backend **other than** what is
  defined in the schema above. New tables require a spec update first.

---

## Operations

### First-time setup

```bash
cd backend
cp .env.example .env  # fill in real Google OAuth client + secret
# data/ directory is created automatically; no need to mkdir
npm run dev           # runMigrations() runs on boot; tables get created
```

### Adding a column

```bash
# 1. Edit src/db/schema.ts (add the column)
# 2. Generate the migration
npm run db:generate
# 3. Commit the new ./drizzle/NNNN_*.sql + ./drizzle/meta/_journal.json
# 4. Restart dev / redeploy — runMigrations() applies the new file
```

### Backup

- SQLite WAL mode writes to `app.sqlite` + `app.sqlite-wal` + `app.sqlite-shm`.
  Backup procedure: stop the server (or use `db.backup('./backup.sqlite')`
  while running) and copy all three files; do not copy just the `.sqlite`.
- The `data/` directory must be persistent in production deployments (mount
  a volume, do **not** put it under `/tmp`).

---

## When this file changes

Update this file first to describe the new table / column / index / driver,
**then** add code. PRs that bypass this order will fail review.
