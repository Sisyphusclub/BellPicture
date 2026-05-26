# Unify frontend UI design system

## Goal

Keep Ref2Image Studio's current calm, premium creative-workstation visual style while standardizing the frontend UI system: design tokens, spacing, typography, layout rhythm, component states, and repeated surface/button/field patterns. Use HeroUI theming as a reference for semantic CSS variables and component-state modeling, but do not introduce HeroUI React components or replace the Vue custom UI system.

## What I already know

* The user says the project functionality is basically stable, but many frontend UI details do not match the intended design standard and feel inconsistent.
* The target is to preserve the existing visual style, not redesign the product into a new theme.
* The user explicitly referenced HeroUI themes and then the HeroUI GitHub repo as inspiration.
* `PRODUCT.md` identifies this as a product UI for a focused desktop image-generation workflow: calm, precise, premium, editorial, restrained, and Simplified Chinese for user-facing copy.
* No `DESIGN.md` exists yet, so the current task should codify the visual system from the existing implementation and the new decisions.
* Frontend stack/spec: Vue 3.5, Vite 5, TypeScript strict, custom product surfaces plus Element Plus utilities.
* Existing global styling entry points are `frontend/src/styles/tokens.css` and `frontend/src/styles/base.css`.
* Existing app routes are `/`, `/generate`, and `/history`; `/` renders `DiscoverView`, which wraps `GenerateView mode="discover"`.
* Existing route-level surfaces likely impacted: `GenerateView.vue`, `HistoryView.vue`, `App.vue`, `AppHeader.vue`, `LoginModal.vue`, `RecentCreationsMasonry.vue`, `RecentCreationDetailModal.vue`, `HistoryGrid.vue`, and `HistoryDetailPanel.vue`.
* Existing specs already require custom product surfaces, Simplified Chinese copy, modal accessibility, and warm composer-like popup surfaces.

## Research References

* [`research/heroui-theming.md`](research/heroui-theming.md) — HeroUI v3's transferable theming ideas are semantic CSS variables, OKLCH roles, field/state tokens, typography roles, and component variant/state anatomy.
* [`research/current-ui-audit.md`](research/current-ui-audit.md) — Current UI drift comes from local one-off colors, mixed typography scales, duplicated button systems, inconsistent focus states, broad radii/shadows/glass usage, and component-local breakpoints.

## Requirements (evolving)

* Preserve the current Ref2Image visual identity: warm clean canvas, restrained premium product feel, editorial but task-first image-generation workspace.
* Keep the Vue custom CSS/SFC UI system; do not add HeroUI as a dependency and do not migrate to React-oriented HeroUI components.
* Convert the current token layer toward semantic roles inspired by HeroUI while retaining existing project naming where practical.
* Standardize spacing on the existing 4px-based scale and reduce local magic numbers where they create visible inconsistency.
* Standardize typography roles for labels, body, card titles, section titles, page titles, and hero titles.
* Standardize core component vocabulary: buttons, fields, cards/surfaces, popups/modals, image tiles, and focus states.
* Keep user-facing copy Simplified Chinese unless it is a brand, model name, route/API/env key, or technical term.
* Respect current modal accessibility and popup-surface specs.
* First implementation pass includes token/base-class cleanup plus `/`, `/generate`, `/history`, login modal, image detail modal, and the active gallery/history surfaces.
* Preserve the dark immersive image detail modal as an intentional exception for focused image inspection, while aligning its typography, spacing, focus, and action-button vocabulary with the broader system.

## Acceptance Criteria (evolving)

* [ ] A reviewer can identify a single coherent token vocabulary for color, spacing, radius, typography, shadows/elevation, fields, and focus states.
* [ ] Primary UI surfaces use shared tokens and reusable base classes rather than one-off raw colors and dimensions where feasible.
* [ ] Buttons and form controls across discover/generate/history/login/detail surfaces share a consistent size, radius, typography, hover, disabled, and focus vocabulary.
* [ ] Main page layouts and gallery/history surfaces have visibly consistent rhythm on desktop and mobile breakpoints.
* [ ] Existing product style is preserved: no new generic SaaS look, no heavy glassmorphism, no gradient text, no noisy neon styling.
* [ ] All changed user-facing copy remains Simplified Chinese.
* [ ] Frontend lint and typecheck pass.
* [ ] Browser verification covers `/`, `/generate`, `/history`, login modal, image detail modal, and responsive narrow viewport, with no console errors.
* [ ] The first pass applies to token/base styles, the three active routes, login modal, image detail modal, gallery masonry, history grid, and history detail panel without changing generation/history behavior.
* [ ] The image detail modal remains dark and immersive, but its labels, spacing, focus rings, and action buttons feel compatible with the app-wide UI system.

## Definition of Done

* Tests added/updated where behavior or component contracts change.
* Frontend lint and typecheck pass.
* Browser verification confirms the UI feels more consistent in the actual app.
* `git status` is checked and reported.
* If stable conventions emerge, update the relevant Trellis frontend spec or create `DESIGN.md` only if explicitly agreed.

## Technical Approach (draft)

Adopt a token-first cleanup. Start from `tokens.css` and `base.css`, add or rename semantic aliases inspired by HeroUI where useful, then update visible route/component CSS to consume those tokens. Prefer targeted cleanup over a visual rewrite: normalize duplicate button/field/panel/focus patterns, remove raw hex/rgba where they conflict with tokens, and align spacing/typography/radius choices across the active surfaces.

## Decision (ADR-lite, draft)

**Context**: The UI works functionally but has accumulated visual drift through local CSS values and component-specific styling systems.
**Decision**: Preserve the existing custom Vue product UI and standardize it using semantic CSS tokens and reusable primitive classes, borrowing HeroUI's theming architecture rather than its components. Keep the image detail modal dark/immersive because image inspection benefits from a dimmed focus scene.
**Consequences**: This avoids a dependency/framework mismatch and keeps the product identity intact. The trade-off is that consistency must be enforced through project tokens/specs and careful CSS refactoring instead of library defaults. The dark modal remains an intentional scene-specific exception, so implementation should align its component vocabulary without forcing it onto the light popup style.

## Expansion Sweep

### Future evolution

* The token layer can later support a documented `DESIGN.md`, theme export, or controlled dark inspection mode without changing product components again.
* Consistent button/field/surface primitives make future screens less likely to drift visually.

### Related scenarios

* Discover and generate share `GenerateView`, so changes there affect both home and generation workflow.
* History, login, date picker, account menu, and image detail modals/popups should remain visually compatible with the composer-like popup convention.

### Failure and edge cases

* Over-normalizing could flatten intentional distinctions, especially the dark immersive image detail modal and hero treatment.
* Token renaming can create broad regressions if done destructively; prefer adding semantic aliases first, then replacing local usage incrementally.
* Visual-only changes still need browser verification because lint/typecheck cannot prove layout quality.

## Open Questions

* None.

## Out of Scope (draft)

* Backend/API changes.
* Adding HeroUI as a dependency.
* Replacing Vue components with HeroUI/React components.
* Large product navigation or workflow changes unrelated to visual consistency.
* Cloud sync, quota behavior, generation logic, or persistence changes.

## Technical Notes

* Existing tokens: `frontend/src/styles/tokens.css`.
* Existing base classes: `frontend/src/styles/base.css`.
* Frontend component rules: `.trellis/spec/frontend/component-guidelines.md`.
* Product context loaded from `PRODUCT.md`; no `DESIGN.md` exists yet.
* HeroUI valid current docs are under `/en/docs/react/...`; the originally provided `/themes` path returned 404 through the fetch tool.
