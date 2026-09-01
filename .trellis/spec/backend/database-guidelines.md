# Database Guidelines

> **Status**: Updated for task `08-28-fix-security-races-resources`. \*\*drizzle-orm
>
> - drizzle-kit own all 7 tables.\*\* Better Auth runs on its `drizzleAdapter`;
>   `user_quota`, `reference_uploads`, and `image_records` are app-owned tables. Migrations
>   live in `backend/drizzle/` and run on every boot.

---

## Decision: SQLite via `better-sqlite3` + drizzle-orm

| Aspect       | Choice                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| DB engine    | SQLite                                                                                                                    |
| Driver       | `better-sqlite3` (synchronous, native module)                                                                             |
| Journal mode | WAL (set on every boot via `db.pragma('journal_mode = WAL')`)                                                             |
| Foreign keys | Enforced (`db.pragma('foreign_keys = ON')`)                                                                               |
| ORM          | **`drizzle-orm`** for all schema definitions + queries (app tables AND Better Auth's 4 tables, via `drizzleAdapter`)      |
| Migrations   | **`drizzle-kit`** — SQL files in `backend/drizzle/`, applied at boot via `runMigrations()` in `backend/src/db/drizzle.ts` |
| File path    | `SQLITE_PATH` env var (default `./data/app.sqlite`)                                                                       |

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
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { env } from "../config/env.js";

mkdirSync(path.dirname(env.SQLITE_PATH), { recursive: true });

export const sqlite = new Database(env.SQLITE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
```

```ts
// src/db/drizzle.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sqlite } from "./sqlite.js";
import * as schema from "./schema.js";

export const db = drizzle(sqlite, { schema });
export function runMigrations(): void {
  migrate(db, { migrationsFolder: "<absolute path to backend/drizzle>" });
}
```

`runMigrations()` is called once at the top of `src/index.ts` (production boot)
and at the top of `tests/setup.ts` (test boot). It is idempotent — drizzle
tracks applied migrations via the `_migrations` table inside the same SQLite
file.

---

## Table ownership

| Table               | Schema lives in    | Mutation path                                                                                              |
| ------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `user`              | `src/db/schema.ts` | Better Auth only; username wrapper routes and seed service must mutate through `auth.handler` / `auth.api` |
| `session`           | `src/db/schema.ts` | only Better Auth                                                                                           |
| `account`           | `src/db/schema.ts` | only Better Auth                                                                                           |
| `verification`      | `src/db/schema.ts` | only Better Auth                                                                                           |
| `user_quota`        | `src/db/schema.ts` | `services/userQuota.service.ts` only                                                                       |
| `reference_uploads` | `src/db/schema.ts` | `services/referenceUpload.service.ts` only (insert from authenticated upload, read before generation)      |
| `image_records`     | `src/db/schema.ts` | `services/history.service.ts` only (insert from images.controller, list/delete from history.controller)    |

App code **must not** write to Better Auth's 4 tables directly. Read-only
queries such as username uniqueness checks are fine; mutations for users,
sessions, accounts, and verifications must go through Better Auth APIs so
password hashing and session semantics stay library-owned.

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
- Paid generation quota must be reserved inside one synchronous transaction
  before the provider call. `used_today` includes committed usage and in-flight
  reservations; a reservation commits the actual result count or releases its
  full amount on provider failure/cancellation. A read-only availability check
  followed by a later deduction is forbidden because concurrent requests can
  both enter the provider.

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
  Better Auth docs (sqlite + ms timestamps), with project-owned username
  extension columns on `user`: `username` (unique, normalized login key) and
  `display_username` (normalized display value). See
  https://www.better-auth.com/docs/concepts/database for base field semantics.
- **`user_quota`** — legacy daily counters plus `permanent_total int?` and
  `permanent_used int?`. The permanent pool is configured by administrators and
  never resets at a product-day boundary; legacy counters remain for migration
  compatibility and analytics.
- **`quota_grants`** — `(id PK, user_id FK → user.id cascade, source,
  amount, remaining, granted_at, expires_at, check_in_date)` with a unique
  `(user_id, source, check_in_date)` constraint and `(user_id, expires_at)` index.
  Check-in grants are independent seven-day batches and are consumed earliest
  expiry first.
- **`reference_uploads`** — `(filename PK, user_id FK → user.id cascade,
created_at integer)` with `(user_id, created_at)` index. The filename is the
  reusable reference id; ownership is recorded immediately after upload.
- **`image_records`** — full schema documented in `src/db/schema.ts`. It stores
  `reference_id` for legacy/single-reference callers and `reference_ids` as JSON
  text for the canonical multi-reference snapshot. Indexes: `(user_id, created_at)`
  (private history), `(batch_id)` (per-batch delete), and
  `(is_public, created_at, id)` (stable public-history cursor pagination).

## Scenario: multi-reference image generation records

### 1. Scope / Trigger

- Trigger: image generation now accepts up to 4 reference images and persists
  the full reference set for history/regenerate. This changes API payloads,
  provider input, and the `image_records` schema.

### 2. Signatures

```ts
// POST /api/images/generate
type GenerateBody = {
  prompt: string;
  referenceId?: string;      // legacy single id
  referenceIds?: string[];   // canonical, max 4
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  isPublic?: boolean;
};

// backend/src/types/image.ts
interface GenerateInput {
  prompt: string;
  referencePath?: string;    // deprecated
  referencePaths?: string[]; // canonical provider input
}

// image_records table
reference_id text;           // first id / legacy fallback
reference_ids text;          // JSON string array, nullable
```

### 3. Contracts

- Controller accepts either `referenceId` or `referenceIds`. If both are
  present, `referenceIds` wins. Normalize by trimming empty ids and de-duping.
- `referenceIds.length` must be `1..MAX_REFERENCE_IMAGES` when present.
- Authenticated upload writes `reference_uploads(filename, user_id)` after the
  file is saved; metadata failure removes the saved file.
- `imageGeneration.service` checks every id belongs to the authenticated user
  before resolving or statting the file, then verifies it exists before calling
  the provider. Demo-cache hits follow the same ownership preflight.
- Provider calls receive `referencePaths` and append each file as an `image`
  multipart field when calling `/v1/images/edits`.
- `history.service` writes `reference_id = referenceIds[0]` and
  `reference_ids = JSON.stringify(referenceIds)`. Owner-scoped DTOs expose
  parsed `referenceIds`, falling back to `[referenceId]` for old rows. Public
  DTOs must omit both `referenceId` and `referenceIds`.
- The ownership migration backfills legacy ids from both history columns. If
  several users referenced the same legacy filename, the earliest history row
  (then record id) is the conservative owner; later users must re-upload.

### 4. Validation & Error Matrix

| Condition                                                        | Expected behavior                                 |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `referenceIds` has more than 4 items                             | 400 `BAD_REQUEST`                                 |
| Any reference id resolves outside upload storage or is malformed | 400 `BAD_REQUEST` from storage path validation    |
| Reference id has no `reference_uploads` row                      | 400 `BAD_REQUEST`, `details.referenceId` set      |
| Reference id belongs to another user                             | 403 `FORBIDDEN` before filesystem/provider access |
| Any reference file is missing or not a file                      | 400 `BAD_REQUEST`, `details.referenceId` set      |
| `reference_ids` contains invalid JSON in an old/corrupt row      | DTO falls back to legacy `reference_id`           |
| Public history DTO is serialized                                 | `referenceId` and `referenceIds` are absent       |

### 5. Good/Base/Bad Cases

- Good: 2 reference ids resolve to 2 absolute paths, provider appends 2
  multipart `image` fields, and history returns both ids for regenerate.
- Base: legacy row with only `reference_id` returns `referenceIds: [referenceId]`.
- Bad: checking only that a globally named file exists; this lets another
  account reuse a reference id learned from a response or log.
- Bad: regenerating by re-uploading generated output files instead of reusing
  persisted upload ids.

### 6. Tests Required

- Controller tests assert `POST /api/images/generate` passes `referencePaths`
  to the provider for legacy `referenceId` and array `referenceIds`.
- Service tests assert every reference id is preflighted and stale ids produce
  `BAD_REQUEST`.
- Controller/service tests assert a foreign user's registered id produces 403
  before the provider call and a user's own id remains reusable.
- Provider tests assert multiple `referencePaths` append multiple multipart
  `image` fields.
- History tests assert `reference_ids` round-trips and legacy `reference_id`
  fallback still works; public history tests assert neither reference-id field
  is present.

### 7. Wrong vs Correct

#### Wrong

```ts
await provider.generate({ prompt, referencePath: resolved[0] });
```

#### Correct

```ts
await assertReferenceImagesOwnedByUser(referenceIds, user.id, signal);
await provider.generate({ prompt, referencePaths: resolved, signal });
```

---

## Scenario: demo prompt cached outputs

### 1. Scope / Trigger

- Trigger: configured exact prompts can be prepared once through normal image
  generation, then returned from local output storage on later matching
  requests. This touches API behavior, quota, env config, and filesystem
  storage.

### 2. Signatures

```ts
// backend/src/config/env.ts
DEMO_PROMPTS: string[];                 // split by "|||", empty disables
DEMO_PROMPT_CACHE_DELAY_MS: number;     // non-negative, default 4000

// POST /api/images/generate
type GenerateBody = {
  prompt: string;
  referenceId?: string;
  referenceIds?: string[];
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  isPublic?: boolean;
  demoPresetId?: string; // legacy admin-only path, not frontend UI
};
```

### 3. Contracts

- Demo prompt matching trims surrounding whitespace, removes all whitespace
  from both the submitted and configured prompt, and compares the normalized
  full prompt text against normalized `DEMO_PROMPTS`.
- `DEMO_PROMPTS` uses `|||` as the delimiter. Empty entries are removed and
  duplicate prompts collapse to one configured prompt.
- Demo prompt cache applies to configured prompts even when `referenceId` or
  `referenceIds` are present. This is an operator demo shortcut: the reference
  image is recorded in history, but it does not change which prepared cache file
  is returned.
- Cache miss: call the normal provider-backed generation path with an atomic
  quota reservation, persist history, return the result, then schedule copying
  the first PNG output to an internal cache file as optional derived work.
- Cache hit: wait `DEMO_PROMPT_CACHE_DELAY_MS`, copy the cached PNG to a new
  normal `<uuid>.png` output, persist a normal `image_records` row, and return
  the normal generate response shape.
- Cache hit must not call the provider and must not consume daily quota.
- Cache-write failure is logged at `warn` and must not change the successful
  response or skip history persistence. Request cancellation skips cache work.
- Internal cache files live under `OUTPUT_DIR` with names matching
  `demo-prompt-<sha>.png` and `demo-prompt-meta-<sha>.json`. They are managed
  only through `storage/localStorage.ts`; service/controller code must not
  import `fs`.

### 4. Validation & Error Matrix

| Condition                                               | Expected behavior                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DEMO_PROMPT_CACHE_DELAY_MS` is negative or non-numeric | Throw on `config/env.ts` import                                                                           |
| `DEMO_PROMPTS` is empty                                 | No prompt-cache branch is active                                                                          |
| Configured prompt + cache meta missing/corrupt          | Treat as cache miss and call the normal provider path                                                     |
| Configured prompt + reference image ids + cache hit     | Return cached image with `generationMode: image-to-image`, persist reference ids, skip provider and quota |
| Configured prompt + reference image ids + cache miss    | Use normal image-to-image behavior; do not write a prompt cache from the reference-image result           |
| Cached output is requested repeatedly                   | Each response gets a fresh `<uuid>.png` output filename and history id                                    |
| Cache directory is unwritable or full after generation  | Keep the successful response/history; log the optional cache failure                                      |

### 5. Good/Base/Bad Cases

- Good: operator configures two exact prompts, warms each once, then live demo
  requests wait four seconds and show prepared images without provider calls.
- Good: a configured prompt still hits the prepared cache when a browser paste
  introduces a newline or removes spaces inside a phrase such as `T 恤`.
- Good: a configured prompt with a reference image returns the prepared cache
  as `image-to-image`, keeps the reference id in history, and avoids provider
  latency during live demos.
- Base: an unconfigured prompt continues to consume quota and call the provider.
- Bad: reusing the same cached filename as the history id for every request,
  which collides with `image_records.id`.
- Bad: exposing a demo button in the frontend; prompt cache should look like
  ordinary prompt submission.

### 6. Tests Required

- Env tests assert prompt delimiter parsing, de-duplication, default empty
  config, and negative-delay rejection.
- Controller tests assert cache miss calls provider and consumes quota.
- Controller tests assert cache hit skips provider, skips quota, returns one
  generated image, and writes a normal history row.
- Controller tests assert cache-write rejection does not turn a completed
  generation into HTTP 500 or suppress history.
- Frontend view tests assert no `.prompt-showcase__demo` button renders for
  admins or ordinary users.

### 7. Wrong vs Correct

#### Wrong

```ts
if (prompt === demoPrompt) return { filename: cachedFilename };
```

#### Correct

```ts
const cached = await readCachedDemoPromptImage(hit, config);
if (cached) {
  persistGeneratedImages({
    result: cached,
    userId,
    prompt,
    model,
    referenceIds: [],
  });
  return responseFromGeneratedResult(cached);
}
```

---

## Scenario: username auth and local/demo default admin

### 1. Scope / Trigger

- Trigger: auth changed from user-facing email/password to username/password,
  which touches DB schema, startup env, backend HTTP contracts, and frontend auth
  calls.
- Scope: username registration/login, Better Auth credential storage, and the
  optional local/demo default admin seed.

### 2. Signatures

```ts
// backend/src/config/env.ts
interface Env {
  SEED_DEFAULT_ADMIN: boolean;
}

// backend/src/routes/auth.ts
POST /api/auth/sign-up/username
body: { username: string; password: string; rememberMe?: boolean }

// Better Auth username plugin route, mounted by auth.handler
POST /api/auth/sign-in/username
body: { username: string; password: string; rememberMe?: boolean }
```

### 3. Contracts

- Usernames are normalized with `trim().toLowerCase()` on the frontend and
  `toLowerCase()` at the backend boundary, then must match `^[a-z0-9_]{3,32}$`.
- Public email/password auth routes are not a supported product surface:
  `/api/auth/sign-up/email` and `/api/auth/sign-in/email` must return a Chinese
  `BAD_REQUEST` telling the client to use username/password.
- `user.username` is the unique login key. `user.display_username` stores the
  normalized display value currently shown in account chrome.
- The credential password must live only in Better Auth's `account.password`
  hash field. Never write plaintext passwords or hand-roll hash storage.
- `POST /api/auth/sign-up/username` may generate the internal Better Auth email
  needed by the library, but this value must not become user-facing UI copy.
  `internalEmailForUsername(username)` must return
  `${username}@users.nebulens.local`.
- `SEED_DEFAULT_ADMIN=true` is the only switch that creates `admin` / `admin123`
  on boot; the default is disabled. The seed must call Better Auth APIs, not
  insert rows directly.
- Admin authorization must read the persisted `user.is_admin` flag only. A
  username such as `admin` or `blur` must never be treated as an admin by
  naming convention or promoted during `isUserAdmin()` checks.

### 4. Validation & Error Matrix

| Condition                                                               | Expected behavior                                                                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Username invalid after normalization                                    | 400 `BAD_REQUEST`, message `用户名需为 3-32 位小写字母、数字或下划线。`                                          |
| Password shorter than 8 on registration                                 | 400 `BAD_REQUEST`, message `密码至少需要 8 个字符。`                                                             |
| Username already exists                                                 | 400 `BAD_REQUEST`, message `该用户名已被占用，请换一个。`                                                        |
| Email auth route called                                                 | 400 `BAD_REQUEST`, message `请使用用户名和密码登录或注册。`                                                      |
| Wrong username/password on sign-in                                      | Chinese frontend message `用户名或密码错误。`                                                                    |
| `SEED_DEFAULT_ADMIN` absent/false                                       | No default admin user is created                                                                                 |
| `SEED_DEFAULT_ADMIN=true` and admin exists                              | No duplicate user; seed is idempotent                                                                            |
| User self-registers `blur` or `admin` while no seed/admin promotion ran | User remains `is_admin=false` and `/api/admin/*` returns 403                                                     |
| Existing database contains a legacy internal email domain               | Do not rewrite silently at runtime; use a reviewed data migration before deploying the renamed identity contract |

### 5. Good/Base/Bad Cases

- Good: fresh local demo database + `SEED_DEFAULT_ADMIN=true` can sign in with
  `admin` / `admin123`; `account.password` is a hash, not `admin123`.
- Base: registering `New_User` stores and signs in as `new_user`.
- Bad: enabling a production deployment with an unconditional weak default admin
  account, deriving admin status from a username, or writing directly to
  `user`/`account` tables.

### 6. Tests Required

- Backend route tests for username registration, login, duplicate username,
  invalid username, short password, and rejected email auth routes.
- Backend seed tests for disabled, created, existing, and hash-not-plaintext
  behavior.
- Backend authorization regression tests proving self-registered `blur` stays
  non-admin and direct `/api/admin/*` access returns 403.
- Unit test `internalEmailForUsername('creator')` returns exactly
  `creator@users.nebulens.local`.
- Frontend tests for username labels/placeholders, normalized submission,
  disabled invalid registration, and Chinese error mapping.
- Existing image/history/quota tests must continue to pass because they depend
  on `user.id` from the Better Auth session.

### 7. Wrong vs Correct

#### Wrong

```ts
await db.insert(user).values({ username: "admin" });
await db.insert(account).values({ password: "admin123" });
```

#### Correct

```ts
if (env.SEED_DEFAULT_ADMIN) {
  await auth.api.signUpEmail({
    body: {
      email: internalEmailForUsername("admin"),
      username: "admin",
      displayUsername: "admin",
      password: "admin123",
      name: "admin",
    },
  });
}
```

---

## Scenario: daily check-in generation credits

### 1. Scope / Trigger

- Trigger: a signed-in user may claim additional image-generation credits once
  per product day. This changes the quota database row, API response, env
  configuration, admin quota reporting, and frontend quota state.

### 2. Signatures

- `POST /api/images/quota/check-in` requires the existing authenticated session.
- `GET /api/images/quota` returns the effective quota snapshot.
- `QuotaPool.checkIn(): DailyCheckInResult` owns the atomic mutation.
- `productDateKey(date?: Date): string` returns `YYYY-MM-DD` in
  `Asia/Shanghai`.
- `user_quota.check_in_date TEXT NULL` records the last claimed product date.
- `user_quota.bonus_today INTEGER NOT NULL DEFAULT 0` records that date's bonus.

### 3. Contracts

- `QuotaSnapshot` is `{ total, remaining, checkedInToday,
dailyCheckInReward }`; `DailyCheckInResult` adds `claimed`.
- `total = base dailyTotal + bonusToday` only when `checkInDate` equals the
  current `Asia/Shanghai` date. `remaining = max(0, total - usedToday)`.
- First successful claim writes the current date and
  `DAILY_CHECK_IN_REWARD`, then returns `claimed: true`. Repeated claims on the
  same date return the same effective quota with `claimed: false` and no write
  that increases the bonus.
- `DAILY_CHECK_IN_REWARD` is an optional positive-integer env key with default
  `5`. Administrator-configured `dailyTotal` remains the base quota and is not
  overwritten by check-in.

### 4. Validation & Error Matrix

| Condition                             | Result                                           |
| ------------------------------------- | ------------------------------------------------ |
| No authenticated user                 | `401 UNAUTHORIZED`; no quota row mutation        |
| First claim today                     | `200`, configured bonus applied, `claimed: true` |
| Repeated claim today                  | `200`, no extra bonus, `claimed: false`          |
| Invalid/non-positive reward env value | Backend fails env validation on boot             |
| New Shanghai product day              | Previous bonus excluded until the next claim     |

### 5. Good/Base/Bad Cases

- Good: base quota `20`, no usage, reward `5` -> first claim returns total and
  remaining `25`; a second claim stays at `25`.
- Base: a user who does not claim keeps the administrator-defined base quota.
- Bad: adding the reward directly to `dailyTotal` would permanently change an
  administrator setting and compound on future claims.

### 6. Tests Required

- Route integration tests assert the first and repeated claim payloads and
  confirm the reward is idempotent.
- Date unit tests straddle the UTC instant where Shanghai advances to a new day.
- Quota generation tests continue to assert exhaustion against the effective
  base-plus-current-bonus total.
- Admin route tests assert quota reporting uses the same effective total.
- Frontend API and route tests assert authenticated POST transport, returned
  quota-store replacement, popover copy, and claim invocation.

### 7. Wrong vs Correct

#### Wrong

```ts
await db
  .update(userQuota)
  .set({ dailyTotal: sql`${userQuota.dailyTotal} + 5` });
```

#### Correct

```ts
db.transaction((tx) => {
  if (row?.checkInDate === productDateKey())
    return { ...snapshot, claimed: false };
  tx.insert(userQuota).values({
    checkInDate: productDateKey(),
    bonusToday: reward,
  });
});
```

---

## Scenario: paid generation reservation and bounded public history

### 1. Scope / Trigger

- Trigger: paid provider calls and anonymous gallery reads both cross the
  database/service/API boundary. They require atomic quota admission and a
  bounded, index-backed response contract.

### 2. Signatures

```ts
interface QuotaPool {
  reserve(count: number): QuotaReservation;
}

interface QuotaReservation {
  commit(actualCount: number): QuotaSnapshot;
  release(): QuotaSnapshot;
}

// GET /api/history/public?limit=24&cursor=<opaque base64url>
interface PublicHistoryPage {
  records: PublicImageRecordDTO[];
  nextCursor?: string;
}
```

### 3. Contracts

- Call `reserve(requestedCount)` immediately before the provider. The SQLite
  transaction rejects overflow and increments `used_today` atomically.
- A ticket is single-settlement: `commit(actualCount)` keeps actual usage and
  releases unused units; provider failure, timeout, cancellation, empty result,
  or settlement failure calls `release()`.
- If provider output was already written when cancellation or settlement fails,
  delete all output files before returning the error.
- Public history defaults to 24 records and rejects limits outside `1..50`.
  Order is `(created_at DESC, id DESC)`; the opaque cursor encodes both values,
  and the query requests `limit + 1` only to determine `nextCursor`.
- Public-history records omit reusable reference identifiers. The query must use
  `image_records_public_created_id_idx` rather than scan/sort the whole table.

### 4. Validation & Error Matrix

| Condition                                          | Result                                              |
| -------------------------------------------------- | --------------------------------------------------- |
| `used + requested > effective total`               | 429 `QUOTA_EXHAUSTED`; provider is not called       |
| Provider returns fewer images than reserved        | Commit actual count and release the difference      |
| Provider fails or request is cancelled             | Release full reservation and remove partial outputs |
| Reservation is committed/released twice            | 500 `INTERNAL`; never adjust usage twice            |
| Public `limit` absent                              | Use 24                                              |
| Public `limit` outside `1..50` or cursor malformed | 400 `BAD_REQUEST`                                   |
| Page has more rows                                 | Return at most `limit` records plus `nextCursor`    |

### 5. Good/Base/Bad Cases

- Good: two requests race for one remaining credit; one reserves it and enters
  the provider, while the other receives 429 without a paid call.
- Base: a provider returns one image for a request reserving two; the ticket
  commits one and restores one.
- Good: records with equal timestamps traverse deterministically by descending
  id without duplication between pages.
- Bad: `snapshot().remaining >= count`, provider call, then `consume(count)`;
  concurrent callers can both pass the snapshot check.
- Bad: `SELECT ... WHERE is_public = 1 ORDER BY created_at` without a limit or
  matching composite index blocks the event loop as history grows.

### 6. Tests Required

- Quota service test races two reservations against one remaining unit and
  asserts exactly one succeeds.
- Generation service tests assert failure/cancellation releases the ticket,
  actual-count commit restores unused units, and settlement failure removes
  provider outputs.
- Public-history controller tests assert default/max limits, malformed cursor
  rejection, stable multi-page traversal, and omission of reference ids.
- Schema test or migration check asserts
  `image_records_public_created_id_idx(is_public, created_at, id)` exists.

### 7. Wrong vs Correct

#### Wrong

```ts
quota.ensureAvailable(count);
const result = await provider.generate(input);
quota.consume(result.images.length);
```

#### Correct

```ts
const reservation = quota.reserve(count);
try {
  const result = await provider.generate(input);
  reservation.commit(result.images.length);
  return result;
} catch (error) {
  reservation.release();
  throw error;
}
```

## Local filesystem storage rules (unchanged)

The backend writes three storage classes (a future task may introduce per-user
output directories):

1. **Uploaded reference images** → `tmp/uploads/<uuid>.<ext>`
2. **Generated output images** → `tmp/outputs/<uuid>.<ext>`
3. **Internal demo prompt cache files** → `tmp/outputs/demo-prompt-*.png`
   and `tmp/outputs/demo-prompt-meta-*.json`

Naming and lifecycle are unchanged from previous task; see the prior version
of this file in git history. Key points still in force:

- `crypto.randomUUID()` for filenames; never user-supplied
- Magic-bytes sniffing decides extension (not Content-Type)
- All filesystem helpers in `src/storage/localStorage.ts`; no direct `fs` use
  elsewhere
- `OUTPUT_DIR/<filename>` files are **not** deleted when the matching
  `image_records` row is deleted. Provider outputs are deleted when generation
  is cancelled or quota settlement fails before persistence.

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
