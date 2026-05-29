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

## Scenario: backend dev and migration commands auto-load `.env`

### 1. Scope / Trigger

- Trigger: backend local-dev and local-migration env wiring changed through the
  `package.json` command signatures.
- Scope: `npm run dev` and `npm run db:migrate`, when executed from `backend/` or
  through `npm --prefix backend ...`. Production `npm run start` does not read
  dotfiles; production env injection belongs to the orchestrator.

### 2. Signatures

```jsonc
{
  "engines": { "node": ">=21.5" },
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "db:migrate": "tsx --env-file=.env -e \"import { runMigrations } from './src/db/drizzle.ts'; runMigrations();\"",
    "start": "node dist/index.js",
  },
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

| Condition                                    | Expected behavior                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev` with complete `backend/.env`   | server boots and logs `server: listening` on `PORT`                         |
| `npm run db:migrate` with complete `.env`    | migrations run against `SQLITE_PATH` and log `drizzle: migrations applied`  |
| `.env` missing a required key                | `config/env.ts` throws `Missing required environment variable: <KEY>`       |
| `dev` / `db:migrate` lacks `--env-file=.env` | fresh local command fails at required-env validation                        |
| Node `<21.5` runs `dev`                      | unsupported runtime for this repo; upgrade Node rather than adding `dotenv` |
| Port already in use                          | startup fails with `EADDRINUSE`; this is not an env-loading failure         |

### 5. Good/Base/Bad Cases

- Good: from `backend/`, `npm run dev` loads `backend/.env` without caller-side
  `NODE_OPTIONS`, shell exports, or extra flags.
- Base: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
  remain independent of local `.env`; `db:migrate` loads `.env` because the
  database path and required env validation live behind the same config boundary.
- Bad: importing `dotenv/config` in `src/index.ts` or `src/config/env.ts` to
  hide a missing `--env-file` script contract.

### 6. Tests Required

- Static review: `backend/package.json` keeps the exact `dev` and `db:migrate`
  scripts and does not change unrelated scripts.
- Backend checks: `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run build` pass.
- Manual local smoke: stop any existing `:3000` listener, run `cd backend &&
npm run dev`, and confirm the existing pino `server: listening` log appears.
- Migration smoke: `npm --prefix backend run db:migrate` succeeds with local
  `backend/.env` and logs `drizzle: migrations applied`.

### 7. Wrong vs Correct

#### Wrong

```jsonc
"dev": "tsx watch src/index.ts",
"db:migrate": "tsx -e \"import { runMigrations } from './src/db/drizzle.js'; runMigrations();\""
```

```ts
import "dotenv/config";
```

#### Correct

```jsonc
"dev": "tsx watch --env-file=.env src/index.ts",
"db:migrate": "tsx --env-file=.env -e \"import { runMigrations } from './src/db/drizzle.ts'; runMigrations();\""
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
│   │   └── auth.ts           # Better Auth instance (username/password primary, Google OAuth soft-hidden via optional envs)
│   ├── db/
│   │   ├── sqlite.ts         # better-sqlite3 singleton (WAL + foreign_keys)
│   │   ├── drizzle.ts        # drizzle-orm instance + runMigrations() helper
│   │   └── schema.ts         # drizzle schema for all 6 tables
│   ├── routes/
│   │   ├── auth.ts           # Username auth wrapper: sign-up/username and email-auth rejection
│   │   ├── images.ts         # POST /api/images/generate, /upload — gated by requireAuth
│   │   ├── history.ts        # GET /api/history/public is public; owner history/delete routes are gated by requireAuth
│   │   ├── openaiCompat.ts   # OpenAI-compatible /v1 image API — gated by openaiCompatAuth
│   │   └── health.ts         # GET /api/health
│   ├── controllers/          # Thin: parse req → call service → format res
│   │   ├── images.controller.ts
│   │   ├── history.controller.ts
│   │   └── openaiCompat.controller.ts
│   ├── services/             # Business logic. No req/res objects here.
│   │   ├── defaultAdminSeed.service.ts      # Gated local/demo admin seed via Better Auth API
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
│   │   ├── openaiCompatAuth.ts # Validates Authorization: Bearer OPENAI_COMPAT_API_KEY for /v1
│   │   ├── requestLogger.ts
│   │   ├── requireAuth.ts    # Validates Better Auth session, attaches req.user
│   │   └── upload.ts         # multer wrapper
│   ├── errors/
│   │   └── AppError.ts       # Tagged error class hierarchy
│   ├── utils/                # Pure helpers only (no I/O, no logger import)
│   │   └── username.ts       # Username normalization, validation, internal email helper
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

| Variable                | Required | Example                         | Notes                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                  | no       | `3000`                          | Default 3000                                                                                                                                                                                                                                                                                                             |
| `IMAGE_API_BASE_URL`    | yes      | `https://api.2api.example`      | 2API reverse-proxy origin. **No `/v1` suffix and no trailing slash** — `TwoApiImageProvider` always appends `/v1/images/generations`. Trailing slashes are stripped before concat, so `https://x.com/` and `https://x.com///` are tolerated, but a base URL that already includes `/v1` will produce a double-`/v1` URL. |
| `IMAGE_API_KEY`         | yes      | `sk-...`                        | Server-side only provider key. Never log or expose to API clients.                                                                                                                                                                                                                                                       |
| `OPENAI_COMPAT_API_KEY` | yes      | `ref2img_...`                   | Inbound bearer token for OpenAI-compatible `/v1/*` clients. Never log.                                                                                                                                                                                                                                                   |
| `IMAGE_MODEL`           | no       | `gpt-image-2`                   | Default `gpt-image-2`                                                                                                                                                                                                                                                                                                    |
| `IMAGE_API_TIMEOUT_MS`  | no       | `120000`                        | Default 120000 (2 min). Must be a positive integer; non-numeric or `<= 0` → throw on `config/env.ts` import.                                                                                                                                                                                                             |
| `UPLOAD_DIR`            | no       | `./tmp/uploads`                 | Default `./tmp/uploads`                                                                                                                                                                                                                                                                                                  |
| `UPLOAD_MAX_BYTES`      | no       | `10485760`                      | Default 10 MiB. Multer `limits.fileSize`. Positive integer; non-numeric or `<= 0` → throw on import. Oversize uploads → `AppError(PAYLOAD_TOO_LARGE, 413)`.                                                                                                                                                              |
| `OUTPUT_DIR`            | no       | `./tmp/outputs`                 | Default `./tmp/outputs`                                                                                                                                                                                                                                                                                                  |
| `LOG_LEVEL`             | no       | `info`                          | pino level                                                                                                                                                                                                                                                                                                               |
| `CORS_ORIGIN`           | no       | `http://localhost:5173`         | Vite dev origin (legacy — superseded by `FRONTEND_ORIGIN` once auth shipped, kept for migration).                                                                                                                                                                                                                        |
| `BETTER_AUTH_URL`       | no       | `http://localhost:3000`         | Backend origin used to build OAuth callback URLs.                                                                                                                                                                                                                                                                        |
| `BETTER_AUTH_SECRET`    | yes      | `<32+ char random>`             | Cookie-signing secret. Generate with `openssl rand -base64 32`. Never log.                                                                                                                                                                                                                                               |
| `GOOGLE_CLIENT_ID`      | no       | `...apps.googleusercontent.com` | Optional. If unset, `socialProviders.google` is NOT mounted on the Better Auth instance — the Google login surface is soft-hidden. Must be set together with `GOOGLE_CLIENT_SECRET` to re-enable. Redirect URI when set: `${BETTER_AUTH_URL}/api/auth/callback/google`.                                                  |
| `GOOGLE_CLIENT_SECRET`  | no       | `<google secret>`               | Optional, paired with `GOOGLE_CLIENT_ID`. Server-side only. Never log.                                                                                                                                                                                                                                                   |
| `FRONTEND_ORIGIN`       | no       | `http://localhost:5173`         | Allowed CORS origin for cookie-authenticated requests.                                                                                                                                                                                                                                                                   |
| `SQLITE_PATH`           | no       | `./data/app.sqlite`             | Persistent location for the SQLite file. Directory is auto-created on boot.                                                                                                                                                                                                                                              |
| `DAILY_USER_QUOTA`      | no       | `20`                            | Per-user generations allowed per server-local day.                                                                                                                                                                                                                                                                       |

`.env.example` must list every variable with a placeholder value and a
one-line comment.

## Scenario: Docker-internal image provider routing

### 1. Scope / Trigger

- Trigger: production image generation calls to the provider can run longer than
  public proxy idle limits. Routing backend → provider through a public
  Cloudflare/Caddy hostname can turn a healthy long-running provider request
  into a `524` / `PROVIDER_ERROR` or a backend `PROVIDER_TIMEOUT`.
- Scope: Docker Compose production deployments where the provider runs in a
  sibling Docker Compose project, such as `chatgpt2api`.

### 2. Signatures

`docker-compose.yml` attaches the backend to an external provider network:

```yaml
services:
  backend:
    networks:
      default:
      provider:
        aliases:
          - ref2image-backend

networks:
  provider:
    name: ${PROVIDER_NETWORK:-chatgpt2api_default}
    external: true
```

Production `.env` should use the provider service DNS name:

```env
IMAGE_API_BASE_URL=http://chatgpt2api
PROVIDER_NETWORK=chatgpt2api_default
IMAGE_API_TIMEOUT_MS=240000
```

### 3. Contracts

- `IMAGE_API_BASE_URL` still has **no `/v1` suffix**; the provider code appends
  `/v1/images/generations` or `/v1/images/edits`.
- `PROVIDER_NETWORK` names an existing Docker network. Compose fails fast if
  the external network is missing.
- The provider service must have a Docker DNS alias matching the base URL host
  (`chatgpt2api` in production). This avoids public DNS, Cloudflare, and Caddy
  for backend-to-provider calls.
- `IMAGE_API_TIMEOUT_MS` must stay below the outer client-facing proxy timeout
  for `/api/*`. For the current `pic.chen08.de` Caddy route, the proxy timeout
  is 300 seconds, so 240000ms is the production ceiling unless Caddy changes.

### 4. Validation & Error Matrix

| Condition                                                                             | Expected behavior                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Backend is attached to `PROVIDER_NETWORK` and `IMAGE_API_BASE_URL=http://chatgpt2api` | Provider calls stay on Docker bridge networking                        |
| Backend uses `https://gpt.chen08.de` for long image edits                             | Cloudflare may return `524`; backend maps this to `PROVIDER_ERROR` 502 |
| `IMAGE_API_TIMEOUT_MS` is too low                                                     | Backend returns `PROVIDER_TIMEOUT` 504 before the provider finishes    |
| `PROVIDER_NETWORK` does not exist                                                     | `docker compose up` fails before starting backend                      |
| Provider DNS alias is wrong                                                           | Backend fetch fails and maps to `PROVIDER_ERROR` 502                   |

### 5. Good/Base/Bad Cases

- Good: backend joins `chatgpt2api_default`, uses
  `IMAGE_API_BASE_URL=http://chatgpt2api`, and direct container smoke
  `fetch("$IMAGE_API_BASE_URL/v1/models")` reaches the provider.
- Base: local demos may still use a public HTTPS provider URL when the provider
  is truly external and not a sibling container.
- Bad: a production backend calls a local provider through a public Cloudflare
  hostname, then increases backend timeout above the public proxy limit. The
  request still dies at the proxy boundary.

### 6. Tests Required

- `docker compose config` must show backend on both `default` and `provider`
  networks.
- Container smoke after deployment:
  `docker compose exec backend node -e "fetch(process.env.IMAGE_API_BASE_URL + '/v1/models', { headers: { Authorization: 'Bearer test' }, signal: AbortSignal.timeout(5000) }).then(r => console.log(r.status))"`.
  A provider auth response such as `401` is acceptable; DNS/network failure is
  not.
- `docker compose ps` must show backend healthy after recreation.
- Backend logs for provider requests should show `url` beginning with
  `http://chatgpt2api/v1/images/...`, not the public hostname.

### 7. Wrong vs Correct

#### Wrong

```env
IMAGE_API_BASE_URL=https://gpt.chen08.de
IMAGE_API_TIMEOUT_MS=240000
```

#### Correct

```env
IMAGE_API_BASE_URL=http://chatgpt2api
PROVIDER_NETWORK=chatgpt2api_default
IMAGE_API_TIMEOUT_MS=240000
```

## Scenario: OpenAI-compatible inbound `/v1` image API

### 1. Scope / Trigger

- Trigger: exposing an API-key-authenticated OpenAI-compatible image surface from
  the backend.
- Scope: `GET /v1/models`, `POST /v1/images/generations`,
  `POST /v1/images/edits`, image-scene `POST /v1/chat/completions`, and
  image-scene `POST /v1/responses`.

### 2. Signatures

- Env: `OPENAI_COMPAT_API_KEY` is required and validates inbound
  `Authorization: Bearer <token>` on `/v1/*`.
- App wiring: `createApp({ provider })` mounts `buildOpenAICompatRouter()` at
  `/v1` before the first-party `/api/*` routers.
- Auth middleware: `openaiCompatAuth(req, res, next)` accepts only bearer tokens
  that timing-safe-equal `env.OPENAI_COMPAT_API_KEY`.
- Models response: `GET /v1/models -> 200 { object: "list", data: Model[] }`.
- Images response: `/v1/images/generations` and `/v1/images/edits` return
  `{ created: number, data: Array<{ b64_json?: string; url?: string }> }`.

### 3. Contracts

- `IMAGE_API_KEY` remains provider-only. Do not use it for inbound `/v1` client
  auth, and do not expose it to clients.
- `/v1/*` does not use Better Auth session cookies and does not consume
  per-user daily quota. It is an API-key surface, separate from `/api/images/*`.
- Route handlers reuse `generateImage()`; controllers must not duplicate
  provider HTTP calls.
- `n` maps to `count`; default `1`; valid range is `1..MAX_COUNT` (currently 2).
  Reject out-of-range values instead of clamping.
- `size` maps exactly to existing aspect ratios:
  `auto|1024x1024 -> 1:1`, `1536x1024 -> 3:2`, `1024x1536 -> 2:3`,
  `1792x1024 -> 16:9`, `1024x1792 -> 9:16`.
- `response_format` supports `b64_json` and `url`; default `b64_json` for
  `/v1/images/*`.
- `POST /v1/images/edits` supports one uploaded `image` file only. Mask files,
  multiple image files, and remote URL fetching are out of scope.
- Chat Completions has no official generated-image output object; image-scene
  compatibility returns a normal `chat.completion` with Markdown output URLs in
  `choices[0].message.content`.
- Responses image output uses `output[]` items of type `image_generation_call`
  with base64 `result`; an additional message item may expose local output URLs.

### 4. Validation & Error Matrix

| Condition                                     | Expected behavior                                      |
| --------------------------------------------- | ------------------------------------------------------ |
| Missing / non-bearer / wrong `/v1` auth       | `AppError('UNAUTHORIZED', ..., 401)` before generation |
| Missing or blank prompt                       | `BAD_REQUEST` 400 with safe details                    |
| `n > MAX_COUNT` or non-integer `n`            | `BAD_REQUEST` 400; provider not called                 |
| Unsupported `size`                            | `BAD_REQUEST` 400 with `details.size`                  |
| `stream: true` or `partial_images`            | `BAD_REQUEST` 400; streaming is unsupported            |
| Edit request missing `image`                  | `BAD_REQUEST` 400                                      |
| Edit request has `mask` or multiple images    | `BAD_REQUEST` 400                                      |
| Uploaded bytes are not PNG/JPEG/WebP          | `UNSUPPORTED_MEDIA_TYPE` 415                           |
| Chat/responses image URL is remote `http(s)`  | `BAD_REQUEST` 400; never fetch user URLs server-side   |
| Data URL reference exceeds `UPLOAD_MAX_BYTES` | `PAYLOAD_TOO_LARGE` 413                                |

### 5. Good/Base/Bad Cases

- Good: `Authorization: Bearer <OPENAI_COMPAT_API_KEY>` +
  `POST /v1/images/generations { prompt, n: 2 }` returns two OpenAI image items.
- Base: `GET /v1/models` returns the fixed local compatibility model list without
  contacting the upstream provider.
- Bad: reusing `IMAGE_API_KEY` for inbound `/v1` auth, silently clamping
  `n = 10` to `2`, or fetching arbitrary remote image URLs from user input.

### 6. Tests Required

- Integration: every `/v1` endpoint rejects missing, non-bearer, and wrong
  bearer auth without calling the provider.
- Integration: `/v1/models` returns all required model IDs in order.
- Integration: generations supports `n = 2`, `b64_json`, `url`, size mapping,
  and typed failures.
- Integration: edits supports one uploaded reference image and rejects missing
  image, mask, multiple images, bad bytes, invalid size, and invalid `n`.
- Integration: chat/responses parse text prompts, reject remote URLs, accept
  local data image URLs, and produce the documented envelopes.
- Backend checks: `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run build`, and `git diff --check` pass for task changes.

### 7. Wrong vs Correct

#### Wrong

```ts
// Inbound API clients must not authenticate with the upstream provider key.
if (token !== env.IMAGE_API_KEY) throw new AppError("UNAUTHORIZED", "...", 401);

// Never fetch user-provided remote image URLs from API requests.
const bytes = await fetch(imageUrl).then((res) => res.arrayBuffer());
```

#### Correct

```ts
if (
  !timingSafeEqual(Buffer.from(token), Buffer.from(env.OPENAI_COMPAT_API_KEY))
) {
  throw new AppError("UNAUTHORIZED", "Invalid Authorization bearer token", 401);
}

if (url.startsWith("http://") || url.startsWith("https://")) {
  throw new AppError("BAD_REQUEST", "Remote image URLs are not supported", 400);
}
```

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

| Condition                | Expected behavior                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Text-to-image request    | Outbound headers include `Authorization: Bearer <key>` and JSON `content-type`      |
| Image-to-image request   | Outbound headers include `Authorization: Bearer <key>` and no manual `content-type` |
| Missing `IMAGE_API_KEY`  | `config/env.ts` required-env validation fails before provider construction          |
| Provider returns 401/403 | Existing non-2xx mapping returns `PROVIDER_ERROR` 502 without logging the token     |

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

## Scenario: first-party public gallery flag

### 1. Scope / Trigger

- Trigger: the authenticated generation API gained a cross-layer visibility flag
  that is persisted in SQLite and consumed by the homepage gallery.
- Scope: `POST /api/images/generate`, `GET /api/history`,
  `GET /api/history/public`, `image_records`, and frontend hydration of public
  gallery records.

### 2. Signatures

- Request: `POST /api/images/generate` accepts optional JSON field
  `isPublic?: boolean` alongside `prompt`, `referenceId`, `model`, `count`, and
  `aspectRatio`.
- DB row: `image_records.is_public INTEGER NOT NULL DEFAULT false`.
- History DTO: `ImageRecordDTO` includes required `isPublic: boolean`.
- Public gallery: `GET /api/history/public` returns `{ records: ImageRecordDTO[] }`
  for every record where `isPublic === true`.
- Migration: add an explicit drizzle SQL migration for `is_public`; do not rely on
  runtime schema drift.

### 3. Contracts

- Omitted `isPublic` means `false`; private is the safe default.
- `isPublic` is record-level, and every image in the same generation batch is
  persisted with the same value from the request.
- `/api/history` remains the owner-scoped source of truth and returns both public
  and private records for asset management and deletion.
- `/api/history/public` is read-only, does not require auth, and must only return
  records with `isPublic === true` from all accounts.

### 4. Validation & Error Matrix

| Condition                      | Expected behavior                                            |
| ------------------------------ | ------------------------------------------------------------ |
| `isPublic` omitted             | Persist `false` and return `isPublic: false` in history      |
| `isPublic: true`               | Persist `true` for every generated image record in the batch |
| `isPublic` is not boolean      | Zod rejects request with `BAD_REQUEST` 400                   |
| Anonymous public gallery fetch | `GET /api/history/public` returns public records only        |
| History row predates migration | Migration default makes returned DTO `isPublic: false`       |

### 5. Good/Base/Bad Cases

- Good: user enables `公开`, generation succeeds, `/api/history` returns owned
  records with `isPublic: true`, and `/api/history/public` exposes them in the
  homepage gallery for every account.
- Base: user leaves `公开` off, generated records still appear in image management
  but not in the public gallery.
- Bad: deriving public/private state from prompt text, frontend-only state, or a
  separate unpersisted list.

### 6. Tests Required

- Integration: `POST /api/images/generate { isPublic: true }` persists history
  rows with `isPublic: true`.
- Integration: omitted `isPublic` returns private history records.
- Integration: `GET /api/history/public` returns all accounts' public records
  without private records.
- Frontend: generation request includes `isPublic` when the composer toggle is
  enabled.
- Frontend: homepage gallery receives public entries from `usePublicGallery`
  while image management keeps the owner-scoped history list.

### 7. Wrong vs Correct

#### Wrong

```ts
// Public state disappears after refresh and cannot be audited.
const galleryEntries = generatedEntries;
```

#### Correct

```ts
const records: NewImageRecord[] = result.images.map((image) => ({
  // ...metadata,
  isPublic: parsed.isPublic ?? false,
}));
```

---

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

| Condition                                 | Expected behavior                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Fresh logged-in user                      | `GET /api/images/quota` returns `{ total: 20, remaining: 20 }` by default                    |
| Same user generates `count = 2`           | Next quota response has `remaining = 18`                                                     |
| Stored row has yesterday/old `quota_date` | Today starts from `remaining = total`                                                        |
| Request would exceed remaining quota      | Throw `AppError('QUOTA_EXHAUSTED', ..., 429)` with `requested`, `remaining`, `total` details |
| Different user consumes quota             | Other users' quota rows are unaffected                                                       |

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
const remaining = row
  ? env.DAILY_USER_QUOTA - row.usedToday
  : env.DAILY_USER_QUOTA;
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
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
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
- ❌ Calling `IMAGE_API_KEY` from any route handler or inbound auth middleware.
  Only `services/providers/TwoApiImageProvider.ts` reads it. `/v1/*` clients
  authenticate with `OPENAI_COMPAT_API_KEY` instead.
- ❌ Writing files outside `tmp/`. Output paths must always be derived from
  `OUTPUT_DIR` / `UPLOAD_DIR`.
- ❌ Putting business logic in `middlewares/`. Middlewares are for
  cross-cutting concerns (auth, logging, error mapping) only.

---

## Open questions to resolve when first implementation lands

- Whether to add a `jobs/` folder for async generation (current MVP assumes
  synchronous request → response).
- Whether `tmp/` cleanup runs in-process (cron) or via an external script.
