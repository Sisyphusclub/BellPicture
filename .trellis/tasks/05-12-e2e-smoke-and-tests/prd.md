# Floating navigation and recent creations masonry

## Goal

Update the Ref2Image Studio frontend to follow the provided Figma reference: a minimal floating top navigation, a refined centered generation hero, and a "最近创作" section that displays recent locally generated images in a masonry-style feed. The goal is to make the generate/home experience feel closer to the reference image-generation landing/workspace while reusing the app's existing local history persistence.

## What I already know

* User provided Figma node `4539:8503` as the visual reference.
* The reference shows a white/cream page, pill-shaped floating top nav, centered brand and actions, centered hero copy/input, and a long multi-column masonry gallery below a "最近创作" heading.
* Current frontend is Vue 3 + Vite + TypeScript with Simplified Chinese UI copy.
* `frontend/src/App.vue` owns root backdrop/layout and renders `AppHeader` plus route content.
* `frontend/src/components/common/AppHeader.vue` already implements a fixed pill-style header with brand, language toggle, and login button.
* `frontend/src/views/GenerateView.vue` already owns the main generation experience, prompt composer, last/generated batch view, and access to `useImageHistory().batches`.
* `frontend/src/composables/useImageHistory.ts` exposes `entries` and `batches` from localStorage metadata + IndexedDB blobs, sorted newest-first.
* `frontend/src/components/gallery/HistoryGrid.vue` is currently a uniform grid for `/history`, not a masonry layout.
* Existing uncommitted frontend work is already present in the files above, so implementation must preserve current work rather than resetting or replacing it.

## Assumptions (temporary)

* "最近创作组件" belongs on the generate/home route below the empty hero, matching the Figma landing-page composition.
* The component should use real local generated images from `useImageHistory`, not static demo assets.
* Empty local history should render a tasteful empty state rather than fake images.
* The `/history` route remains the detailed management view; the home masonry is a lightweight preview/entry point.

## Open Questions

* None.

## Requirements (evolving)

* Revise the top floating navigation to more closely match the Figma reference while keeping current routes/actions that are actually implemented.
* Add a "最近创作" section to the generate/home experience.
* Treat the home recent creations section as a lightweight preview only; keep `/history` as the detailed image management page for this MVP.
* Render recent generated images in a masonry-style layout with responsive columns.
* Use persisted local history images via existing composables/storage.
* Clicking a recent creation shows an in-page image detail view with the selected image, its prompt, basic generation metadata, and a copy-prompt action.
* Keep all user-facing copy in Simplified Chinese.
* Preserve generation flow: prompt input, reference image upload/paste/drop, count/aspect controls, generation result display, and local history save.
* Show remaining backend-maintained GPT account pool quota in the hero `prompt-showcase__grid` control.
* Change the `prompt-showcase__smart` control into a clickable image aspect-ratio selector with an "智能" default label.
* Default generation count to 1 and cap the maximum generation count at 2 across frontend and backend validation.

## Decision (ADR-lite)

**Context**: The Figma reference shows a landing-style home page with recent creations below the hero, while the existing app already has a dedicated `/history` image management route.
**Decision**: Scope the new masonry layout to the generate/home route as a recent creations preview. Do not replace the `/history` management grid in this task.
**Consequences**: This keeps the UI change focused and lowers regression risk. A future task can unify the history page visual system if the preview pattern proves useful.

**Context**: Recent creation cards need an interaction that exposes the image and prompt without turning the home preview into another management page.
**Decision**: Clicking a masonry image opens a page-level modal for that image, showing the selected image, prompt, basic generation metadata, and a copy-prompt action.
**Consequences**: Users can inspect and reuse prompts without leaving the home page. `/history` continues to own heavier management actions such as full metadata review, rerun, download, and removal.

## Acceptance Criteria (evolving)

* [ ] Top navigation visually matches the Figma reference direction: floating pill, minimal brand/actions, translucent surface, responsive layout.
* [ ] Generate/home page shows a "最近创作" section when no active generated result is displayed.
* [ ] Recent creations are sourced from real local history and sorted newest-first.
* [ ] Recent creations use a responsive masonry/waterfall layout rather than equal square tiles.
* [ ] Empty local history renders a polished empty state and does not show fake content.
* [ ] Clicking a recent creation opens a page-level modal with the image, prompt, basic metadata, and copy-prompt action.
* [ ] Copying a prompt writes the selected image prompt to the clipboard and shows clear success/failure feedback.
* [ ] Existing generate flow still works after the layout change.
* [ ] Hero quota control displays the remaining GPT account pool quota from the backend and handles unavailable quota data gracefully.
* [ ] Hero aspect-ratio control is clickable, defaults to 智能, and lets the user choose supported image ratios.
* [ ] Generation count defaults to 1 and cannot exceed 2 in both frontend controls and backend request validation.
* [ ] Frontend typecheck/tests pass, and the UI is smoke-tested in a browser.

## Definition of Done

* Tests added/updated where appropriate for composable or derived display behavior.
* Lint/typecheck/test commands relevant to frontend pass.
* Browser smoke test covers the generate/home page, empty recent creations, populated recent creations if local data exists, and responsive behavior.
* Git status is reviewed before reporting completion.

## Out of Scope (explicit)

* No persistent database-backed quota ledger; the quota endpoint can use the existing backend runtime/config for MVP.
* No cloud/user-account history sync.
* No fake seeded gallery assets unless explicitly requested.
* No new route beyond existing `/` and `/history` unless explicitly requested.
* No destructive reset of current uncommitted UI work.

## Technical Notes

* Figma design context and screenshot were inspected for node `4539:8503`.
* Code context inspected: `AppHeader.vue`, `GenerateView.vue`, `HistoryGrid.vue`, `useImageHistory.ts`, `App.vue`, prior frontend PRD/spec snippets.
* Frontend state rule: composables only, no Pinia; image blobs in IndexedDB and metadata in localStorage.
* The home masonry can likely be a new presentational component under `frontend/src/components/gallery/` receiving `HistoryEntry[]`, reusing `useImageHistory().entries` from `GenerateView.vue`.
* The history management route can keep `HistoryGrid` unless MVP chooses to share/replace the layout there.
