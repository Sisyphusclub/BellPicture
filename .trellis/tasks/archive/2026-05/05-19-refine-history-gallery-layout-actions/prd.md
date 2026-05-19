# refine history gallery layout actions

## Goal

Polish the image management page so it feels less oversized and more action-oriented: reduce the page title scale, flatten the content area toward the warm workstation surface, and expose quick hover actions for generated images.

## Requirements

- Reduce the `/history` page title from the current oversized hero scale to a calmer page-heading scale.
- Adjust the content section to feel closer to a flat image-management workspace: warm off-white surface, subtle hairline border, smaller visual weight, no glassy blur, and no heavy drop shadow.
- Keep the existing date range filter, query, clear, refresh, detail modal, rerun, download, remove, copy-id, Escape close, and backdrop close behavior unless explicitly changed below.
- Add hover/focus actions on each generated image tile:
  - `放大`: opens the existing history detail modal directly in enlarged-image preview mode.
  - `删除`: invokes the existing history remove flow for that entry.
- Preserve primary thumbnail click behavior: clicking the image itself still opens normal detail view.
- Prevent hover action clicks from accidentally triggering thumbnail selection.
- Use Simplified Chinese visible labels and `aria-label`s.
- Keep surfaces aligned with the composer-like convention: no popup shadows, no glassy blur on popup surfaces, and no decorative shadows on popup-contained images or hints.

## Acceptance Criteria

- [ ] `/history` title CSS uses a smaller clamp than the old `clamp(44px, 6vw, 80px)`.
- [ ] `.history-card` no longer uses heavy `box-shadow` or `backdrop-filter` blur.
- [ ] `HistoryGrid` emits separate events for normal selection, quick enlarge, quick remove, and copy-id.
- [ ] Hover/focus controls are available on each history tile with Chinese labels for enlarge and delete.
- [ ] Quick enlarge opens the detail modal with `history-modal__panel--expanded` and `aria-labelledby="history-detail-expanded-title"`.
- [ ] Quick delete calls the same existing `remove(entry.record.id)` path used by the detail panel remove action.
- [ ] Existing selection and copy-id interactions remain covered by tests.
- [ ] Relevant Vitest tests pass, typecheck passes, and the UI is smoke-tested in the browser.

## Technical Approach

- Update `HistoryGrid.vue` with a non-interactive media wrapper containing the existing thumbnail button plus sibling hover action buttons, avoiding nested buttons.
- Add typed `expand` and `remove` emits from `HistoryGrid`.
- Update `HistoryView.vue` to distinguish normal detail open from quick enlarged open by setting `isDetailImageExpanded` before assigning `selectedEntry`.
- Add an `initialExpanded` prop to `HistoryDetailPanel.vue` so the existing preview/return flow can mount directly in enlarged mode without introducing a second modal.
- Tighten history page and card CSS in place.
- Extend component/view tests for style regressions and quick actions.

## Out of Scope

- No new backend or storage contract.
- No new image deletion confirmation flow unless requested separately.
- No new detail modal design system component extraction.
- No changes to generated image persistence format.

## Technical Notes

- Relevant specs read: `frontend/component-guidelines.md`, `frontend/quality-guidelines.md`, `frontend/type-safety.md`, `guides/index.md`.
- The current custom modal already owns `role="dialog"`, `aria-modal="true"`, dynamic `aria-labelledby`, Escape close, backdrop close, and initial close-button focus.
- The implementation should preserve no-shadow composer-like popup styling already documented in `frontend/component-guidelines.md`.
