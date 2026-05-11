# Backend Quality Guidelines

> **Status**: Verified against `backend/` after task `05-09-backend-skeleton`.
> Pre-commit toolchain locked to husky + lint-staged.

---

## Toolchain

| Tool | Purpose | Config file |
|---|---|---|
| TypeScript 5.x | Static typing | `tsconfig.json` |
| ESLint 9 (flat config) | Lint | `eslint.config.js` |
| Prettier 3 | Formatting | `.prettierrc` |
| Vitest | Unit + integration tests | `vitest.config.ts` |
| husky + lint-staged | Pre-commit gate | `.husky/pre-commit` + `lint-staged` block in `package.json` |

### TypeScript settings (non-negotiable)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### ESLint baseline rules

- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/no-floating-promises: error`
- `@typescript-eslint/no-misused-promises: error`
- `@typescript-eslint/consistent-type-imports: error`
- `no-console: error` (use `logger`)
- `import/order` enforced: node built-ins → external → internal → relative.

---

## Required scripts in `package.json`

```jsonc
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`lint`, `typecheck`, and `test` must all pass before commit.

---

## Pre-commit gate

Run lint + format via `husky + lint-staged` (no lefthook). On `npm install`, the
`prepare` script installs husky and writes `.husky/pre-commit`.

`package.json` (excerpt):

```jsonc
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,js,cjs,mjs}": "eslint --fix",
    "*.{ts,js,cjs,mjs,json,md,yml,yaml}": "prettier --write"
  }
}
```

`.husky/pre-commit`:

```sh
npx lint-staged
```

Typecheck is **not** in the pre-commit gate (slow on touch-one-file commits);
it is enforced by `npm run typecheck` in CI / before-merge instead.

If the hook is bypassed, the commit succeeds locally but `npm run lint` will
fail in the next session — **never** pass `--no-verify` unless explicitly
authorized by the user.

---

## Testing requirements

- **Services**: unit-test with Vitest. No real network — stub
  `ImageGenerationProvider` with a fake.
- **Controllers**: integration-test against the Express app from `app.ts`
  using `supertest`. Use a fake provider; do not hit the real 2API.
- **Storage helpers**: test against a tmp directory created per test
  (`fs.mkdtemp`), cleaned up in `afterEach`.
- One assertion focus per test. Test names: `it('rejects unsupported MIME types', ...)`.
- Coverage target for week 1: services > 80%, controllers > 60%. Not
  enforced in CI yet; informational.

---

## Code review checklist (use before declaring "done")

- [ ] No `any`, no `as unknown as ...` to bypass types.
- [ ] Every async path has a `try/catch` or is awaited inside one.
- [ ] Errors use `AppError`; the final middleware handles them.
- [ ] No raw `process.env.X` reads outside `config/env.ts`.
- [ ] No `fs` imports outside `storage/`.
- [ ] No `console.*`; uses `logger`.
- [ ] New env vars added to `.env.example`.
- [ ] New endpoints documented (route comment with method + auth + body shape).
- [ ] Tests cover happy path + at least one failure path.

---

## Forbidden patterns

- ❌ Disabling lint rules inline (`// eslint-disable-line`) without a
  comment explaining why and when to remove.
- ❌ Skipping tests (`it.skip`, `describe.skip`) without a TODO + ticket.
- ❌ Adding dependencies that overlap with existing ones (e.g., adding
  `axios` when `fetch` is already in use). Flag in PR.
- ❌ Catching errors only to log and rethrow with no added context. Either
  add context or remove the catch.
