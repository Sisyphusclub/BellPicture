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

### Generate

- Recompose the page around a persistent Agent Chat Input create bar and a continuous session result feed.
- Preserve prompt, reference images, model, aspect ratio, count, quality, visibility, and quota state.
- Keep upload, paste, removal, authentication gating, generation progress, error recovery, and submit/stop states functional.
- Reuse and rerun must restore the complete supported generation contract, not prompt text alone.
- Results expose direct actions for inspect, rerun, use as reference, reuse settings, download, visibility where supported, and delete.
- Advanced options use progressive disclosure through beUI menus or a responsive side sheet.

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

## Independent Check Evidence

- Frontend: typecheck, lint, formatting, production build, and 40 Vitest tests pass.
- Backend: typecheck, lint, production build, scoped formatting, and 166 Vitest tests pass.
- Browser QA: Assets authentication loading and guest states pass at 320px, 390px, 1024px, and 1440px with no horizontal document overflow, clipping, incoherent overlap, or fixed-navigation coverage.
- Browser console: no application warnings or errors; observed log entries came only from an installed browser extension.
- Gallery follow-up: the standalone Public Gallery section and its hydration request are absent; the home hero is followed by a static six-image `今日创作` waterfall with 3/2/1 responsive columns and retained detail inspection.
- Destructive-action follow-up: Generate single/batch deletion and Assets single/bulk deletion use the shared beUI Morphic confirmation alert dialog. Integration and browser QA cover cancel, confirm, failure, retry, pending guards, focus containment/return, Escape, backdrop close, and 320px layout.
- Template asset follow-up: all 12 visible templates now use distinct Nebulens-owned GPT Image 2 WebP assets; browser QA found 12 unique URLs, zero broken images, no overflow at 1447px/394px, and no third-party source text, logos, or watermarks.

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
