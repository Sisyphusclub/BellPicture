# Fix discover navigation during generation

## Goal

Users should be able to click the sidebar "发现" navigation while an image generation request is in progress and see the discovery/home surface immediately. The generation request may continue in the background; navigation should not feel blocked by the in-flight state.

## Requirements

- Clicking "发现" during an in-flight generation from the generate workspace shows the discover/home layout.
- The in-flight generation continues and can still finish normally.
- Starting generation from the discover hero still transitions into the generate workspace promptly.
- No backend/API behavior changes.
- User-facing copy remains Simplified Chinese.

## Acceptance Criteria

- [ ] A generation started on `/generate` can be followed by switching the component to discover mode; the hero/discover surface is rendered instead of the generation dock.
- [ ] Existing discover-submit behavior still routes to `/generate` and shows the generation surface during the transition.
- [ ] Focused GenerateView tests cover this route-state regression.
- [ ] Frontend lint, typecheck, and relevant tests pass.

## Definition of Done

- Regression test added or updated.
- Frontend lint, typecheck, and focused tests pass.
- Changes are committed, pushed, and the production frontend is rebuilt.

## Technical Approach

The generation view currently treats any pending generation as an active surface even in discover mode. Track only the short automatic "discover submit is routing to generate" transition as eligible to show the stage in discover mode. Manual navigation back to discover from the generate route should render the home surface even while `pendingGeneration` remains active.

## Decision (ADR-lite)

**Context**: `/` and `/generate` reuse `GenerateView` with a mode prop, so local pending state survives route changes.

**Decision**: Add a small route-transition flag scoped to `GenerateView` instead of moving generation state into a global store or changing the route/component structure.

**Consequences**: The fix stays local and keeps in-flight generation behavior intact while removing the perceived navigation block.

## Out of Scope

- Cancelling in-flight generations on navigation.
- Changing backend timeouts or provider behavior.
- Redesigning the sidebar navigation.

## Technical Notes

- Likely file: `frontend/src/views/GenerateView.vue`.
- Regression test target: `frontend/tests/views/GenerateView.spec.ts`.
