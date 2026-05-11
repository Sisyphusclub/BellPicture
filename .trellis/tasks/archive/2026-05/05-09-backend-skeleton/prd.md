# Backend skeleton: Express + 2API provider

## Goal

Stand up the backend codebase from zero so subsequent feature tasks have a
runnable Express server, the agreed folder structure, the typed
`ImageGenerationProvider` boundary with `TwoApiImageProvider` wired in,
and all quality tooling (lint / format / type-check / test / pre-commit)
green on day one. No real frontend integration yet — the goal is "I can
`npm run dev` the backend and curl `/api/health`, and the test suite
passes."

---

## What I already know

From bootstrap spec (`.trellis/spec/backend/`):

- **Stack**: Node.js 20+, TypeScript (strict, ESM), Express 4, pino
- **Folder layout** (locked): `src/{index,app,config/env,routes,controllers,services/providers,storage,middlewares,errors,utils,types,logger}.ts`
- **Env vars**: `IMAGE_API_BASE_URL`, `IMAGE_API_KEY`, `IMAGE_MODEL` (default `gpt-image-2`), `IMAGE_API_TIMEOUT_MS` (default 120000), `PORT`, `LOG_LEVEL`, `CORS_ORIGIN`, `UPLOAD_DIR`, `OUTPUT_DIR`
- **Error model**: tagged `AppError` + final error middleware → `{ error: { code, message, requestId } }`
- **Provider boundary**: `ImageGenerationProvider` interface in `services/providers/`. MVP-only concrete: `TwoApiImageProvider`.
- **No DB**. Local fs only under `tmp/{uploads,outputs}`.
- **Frontend lives in `frontend/`** as a separate package; this task does not touch it.

Project state right now:

- Repo root contains only `.trellis/`, `.agents/`, `.codex/`, `.claude/`, `AGENTS.md`. No `backend/` folder yet.
- Not a git repo. `git init` is part of this task.

---

## Decisions locked

- **Endpoint scope = `/api/health` only**. All image endpoints deferred to task 2. Multer + validation library (zod) deferred — no user-input endpoints.
- **`TwoApiImageProvider` = fully written**. Real `fetch` + timeout + error mapping land here; exercised by unit tests with stubbed `fetch`. Not called from any route yet.
- **2API contract = OpenAI Images API compatible**:
  - `POST {IMAGE_API_BASE_URL}/v1/images/generations`
  - Header: `Authorization: Bearer ${IMAGE_API_KEY}`
  - Body: `{ model, prompt, n: 1, size: "1024x1024", response_format: "b64_json" }`
  - Response: `{ created, data: [{ b64_json, revised_prompt? }] }`
  - Provider decodes base64 → writes `OUTPUT_DIR/<uuid>.png` → returns `{ outputPath, width, height }`.
  - URL composition uses `new URL('v1/images/generations', base)` so trailing-slash variants in `IMAGE_API_BASE_URL` are tolerated.
- **Image-to-image deferred to task 2.** Provider interface keeps an optional `referencePath` field; passing it now → `AppError('BAD_REQUEST', 'Reference image not yet supported', 400)`.
- **Pre-commit runner = `husky + lint-staged`.** Spec quality-guidelines.md gets updated in Phase 3.3 (drop the lefthook variant).
- **Dockerfile + CI deferred** to a future task.
- **`git init` included** in this task — root `.gitignore` + `backend/.gitignore`, first commit, default branch `main`, no remote.
- **CORS middleware enabled** in `app.ts` reading `CORS_ORIGIN`. Lets task 2 frontend probe land cleanly.
- **Graceful shutdown** in `index.ts` — SIGTERM/SIGINT closes the HTTP server before `process.exit`.

---

## Requirements

### Filesystem skeleton (new)

- `backend/package.json` with scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `test`, `test:watch`, `prepare` (husky install).
- `backend/tsconfig.json` per backend `quality-guidelines.md` strict settings.
- `backend/eslint.config.js` (flat) with rules from spec.
- `backend/.prettierrc`, `backend/.prettierignore`.
- `backend/vitest.config.ts` (Node env, coverage off by default).
- `backend/.env.example` listing every env var with defaults + 1-line comments.
- `backend/.gitignore` (`node_modules/`, `dist/`, `.env`, `tmp/`, IDE folders).
- Root `.gitignore` (covers all of repo, including the same backend-local paths).

### Source modules

- `src/index.ts` — bootstrap: read env, build provider, build app, listen on `PORT`, register SIGTERM/SIGINT graceful shutdown.
- `src/app.ts` — `createApp(deps: { provider: ImageGenerationProvider }): Express`. Wires: requestLogger → CORS → JSON parser → routes → final errorHandler.
- `src/config/env.ts` — parse + validate `process.env`; export typed `env` const. Missing required vars → throws on import (server fails fast).
- `src/logger.ts` — pino singleton with redact list per spec.
- `src/middlewares/requestLogger.ts` — assigns `req.requestId`, logs inbound + outbound (uses pino child).
- `src/middlewares/errorHandler.ts` — final middleware per spec error-handling.md.
- `src/errors/AppError.ts` — class + `ErrorCode` union (`BAD_REQUEST | UNSUPPORTED_MEDIA_TYPE | PAYLOAD_TOO_LARGE | PROVIDER_ERROR | PROVIDER_TIMEOUT | STORAGE_ERROR | INTERNAL`).
- `src/routes/health.ts` — `GET /api/health` → `{ status: 'ok', uptimeSec, version }` (version from `package.json`).
- `src/types/image.ts` — `GenerateInput`, `GenerateOutput`.
- `src/services/providers/ImageGenerationProvider.ts` — interface.
- `src/services/providers/TwoApiImageProvider.ts` — concrete impl. Uses `fetch` + `AbortSignal.timeout(IMAGE_API_TIMEOUT_MS)`. Maps HTTP failures per spec error-handling.md table. Writes base64 → `OUTPUT_DIR/<uuid>.png`.
- `src/storage/localStorage.ts` — `saveOutput(buffer, ext)`, `readOutput(id)`, path-traversal guard. (Upload helpers deferred; this task only needs the output path.)

### Tooling artifacts

- `.husky/pre-commit` running `npx lint-staged`.
- `lint-staged` config in `package.json`:
  - `*.{ts,js,json}` → `eslint --fix`
  - `*.{ts,vue,js,json,md}` → `prettier --write`
- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` per spec.
- ESLint plugins: `@typescript-eslint`, `eslint-plugin-import` (for `import/order`), `prettier` (peace treaty).
- Vitest config minimal; tests live in `tests/` mirroring `src/`.

### Tests (minimum bar)

- `tests/routes/health.spec.ts` — `supertest(createApp({ provider: fake }))` → assert 200 + body shape.
- `tests/middlewares/errorHandler.spec.ts` — route that throws `AppError('PROVIDER_TIMEOUT', ..., 504)` → assert JSON shape + `requestId` echoed.
- `tests/middlewares/errorHandler.spec.ts` — route that throws plain `Error('boom')` → assert `code='INTERNAL', status=500`, no stack leaked.
- `tests/services/providers/TwoApiImageProvider.spec.ts`:
  - happy: stub `fetch` → 200 with `{ data: [{ b64_json: '...' }] }` → assert file written under `OUTPUT_DIR` + return shape.
  - 4xx: stub → 401 → assert `AppError(PROVIDER_ERROR, ..., 502)`.
  - 5xx: stub → 500 → assert `AppError(PROVIDER_ERROR, ..., 502)`.
  - timeout: stub `fetch` to reject `AbortError` → assert `AppError(PROVIDER_TIMEOUT, ..., 504)`.
  - referencePath set: assert `AppError(BAD_REQUEST, ..., 400)` thrown synchronously.
  - URL: pass `IMAGE_API_BASE_URL='https://x.com'` and `'https://x.com/'` — both produce `https://x.com/v1/images/generations`.
- `tests/storage/localStorage.spec.ts` — `saveOutput` writes under `OUTPUT_DIR`, returns absolute path under that root; rejects an `ext` containing `..` or `/`.
- `tests/config/env.spec.ts` — missing `IMAGE_API_KEY` throws on `loadEnv()`; valid env returns the typed object.

### Repo state

- `git init`, root `.gitignore`, first commit message: `feat: bootstrap backend skeleton` (or per the spec's commit-style discovery if there are other recent commits — there aren't, this is commit 1). Branch `main`. No remote.

---

## Acceptance Criteria

- [ ] `cd backend && npm install` succeeds clean (no peer-dep warnings beyond noise).
- [ ] `npm run dev` starts the server; `curl localhost:3000/api/health` → 200 JSON `{ status: 'ok', uptimeSec, version }`.
- [ ] `npm run build` produces `dist/index.js`; `node dist/index.js` starts the server identically.
- [ ] `npm run typecheck` passes (zero errors).
- [ ] `npm run lint` passes (zero errors, zero warnings).
- [ ] `npm test` passes (all tests green).
- [ ] Pre-commit hook fires on a synthetic commit and runs `lint-staged`.
- [ ] Missing `IMAGE_API_KEY` causes startup to fail fast with a clear pino error log mentioning the variable name; no silent start.
- [ ] An unhandled error inside any route is caught by the final middleware and returns the documented JSON shape with `requestId`. Provider error codes map to the documented HTTP statuses.
- [ ] CORS preflight from `CORS_ORIGIN` succeeds for `/api/health`; from a disallowed origin, the response omits the `Access-Control-Allow-Origin` header.
- [ ] Sending SIGTERM to a running `npm run dev` process triggers an info-level pino log `shutdown: closing server` and exits within 5s.
- [ ] Repository has `.git/`, branch `main`, exactly one commit listing the expected files.

---

## Definition of Done

- All Acceptance Criteria checked.
- `.env.example` matches the env vars actually consumed by `config/env.ts`.
- `backend/README.md` (one section, < 30 lines) documents `npm run dev` / `npm run build` / `npm test` / env-var setup.
- Spec drift logged for Phase 3.3 update:
  - `quality-guidelines.md` should switch from "lefthook *(or husky+lint-staged)*" to "husky + lint-staged" since the lefthook variant is now dead code in our project.
  - Any other deviation discovered during implementation gets queued for spec update.

---

## Out of Scope (explicit)

- All image endpoints (`/api/images/generate`, `/api/images/upload`) and multer wiring.
- Real 2API calls against a live endpoint (provider is exercised against stubbed `fetch` only).
- Image-to-image / reference image upload flow.
- Frontend integration (no Vue app exists yet).
- Authentication, rate limiting, or multi-tenant concerns.
- Persistent storage (DB).
- Cleanup cron for `tmp/`.
- Async job queue.
- Logging to a remote sink — pino stdout only.
- Dockerfile and CI workflows.
- Boot-time 2API readiness ping (deferred to a future task once we know how much it costs in quota).

---

## Technical Approach

`ImageGenerationProvider` interface:

```ts
export interface ImageGenerationProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}
export interface GenerateInput {
  prompt: string;
  /** Path under UPLOAD_DIR. Currently unsupported — providers must throw BAD_REQUEST if set. */
  referencePath?: string;
  model?: string;
}
export interface GenerateOutput {
  /** Absolute path under OUTPUT_DIR. */
  outputPath: string;
  width: number;
  height: number;
}
```

`createApp` factory (test-friendly DI):

```ts
export interface AppDeps { provider: ImageGenerationProvider; }
export function createApp(deps: AppDeps): Express { /* ... */ }
```

`index.ts`:

```ts
const provider = new TwoApiImageProvider({ ...env });
const app = createApp({ provider });
const server = app.listen(env.PORT, () => logger.info(...));
const shutdown = (sig: string) => {
  logger.info({ sig }, 'shutdown: closing server');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

---

## Decision (ADR-lite)

**Context**: First-cut backend, no code exists. Bootstrap spec defines conventions but they need to be operationalized.

**Decision**: Ship a minimal `/api/health`-only Express app whose chief job is to **prove the spec is buildable**: every guideline in `.trellis/spec/backend/` is exercised at least once (config/env, AppError, errorHandler, pino logger, provider interface, storage helper, husky pre-commit, vitest harness, eslint, prettier). The 2API provider is written in full but not yet routed.

**Consequences**:
- Task 2 ("expose `/api/images/generate`") becomes pure plumbing — controller + zod schema + service call.
- Any friction we hit (env loading, fetch timeout API, CORS config) surfaces now while the surface area is small.
- If the OpenAI-compatible assumption is wrong, task 2 absorbs the rework — provider gets rewritten there.

---

## Implementation Plan (single PR, ordered slices)

1. **Tooling first** — `package.json`, `tsconfig.json`, ESLint flat config, Prettier, Vitest config, `.env.example`, `.gitignore`. Verify `npm install` + `npm run typecheck` (no source yet) pass on an empty `src/`.
2. **Logger + env + errors** — `src/logger.ts`, `src/config/env.ts`, `src/errors/AppError.ts`. Add unit test for env loader.
3. **Middlewares** — `requestLogger.ts`, `errorHandler.ts`. Test errorHandler with two synthetic routes (AppError + plain Error).
4. **Storage helper** — `src/storage/localStorage.ts` (saveOutput + path guard) + test.
5. **Provider** — `ImageGenerationProvider.ts` + `TwoApiImageProvider.ts` + the 5 test cases listed above.
6. **App + route + index** — `createApp`, `routes/health.ts`, `src/index.ts` with graceful shutdown.
7. **Husky** — install, add `.husky/pre-commit`, add `lint-staged` to `package.json`.
8. **README** — short backend README with run commands.
9. **`git init` + first commit** — verify all acceptance criteria green before committing.

---

## Technical Notes

- All design decisions trace to existing spec under `.trellis/spec/backend/`. The PRD does not redefine conventions — it only locks the open variables (which endpoint, which provider impl depth, which pre-commit runner, etc.).
- `fetch` is used directly (Node 20 native). No `axios`, no `undici` import — keeps deps lean.
- `AbortSignal.timeout()` is available in Node 20.
- Test strategy is **DI for the provider**, **stubbed `fetch` for the provider's tests**. No real network calls anywhere.
- Logger redact list will be re-verified during implementation — anything the implementation logs that *could* contain `IMAGE_API_KEY` (e.g., a fetch error with full request config) needs an extra redact path or a manual scrubbing step.
