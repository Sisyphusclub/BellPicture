# Align gallery width and masonry

## Goal

Make the homepage gallery visually align with the prompt input above it and keep the gallery presented as a waterfall/masonry layout.

## What I already know

- User wants the homepage gallery width to match the input box above.
- User wants the gallery display to be waterfall/masonry.
- `RecentCreationsMasonry.vue` currently owns the homepage gallery and already uses CSS columns for masonry-like layout.
- The homepage prompt input in `GenerateView.vue` uses `.prompt-showcase` with `width: min(100%, 960px)`.
- The gallery currently uses `width: min(100% - 48px, 980px)`, which is slightly wider than the input box.

## Requirements

- Set the homepage gallery container width to align with the prompt input width (`960px` max on desktop).
- Preserve waterfall/masonry layout for visible gallery items.
- Keep responsive behavior usable on tablet/mobile.
- Preserve existing copy and public-gallery filtering behavior.

## Acceptance Criteria

- [ ] On desktop, the gallery outer width visually matches the homepage input box width.
- [ ] Gallery items still render in a waterfall/masonry layout.
- [ ] Existing empty state and item click behavior still work.
- [ ] Targeted component test(s) pass.
- [ ] Browser smoke verifies width alignment.

## Definition of Done

- Relevant frontend checks pass.
- Browser verification performed.

## Added Scope: Aspect selector and long prompt result display

The user found two additional frontend issues while validating the generation UI:

- 比例选择不生效: selecting an aspect ratio from the composer must affect the generated image request and visible state.
- 提示词占位太多了，不优雅: long prompts on the result page should not dominate the page or push the image far down; the result prompt should be visually compact and elegant.

### Added Requirements

- Fix aspect ratio selection for both homepage and dock composers so the selected ratio is submitted in `GenerateImageOptions.aspectRatio` when not `auto`.
- Keep the aspect dropdown behavior discoverable and preserve existing options/copy.
- Restyle/clamp long result prompts so the result page prioritizes the generated image and actions.
- Preserve access to the full prompt text where practical via native title/tooltip or expansion behavior.

### Added Acceptance Criteria

- [ ] Selecting `2:3` or another non-auto ratio before generation sends that aspect ratio in the generation request.
- [ ] The selected ratio label updates in the composer UI.
- [ ] Long result prompts are constrained to a compact block and no longer consume most of the viewport.
- [ ] Existing generation, public toggle, count selector, and gallery layout behavior still pass tests.

## Out of Scope

- Changing gallery data source or public/private behavior.
- Redesigning gallery cards.
- Changing the prompt input width.
- Changing backend aspect-ratio contracts.

## Technical Notes

- Relevant files:
  - `frontend/src/components/gallery/RecentCreationsMasonry.vue`
  - `frontend/src/views/GenerateView.vue`
- Relevant tests:
  - `frontend/tests/components/RecentCreations.spec.ts`
  - `frontend/tests/views/GenerateView.spec.ts`
