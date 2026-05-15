# Fix home count selector and stage overlay

## Goal

Fix two UI regressions in the image generation flow: the homepage composer must expose image count selection, and the generated/result page translucent stage overlay must cover the full viewport behind the floating top navigation instead of stopping at the app content top.

## What I already know

- User reports the homepage input lacks a count selector.
- User reports the generation image translucent overlay is not fullscreen and stops at the floating top navigation.
- `frontend/src/views/GenerateView.vue` owns both the homepage composer and generated/result stage.
- The dock composer already has a `prompt-showcase__stepper` count selector and count state.
- The stage overlay is currently implemented with `.studio--stage::before` / `::after` pseudo-elements inside app content, so it can be clipped by the top offset from `App.vue` / header layout.

## Requirements

- Add count selection controls to the homepage prompt composer, using the same `MIN_COUNT`, `MAX_COUNT`, `count`, `decreaseCount()`, and `increaseCount()` behavior as the dock composer.
- Keep the homepage composer visually balanced on desktop and usable on narrow widths.
- Make the generated/result stage translucent background/overlay cover the viewport behind the floating top navigation, with no cutoff at the header band.
- Preserve the floating top navigation itself above the overlay.
- Do not change backend generation contracts.

## Acceptance Criteria

- [ ] Homepage composer shows `1 张` / `2 张` count controls before generation.
- [ ] Changing homepage count affects the submitted generation `count`.
- [ ] Result/loading stage overlay extends under the top floating navigation without a visible cutoff.
- [ ] Existing dock composer count behavior still works.
- [ ] Targeted GenerateView tests cover homepage count submission.
- [ ] Browser verification confirms homepage count control and full-screen overlay behavior.

## Definition of Done

- Tests updated for changed behavior.
- Frontend typecheck/lint pass.
- Browser smoke verifies the reported UI surfaces.

## Out of Scope

- Changing max generation count.
- Changing backend API or quota behavior.
- Redesigning the full GenerateView layout.

## Technical Notes

- Relevant file: `frontend/src/views/GenerateView.vue`.
- Relevant test: `frontend/tests/views/GenerateView.spec.ts`.
- Relevant specs: frontend component and quality guidelines.
