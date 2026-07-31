# Full UI Inventory for the Squarespace Redesign

## Scope and current-state caveats

- Authoritative redesign brief: updated `prd.md` in this task plus project-root `design.md`.
- The working tree already contains an uncommitted standalone landing implementation (`LandingView.vue`, router/App changes, and tests). Treat it as current state, not a clean baseline.
- The current PRD asks to preserve history pagination/load-more, but no pagination or load-more behavior exists in the current frontend. `useImageHistory` fetches all `/api/history` records once. Do not invent a new backend contract during a visual rebuild.
- `GenerationStatusPanel.vue` still says history is stored in local IndexedDB, but the active implementation hydrates authenticated history from the backend. This copy is stale and the component is not mounted.

## Registered routes and screens

| Route | View / shell | Current behavior to preserve | Redesign notes |
| --- | --- | --- | --- |
| `/` (`landing`) | `src/views/LandingView.vue`; `App.vue` removes app chrome | Full-viewport remote MP4, 50% black overlay, reduced-motion omission, video-error fallback, brand/nav links, two `/generate` CTAs | Already dark but page-scoped and not aligned with the new tokens. Uses forbidden gradient text and raw `#000/#fff`; should gain a hint of the next layer while keeping fallback behavior. |
| `/generate` (`generate`) | `GenerateView.vue` with `mode="generate"` | Generation workspace, history rail, dock composer, settings, result feed, gallery detail modal | Largest and riskiest surface (3,168 lines). Preserve selectors/labels used by tests where practical. Recompose before restyling rather than layering more CSS. |
| `/history` (`history`) | Lazy `HistoryView.vue` | Backend-backed private history; pending vs applied search/date filters; grouped asset grid; detail modal; copy/delete | Current page has no loading skeleton and no pagination/load-more. Keep filter submit semantics and delete/copy messages. |
| `/admin/users` (`admin-users`) | Lazy `AdminUsersView.vue` | Admin authorization state, user creation, quota edits, refresh, protected deletion | Desktop table becomes single-column mobile rows. Keep current-admin/admin-account delete protection. |

Unregistered route-level files:

- `DiscoverView.vue` is a 7-line wrapper around `GenerateView mode="discover"`; no route imports it.
- `PromptsView.vue` is a complete static prompt-library page with 12 generated SVG data-URI templates, search/category filtering, copy, and `/generate?prompt=...` navigation. It is intentionally not routed, and `PromptsView.spec.ts` asserts `/prompts` is absent. It is not a user-facing screen under the current route contract.

## Global shell and navigation

### `App.vue`

- Globally mounts `LoginModal` on every route.
- Hides `AppHeader` and the operational backdrop on `landing`.
- Hides `AppHeader` while any `RecentCreationDetailModal` registers itself as open through `useImageDetailModalState`.
- Applies left content padding for the 86px desktop sidebar; below 760px removes it and reserves bottom-safe-area space.
- Plays a second remote backdrop video on desktop for `generate`, `history`, and `admin-users`; suppresses it at `max-width: 760px`. The redesign should decide whether this remains useful, but route behavior and readable fallback must remain stable.

### `AppHeader.vue`

- Desktop fixed left sidebar; mobile (<=760px) floating bottom navigation; logo hidden <=390px.
- Links in order: `发现` -> `/`, `生图` -> `/generate`, `资产` -> `/history`; admin adds `用户管理` -> `/admin/users`.
- Anonymous account button opens the global login modal. Authenticated account button toggles a logout menu; avatar uses profile image or initials.
- Current `RouterLink` active classes supply route state. Preserve active-state semantics, admin-only visibility, labels, and stable dimensions.

`AppFooter.vue` exists but is not mounted anywhere.

## Generation workspace contract

`GenerateView.vue` owns both a legacy discover state (`mode="discover"`) and the registered generation state (`mode="generate"`). The registered route is always the latter, but tests still cover both modes.

### Inputs and settings

- Prompt is required; Enter submits and Shift+Enter inserts a newline.
- Query parameter `route.query.prompt` populates the composer (used by the dormant prompt library and reusable deep links).
- One model is exposed: `gpt-image-2`.
- Count range is 1-2 (`DEFAULT_COUNT`, `MIN_COUNT`, `MAX_COUNT`).
- Aspect choices: auto, 1:1, 3:2, 2:3, 16:9, 9:16.
- Resolution choices: standard, 2K, 4K. Only admins see/use resolution. 4K forces 16:9 when needed; leaving a valid 4K aspect can downgrade resolution to 2K.
- Public/private toggle controls `isPublic` and insertion into the public gallery cache.
- Quota shows auth loading, remaining value, or login requirement; successful generation refreshes quota.

### Authentication and reference images

- Generation, upload picker, drop, paste, and regeneration are authentication-gated. Anonymous actions open `LoginModal` and show concise Chinese errors.
- File picker accepts PNG/JPEG/WebP and allows multiple files. Drag/drop and clipboard paste are also accepted.
- `useFileUpload` allows at most four reference images, appends repeated selections, creates/revokes object URLs, and retains validation warnings for nonstandard MIME types.
- Regeneration can reuse backend `referenceId`/`referenceIds` without uploading again. Do not collapse this to a preview-only visual state.

### Generation and result lifecycle

- `useImageGeneration` uploads local references sequentially, then POSTs to standard or high-resolution generation endpoints.
- Pending, success, and error records render inline. Failed generations keep their prompt/options for editing or retry.
- Success creates typed `ImageRecord`s, prepends them to shared history, refreshes quota, adds public entries to the gallery cache, clears prompt, and keeps the result feed.
- Result actions: preview, edit prompt, regenerate, download every image in the batch, and two-step batch deletion.
- Sidebar batches are grouped `今天 / 昨天 / 更早`; selecting a batch restores prompt, count, ratio, public state, and reference IDs.
- `新建生成` clears active/pending/result-reference state; `查看全部历史` routes to `/history`.
- Empty generate route still shows a dock composer and a minimal work-area message. Legacy discover mode shows a hero composer, animated suggestion, public gallery, and reduced-motion static suggestion.

### API contracts used by this screen

- `GET /api/images/quota`
- `POST /api/images/upload` (multipart field `image`, sequential for multiple files)
- `POST /api/images/generate` or `/api/images/generate/high-res`
- Request fields: prompt, optional referenceId/referenceIds, model, count, aspectRatio, resolution, isPublic, optional demoPresetId.
- Response requires batchId, aspectRatio, generationMode, and one or more typed image records.
- Do not rename `HistoryEntry`, `ImageRecord`, `GroupedBatch`, or the current composable event/data contracts as part of the visual rebuild.

## History / asset library contract

### `HistoryView.vue`

- Uses `useImageHistory`, which hydrates only after authentication and clears records on logout.
- Search and date range are staged locally and applied only when `查询` is submitted. `清除筛选` clears staged and applied state.
- Search covers prompt, id, batchId, model, aspect ratio, and public/private terms.
- Element Plus `ElDatePicker` is configured in Simplified Chinese with string `YYYY-MM-DD` values and responsive two-to-one-panel behavior.
- Hydration failures appear in a `role="alert"` block.
- Asset click opens `RecentCreationDetailModal`; delete calls `DELETE /api/history/:id`; copy uses `navigator.clipboard` with Chinese success/error messages.

### `HistoryGrid.vue`

- Sorts newest first, groups by calendar date, and shows per-day item count.
- Each tile exposes preview, public/private status, time, ratio, dimensions, size/fallback label, and an explicit remove action.
- Empty state text is `暂无符合条件的资产。`.

`HistoryDetailPanel.vue` is a richer inline inspector with enlarged-image mode, prompt metadata, rerun/download/remove actions, and focus restoration, but it is not currently mounted. Tests still cover it, so either deliberately adopt it in the redesign or leave its contract intact.

## Administration contract

- `useAuth().isAdmin` gates fetching and the entire management UI. Non-admin users see `无权访问`; there is no router guard.
- Admin load is triggered immediately when `isAdmin` becomes true.
- Creation requires a nonempty username, password >=8 characters, and integer daily quota >=0; submits username/password/dailyTotal.
- Table fields: avatar/identity, username/name/email, role, creation date, quota total/used/remaining, save quota, delete.
- Admin and current signed-in accounts cannot be deleted. Buttons expose pending states for create, refresh, quota save, and delete.
- API endpoints: GET/POST `/api/admin/users`, PATCH `/api/admin/users/:id/quota`, DELETE `/api/admin/users/:id`.
- Responsive behavior: four-column desktop table; at <=1160 actions move below; <=860 rows become labeled vertical records and header disappears; <=560 actions become full-width. Redesign must retain every action on mobile.

## Authentication and overlays

### `LoginModal.vue`

- Global Element Plus dialog, 380px desktop width, close by button/backdrop/Escape.
- Tablist switches username/password sign-in and sign-up. Sign-up requires password >=8; `useAuth` additionally normalizes username to lowercase and validates `[a-z0-9_]{3,32}`.
- Separate Google sign-in action. No forgot-password UI.
- Successful auth automatically closes the dialog; close resets all form and pending state.
- `useAuth` merges Better Auth session user with `/api/auth/me` profile; admin status comes only from the profile.

### `RecentCreationDetailModal.vue`

- Teleports to `body`, uses dialog semantics, closes on backdrop/Escape/button, and focuses close control on open.
- Shows bounded image stage, scrollable prompt, model/time metadata, save and copy/remix actions, plus admin delete.
- Registers global image-detail modal state so app navigation disappears while open.
- <=900px becomes stacked and scrollable; <=520px becomes a full-height single-column inspector with safe-area padding.

## Shared components and reuse status

| Component/composable | Used now | Contract |
| --- | --- | --- |
| `RecentCreationsMasonry` | `GenerateView` legacy discover surface | Up to 40 public entries; JS-calculated 4/3/2 masonry columns at >860/<=860/<=560; shortest-column distribution; admin two-click delete. |
| `RecentCreationDetailModal` | Generate and history | Shared preview/copy/save/admin-delete overlay and global shell suppression. |
| `HistoryGrid` | History | Date grouping, responsive tiles, preview/remove emits. |
| `LoginModal` | App global | Auth tabs, Google, validation, reset, close behavior. |
| `ImageDropzone` | Not mounted | Single-file browse/drop, metadata/preview, validation and clear emits; component tests exist. |
| `GenerationStatusPanel` | Not mounted | Status message/progress display; contains stale IndexedDB copy. |
| `HistoryDetailPanel` | Not mounted | Rich detail/enlarge/rerun/download/remove inspector; component tests exist. |
| `AppFooter` | Not mounted | Simple route footer. |
| `useImageHistory` | Generate/history | Module-level authenticated cloud history cache, batch grouping, record/batch deletion. |
| `usePublicGallery` | Generate discover surface | Module-level public cache, unauthenticated hydration, add public-only, admin removal. |
| `useImageQuota` | Generate | Module-level quota, optimistic authenticated fallback of 20, race protection. |
| `useImageDetailModalState` | App/detail modal | Reference-count-like set of open modal IDs. |

## Current CSS and token architecture

- `src/styles/tokens.css` is globally imported through `base.css`. It currently contains earlier redesign work that must be aligned with the new Squarespace-derived system.
- Current typography loads remote Geist, Instrument Serif, Noto Serif SC, and LXGW WenKai. New `design.md` specifies Inter/Inter Display with fallbacks. Font loading is network-dependent and there are no local font assets.
- Global primitives in `base.css`: container, headings, buttons (`claude-button` variants), icon buttons, pills, surfaces, fields, image surface, and metadata rows.
- Most visual CSS is duplicated in large `<style scoped>` blocks inside views/components. Element Plus is globally overridden from `LoginModal.vue` and `HistoryView.vue` via `:global`/`:deep`.
- Existing layout variables include 86px app rail, 280px generation history sidebar, 1200px content widths, and safe-area-aware bottom spacing.
- Current breakpoints are inconsistent: 1280, 1180, 1160, 1100, 980, 920, 900, 860, 760/767, 720, 700, 640, 560, 520, 420, 390, and 360px. The redesign should consolidate behavior around content-driven desktop/tablet/mobile boundaries while retaining tested 860/760/560 behavior.
- The new design system should be implemented first in tokens/global primitives, then consumed from SFCs. Avoid keeping raw legacy colors or duplicating page-local versions of the same button/input/panel treatment.
- `design.md` asks for alternating full-width black and white bands, black/white action inversion, 4px controls, 8px inset media cards, 100px tab pills, no decorative shadows, and generated imagery as the color system. Operational pages should translate this vocabulary into dense, readable tools without wrapping each section in a floating card.

## Existing responsive and accessibility states

- Landing: nav links hidden <=860; heading becomes 36px; tighter brand/CTA at 520/360; compact-height layout <=700; reduced-motion disables video and transitions; forced-colors restores solid heading text.
- App shell: operational video disabled and content switches to bottom-nav layout <=760.
- Header: desktop rail -> bottom bar <=760; logo removed <=390.
- Generate: type and stage compress at 1180; dock controls wrap at 1100; history sidebar stacks above content at 860; result grids collapse; at 560 composer becomes a safe-area-aware bottom dock with scrollable settings and full-width submit.
- History: date-picker popper stacks calendars <=720; filters become one column <=860; tighter two-column tiles <=560 and one-column fallback <=420 (current media order makes the <=560 two-column rule override the earlier <=420 width rule, a likely bug to fix).
- Admin: table/actions reflow at 1160/860/560 as described above.
- Gallery/detail: masonry 4/3/2; modal stacks <=900 and becomes mobile full-height <=520.
- Visible focus rules exist on most custom controls; semantic labels/roles are broadly present. Preserve dialog semantics, `aria-live`, `role=alert/status`, listbox/radio/pressed states, focus transfer, Escape close, and `prefers-reduced-motion` behavior.

## Existing tests

Vitest + Vue Test Utils + jsdom; tests are serialized (`fileParallelism: false`). There are 20 spec files plus setup, including:

- Routing/app shell: exact four routes, standalone landing shell, global login modal, operational video backdrop, and header suppression while image detail is open.
- Landing: exact video URL/media attributes, link destinations, logo, error fallback, reduced-motion omission, accessible labels.
- Generate (largest suite, 1,252 lines): discover suggestion behavior, routing, authentication gates, empty/workspace states, public toggle, count/aspect/admin resolution, gallery/admin delete, multi-generation feed, failure retention, edit/regenerate/save/delete, multiple reference files, reused reference IDs.
- History: title/surface structure, preview/removal, Element Plus date picker, staged/apply/clear search and date filtering.
- Admin: authorized load, non-admin block, create, quota update, protected delete and normal delete.
- Shared components: header nav/account/admin state; login tabs/forms/Google; history grid/detail; public masonry/detail modal; dropzone.
- Composables/services/utils: generation request/error mapping, cloud history auth behavior, public gallery, quota fallback/refresh, typed API narrowing, 401 handler, network localization, blob download.
- `PromptsView.spec.ts` explicitly asserts `/prompts` is not registered.

Tests are behavior-heavy but mostly shallow DOM tests. They do not prove route-level visual quality, full keyboard trapping, horizontal overflow, browser video playback, responsive screenshots, or real backend integration. The PRD therefore still requires browser QA for all four routes and key overlays at desktop/mobile sizes.

## Public and visual assets

- Only production public asset: `frontend/public/brand/logo.png` (256x256 transparent Nebulens mark, 18,433 bytes).
- Landing hero and operational backdrop use two different CloudFront MP4 URLs. Both require network access and must keep black/static fallbacks.
- Generated/history images are real backend URLs at `/api/outputs/:id` via `VITE_API_BASE_URL` (default `http://localhost:3000`).
- User avatars may be remote profile image URLs.
- `docs/screenshots/{home,generate,history}.png` are documentation images, not public runtime assets.
- The root favicon is an inline warm-cream SVG data URI and should be updated to the new brand system during the full redesign.

## Likely files impacted

Primary production files:

- `frontend/src/styles/tokens.css`
- `frontend/src/styles/base.css`
- `frontend/src/App.vue`
- `frontend/src/components/common/AppHeader.vue`
- `frontend/src/views/LandingView.vue`
- `frontend/src/views/GenerateView.vue`
- `frontend/src/views/HistoryView.vue`
- `frontend/src/views/AdminUsersView.vue`
- `frontend/src/components/auth/LoginModal.vue`
- `frontend/src/components/gallery/HistoryGrid.vue`
- `frontend/src/components/gallery/RecentCreationsMasonry.vue`
- `frontend/src/components/gallery/RecentCreationDetailModal.vue`
- `frontend/src/components/gallery/HistoryDetailPanel.vue`
- `frontend/src/components/gallery/GenerationStatusPanel.vue`
- `frontend/src/components/upload/ImageDropzone.vue`
- `frontend/index.html` (metadata/favicon color language)

Potential structural work:

- Extract reusable dark input/button/panel primitives only where it removes real duplication; do not introduce a new component framework.
- `GenerateView.vue` is an extraction candidate for composer, settings, history rail, and result item components, provided composable/data contracts remain unchanged.
- `AppFooter.vue`, `DiscoverView.vue`, and `PromptsView.vue` should not be included in the route redesign unless the route/product scope is deliberately changed; do not silently expose `/prompts`.

Test/QA files likely updated:

- `frontend/tests/App.spec.ts`, `router.spec.ts`
- `frontend/tests/views/{LandingView,GenerateView,HistoryView,AdminUsersView}.spec.ts`
- `frontend/tests/components/{AppHeader,LoginModal,HistoryGrid,HistoryDetailPanel,RecentCreations,ImageDropzone}.spec.ts`
- `design-qa.md` plus route screenshots under the active task research directory.

Do not change backend services, endpoint contracts, authentication semantics, quota rules, or image/history types for this redesign.
