# Fix generate image preview navigation visibility

## Goal

When a user clicks a generated image preview on the generate page, the full-screen image detail view must take over the workspace and hide the app navigation. The preview should feel modal and focused, with no sidebar navigation visible above or through the overlay.

## What I already know

* User reported the production bug: on the `生图` page, clicking a generated image preview does not hide navigation.
* `frontend/src/views/GenerateView.vue` opens `RecentCreationDetailModal` through `selectedRecentEntry`.
* `RecentCreationDetailModal` teleports to `body` and currently uses a fixed full-screen overlay.
* Global navigation lives in `frontend/src/components/common/AppHeader.vue`.
* The route shell lives in `frontend/src/App.vue`.

## Assumptions

* The expected behavior is to hide the global app navigation while any image detail modal is open.
* The fix should apply to generated image previews and should not regress history/discover image detail previews.
* User-facing copy remains Simplified Chinese.

## Requirements

* Opening a generated image preview from the `生图` page hides the app navigation.
* Closing the preview restores the app navigation.
* The full-screen preview overlay remains above the app shell, docked prompt composer, and any route-level sidebar.
* Existing detail modal keyboard close behavior must continue to work.

## Acceptance Criteria

* [ ] Generated image preview overlay is modal and no app navigation remains visible.
* [ ] Closing the preview restores navigation.
* [ ] Existing detail modal interactions still work.
* [ ] Frontend tests cover the navigation hiding behavior or equivalent overlay state.
* [ ] Frontend lint/typecheck pass.

## Definition of Done

* Frontend code is updated in the smallest safe scope.
* Tests are added or updated for the bug.
* Lint/typecheck are run, or any inability to run them is reported.
* Git status is checked and reported.

## Out of Scope

* Redesigning the image detail modal.
* Changing generation, history persistence, or provider logic.
* Admin user management work.

## Technical Notes

* Likely files: `frontend/src/App.vue`, `frontend/src/views/GenerateView.vue`, `frontend/src/components/gallery/RecentCreationDetailModal.vue`, relevant frontend tests.
