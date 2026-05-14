# Make backend dev load .env via tsx --env-file

## Goal

`backend/package.json` `dev` script is `tsx watch src/index.ts` and there is no `dotenv` import anywhere in `src/`. As a result, `npm run dev` never reads `backend/.env` — `config/env.ts` always sees `process.env` without the dotfile and throws `Missing required environment variable: IMAGE_API_BASE_URL` on every fresh boot. The defect went unnoticed because tests use `tests/setup.ts` to stub env vars; the dev server has never been used end-to-end. Fix it so a freshly-cloned dev can `cd backend && npm run dev` and hit a working `:3000`.

## What I already know

- Node v24.13.0 is in use (project default). Node 21.5+ supports `--env-file=path` as a CLI flag that auto-populates `process.env` before user code runs.
- `tsx` v4 passes unknown flags through to the underlying Node process. `npx tsx watch --env-file=.env src/index.ts` worked in this session (`server: listening on :3000` confirmed) without any code/dependency change beyond the dev script.
- `tests/setup.ts` already stubs every required env var, so the test suite is independent of `.env`. No test impact from the script change.
- `backend/.env.example` exists and documents every variable. `.gitignore` excludes `.env`.
- `backend/package.json` other scripts: `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/index.js`), `lint`/`typecheck`/`test`. None of them need `.env` injection — `start` is for production where env is provided externally, `build`/`lint`/`typecheck` don't run user code.
- Approach A was selected over installing `dotenv` (B) because A is zero-dependency, native to Node, and matches the project's preference for thin tooling.

## Assumptions (temporary)

- Dev contributors all run Node 21.5+. Confirmed for this machine; CI/typecheck doesn't depend on it.
- `--env-file=.env` resolves relative to the script's cwd (`backend/`), so the literal string `.env` is correct.

## Open Questions

- None.

## Requirements

- `backend/package.json` `dev` script loads `backend/.env` automatically when run from the `backend/` directory.
- No new runtime dependencies (no `dotenv` install).
- No changes to `src/`, `tests/`, or any other npm script (`build`, `start`, `lint`, `typecheck`, `test`).
- `.env.example` is unchanged.

## Decision (ADR-lite)

**Context**: Backend dev startup fails immediately because `.env` is never loaded. The two viable approaches are:
- A. Add `--env-file=.env` to the `dev` script (uses Node's built-in support, no dep).
- B. Add `dotenv` as a dependency and `import 'dotenv/config'` at the top of `src/index.ts` (and `src/config/env.ts` for direct unit invocation).

**Decision**: Approach A. Zero dependency surface, one-line change, leverages a stable Node feature already available on the developer machines. If we later need conditional loading (e.g. `.env.local` override) we can revisit.

**Consequences**: The dev script ties to a single env file name. If someone wants to use `.env.development.local`, they need to either rename or re-edit the script — acceptable for MVP.

## Acceptance Criteria

- [ ] After `cd backend && npm run dev`, the backend boots and emits the existing `server: listening` pino log on `:3000` without throwing.
- [ ] `backend/.env` is loaded automatically — no `--env-file` flag, no `NODE_OPTIONS`, no shell-side env injection required from the caller.
- [ ] `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, and `npm test` are unchanged in behavior.
- [ ] No new entries in `dependencies` or `devDependencies`.
- [ ] `git status` shows only `backend/package.json` modified for this task (plus task/spec dirs).

## Definition of Done

- AC checklist green.
- Backend `npm run lint` + `npm run typecheck` + `npm test` still pass.
- Manual verification: stop the running backend, `cd backend && npm run dev`, confirm `server: listening` log.
- Brief note in `.trellis/spec/backend/directory-structure.md` if a convention emerges (e.g. "dev script loads `.env` via Node `--env-file`").
- `git status` reviewed before reporting completion.

## Out of Scope

- Installing or wiring `dotenv` (rejected via ADR).
- Supporting multiple env files (`.env.local`, `.env.test`, etc.).
- Changing `tests/setup.ts` env stubbing.
- Touching `start`/`build` for production env loading — production env comes from the orchestrator, not `.env`.
- Frontend env loading (Vite already auto-loads `.env*`).

## Technical Notes

- File touched: `backend/package.json`, `scripts.dev`.
- Old: `tsx watch src/index.ts`
- New: `tsx watch --env-file=.env src/index.ts`
- Verified manually in this session that `npx tsx watch --env-file=.env src/index.ts` runs the backend end-to-end (sqlite WAL, drizzle migrations applied, `server: listening`).
- The change is reversible by editing one line.
