# Rebuild the Nebulens Frontend Around the beUI Pro Dark Design System

## Goal

Rebuild the complete Nebulens frontend in React and every user-facing route around the beUI Pro-derived dark `design.md`, while preserving all existing generation, history, authentication, quota, and administration behavior. The home page becomes a prompt-first AI creation screen with a generated-image rail; operational pages form one layered dark studio using beUI interaction patterns.

## Product and Visual Brief

- **Users:** AI image creators, small creative teams, and administrators managing daily generation quotas.
- **Primary jobs:** start from a prompt or reference image, configure and run generations, compare current-session results, revisit/download/delete history, authenticate, and administer users.
- **Visual source:** project-root `design.md`, derived from `https://pro.beui.dev/components` and the installed beUI Pro component sources.
- **Tone:** dark, precise, fluid, and operational.
- **Interactivity:** full; every existing control, state, route, and responsive workflow remains functional.

## Routes and Screens in Scope

- `/` cinematic public landing page.
- `/generate` generation workspace.
- `/history` personal asset history.
- `/admin/users` administrator user and quota management.
- Global application shell and navigation.
- Authentication modal and account menu.
- Generation status, upload, recent creation, history grid/detail, and image detail surfaces.
- Shared loading, empty, error, disabled, hover, focus, selected, and mobile states.

## Requirements

### Global design system

- Replace Vue 3, Vue Router, Element Plus, Vue Test Utils, and Vue-only build tooling with React 19, React Router, React Testing Library, and React-compatible Vite tooling.
- Install and configure Tailwind CSS v4 plus the shadcn registry contract (`components.json`, aliases, utility helper, and CSS token layer).
- Install the documented beUI runtime dependencies `clsx`, `motion`, and `tailwind-merge`; use the component-source distribution model rather than treating beUI as a monolithic npm UI package.
- Replace the warm cream, COSMOQ, and Squarespace token remnants with the semantic dark beUI/Nebulens system derived from `design.md`.
- Use layered graphite canvases, compact operational spacing, stable content widths, hairline borders, and role-based 8-20px radii.
- Use light inversion for primary actions, restrained floating shadows only for menus/modals, and generated imagery as the main source of chroma.
- Use Geist Sans/Inter consistently for display and interface text. Do not scale font size continuously with viewport width.
- Keep all user-facing copy concise and in Simplified Chinese.
- Use the existing logo and real product/generated imagery; do not add fake visual assets or CSS illustrations.
- Preserve practical WCAG AA contrast, visible keyboard focus, reduced-motion behavior, and descriptive labels.

### Application shell

- Rebuild the desktop sidebar and mobile bottom navigation as layered dark beUI-style navigation surfaces.
- Preserve existing route destinations, active states, authentication/account behavior, and administrator visibility.
- Use a stable shell that does not shift between loading, authenticated, and anonymous states.
- Ensure every route has consistent content width, top spacing, surface hierarchy, and mobile safe-area handling.

### Landing page

- Replace the Squarespace/video hero with a dark, full-viewport, prompt-first beUI product screen using the shared Agent Composer.
- Keep compact brand/navigation controls, one concrete creation promise, and real generated imagery visible in the first viewport.
- Preserve a five-slot animated image rail with three visible cards: it auto-advances about every 5 seconds, moves all three cards together over about 800ms, exposes Previous/Next controls on hover or focus, pauses while hovered or focused, and stops motion for reduced-motion users. The complete public generated-image stream follows below it. On mobile, keep a single-focus swipeable rail followed immediately by the gallery.
- Keep brand, authentication, quota context, navigation, and `开始创作` / `进入工作台` routes functional; primary creation actions lead to `/generate`.
- Make the hero and generated-image stream responsive without horizontal overflow, clipped text, or navigation overlap.

### Generation workspace

- Recompose the page as a focused creation console with prompt/reference input, model/count/ratio/public controls, quota, submit action, status, and results all visible in a predictable hierarchy.
- Preserve all composables, API requests, validation, event contracts, and testable labels.
- Keep generated images and current-session outputs as the dominant content, not decorative cards.
- Preserve reference-image upload, removal, preview, generation, download, and authentication-gated flows.

### Asset history

- Rebuild history as a scan-friendly asset library with date grouping, responsive image grid, detail inspection, deletion, download, and public-state information.
- Preserve existing loading, empty, error, pagination/load-more, detail, and deletion behavior.
- Avoid nested card treatment; image tiles should be the primary repeated surface.

### Administration

- Rebuild user management as a dense, operational console with user creation, quota editing, role/status visibility, and deletion.
- Preserve all authorization checks, loading/error/empty states, confirmation behavior, and API contracts.
- Keep table content readable on desktop and adapt to a purposeful mobile layout instead of clipping or hiding critical actions.

### Authentication and overlays

- Restyle the login/sign-up modal, Google action, fields, tabs, errors, disabled states, and close control to the new system.
- Restyle image detail, history detail, and recent creation overlays without changing their behavior.
- Maintain keyboard access, escape/close behavior, focus visibility, and responsive sizing.

## Acceptance Criteria

- [ ] Every route and shared UI surface visually follows the new `design.md`; no warm cream legacy page remains.
- [ ] / renders a dark beUI prompt-first creation screen with a functional Agent Composer, three visible generated-image carousel cards, autoplay and Previous/Next controls, reduced-motion behavior, the full public image stream below, and a single-focus mobile rail.
- [ ] `/generate` preserves prompt/reference generation, settings, quota, status, results, and current-session behavior.
- [ ] `/history` preserves loading, empty, error, grouping, detail, download, deletion, and responsive behavior.
- [ ] `/admin/users` preserves account creation, quota editing, deletion, authorization, and mobile access to all actions.
- [ ] Login/sign-up and image-detail overlays match the new visual system and remain fully functional.
- [ ] Desktop and mobile views have no horizontal overflow, incoherent overlap, clipped text, or inaccessible controls.
- [ ] Existing tests are updated only where the visual restructuring changes DOM structure; behavioral coverage remains intact or expands.
- [ ] Lint, typecheck, tests, production build, formatting check, `git diff --check`, and browser console checks pass.
- [ ] Browser screenshots are captured for every route at desktop and mobile sizes and inspected against `design.md`.
- [ ] `design-qa.md` records route-by-route evidence and ends with `final result: passed` only after all routes pass.

## Technical Approach

1. Keep the pure TypeScript service, type, and utility contracts; migrate Vue composables into React hooks/providers with equivalent module-level cache and request behavior.
2. Replace the Vue entry, router, SFCs, test harness, lint config, and build scripts with React equivalents.
3. Establish Tailwind v4, shadcn aliases/tokens, beUI runtime dependencies, and the dark semantic token layer before rebuilding surfaces.
4. Rebuild the app shell and global navigation without altering routing or authentication logic.
5. Rebuild the existing landing, generation, history, administration, authentication, gallery, upload, status, and detail surfaces in TSX.
6. Update tests to React Testing Library while preserving behavior-focused coverage.
7. Start the local app and perform route-by-route browser QA at desktop and mobile viewports.

## Constraints

- Add only the React, React Router, Tailwind/shadcn, beUI runtime, lint, and React test dependencies required for the framework migration.
- Do not change backend APIs, storage behavior, authentication semantics, or quota rules.
- Do not remove or rename existing routes.
- Do not replace real assets with placeholders or CSS illustrations.
- Do not commit or push without the repository workflow's explicit commit-plan confirmation.

## Decision (ADR-lite)

**Context:** beUI components are React/Tailwind/Framer Motion sources distributed through the shadcn registry, while the existing frontend is Vue 3 with Element Plus.

**Decision:** Perform an in-place frontend framework migration to React 19 while retaining Vite, TypeScript strict mode, the existing backend, public assets, route URLs, API services, domain types, and product behavior. Configure Tailwind v4 and shadcn as the component-source layer, then add beUI components individually as product needs arise.

**Consequences:** Vue SFCs and Vue-specific tests are replaced rather than bridged; Element Plus is removed; framework-neutral services and utilities remain authoritative; responsive and accessibility behavior must be revalidated route by route.

## Definition of Done

- All routes and shared UI surfaces are rebuilt and visibly cohesive.
- Full frontend tests, lint, typecheck, formatting check, and production build pass.
- Desktop and mobile browser QA covers every route, key overlay, and key state with no actionable P0/P1/P2 findings.
- `design-qa.md` contains route-by-route evidence and `final result: passed`.
- User approves the final local preview before any commit.
