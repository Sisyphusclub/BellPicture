# Frontend Vue app (Ref2Image studio UI)

## Goal

Stand up the `frontend/` Vue 3 + Vite app that consumes the backend's image
endpoints (`/api/images/upload`, `/api/images/generate`,
`/api/outputs/:filename`) and lets a user (1) describe a prompt, optionally
attach a reference image, generate, and (2) browse the history of past
generations. The visual language follows the **Claude design system** —
warm cream canvas, coral CTAs, serif display headlines, dark navy product
surfaces — as documented in `research/claude-design.md`.

This task takes the project from "backend works via curl" to "browser end
user can generate images and see history."

---

## What I already know

### Backend contract (locked, from tasks 05-09 + 05-11)

- `POST /api/images/upload` (multipart `image` field, ≤ `UPLOAD_MAX_BYTES`)
  → `{ id, filename, mime, size }`. `id == filename == <uuid>.<png|jpeg|webp>`.
- `POST /api/images/generate` (JSON `{ prompt, referenceId?, model? }`)
  → `{ id, outputUrl: '/api/outputs/<filename>', filename, mime, width, height, generationMode }`.
- `GET /api/outputs/:filename` → image bytes with correct `Content-Type`.
- Errors: `{ error: { code, message, requestId, details? } }`. New codes
  `PROVIDER_RATE_LIMITED` (429) and `NOT_FOUND` (404).
- CORS allows `CORS_ORIGIN` (defaults to `http://localhost:5173` — the Vite
  dev origin).

### Frontend spec (planning, will become Verified after this task)

- Vue 3.4+ + `<script setup>` only, Vite 5+, TS strict
  (`noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`),
  Vitest + jsdom + `@vue/test-utils`, ESLint + Prettier, lefthook OR
  husky+lint-staged (backend went husky+lint-staged; we'll stay consistent).
- Folder layout: `views/`, `components/`, `composables/`, `services/api/`,
  `services/storage/`, `types/`, `utils/`, `styles/`, `assets/`.
- **Composables only**, no Pinia. Module-level refs for shared state.
- IndexedDB for blobs (`ref2image-studio` db, `images` store, value = `Blob`),
  localStorage for metadata (`ref2image:history`, `ImageRecord[]`,
  `schemaVersion: 1`).
- All HTTP through `services/api/`; all storage through `services/storage/`.
- The shared `ImageRecord` type: `{ id, createdAt, prompt, model,
  referenceId?, width, height }`.
- Component spec demands Element Plus — that's the tension this PRD has to
  resolve up front (see Open Questions).

### Visual reference

`.trellis/tasks/05-11-frontend-app/research/claude-design.md` — full
design system extracted from voltagent/awesome-design-md. Hot points:

- **Cream canvas** `#faf9f5` + **dark warm ink** `#141413`. No pure white.
- **Coral primary** `#cc785c` on every CTA; **coral active** `#a9583e`.
- **Surface trio**: cream-canvas / surface-card `#efe9de` / dark-navy
  `#181715`. Alternate band-by-band.
- Typography: **Copernicus** (or fallbacks Tiempos Headline / Cormorant
  Garamond / EB Garamond) serif display, **StyreneB** (or Inter)
  humanist sans body, **JetBrains Mono** for code. Display weight 400 with
  negative letter-spacing; never bold serif.
- Spacing system: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 96. Section gap = 96px.
  Card padding 32px.
- Radii: 4 / 6 / 8 / 12 / 16 / pill. Buttons + inputs at 8, cards at 12,
  hero at 16.
- Components needed for this product: top-nav, hero-band, feature-card,
  text-input (textarea variant), button-primary, button-secondary,
  badge-pill, badge-coral, gallery/code-window-card, callout-card-coral,
  cta-band-dark, footer. The Claude system documents all of these.

### What this app needs

Two routes minimum:

- `/` (or `/generate`) — **GenerateView**: prompt textarea, optional
  reference-image dropzone, model selector (probably hidden default for
  MVP), generate button → result preview → "Save to history" is automatic
  on success.
- `/history` — **HistoryView**: chronological grid of past generations
  from IndexedDB, click to view detail / re-run with same prompt /
  download.

---

## Decisions (evolving)

1. **Design system vs Element Plus**: Hybrid. Build bespoke Claude-styled
   product surfaces for hero, cards, buttons, upload/dropzone, result preview,
   and gallery; use Element Plus only for utility primitives where it reduces
   risk (`ElMessage`, `ElDialog`, form validation if needed).
2. **Routes & views**: `/` is `GenerateView` with an integrated Claude-styled
   hero and generation workflow; `/history` is `HistoryView`. No separate
   landing page for MVP.
3. **Upload UX**: custom Claude-styled drag/drop zone with click-to-browse,
   thumbnail preview, file metadata, validation feedback, and clear/remove.
4. **Generation latency UX**: Claude-style status/code-window panel with
   staged copy, coral progress treatment, and clear disabled/cannot-cancel
   semantics while the backend request is in flight.
5. **Model selector**: default to `gpt-image-2`; expose it in an Advanced
   disclosure so the UI is simple now but has a stable extension point for
   future model options.
6. **History entry detail**: clicking a history card opens a right-side detail
   panel within `/history`, showing a larger image, prompt, model, dimensions,
   created time, download action, and re-run action.
7. **MVP boundary**: strict current scope only. Do not add a settings page,
   runtime API configuration UI, or batch-generation scaffolding in this task.
8. **UI language**: all user-facing frontend page copy is Simplified Chinese.
   Code identifiers, route paths, API fields, env keys, and tests may remain
   English where that keeps implementation clearer.
9. **Claude Web layout reference**: revise the product layout toward a
   production image-generation workspace, using the latest provided reference
   as the controlling layout: top navigation with only the active MVP modules
   (画图 and 图片管理), left chat rail for new/delete/history conversations,
   large central canvas for image results, and a bottom docked composer for
   prompt, image upload/drag-in, model switching, and generate action. Remove
   the previous centered greeting, workbench status card, result placeholder
   card, descriptive upload block, local archive explainer card, local plan
   card, 画图工作台 / 提示词记录 cards, left placeholder box, and non-MVP top-nav
   modules (号池管理, 注册机, 日志管理, 设置).

## Open Questions (blocking)

- None.

## Requirements (evolving)

- Two routes: `/` for `GenerateView` with integrated hero + generation
  workflow, and `/history` for `HistoryView`; top nav + footer chrome.
- All HTTP via `services/api/imagesApi.ts`; all persistence via
  `services/storage/indexedDb.ts` + `services/storage/localStorageMeta.ts`.
- Composables: `useImageGeneration`, `useImageHistory`, `useFileUpload`.
- Visual tokens (color / typography / spacing / radii) extracted from
  Claude design system into `src/styles/tokens.css` (or `.scss`).
- Hybrid UI system: bespoke Claude-styled product components for primary
  surfaces, with Element Plus limited to utility primitives.
- Custom reference-image dropzone supports drag/drop, browse, thumbnail
  preview, validation feedback, and remove.
- Generation requests show a Claude-style status panel with staged copy and
  coral progress treatment until the backend responds.
- Model selection defaults to `gpt-image-2` and lives in an Advanced disclosure.
- History detail opens as a right-side panel within `/history`, with large
  preview, metadata, download, and re-run actions.
- Generate end-to-end works against a real running backend at
  `VITE_API_BASE_URL`.
- All user-facing page copy, labels, buttons, empty states, status messages,
  validation messages, and toasts are Simplified Chinese.
- Layout follows the latest provided product reference: a top navigation bar
  with only 画图 and 图片管理 as visible product modules, a left conversation rail
  with 新建对话 and 删除 controls plus recent conversation entries, a central
  canvas/content region for generated images, and a bottom docked composer.
- The composer is the default interaction: one large text box that accepts text
  input and pasted/dropped images, with an 上传 action, current-model selector
  directly below the text area, and a generate submit button. Do not show the
  previous separate “描述画面” heading, separate drag/drop reference card,
  workbench status card, result placeholder card, or details-style Advanced
  settings block.
- The app currently only shows two product modules in top navigation: 画图 and
  图片管理. Do not render 号池管理, 注册机, 日志管理, 设置, or other inert module
  placeholders.
- The drawing workspace must not show the previous 画图工作台 heading, 提示词记录
  card, or left placeholder box; keep the canvas focused on generated images and
  the bottom composer as the primary interaction.
- 图片管理 should follow the latest image-management reference: page title,
  compact filter/search row, clear/query/refresh actions, total count, and a
  card grid with image metadata such as created time, size, dimensions, and copy
  affordance.

## Acceptance Criteria (evolving)

- [ ] `npm run dev` boots Vite at `:5173`; CORS_ORIGIN already permits this.
- [ ] `/` renders the hero + generation workflow; `/history` renders the
      persisted generation history.
- [ ] User can submit a prompt → see a status panel while generation is in
      flight → see the generated image rendered in the browser → it appears in
      History after refresh.
- [ ] User can attach a reference image by drag/drop or browse, see a
      thumbnail plus file metadata, remove it, then generate image-to-image;
      result `generationMode` reflects the right mode.
- [ ] Upload over `UPLOAD_MAX_BYTES` shows a clear 413 message; non-image
      shows 415; provider timeout shows 504 message.
- [ ] History grid loads from IndexedDB on app boot; clicking a card opens a
      right-side detail panel with large preview, metadata, download, and
      re-run.
- [ ] `npm run typecheck`, `lint`, `test`, `build` all green.
- [ ] No `any`, no `as` on API responses; runtime narrowing at the
      boundary.
- [ ] Color contrast ≥ 4.5:1 on cream surfaces; coral CTA ≥ 4.5:1 on white.
- [ ] All user-facing page text is Simplified Chinese across `/`, `/history`,
      status panels, validation, errors, toasts, and README usage guidance.
- [ ] `/` visually matches the latest image-generation workspace reference:
      top module navigation with only 画图 / 图片管理, left conversation rail with
      新建对话 and 删除, central generated-image canvas, and bottom docked
      composer.
- [ ] The bottom composer has one primary text box, supports upload/drag/paste
      image input, exposes a current model switcher below the text area, and no
      details-style Advanced block.
- [ ] Removed UI elements: 本地档案说明卡片, 本地计划卡片, 工作台状态, 结果
      placeholder card, separate 描述画面 area, separate drag/drop reference
      card, previous centered greeting layout, non-MVP nav modules, 画图工作台 /
      提示词记录 cards, and the left placeholder box.
- [ ] `/history` / 图片管理 matches the latest image-management reference with
      filters/search actions, refresh, total count, and metadata-rich image
      cards.

## Definition of Done

- Lint / typecheck / vitest / build green.
- `.env.example` includes `VITE_API_BASE_URL`.
- README in `frontend/` documents `npm run dev` + production build.
- Design tokens captured in spec drift queue for Phase 3.3 (the
  Claude-design-derived tokens should land in `.trellis/spec/frontend/`).
- The 5 planning-version frontend specs become Verified after this task.

## Out of Scope (explicit, will reconfirm)

- Authentication / user accounts.
- Backend cleanup cron / tmp lifecycle (still task-N).
- Multi-image batch generation (`n > 1`).
- Server-driven model catalog (we hardcode `gpt-image-2` for MVP).
- Settings page or runtime API base URL configuration UI.
- Dark mode for the entire app (Claude design uses dark only on
  product-chrome surfaces, not whole-page).
- Animations / micro-interactions (the Claude design system explicitly
  excludes these).
- i18n / RTL (Simplified Chinese only for MVP).
- Mobile-first design (Claude design is desktop-first with responsive
  collapse; mobile polish can come later).
- E2E tests (manual smoke for MVP; vitest unit/component only).

## Technical Approach

Use a Vue 3 + Vite + TypeScript frontend with a Hybrid UI layer: custom
Claude-styled SFCs for product-defining surfaces and Element Plus only for
utility interactions. Keep business logic in composables, IO in services, and
persist history via IndexedDB blobs plus localStorage metadata.

## Research References

- [`research/claude-design.md`](research/claude-design.md) — Claude visual
  system tokens, surfaces, typography, spacing, and product component patterns.

## Implementation Plan

1. Scaffold `frontend/` with Vue 3, Vite, TypeScript strict, Vue Router,
   Vitest/jsdom, ESLint, Prettier, Element Plus utility imports, and
   `.env.example`.
2. Implement shared image/API types, runtime response narrowing, backend fetch
   wrappers, IndexedDB blob storage, localStorage metadata, and composables.
3. Implement global tokens and app shell: top nav, footer, responsive layout,
   hero band, cards, buttons, form controls, upload dropzone, status panel,
   and result preview.
4. Implement `/history` grid plus right-side detail panel with metadata,
   download, and re-run behavior.
5. Add unit/component tests for services, storage, composables, and critical UI
   flows; run lint, typecheck, test, build, and browser smoke checks.

## Decision (ADR-lite)

**Context**: The frontend spec names Element Plus, while the desired Claude
visual system depends on editorial surfaces, warm tokens, and bespoke layout
that Element Plus does not provide out of the box.
**Decision**: Adopt the Hybrid approach.
**Consequences**: Implementation keeps Element Plus where it is low-risk and
useful, but core visual components must be custom and token-driven. This avoids
global CSS specificity fights while still satisfying the spec's utility usage.

## Technical Notes

- Vite dev server origin must match backend `CORS_ORIGIN` (default
  `http://localhost:5173`). Backend already enabled cors with that origin.
- Backend's `outputUrl` is server-relative (`/api/outputs/<file>`). Frontend
  prepends `VITE_API_BASE_URL` when rendering.
- Frontend's `ImageRecord` schema must match the backend's response field
  names. `referenceId` is required on the metadata when generated with a
  reference; it's the upload's `<uuid>.<ext>` filename.
- `fake-indexeddb` for tests (per quality-guidelines).
- Element Plus, if kept, ships its own CSS reset / global tokens — there
  will be a CSS specificity battle with the Claude tokens. The Hybrid
  approach contains it to specific components.
