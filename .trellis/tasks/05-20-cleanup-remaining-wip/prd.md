# Clean up remaining WIP

## Goal

Review and finish the remaining uncommitted work after the `/prompts` entry removal task, separating useful product changes from obsolete or temporary artifacts so the repository ends in a clean, intentional state.

## What I already know

* User asked to inspect and wrap up the remaining unhandled WIP.
* A new cleanup task was created at `.trellis/tasks/05-20-cleanup-remaining-wip`.
* Current tracked WIP includes:
  * `frontend/src/components/gallery/RecentCreationDetailModal.vue` — large restyle of the recent creation detail modal.
  * `frontend/src/views/PromptsView.vue` — glass-card styling updates to the now-unrouted Prompts page.
* Current untracked WIP includes:
  * `frontend/public/brand/logo.png` — likely needed because committed `AppHeader.vue` now references `/brand/logo.png`.
  * Many `tmpclaude-*` files — likely temporary working-directory marker files that should not be committed.
* The recently committed `/prompts` removal means PromptsView is no longer registered as a route, so continuing to polish `PromptsView.vue` may be obsolete unless it will be kept for future reuse.

## Assumptions (temporary)

* `frontend/public/brand/logo.png` should be kept and committed because the header references it.
* `tmpclaude-*` files are temporary artifacts and should be deleted or ignored, not committed.
* `PromptsView.vue` styling changes should probably be discarded or left out because the page entry was removed.
* `RecentCreationDetailModal.vue` may represent a useful completed UI restyle and needs verification before committing.

## Open Questions

* None.

## Requirements

* Apply the minimal cleanup scope chosen by the user.
* Keep and commit `frontend/public/brand/logo.png`, because the committed header references `/brand/logo.png`.
* Delete `tmpclaude-*` temporary files from the repo root; do not commit them.
* Revert/discard the uncommitted `frontend/src/views/PromptsView.vue` styling WIP because the `/prompts` route was removed.
* Leave `frontend/src/components/gallery/RecentCreationDetailModal.vue` untouched for a separate task.
* Avoid mixing unrelated changes into one commit.
* Preserve the already-committed `/prompts` removal behavior.

## Acceptance Criteria

* [ ] `frontend/public/brand/logo.png` is tracked and committed.
* [ ] `tmpclaude-*` temporary files are removed from `git status --short`.
* [ ] `frontend/src/views/PromptsView.vue` no longer has uncommitted changes.
* [ ] `frontend/src/components/gallery/RecentCreationDetailModal.vue` remains as uncommitted WIP for a separate task.
* [ ] `git status --short` no longer contains accidental leftovers from this cleanup scope.

## Definition of Done

* Relevant frontend lint/typecheck/tests pass for kept changes.
* Git commits are grouped by coherent change unit.
* Trellis task is archived and journaled after work commits.
* No temporary artifacts are committed.

## Out of Scope

* Reopening the removed `/prompts` product route.
* Redesigning unrelated pages beyond already-present WIP.
* Deleting user work without confirmation.

## Technical Notes

* `git diff --stat` shows tracked WIP only in:
  * `frontend/src/components/gallery/RecentCreationDetailModal.vue`
  * `frontend/src/views/PromptsView.vue`
* `frontend/public/brand/logo.png` exists as an untracked asset.
* Many `tmpclaude-*` untracked files exist at repo root.
* The previous work commit `8188e17` references `/brand/logo.png` in `AppHeader.vue`; leaving the logo asset uncommitted would likely break the rendered header logo.

## Research References

* None needed; this is local repository cleanup and verification.
