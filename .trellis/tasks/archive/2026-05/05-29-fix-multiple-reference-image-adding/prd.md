# Fix multiple reference image adding

## Goal

When users add reference images for generation multiple times, the newly added images should append to the existing selection up to the existing four-image limit. The current production behavior appears to replace previously selected references on the second add action, so users cannot build a multi-reference set through repeated selection, paste, or drop.

## Requirements

- Selecting, dropping, or pasting additional reference images appends them to the current reference selection.
- The existing maximum of four reference images remains enforced by the existing upload composable.
- Regenerate/edit flows that hydrate references from a saved snapshot still replace the current reference selection with the snapshot references.
- User-facing copy stays Simplified Chinese.

## Acceptance Criteria

- [ ] Add one reference image, then add a second image; the UI keeps both selected references.
- [ ] Submitting after repeated adds passes both files in `referenceFiles`.
- [ ] Existing snapshot sync/regeneration behavior continues to replace current references instead of appending stale files.
- [ ] Focused tests cover the repeated-add regression.
- [ ] Frontend lint, typecheck, and relevant tests pass.

## Definition of Done

- Tests added or updated for the regression.
- Lint and typecheck pass for the frontend.
- Changes are committed, pushed, and the production frontend is rebuilt.

## Technical Approach

Use the existing `useFileUpload()` append API (`selectFiles`) for normal user add flows in `GenerateView.vue`. Keep `replaceFiles` only for snapshot synchronization where replacing is the intended behavior.

## Decision (ADR-lite)

**Context**: The backend and generation composable already support multiple reference IDs/files. The likely regression is local selection state being replaced on every add.

**Decision**: Reuse the existing `selectFiles` append behavior instead of adding new state machinery.

**Consequences**: The fix stays small and preserves the established four-image cap and error handling inside `useFileUpload`.

## Out of Scope

- Changing the backend reference image API.
- Increasing the four-image limit.
- Redesigning the reference image UI.

## Technical Notes

- Likely files: `frontend/src/views/GenerateView.vue`, `frontend/src/composables/useFileUpload.ts`, `frontend/tests/views/GenerateView.spec.ts`.
- Existing backend types use `MAX_REFERENCE_IMAGES = 4` and support `referenceIds`.
