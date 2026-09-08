# QA Evidence

## Automated

- Backend: format, lint, typecheck, build, and 20 test files / 214 tests passed.
- Frontend: component provenance, format, lint, typecheck, build, and 43 test
  files / 169 tests passed.
- Root: Prettier, `git diff --check`, and `docker compose config --quiet` passed.
- Host release-gate dependency audit: frontend has zero findings; backend has no
  high-severity production finding and reports three moderate Express 4
  dependency-chain findings. A separate runtime-image audit also sees retained
  optional peer development tooling from the existing Docker prune flow; that
  pre-existing image-composition issue is outside this feature's code path.

## Runtime

- Rebuilt with `docker compose up -d --build`; backend became healthy and
  migration `0010` applied on boot.
- `GET /api/health/ready` returned 200 with database/uploads/outputs ready.
- Unauthenticated settings GET returned 401.
- Authenticated settings GET returned `{ "configured": false }`.
- A deliberately invalid Key returned 400 `PROVIDER_KEY_INVALID`; the following
  GET remained unconfigured, proving failed validation did not write a row.

## Browser

- Chromium desktop 1440x813: dialog 458x259 at `(486, 277)`, fully in viewport,
  no horizontal document overflow.
- Chromium mobile 390x844: dialog 356x243 at `(17, 300.5)`, fully in viewport,
  full-width 312x44 primary action, no horizontal document overflow.
- Desktop account popover and mobile sidebar both opened the shared settings
  dialog. Browser console and runtime exception collection were empty.
