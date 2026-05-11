# Database Guidelines

> **Status**: Planning version. **The MVP backend has no database.** This file
> documents that decision, the local-filesystem substitute, and the rules
> that prevent the team from accidentally introducing a DB before it's
> agreed.

---

## MVP decision: no database

For week-1 MVP:

- **No PostgreSQL, MySQL, SQLite, MongoDB, Redis, Supabase, or Firebase.**
- **No ORM** (Prisma, TypeORM, Sequelize, Drizzle, etc.).
- **All persistence lives on the frontend** in IndexedDB (image blobs) and
  localStorage (metadata). See `.trellis/spec/frontend/state-management.md`.
- **Backend is stateless** between requests. The only on-disk state is
  ephemeral files under `tmp/` (uploaded reference images, generated outputs).

If a sub-agent or contributor finds themselves needing a database, that is a
**scope-change conversation**, not a quiet addition. Stop and surface it.

---

## Local filesystem storage rules

The backend writes two kinds of files:

1. **Uploaded reference images** → `tmp/uploads/<uuid>.<ext>`
2. **Generated output images** → `tmp/outputs/<uuid>.<ext>`

### Naming

- Use `crypto.randomUUID()` for filenames. Never use the user-supplied
  filename (path-traversal risk, collision risk).
- Preserve the file extension only after validating the MIME type against
  an allow-list (`image/png`, `image/jpeg`, `image/webp`).

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

- ❌ Adding a database driver, ORM, or migration tool to `package.json`
  without an explicit task and PRD update.
- ❌ Persisting user history, API keys, or any cross-request state on the
  backend (frontend owns history; env owns keys).
- ❌ Using `fs.writeFileSync` / `fs.readFileSync` in request handlers (sync
  I/O blocks the event loop). Always use `fs/promises`.
- ❌ Constructing file paths via string concatenation. Always go through
  `path.resolve` + the storage helpers.

---

## When this file changes

If/when the team decides to add a database (e.g., for accounts, persistent
history, or multi-device sync), update this file first to describe the
chosen DB, ORM, naming conventions, migration tool, and query patterns —
**then** add code. Reverse order risks divergent specs.
