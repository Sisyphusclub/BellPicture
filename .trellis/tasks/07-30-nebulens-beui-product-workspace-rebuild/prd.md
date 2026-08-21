# Nebulens beUI Product Workspace Rebuild

## Goal

Completely rebuild the Generate, Creation Templates, Assets, Sign In, and Sign Up experiences as one coherent, fully interactive AI image studio aligned with beUI Pro. Use current competitor workflows to improve creation speed, continuation, organization, and account entry without copying competitor branding or adding unsupported controls.

## What I Already Know

- The product is a dark-first AI image studio for individual creators and small teams.
- The source of truth for components and interaction language is [beUI Pro](https://pro.beui.dev/components).
- The target pages are `/generate`, `/templates`, `/history`, and the sign-in/sign-up overlay.
- The user explicitly wants full interaction, a complete redesign, competitor research first, and no visible explanatory UI copy.
- React 19, React Router, TypeScript, Motion, Lucide, Tailwind 4, Better Auth, and Vitest are already installed.
- Source-owned beUI components already present: Agent Chat Input, Animated Dropdown, Morphic Card Modal, Morphic Tooltip, and Navbar Expand.
- The backend currently supports authentication, quota, 1-2 image generation, up to 4 reference images, aspect ratio, admin-only high resolution, visibility at creation, history loading, and image/batch deletion.

## Requirements

### Shared workspace

- Use one shared beUI-aligned application shell for Generate, Templates, and Assets.
- Keep route navigation, quota, account, and primary create action available without crowding the work area.
- Use semantic tokens, stable control dimensions, Lucide icons, visible focus, and reduced-motion fallbacks.
- Visible work surfaces use labels and state only; no page subtitles, tutorial paragraphs, feature narration, or keyboard shortcut prose.

#### Discover liquid-glass follow-up (2026-08-11)

- Keep the existing beUI `AgentChatInput`, Nebulens BorderGlow palette, video background, layout,
  and generation handoff intact.
- Replace only the Discover composer material with the Wanxiang-style layered glass technique:
  continuous full-surface directional SVG displacement refraction, a lightly tinted radial sheen, a
  restrained directional inset rim, and a separate `20px` desktop / `18px` mobile chrome blur.
- Reframe the overscanned desktop hero video around its visual focal point rather than its source-box
  midpoint so the vortex reads centered behind the title and composer.
- Apply the supplied 6-second blue-lilac-blush-ivory shiny gradient only to the italic `into images`
  headline accent. Its visible sheen travels left to right, keeps italic descenders fully painted, and
  becomes a static centered gradient when reduced motion is requested.
- Expose the material as a typed optional `AgentChatInput` capability and enable it only on Discover;
  Generate must keep its existing workbench surface.
- Preserve root overflow for menus, clip only the glass layers, retain the focused gradient edge ring,
  and provide no-filter and higher-contrast fallbacks.

### Generate

- Recompose the page around a persistent Agent Chat Input create bar and a continuous session result feed.
- Preserve prompt, reference images, model, aspect ratio, count, visibility, and quota state.
- Keep the current Generate workspace fixed to 1K. Do not render the former Standard/2K/4K
  selector, and normalize legacy `resolution=2k|4k` URL values plus rerun, retry, edit, and reuse
  snapshots to `standard` before starting a new request.
- Discover and Generate submit actions share the same credit-cost treatment and show one credit per
  requested image, updating from `1` to `4` as the count changes.
- Keep upload, paste, removal, authentication gating, generation progress, error recovery, and submit/stop states functional.
- Reuse and rerun must restore the complete supported generation contract, not prompt text alone.
- Results expose direct actions for inspect, rerun, use as reference, reuse settings, download, visibility where supported, and delete.
- Advanced options use progressive disclosure through beUI menus or a responsive side sheet.

#### Result-state visual regression follow-up (2026-08-03)

- Fix the completed-result workspace shown in
  `research/generate-result-ui-regression-1963.png` without changing generation behavior.
- Replace the detached full-width batch header with the established GPT-style conversation
  hierarchy: a compact right-aligned prompt/meta bubble followed by the generated media and
  contextual actions in one centered reading column.
- Make a single generated image materially larger on wide desktop while preserving its source
  aspect ratio. Keep multi-image batches balanced and centered instead of stretching or leaving an
  orphaned first column.
- Keep batch actions available but visually subordinate. Destructive actions must not dominate the
  prompt or image, and image-level actions stay attached to the corresponding result.
- Preserve the bottom-centered Agent Chat Input, right-side generation history rail, canvas dot
  field, session switching, rerun/reuse/download/delete behavior, and reduced-motion handling.
- Harden the left recent-session presentation so the heading, numeric count, title, and hover
  three-dot action retain separate alignment and never collapse into consecutive raw text at wide
  desktop widths.
- Keep the page free of horizontal overflow and ensure the result column remains clear of the fixed
  composer at 1366px, 1440px, and 1920px-class viewports.

#### Prompt editor action normalization follow-up (2026-08-04)

- Replace the prompt editor's page-local action buttons with the shared beUI-aligned `Button`
  primitive. Use `secondary` for `取消` and `primary` for `修改`.
- Keep a visible `16px` gap between the actions so they read as separate commands rather than a
  segmented control. Preserve submit, cancel, disabled, focus, keyboard, and mobile behavior.

#### GPT-style recent session differentiation follow-up (2026-08-04)

- Match the supplied GPT Recents reference in the Generate sidebar: the active session has a
  persistent full-row low-contrast highlight and high-contrast title; inactive sessions remain
  borderless and unfilled until hover or focus.
- Keep the `最近会话` heading clear and remove the visible numeric badge.
- Replace the two per-row action columns with one shared beUI `AnimatedDropdown` trigger. Reveal
  the three-dot trigger only on hover/focus/menu-open, with rename and delete inside the menu.
- Preserve session creation, navigation, inline rename, delete confirmation, keyboard access,
  truncation, ordering, and sidebar width.

#### Recent session result restoration follow-up (2026-08-04)

- Preserve each session's current result feed in a page-lifetime cache and merge it with server
  history when switching sessions, so A to B to A navigation never clears newly generated results.
- Keep pending, completed, failed, and replaced batches associated with their owning session until
  the server-backed history can restore them.
- Clear the visible feed when the active session is removed and navigation returns to bare
  `/generate`, without deleting other session results.

#### Component provenance quality gate follow-up (2026-08-04)

- Audit every frontend route and component against the beUI Pro source contract.
- Replace visible page-local native controls and browser dialogs with shared beUI/ui adapters while
  preserving existing behavior, focus, disabled, responsive, and pending states.
- Keep browser-required native controls as exact, documented exceptions only; the hidden reference
  file input is permitted while its visible trigger remains shared.
- Add a machine-readable provenance policy and AST check that fails on unapproved native controls,
  direct foundation imports outside shared roots, competing component systems, browser dialogs,
  or undocumented external-component consumers.
- Run the provenance check before frontend lint and production build, and document the source
  inventory, exceptions, findings, and residual risk.

### Creation templates

- Replace the current six-card demo grid with an image-led template browser.
- Support search, category filters, quick preview, copy, use template, favorites, and recent-use state.
- Template use opens Generate with the supported settings prefilled.
- Template cards and detail interactions use real images and beUI image/morphic patterns.

### Assets

- Provide image grid and compact list modes.
- Support search, sort, date, visibility, favorites, and collection filters.
- Support multi-select, select all in current result set, bulk download, bulk collection assignment, and bulk delete.
- Preserve inspect, copy prompt, reuse, download, visibility, single delete, loading, empty, error, unauthenticated, and retry states.
- Add backend persistence for new asset metadata only when the corresponding UI ships fully functional.

### Authentication

- Rebuild sign in and sign up from the beUI Auth interaction model.
- Preserve username/password and Google flows.
- Add password visibility, inline username/password validation, pending/error states, correct autocomplete, focus containment, Escape/outside close, and focus return.
- Return users to the command that opened authentication after successful sign in.
- Do not add forgot-password, verification, or social methods that the backend does not support.

## Acceptance Criteria

- [x] Generate, Templates, Assets, Sign In, and Sign Up have visibly new beUI-aligned compositions rather than CSS-only reskins.
- [x] Every visible control is functional and has populated, loading, empty, error, disabled, and keyboard states where applicable.
- [x] Generate supports prompt, references, aspect, count, quality, visibility, quota, generation progress, errors, and complete reuse/rerun.
- [x] Result actions continue creation without losing supported settings.
- [x] Templates support search, filters, preview, favorite/recent state, copy, and one-click use.
- [x] Assets support grid/list, filters, sorting, multi-select, bulk operations, inspect, reuse, download, visibility, and delete.
- [x] Sign in/sign up pass keyboard, focus, validation, pending, error, and focus-return checks.
- [x] No operational page contains explanatory subtitles, tutorial text, feature descriptions, or keyboard shortcut prose.
- [x] No fake buttons or unsupported model features are exposed.
- [x] No horizontal overflow, clipped text, overlap, or unstable controls at 1440px, 1024px, 768px, 390px, and 320px.
- [x] Typecheck, lint, formatting, frontend tests, backend tests where changed, production build, browser console checks, and visual QA pass.
- [x] At 1963 x 1282, one completed square result renders in a coherent conversation column with
      the prompt bubble, image, and actions visibly connected rather than as a detached full-width bar.
- [x] Single-result media is larger than the previous 340px card on wide desktop, remains fully
      visible above the composer, and preserves its intrinsic aspect ratio.
- [x] Recent-session heading and title/ellipsis controls remain separated and aligned with two or
      more sessions; hover, active, focus, and inline rename states remain functional.
- [x] Recent sessions visually distinguish the active conversation from inactive rows without a
      count badge, and row actions use one beUI Animated Dropdown instead of parallel icon buttons.
- [x] Repeated switching between recent sessions restores each session's own generated results even
      before server history hydration completes.
- [x] All visible route and domain controls use shared beUI/ui contracts; the only native-control
      exception is the exact hidden reference file input required by the browser.
- [x] `npm run check:components` passes and runs before frontend lint and build.
- [x] Discover renders the optional liquid-glass layers over the hero video while Generate renders no
      liquid-glass layer; the focused BorderGlow ring, menus, mobile layout, and zero-overflow behavior
      remain intact.
- [x] Result-state screenshots pass at 1366px, 1440px, and 1963px with no overlap, clipping, or
      horizontal overflow; route tests, lint, typecheck, formatting, and production build pass.

## Independent Check Evidence

- Frontend: typecheck, lint, formatting, production build, and 40 Vitest tests pass.
- Backend: typecheck, lint, production build, scoped formatting, and 166 Vitest tests pass.
- Browser QA: Assets authentication loading and guest states pass at 320px, 390px, 1024px, and 1440px with no horizontal document overflow, clipping, incoherent overlap, or fixed-navigation coverage.
- Browser console: no application warnings or errors; observed log entries came only from an installed browser extension.
- Gallery follow-up: the standalone Public Gallery section and its hydration request are absent; the home hero is followed by a static six-image `今日创作` waterfall with 3/2/1 responsive columns and retained detail inspection.
- Destructive-action follow-up: Generate single/batch deletion and Assets single/bulk deletion use the shared beUI Morphic confirmation alert dialog. Integration and browser QA cover cancel, confirm, failure, retry, pending guards, focus containment/return, Escape, backdrop close, and 320px layout.
- Template asset follow-up: all 12 visible templates now use distinct Nebulens-owned GPT Image 2 WebP assets; browser QA found 12 unique URLs, zero broken images, no overflow at 1447px/394px, and no third-party source text, logos, or watermarks.
- Result-state follow-up: independent Trellis review plus in-app browser measurement confirmed the GPT-style prompt/media/action hierarchy, 520px wide-desktop square result, 36px batch action targets, intrinsic 16:9 preview ratio (422 x 241), separated recent-session controls, zero horizontal overflow, and 24px composer clearance at 1366 x 768 and 1440 x 900.

## Definition of Done

- All five requested experiences are rebuilt and connected through the same product shell.
- Existing production behavior is preserved or deliberately replaced with a tested interaction.
- New persisted asset capabilities include backend schema/API tests and frontend integration tests.
- `design.md`, frontend specifications, and tests reflect the final component contracts.
- The running preview has been checked route by route at desktop and mobile sizes.

## Technical Approach

1. Normalize the shell, navigation, tokens, shared toolbar/button/input/menu contracts, and account entry.
2. Rebuild Generate around the existing Agent Chat Input and generation/history hooks; add a serializable generation settings snapshot for reliable rerun/reuse.
3. Build the template browser from structured template data with favorites and recent use.
4. Extend asset records and API contracts only for features that require persistence, then rebuild Assets with selection and bulk actions.
5. Run route-level and visual QA, then update `design.md` with the final beUI mappings.

## Decision (ADR-lite)

**Context:** Competitors expose many capabilities that Nebulens' current image provider and API do not support.

**Decision:** Implement a precision-first studio using the complete existing generation contract plus real asset organization features. Do not imitate Canvas, video, trained style profiles, or semantic reference controls until the upstream API can represent them.

**Consequences:** The rebuilt interface remains honest and fully functional. Some competitor capabilities are documented as follow-on work rather than appearing as inactive UI.

## Research References

- [`research/competitive-workflows.md`](research/competitive-workflows.md) - competitor interaction patterns, beUI mapping, current gaps, and scope priorities.

## Out of Scope

- Home page redesign beyond shared navigation/auth integration.
- Admin user-management redesign.
- Video generation.
- Canvas inpainting/outpainting, layers, pose/depth/edge controls, or trained personalization profiles.
- Unsupported authentication methods or password-recovery flows.

## Technical Notes

- Relevant views: `frontend/src/views/GenerateView.tsx`, `TemplatesView.tsx`, `HistoryView.tsx`.
- Authentication: `frontend/src/components/auth/LoginModal.tsx`, `frontend/src/hooks/useAuth.tsx`.
- Shared design system: `design.md`, `.impeccable.md`, `frontend/src/styles/tokens.css`, `frontend/src/components/premium/`.
- Frontend code must follow `.trellis/spec/frontend/index.md` and its linked guides.
- Worktree contains an in-progress Vue-to-React migration and user changes. Do not revert unrelated files.

### Static discovery gallery refinement (2026-08-13)

- Keep the existing beUI Pro four-column desktop and two-column compact waterfall composition.
- Render each of the six bundled works once per responsive gallery without automatic vertical movement, duplicated loop copies, or animation timing styles.
- Remove the top and bottom edge fade so every image renders at full opacity while preserving image aspect ratios, responsive behavior, and image-detail interaction.
- While the user scrolls through the Discover gallery, dock the existing composer at the viewport bottom in a compact single-line state. Clicking or focusing its prompt expands the complete controls without moving gallery content; a non-interactive black-to-transparent bottom gradient maintains contrast over the images.

## Discovery Account Actions Follow-up (2026-08-13)

- Replace the discovery page's previous account/points cluster with the supplied
  compact upper-right reference hierarchy: Templates, Notifications, Personal
  Credits, and Account.
- Personal Credits opens a functional daily check-in popover. Authenticated
  users receive the configured generation-credit reward once per
  `Asia/Shanghai` calendar day; repeated claims are idempotent and the returned
  quota snapshot updates both the header and composer.
- Persist check-in date and same-day bonus without overwriting the
  administrator-defined base quota. Keep the operation accessible from the
  mobile Sidebar while hiding the desktop cluster below 860px.
- Acceptance evidence: 1440 x 813, 1366 x 768, and 390 x 844 browser checks;
  successful 20 -> 25 credit claim; backend/frontend typecheck, lint, tests,
  component provenance, and production builds all pass.
