# Backend Directory Structure

> **Status**: Verified against `backend/src/` after task
> `05-11-image-endpoints`. Routes, controllers, services, and the upload
> middleware now exist. Env table reflects actual implementation including
> `UPLOAD_MAX_BYTES`. The `IMAGE_API_BASE_URL` "no `/v1`" convention is
> locked.

---

## Stack

- Runtime: Node.js 21.5+ (the `dev` script uses Node's built-in `--env-file`
  flag via tsx; it is GA from Node 21.5)
- Language: TypeScript (strict mode, ESM)
- HTTP framework: Express 4.x
- Package manager: npm or pnpm (single-folder, no workspace)

The backend lives in `backend/` at the repo root, fully independent from
`frontend/`. There is no shared package — each side owns its own
`package.json`, `tsconfig.json`, and `node_modules/`.

## Scenario: backend dev auto-loads `.env`

### 1. Scope / Trigger
- Trigger: backend local-dev env wiring changed through the `package.json`
  command signature.
- Scope: `npm run dev` only, when executed from `backend/`. Production
  `npm run start` does not read dotfiles; production env injection belongs to
  the orchestrator.

### 2. Signatures
```jsonc
{
  "engines": { "node": ">=21.5" },
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "start": "node dist/index.js"
  }
}
```

### 3. Contracts
- `--env-file=.env` is resolved relative to the backend process cwd, so the
  expected file is `backend/.env`.
- `src/config/env.ts` remains the only source boundary for reading and
  validating `process.env`.
- `.env.example` lists the required and optional keys; real `.env` stays
  gitignored.
- Tests do not consume `.env`; `tests/setup.ts` provides test env values.
- No `dotenv` / `dotenv/config` dependency or import is allowed for this path.

### 4. Validation & Error Matrix
| Condition | Expected behavior |
|---|---|
| `npm run dev` with complete `backend/.env` | server boots and logs `server: listening` on `PORT` |
| `.env` missing a required key | `config/env.ts` throws `Missing required environment variable: <KEY>` |
| `dev` script lacks `--env-file=.env` | fresh local boot fails at required-env validation |
| Node `<21.5` runs `dev` | unsupported runtime for this repo; upgrade Node rather than adding `dotenv` |
| Port already in use | startup fails with `EADDRINUSE`; this is not an env-loading failure |

### 5. Good/Base/Bad Cases
- Good: from `backend/`, `npm run dev` loads `backend/.env` without caller-side
  `NODE_OPTIONS`, shell exports, or extra flags.
- Base: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
  remain independent of local `.env`.
- Bad: importing `dotenv/config` in `src/index.ts` or `src/config/env.ts` to
  hide a missing `--env-file` script contract.

### 6. Tests Required
- Static review: `backend/package.json` keeps the exact `dev` script and does
  not change unrelated scripts.
- Backend checks: `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run build` pass.
- Manual local smoke: stop any existing `:3000` listener, run `cd backend &&
  npm run dev`, and confirm the existing pino `server: listening` log appears.

### 7. Wrong vs Correct
#### Wrong
```jsonc
"dev": "tsx watch src/index.ts"
```
```ts
import 'dotenv/config';
```

#### Correct
```jsonc
"dev": "tsx watch --env-file=.env src/index.ts"
```

---

## Folder Layout

```
backend/
├── src/
│   ├── index.ts              # Entry: bootstrap Express app, listen on PORT
│   ├── app.ts                # Express app factory (no listen). Test target.
│   ├── config/
│   │   ├── env.ts            # Loads + validates env vars (see below)
│   │   └── auth.ts           # Better Auth instance (email/password primary, Google OAuth soft-hidden via optional envs)
│   ├── db/
│   │   ├── sqlite.ts         # better-sqlite3 singleton (WAL + foreign_keys)
│   │   ├── drizzle.ts        # drizzle-orm instance + runMigrations() helper
│   │   └── schema.ts         # drizzle schema for all 6 tables
│   ├── routes/
│   │   ├── images.ts         # POST /api/images/generate, /upload — gated by requireAuth
│   │   ├── history.ts        # GET/DELETE /api/history/* — gated by requireAuth
│   │   └── health.ts         # GET /api/health
│   ├── controllers/          # Thin: parse req → call service → format res
│   │   ├── images.controller.ts
│   │   └── history.controller.ts
│   ├── services/             # Business logic. No req/res objects here.
│   │   ├── imageGeneration.service.ts
│   │   ├── userQuota.service.ts             # Per-user daily quota (drizzle queries)
│   │   ├── history.service.ts               # image_records CRUD via drizzle
│   │   ├── quota.service.ts                 # Shared QuotaPool / QuotaSnapshot type contract
│   │   └── providers/
│   │       ├── ImageGenerationProvider.ts   # Interface
│   │       └── TwoApiImageProvider.ts       # MVP concrete impl
│   ├── storage/              # Local filesystem helpers (uploads, outputs)
│   │   └── localStorage.ts
│   ├── middlewares/
│   │   ├── errorHandler.ts   # Final Express error middleware
│   │   ├── requestLogger.ts
│   │   ├── requireAuth.ts    # Validates Better Auth session, attaches req.user
│   │   └── upload.ts         # multer wrapper
│   ├── errors/
│   │   └── AppError.ts       # Tagged error class hierarchy
│   ├── utils/                # Pure helpers only (no I/O, no logger import)
│   ├── types/                # Cross-module TS types/interfaces
│   └── logger.ts             # Configured pino instance, exported singleton
├── tests/                    # Vitest tests. Mirror src/ structure.
├── tmp/                      # Runtime: uploaded refs + generated images
│   ├── uploads/              # Reference images from frontend
│   └── outputs/              # Generated images (cleaned periodically)
├── data/                     # Persistent SQLite file (Better Auth + user_quota + image_records). Gitignored.
├── drizzle/                  # drizzle-kit migration SQL files + meta. Committed.
├── drizzle.config.ts         # drizzle-kit config (schema path, dialect, dbCredentials)
├── .env.example              # Committed. Real .env is gitignored.
├── package.json
├── tsconfig.json
├── eslint.config.js          # Flat config
└── vitest.config.ts
```

### Key rules

- **Routes thin, services fat.** Controllers parse/validate input and shape the
  response; all third-party calls and business logic live in `services/`.
- **Services do not touch `req`/`res`.** They take plain inputs, return plain
  outputs (or throw `AppError`). This makes them unit-testable without an
  Express test harness.
- **`utils/` is for pure, side-effect-free helpers.** If a helper needs the
  logger or fs, it belongs in `services/` or its own dedicated module.
- **`tmp/` is runtime-only and gitignored.** Treat it as ephemeral; never
  rely on a file persisting across restarts.
- **No `index.ts` barrel files.** Import from explicit module paths so
  IDE go-to-definition and tree-shaking work cleanly.

---

## Environment variables

Loaded once in `src/config/env.ts` via `zod` (or manual validation), then
imported elsewhere as a typed object. **Never read `process.env.X` directly
outside `config/env.ts`.**

| Variable | Required | Example | Notes |
|---|---|---|---|
| `PORT` | no | `3000` | Default 3000 |
| `IMAGE_API_BASE_URL` | yes | `https://api.2api.example` | 2API reverse-proxy origin. **No `/v1` suffix and no trailing slash** — `TwoApiImageProvider` always appends `/v1/images/generations`. Trailing slashes are stripped before concat, so `https://x.com/` and `https://x.com///` are tolerated, but a base URL that already includes `/v1` will produce a double-`/v1` URL. |
| `IMAGE_API_KEY` | yes | `sk-...` | Server-side only. Never log. |
| `IMAGE_MODEL` | no | `gpt-image-2` | Default `gpt-image-2` |
| `IMAGE_API_TIMEOUT_MS` | no | `120000` | Default 120000 (2 min). Must be a positive integer; non-numeric or `<= 0` → throw on `config/env.ts` import. |
| `UPLOAD_DIR` | no | `./tmp/uploads` | Default `./tmp/uploads` |
| `UPLOAD_MAX_BYTES` | no | `10485760` | Default 10 MiB. Multer `limits.fileSize`. Positive integer; non-numeric or `<= 0` → throw on import. Oversize uploads → `AppError(PAYLOAD_TOO_LARGE, 413)`. |
| `OUTPUT_DIR` | no | `./tmp/outputs` | Default `./tmp/outputs` |
| `LOG_LEVEL` | no | `info` | pino level |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Vite dev origin (legacy — superseded by `FRONTEND_ORIGIN` once auth shipped, kept for migration). |
| `BETTER_AUTH_URL` | no | `http://localhost:3000` | Backend origin used to build OAuth callback URLs. |
| `BETTER_AUTH_SECRET` | yes | `<32+ char random>` | Cookie-signing secret. Generate with `openssl rand -base64 32`. Never log. |
| `GOOGLE_CLIENT_ID` | no | `...apps.googleusercontent.com` | Optional. If unset, `socialProviders.google` is NOT mounted on the Better Auth instance — the Google login surface is soft-hidden. Must be set together with `GOOGLE_CLIENT_SECRET` to re-enable. Redirect URI when set: `${BETTER_AUTH_URL}/api/auth/callback/google`. |
| `GOOGLE_CLIENT_SECRET` | no | `<google secret>` | Optional, paired with `GOOGLE_CLIENT_ID`. Server-side only. Never log. |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | Allowed CORS origin for cookie-authenticated requests. |
| `SQLITE_PATH` | no | `./data/app.sqlite` | Persistent location for the SQLite file. Directory is auto-created on boot. |
| `DAILY_USER_QUOTA` | no | `20` | Per-user generations allowed per server-local day. |

`.env.example` must list every variable with a placeholder value and a
one-line comment.

## Scenario: outbound AI provider authorization headers

### 1. Scope / Trigger
- Trigger: any outbound `TwoApiImageProvider` call to the configured
  OpenAI-compatible `/v1/*` AI image API.
- Scope: currently `POST /v1/images/generations` and
  `POST /v1/images/edits`. Do not add `/v1/models`,
  `/v1/chat/completions`, or `/v1/responses` support unless a dedicated task
  requests it.

### 2. Signatures
- Auth header: `Authorization: Bearer ${env.IMAGE_API_KEY}` on every provider
  `fetch` call.
- Generations: JSON body to `/v1/images/generations` with
  `'content-type': 'application/json'`.
- Edits: `FormData` body to `/v1/images/edits` with no manual `content-type`
  header.

### 3. Contracts
- `IMAGE_API_KEY` stays server-side and is never logged directly or as a
  computed bearer token.
- The provider fetch-options object uses the canonical `Authorization` header
  key; tests assert the same spelling.
- Multipart boundaries are owned by undici/FormData. Manually setting
  `content-type` for edits is forbidden.
- Routes and controllers never read or forward the API key; provider code owns
  outbound provider authentication.

### 4. Validation & Error Matrix
| Condition | Expected behavior |
|---|---|
| Text-to-image request | Outbound headers include `Authorization: Bearer <key>` and JSON `content-type` |
| Image-to-image request | Outbound headers include `Authorization: Bearer <key>` and no manual `content-type` |
| Missing `IMAGE_API_KEY` | `config/env.ts` required-env validation fails before provider construction |
| Provider returns 401/403 | Existing non-2xx mapping returns `PROVIDER_ERROR` 502 without logging the token |

### 5. Tests Required
- Unit: text-to-image provider call asserts
  `headers['Authorization'] === 'Bearer sk-test'`.
- Unit: image-to-image provider call asserts
  `headers['Authorization'] === 'Bearer sk-test'`.
- Unit: image-to-image provider call asserts `headers['content-type']` is
  `undefined`.
- Backend checks: `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run build` pass.

### 6. Wrong vs Correct
#### Wrong
```ts
headers: { authorization: `Bearer ${apiKey}` };
headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'multipart/form-data' };
```

#### Correct
```ts
headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` };
headers: { Authorization: `Bearer ${apiKey}` };
```

## Scenario: per-user daily image quota

### 1. Scope / Trigger
- Trigger: authenticated image generation consumes a per-user quota backed by
  SQLite.
- Scope: `GET /api/images/quota` and `POST /api/images/generate` for logged-in
  users. Unauthenticated users are rejected before quota logic runs.

### 2. Signatures
- Env: `DAILY_USER_QUOTA` optional positive integer, default `20`.
- API response: `GET /api/images/quota -> 200 { total: number, remaining: number }`.
- Service contract: `createUserQuotaService().forUser(userId)` returns a
  `QuotaPool` with `snapshot()`, `ensureAvailable(count)`, and `consume(count)`.
- DB row: `user_quota(user_id TEXT PRIMARY KEY, used_today INTEGER,
  quota_date TEXT)` where `quota_date` is server-local `YYYY-MM-DD`.

### 3. Contracts
- Backend is the source of truth for quota exhaustion; frontend labels are UX
  only.
- `snapshot()` treats a missing row or stale `quota_date` as `used_today = 0`
  for today's server-local date.
- `consume(count)` runs in a transaction, validates the requested count against
  today's effective usage, then upserts today's `used_today` and `quota_date`.
- Successful generation decrements by the requested image count. Failed provider
  calls must not consume quota.

### 4. Validation & Error Matrix
| Condition | Expected behavior |
|---|---|
| Fresh logged-in user | `GET /api/images/quota` returns `{ total: 20, remaining: 20 }` by default |
| Same user generates `count = 2` | Next quota response has `remaining = 18` |
| Stored row has yesterday/old `quota_date` | Today starts from `remaining = total` |
| Request would exceed remaining quota | Throw `AppError('QUOTA_EXHAUSTED', ..., 429)` with `requested`, `remaining`, `total` details |
| Different user consumes quota | Other users' quota rows are unaffected |

### 5. Good/Base/Bad Cases
- Good: quota resets automatically when the server-local date changes, without a
  cron job or client-side clock.
- Base: `DAILY_USER_QUOTA=20` means every authenticated user starts each day at
  20 available generated images.
- Bad: trusting a frontend-displayed remaining number to authorize generation.
  Always call backend quota logic before consuming provider capacity.

### 6. Tests Required
- Integration: quota endpoint returns 20/20 for a fresh authenticated user.
- Integration: generating two images changes remaining from 20 to 18.
- Integration: quota is isolated across users.
- Regression: a stale `quota_date` row is ignored for today's snapshot and is
  overwritten after successful generation.
- Error path: over-quota generation returns `QUOTA_EXHAUSTED` with 429.

### 7. Wrong vs Correct
#### Wrong
```ts
const remaining = row ? env.DAILY_USER_QUOTA - row.usedToday : env.DAILY_USER_QUOTA;
```

#### Correct
```ts
const used = !row || row.quotaDate !== todayISO() ? 0 : row.usedToday;
const remaining = Math.max(0, env.DAILY_USER_QUOTA - used);
```

### Convention: Soft-hide optional integrations via env presence

**What**: When an integration (OAuth provider, third-party API, etc.) is
optional for the MVP but kept in source for future re-enable, gate its
registration on whether its env vars are populated. Do NOT register the
integration with empty / placeholder values, and do NOT remove the code.

**Why**: Better Auth and similar libraries reject registration with empty
strings at boot time. Registering with `{}` is also wrong — it may pass
type checks but fail at first request with an unhelpful runtime error.
Source-gating keeps the integration trivially re-enableable (one env edit)
without code review.

**Example** (the locked pattern from `config/auth.ts`):
```ts
const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const auth = betterAuth({
  // ...
  emailAndPassword: { enabled: true },
  ...(socialProviders ? { socialProviders } : {}),
});
```

**Caller-side rule**: The env vars MUST be marked optional in `config/env.ts`
(typed `string | undefined`) and their `.env.example` row must say `Optional`
in the Notes column. The corresponding spec env table row uses `no` in the
Required column.

---

## Forbidden patterns

- ❌ Importing `express` types inside `services/` — services must be
  framework-agnostic.
- ❌ Calling `IMAGE_API_KEY` from any route handler. Only
  `services/providers/TwoApiImageProvider.ts` reads it.
- ❌ Writing files outside `tmp/`. Output paths must always be derived from
  `OUTPUT_DIR` / `UPLOAD_DIR`.
- ❌ Putting business logic in `middlewares/`. Middlewares are for
  cross-cutting concerns (auth, logging, error mapping) only.

---

## Open questions to resolve when first implementation lands

- Whether to add a `jobs/` folder for async generation (current MVP assumes
  synchronous request → response).
- Whether `tmp/` cleanup runs in-process (cron) or via an external script.
