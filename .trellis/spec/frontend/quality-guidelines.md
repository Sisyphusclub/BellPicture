# Frontend Quality Guidelines

> **Status**: Planning version.

---

## Toolchain

| Tool | Purpose | Config file |
|---|---|---|
| Vite 5+ | Dev server / bundler | `vite.config.ts` |
| TypeScript 5.x | Static typing | `tsconfig.json` |
| ESLint 9 (flat config) | Lint (with `eslint-plugin-vue`) | `eslint.config.js` |
| Prettier 3 | Formatting | `.prettierrc` |
| Vitest + jsdom | Unit + component tests | `vitest.config.ts` |
| `@vue/test-utils` | Component mounting helpers | (peer dep) |
| lefthook *(or husky+lint-staged)* | Pre-commit gate | `lefthook.yml` |

### ESLint baseline

Extends:
- `eslint-plugin-vue/flat/recommended`
- `@vue/eslint-config-typescript`
- `@vue/eslint-config-prettier`

Project-specific rules:
- `@typescript-eslint/no-explicit-any: error`
- `@typescript-eslint/no-floating-promises: error`
- `@typescript-eslint/consistent-type-imports: error`
- `vue/multi-word-component-names: error`
- `vue/component-api-style: ['error', ['script-setup']]`
- `vue/define-macros-order: ['error', { order: ['defineProps', 'defineEmits', 'defineModel'] }]`
- `no-console: error` (use a small `logger` util if needed; otherwise
  remove debug logs before commit)

---

## Required scripts in `package.json`

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Pre-commit gate

`lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{ts,vue,js,json}"
      run: npx eslint {staged_files}
    typecheck:
      glob: "*.{ts,vue}"
      run: npx vue-tsc --noEmit
    format:
      glob: "*.{ts,vue,js,json,md,css,scss}"
      run: npx prettier --check {staged_files}
```

Never bypass with `--no-verify` unless explicitly authorized.

---

## Testing requirements

| Layer | Tooling | Coverage target |
|---|---|---|
| `services/` (API + storage) | Vitest, no Vue | services/api: stub `fetch`; services/storage: real IndexedDB via `fake-indexeddb` |
| `composables/` | Vitest + a tiny harness component | Test the public API (refs, methods), not internals |
| `components/` | Vitest + `@vue/test-utils` | Smoke-test rendering + key interactions; avoid asserting on Element Plus internals |
| `views/` | Light. Prefer testing composables + components. | — |

Coverage target for week 1: services > 80%. Composables > 70%. Components
informational only. Not enforced in CI yet.

Test names: `it('shows the error banner when generation fails', ...)`.
One assertion focus per test.

---

## Code review checklist

- [ ] No `any`, no `as` casts on API responses.
- [ ] All HTTP goes through `services/api/`. No `fetch` in components/composables.
- [ ] All persistent storage goes through `services/storage/`.
- [ ] No new dependency without justification (esp. UI libs that
      overlap with Element Plus).
- [ ] No global side effects on import (top-level `await`, `window.x = ...`).
- [ ] Element Plus components used over hand-rolled equivalents.
- [ ] All async paths handle errors via composable `error` ref + UI feedback.
- [ ] New types added to `src/types/`, not inline-duplicated.
- [ ] `schemaVersion` bumped if localStorage shape changed.

---

## Accessibility (baseline)

- Element Plus components ship reasonable a11y; **don't override their
  semantics** (e.g., don't `role="button"` an `el-button`).
- Every interactive element has a visible label or `aria-label`.
- Color contrast ≥ 4.5:1 for body text. Don't rely on color alone for
  state (also use icon/text).
- Forms have associated labels via `el-form-item` `label`.

---

## Forbidden patterns

- ❌ Disabling lint rules inline without a comment + TODO.
- ❌ `it.skip` / `describe.skip` without a tracking note.
- ❌ Importing CSS from `node_modules` directly inside components (do it
  once in `main.ts`).
- ❌ Using `v-html` with backend-returned strings.
- ❌ Committing `console.log` / `console.warn`.
- ❌ Adding a state-management lib (Pinia, Vuex) — see
  `state-management.md` for the agreed escalation path.
