# Database Guidelines

> **Status**: Updated for task `05-13-user-login-auth`. **The backend now uses
> SQLite** (`better-sqlite3`) for auth (`user` / `session` / `account` /
> `verification` tables, managed by Better Auth) and per-user daily quota
> (`user_quota` table, managed by this app). Local-filesystem rules for
> `tmp/uploads` and `tmp/outputs` are unchanged.

---

## Decision: SQLite via `better-sqlite3`

| Aspect | Choice |
|---|---|
| DB engine | SQLite |
| Driver | `better-sqlite3` (synchronous, native module) |
| Journal mode | WAL (set on every boot via `db.pragma('journal_mode = WAL')`) |
| Foreign keys | Enforced (`db.pragma('foreign_keys = ON')`) |
| ORM (PR1) | **None** — Better Auth manages its own tables; this app's `user_quota` table uses raw SQL through `better-sqlite3` |
| ORM (PR2+) | `drizzle-orm` will be introduced when `image_records` is added |
| Migrations (PR1) | None needed (Better Auth auto-creates its 4 tables; `user_quota` created idempotently via `CREATE TABLE IF NOT EXISTS` on boot) |
| Migrations (PR2+) | `drizzle-kit` will own all schema migrations |
| File path | `SQLITE_PATH` env var (default `./data/app.sqlite`) |

### Rationale

- Single-VM / single-instance self-hosted deployment — no need for a separate DB process
- Solo dev — minimum ops surface
- Better Auth bundles its own data model and supports `better-sqlite3` directly
- See `.trellis/tasks/05-13-user-login-auth/research/db-orm.md` for the full evaluation

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

This singleton is consumed by both `src/config/auth.ts` (Better Auth) and
`src/services/userQuota.service.ts` (per-user quota).

---

## Table ownership

| Table | Owner | Mutation path |
|---|---|---|
| `user` | Better Auth | only Better Auth (`/api/auth/*` handlers) |
| `session` | Better Auth | only Better Auth |
| `account` | Better Auth | only Better Auth |
| `verification` | Better Auth | only Better Auth |
| `user_quota` | this app | `services/userQuota.service.ts` only |

App code **must not** write to Better Auth's 4 tables directly. Read-only
joins (`SELECT user.name FROM user JOIN user_quota ...`) are fine for
display/admin features.

---

## Concurrency & transactions

- `better-sqlite3` is **synchronous** and runs in the Node main thread. Each
  statement is a microsecond-scale operation; this is well within tolerance
  for HTTP handlers whose dominant latency is the 2API provider call.
- WAL mode allows concurrent readers + one writer. The auth callback flow and
  quota deduction both fit comfortably under this model.
- Use `db.transaction(...)` for any multi-statement mutation that must be
  atomic (e.g., quota reset-and-decrement when crossing midnight):

```ts
const consumeQuota = sqlite.transaction((userId: string, n: number) => {
  // read existing row, reset if stale day, decrement, return remaining
});
```

---

## Schema-change rules (until drizzle-kit is introduced in PR2)

1. App tables created idempotently in their owning service module via
   `CREATE TABLE IF NOT EXISTS` on first boot.
2. Add columns only via `ALTER TABLE ... ADD COLUMN` (SQLite supports this);
   never rename or drop columns in PR1 — wait for drizzle-kit migrations.
3. Every new column must have a default or be nullable to keep boot-on-empty
   safe.
4. Document the schema in this file (below) whenever it changes.

### Current app schema (PR1)

```sql
CREATE TABLE IF NOT EXISTS user_quota (
  user_id    TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  used_today INTEGER NOT NULL DEFAULT 0,
  quota_date TEXT    NOT NULL                  -- ISO date 'YYYY-MM-DD' (server local)
);
```

Better Auth's schema for `user` / `session` / `account` / `verification` is
managed by the library; refer to upstream docs. We only depend on `user.id`
being a stable text primary key.

---

## Local filesystem storage rules (unchanged)

The backend still writes two kinds of files (PR1 does **not** introduce
per-user directories — that's PR3):

1. **Uploaded reference images** → `tmp/uploads/<uuid>.<ext>`
2. **Generated output images** → `tmp/outputs/<uuid>.<ext>`

### Naming

- Use `crypto.randomUUID()` for filenames. Never use the user-supplied
  filename (path-traversal risk, collision risk).
- For uploads, the extension is decided by **magic-bytes sniffing**, not
  the client-declared MIME (`Content-Type` is forgeable). See
  `sniffImageExt` in `storage/localStorage.ts`.
- The `referenceId` that the client passes back to `/api/images/generate`
  is the full `<uuid>.<ext>` filename — not just the UUID — so the backend
  doesn't have to do directory scans to find the extension.

### Lifecycle

- Files in `tmp/uploads/` may be deleted after the generation request that
  consumed them succeeds.
- Files in `tmp/outputs/` are returned to the frontend (which copies them
  into IndexedDB), and may be deleted after the response is sent or after
  a TTL (default 1 hour, configurable later).
- The backend **must not** assume any file is still on disk between
  requests. Every consumer re-reads or fails fast.

### Access

- All filesystem helpers live in `src/storage/localStorage.ts`. Other
  modules call helpers, not `fs` directly.
- Helpers must reject any path that escapes `UPLOAD_DIR` / `OUTPUT_DIR`
  (resolve absolute, then check `startsWith` of the configured root).

---

## Forbidden patterns

- ❌ Instantiating a second `better-sqlite3 Database` pointing at the same
  file. Always go through the singleton in `src/db/sqlite.ts`.
- ❌ Writing to Better Auth's 4 tables from app code (only `/api/auth/*`
  handlers via the Better Auth library may mutate them).
- ❌ `fs.writeFileSync` / `fs.readFileSync` in request handlers (sync I/O
  blocks the event loop). Always use `fs/promises`. **Exception**:
  `better-sqlite3` is synchronous by design and is allowed — its operations
  are microsecond-level and much cheaper than the awaited HTTP work that
  dominates each request.
- ❌ Constructing file paths via string concatenation. Always go through
  `path.resolve` + the storage helpers.
- ❌ Adding a second database driver / ORM / migration tool to
  `package.json` without an explicit task and PRD update — this guardrail
  is still in force.
- ❌ Persisting cross-request state on the backend **other than** what is
  defined in the schema above. New tables require a spec update first.

---

## Backup

- SQLite WAL mode writes to `app.sqlite` + `app.sqlite-wal` + `app.sqlite-shm`.
  Backup procedure: stop the server (or use `db.backup('./backup.sqlite')`
  while running) and copy all three files; do not copy just the `.sqlite`.
- The `data/` directory must be persistent in production deployments (mount
  a volume, do **not** put it under `/tmp`).

---

## When this file changes

Update this file first to describe the new table / column / index / driver,
**then** add code. PRs that bypass this order will fail review.
