# Fix history detail modal actions and image preview

## Goal

Polish the image management history detail modal so its actions match the intended composer-like no-shadow style and the selected image can be enlarged from the modal.

## Requirements

* Remove the extra duplicate download button shown at the bottom-right of the history detail modal.
* Keep the action row inside the detail panel with exactly three actions: `用此提示词再生成`, `下载`, and `移除`.
* Remove drop shadows from the three bottom-left action buttons in the detail panel.
* Clicking the detail image opens an enlarged preview.
* The prompt area should show a compact generated title, with the full prompt moved into a detail form field.
* The enlarged preview must include a clear return/back interaction and preserve the existing close/Escape/backdrop behavior.
* The enlarged preview must fit the full image within the viewport, not crop it.
* Adjust history grid thumbnails so the image sits closer to its frame, the frame uses no gradient background, and the thumbnail corners are smaller.
* Preserve the existing no-shadow composer-like modal surface style.
* Use Simplified Chinese for all user-facing labels and aria labels.

## Acceptance Criteria

* [ ] The history detail modal no longer renders the bottom-right duplicate `下载` action.
* [ ] The detail panel action row still has `用此提示词再生成`, `下载`, and `移除`.
* [ ] Those three action buttons have no `box-shadow` / drop-shadow styling.
* [ ] Clicking the detail image opens an enlarged image preview.
* [ ] The detail prompt area shows a compact generated title and keeps the full prompt in a form field.
* [ ] The enlarged preview has a return interaction back to detail view.
* [ ] The enlarged image is fully contained inside the viewport on desktop and mobile.
* [ ] History grid thumbnails have tighter image/frame spacing, no gradient frame background, and smaller corners.
* [ ] Escape and backdrop still close the modal.
* [ ] Focus behavior remains accessible for the custom modal.
* [ ] Relevant component tests pass.

## Definition of Done

* Implementation uses existing Vue component patterns.
* Component tests updated for duplicate action removal and enlarged preview behavior.
* Frontend lint/typecheck and focused tests pass.
* Browser smoke verifies click-to-enlarge and return interaction.

## Technical Approach

* Update `HistoryView.vue` to remove the outer `history-modal__actions` duplicate download footer.
* Update `HistoryDetailPanel.vue` to make the image preview clickable and manage an expanded-view state similar to `RecentCreationDetailModal`.
* Show a compact title derived from the prompt and move the full prompt into the detail form area.
* Keep action styling no-shadow and reuse existing product button language.
* Update `HistoryGrid.vue` thumbnail styling only: reduce inset spacing, use a flat frame background, and lower the thumbnail radius.
* Add/adjust tests in the existing history/detail component test area.

## Out of Scope

* Changing history grid card structure or click/copy behavior beyond thumbnail presentation.
* Changing backend image/history APIs.
* Adding new download formats or batch actions.

## Technical Notes

* Relevant files discovered: `frontend/src/views/HistoryView.vue`, `frontend/src/components/gallery/HistoryDetailPanel.vue`, and `frontend/src/components/gallery/HistoryGrid.vue`.
* Prior UI convention: popup/modal surfaces should be warm off-white, hairline bordered, rounded, and no-shadow.
