# Backend Directory Structure

> **Status**: Verified against `backend/src/` after task
> `05-11-image-endpoints`. Routes, controllers, services, and the upload
> middleware now exist. Env table reflects actual implementation including
> `UPLOAD_MAX_BYTES`. The `IMAGE_API_BASE_URL` "no `/v1`" convention is
> locked.

---

## Stack

- Runtime: Node.js 20+
- Language: TypeScript (strict mode, ESM)
- HTTP framework: Express 4.x
- Package manager: npm or pnpm (single-folder, no workspace)

The backend lives in `backend/` at the repo root, fully independent from
`frontend/`. There is no shared package — each side owns its own
`package.json`, `tsconfig.json`, and `node_modules/`.

---

## Folder Layout

```
backend/
├── src/
│   ├── index.ts              # Entry: bootstrap Express app, listen on PORT
│   ├── app.ts                # Express app factory (no listen). Test target.
│   ├── config/
│   │   ├── env.ts            # Loads + validates env vars (see below)
│   │   └── auth.ts           # Better Auth instance (Google OAuth + drizzleAdapter)
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
| `GOOGLE_CLIENT_ID` | yes | `...apps.googleusercontent.com` | Configure in Google Cloud Console; redirect URI = `${BETTER_AUTH_URL}/api/auth/callback/google`. |
| `GOOGLE_CLIENT_SECRET` | yes | `<google secret>` | Server-side only. Never log. |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | Allowed CORS origin for cookie-authenticated requests. |
| `SQLITE_PATH` | no | `./data/app.sqlite` | Persistent location for the SQLite file. Directory is auto-created on boot. |
| `DAILY_USER_QUOTA` | no | `20` | Per-user generations allowed per server-local day. |

`.env.example` must list every variable with a placeholder value and a
one-line comment.

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
