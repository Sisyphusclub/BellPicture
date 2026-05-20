# Remove prompts page

## Goal

Remove the standalone Prompts page from the frontend navigation and route surface so users no longer see or access the built-in prompt library as a separate workspace page.

## What I already know

* User wants to advance the existing planning task `05-20-remove-prompts-page`.
* The task currently exists with `status: planning` and did not yet have a `prd.md`.
* Current frontend router imports and registers `PromptsView` at `/prompts` in `frontend/src/router/index.ts`.
* Current sidebar navigation includes a `提示词` item pointing to `/prompts` in `frontend/src/components/common/AppHeader.vue`.
* Existing tests cover the prompts page in `frontend/tests/views/PromptsView.spec.ts` and sidebar nav order in `frontend/tests/components/AppHeader.spec.ts`.
* `PromptsView.vue` supports search/category filters, copy-to-clipboard, and routing selected prompts to `/generate`.

## Assumptions (temporary)

* Removing the page should include removing the sidebar navigation entry.
* The generate page should remain available at `/generate`.
* Backend behavior is likely unaffected because the prompts library appears frontend-only.

## Open Questions

* None.

## Requirements

* Remove the Prompts page from visible app navigation.
* Remove the `/prompts` route entry so it is no longer a first-class product route.
* Remove the direct `/prompts` product entry points rather than redirecting users to a replacement prompt library page.
* Update tests that currently assert the Prompts page route/navigation behavior.

## Acceptance Criteria

* [ ] Sidebar navigation no longer shows `提示词`.
* [ ] The frontend router no longer registers a `/prompts` route.
* [ ] The standalone prompt library page is not reachable through app navigation or route configuration.
* [ ] Frontend tests are updated to reflect the removed page.
* [ ] Lint/typecheck/tests relevant to frontend pass.

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / CI-equivalent checks pass for impacted frontend scope.
* Docs/notes updated only if behavior changes require it.
* Rollback considered if risky.

## Out of Scope (explicit)

* Redesigning the Generate page.
* Reworking prompt template content unless it is being removed with the page.
* Backend API changes unless inspection reveals a direct dependency.

## Technical Notes

* Inspected via code search:
  * `frontend/src/router/index.ts` imports `PromptsView` and registers `/prompts`.
  * `frontend/src/components/common/AppHeader.vue` includes `{ label: '提示词', to: '/prompts', icon: 'prompt' }`.
  * `frontend/tests/views/PromptsView.spec.ts` is dedicated to the page behavior and may be removed or replaced.
  * `frontend/tests/components/AppHeader.spec.ts` expects the nav link order to include `/prompts` and label `提示词`.

## Research References

* None needed so far; this is repo-local frontend route/navigation cleanup.
