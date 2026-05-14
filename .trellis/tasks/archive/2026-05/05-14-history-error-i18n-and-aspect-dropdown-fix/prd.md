# Localize history fetch errors and fix aspect dropdown visual overlap

## Goal

Fix two visual / UX defects surfaced by the 05-14 home smoke test:

1. `/history` renders the raw English message `Failed to fetch` when the backend is unreachable, violating the Simplified-Chinese UI copy contract.
2. The hero `prompt-showcase__smart` aspect-ratio dropdown opens upward over the hero subtitle and lets the underlying text bleed through, hurting legibility.

## What I already know

- Spec `.trellis/spec/frontend/component-guidelines.md` mandates "Simplified Chinese UI copy" for all user-facing strings, explicitly including validation, error, status, and toast messages.
- `frontend/src/composables/useImageHistory.ts:114` catch sets `hydrateError.value` via `err instanceof Error ? err : new Error('无法从服务器加载历史，请刷新或重新登录后重试。')`. Native `fetch` failures throw a `TypeError` (`instanceof Error === true`), so the Chinese fallback is skipped and the raw English message reaches `HistoryView.vue:153` which renders `{{ hydrateError.message }}`.
- `frontend/src/composables/useImageQuota.ts:14-18` already does it correctly: the catch swallows the original error and replaces it with `new Error('无法读取剩余额度。')` unconditionally.
- `frontend/src/services/api/httpClient.ts` exposes `authedFetch` and `buildApiError` shared by `historyApi` and `imagesApi`. There is currently NO centralized handling for native fetch failures (network down, CORS, DNS, abort).
- The aspect menu CSS lives in `frontend/src/views/GenerateView.vue` around line 1397 onward: `position: absolute; bottom: calc(100% + 8px); left: 0; z-index: 8; min-width: 150px; ...`. The menu opens upward by design (toolbar is near the bottom of the showcase card). Smoke screenshot shows hero subtitle bleeding through the panel — likely because the menu background uses a translucent surface token, not a solid one.
- `tokens.css` exposes both `--color-surface-card` (translucent) and `--color-surface-card-solid` (opaque). Other floating panels in the same file use `--color-surface-card-solid` for solid backdrops (see `.control-menu`).
- Newly committed spec section "Modal accessibility contract" in `.trellis/spec/frontend/component-guidelines.md` does NOT yet require any equivalent contract for non-modal floating menus (dropdowns/popovers). Out of scope to add here, but worth noting.

## Assumptions (temporary)

- The smoke test's `Failed to fetch` regression is the only place a native fetch error leaks an English string to the UI today; other API callers (`imagesApi`, `useImageGeneration`, `useImageQuota`) already either swallow + replace, or wrap via `buildApiError`.
- The aspect menu visual fix is purely CSS — no markup/behavior change needed beyond a solid background and a slightly bumped z-index over surrounding content.

## Open Questions

- None blocking. One preference question below.

## Requirements (evolving)

- Network/native fetch failures must surface as Simplified-Chinese messages in the UI.
- `/history` empty/error state must never display `Failed to fetch` or any other untranslated browser error.
- Aspect dropdown panel must render with a fully opaque background so underlying hero/showcase text never shows through.
- Aspect dropdown must stack above the hero subtitle and any sibling decorative layers (z-index bump if needed).
- Behavior of the aspect dropdown (open/close, selection, default 智能) is unchanged.
- Backend behavior is unchanged.

## Decision (ADR-lite)

**Context**: Native `fetch` failures throw `TypeError: Failed to fetch`. Today the catch in `useImageHistory.ts` keeps the original `Error` instance because `instanceof Error` short-circuits the Chinese fallback. The same pattern could bite future API callers.

**Decision**: Centralize the fix in `services/api/httpClient.ts`. Introduce a `safeFetch` wrapper (built on `authedFetch`) that catches native fetch failures and rethrows them as `ImageApiError(status=0, code='NETWORK_ERROR', message='无法连接到服务器，请检查网络或稍后重试。')`. `historyApi` and `imagesApi` both go through it. Every caller — `historyApi`, `imagesApi`, future apis — uniformly receives an `ImageApiError` whose `.message` is already Chinese. The Chinese-fallback branch in `useImageHistory.ts:114` is no longer load-bearing; it stays as defense-in-depth but its diff is small.

**Consequences**: One shared file changes, all existing API callers benefit immediately, zero behavior change for happy paths. A `httpClient.spec.ts` regression test pins the new contract.

## Acceptance Criteria (evolving)

- [ ] When the backend is unreachable, `/history` renders a Simplified-Chinese error message (not `Failed to fetch`).
- [ ] When the backend is unreachable, `useImageHistory` exposes a `hydrateError` whose `.message` is Simplified Chinese.
- [ ] Aspect dropdown panel uses an opaque background; manual smoke test at 1440px shows no bleed-through of hero subtitle text.
- [ ] Aspect dropdown stacking is correct against hero subtitle, masonry, and any decorative siblings.
- [ ] Frontend lint, typecheck, and tests stay green.
- [ ] Existing unit tests covering history hydrate / quota are still passing; a regression test for the network-error path is added at the appropriate layer (`httpClient` or `useImageHistory`).

## Definition of Done

- All ACs check off.
- `frontend/npm run lint && npm run typecheck && npm test` green.
- Manual browser smoke at 1440px: kill backend, load `/`, click aspect button (no bleed-through), navigate to `/history` (Chinese error visible).
- `git status` reviewed before reporting completion.

## Out of Scope (explicit)

- Translating browser-native error strings everywhere; only the user-visible API/network failure path is covered.
- Establishing a non-modal floating-menu a11y / styling spec (defer to a future spec task).
- Reworking the aspect dropdown's open direction or making it dismissable via Escape (current click-outside behavior is preserved as-is).
- Backend changes.

## Technical Notes

- Files likely touched:
  - `frontend/src/services/api/httpClient.ts` (new network-error wrapping)
  - `frontend/src/composables/useImageHistory.ts` (catch branch cleanup; optional)
  - `frontend/src/views/GenerateView.vue` (CSS: `.aspect-menu`/`.prompt-showcase__aspect-menu` opaque background + z-index)
  - `frontend/tests/...` (regression test for network-error path)
- Existing patterns to mirror:
  - `useImageQuota.ts:14-18` (catch + replace pattern, the correct shape)
  - `httpClient.ts:55-61` `buildApiError` (uniform `ImageApiError` shape, includes Chinese fallback for unknown payloads)
