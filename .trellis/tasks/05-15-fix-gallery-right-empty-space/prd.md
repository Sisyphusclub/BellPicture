# Fix gallery right empty space

## Goal

Fix the homepage gallery waterfall layout so published images fill the available gallery rail instead of leaving a large empty area on the right.

## What I already know

- User screenshot shows gallery cards occupying only the left/middle columns while the right side of the gallery rail remains empty.
- Current `RecentCreationsMasonry.vue` uses CSS multi-column layout (`column-count`), which can visually flow cards top-to-bottom and leave right-side columns unused depending on item count and image heights.
- The user still wants a waterfall/masonry presentation, not a uniform grid.
- The previous task aligned the gallery rail width with the prompt composer; this task should preserve rail alignment while improving card distribution.

## Requirements

- Keep the gallery rail aligned with the homepage input/composer width.
- Replace or adjust the masonry layout so visible cards distribute across all available columns instead of leaving a right-side blank column.
- Preserve waterfall-style staggered card heights and image natural aspect ratios.
- Keep responsive column counts: desktop wider layout, tablet fewer columns, mobile fewer columns.
- Preserve existing copy, empty state, selection events, and public-gallery filtering.

## Acceptance Criteria

- [ ] With 5+ gallery images on desktop, cards appear in the rightmost available column instead of leaving a large blank area.
- [ ] The gallery still reads as waterfall/masonry, not equal-height card rows.
- [ ] Desktop/tablet/mobile responsive column counts remain usable.
- [ ] Existing empty state and select behavior tests still pass.
- [ ] Browser smoke verifies the right side is no longer empty.

## Definition of Done

- Relevant frontend tests pass.
- Frontend typecheck/lint pass.
- Browser smoke performed.

## Out of Scope

- Changing gallery data source or public/private behavior.
- Redesigning card visuals beyond layout distribution.
- Changing generation or backend APIs.

## Technical Notes

- Relevant file: `frontend/src/components/gallery/RecentCreationsMasonry.vue`.
- Relevant tests: `frontend/tests/components/RecentCreations.spec.ts`.
