# Fix image regenerate errors

## Goal

Fix regressions in the Generate workspace "再次生成" flow so retrying a completed generation reuses the original request context and image-to-image batches keep their reference image.

## What I Already Know

- User reported two bugs:
  - Text-to-image "再次生成" can fail with a 504.
  - Image-to-image "再次生成" loses the added reference image.
- Follow-up user requests:
  - The homepage/gallery should show public images from every account, not only
    the current account's public images.
  - The personal assets and user management pages should show the same backdrop
    as the generate/discover pages.
- `frontend/src/views/GenerateView.vue` reconstructs a `PendingGeneration` from a displayed saved batch.
- The saved-batch snapshot currently includes prompt/model/count/aspect/public, but not the original `referenceId`.
- `frontend/src/composables/useImageGeneration.ts` only accepts `referenceFile`, uploads it, then sends `referenceId` to `/api/images/generate`.
- Backend history records already persist `referenceId`, and `GET /api/history` returns it in `ImageRecord`.
- Backend `/api/images/generate` already accepts a previously uploaded `referenceId` and validates that the upload exists.

## Requirements

- Clicking "再次生成" on a completed text-to-image batch must send a normal text-to-image request with the original prompt, model, count, aspect ratio, and public visibility.
- Clicking "再次生成" on a completed image-to-image batch must send an image-to-image request by reusing the saved batch's `referenceId`.
- Retrying an in-flight or failed pending generation must continue to reuse the original `File` when that pending snapshot came from a just-added reference image.
- The current composer should not unexpectedly drop an attached reference image when users edit or regenerate from an image-to-image result.
- Do not re-upload an existing history `referenceId` just to regenerate; use the existing backend reference id.
- Keep `/api/history` owner-scoped for personal assets and deletion.
- Add a read-only public gallery source for all accounts' public records.
- Keep the generate/discover, personal assets, and user management routes on the
  same global video backdrop layer.

## Acceptance Criteria

- [x] Component tests cover regenerating a saved image-to-image batch with `referenceId`.
- [x] Component tests cover regenerating after a completed text-to-image batch without adding a reference id.
- [x] Existing generate tests pass.
- [x] Frontend typecheck passes.
- [x] Frontend nginx proxy timeout exceeds backend generation timeout.
- [x] Public gallery endpoint returns only public records from all accounts
  without requiring auth.
- [x] Homepage gallery uses the public gallery source, while personal assets
  remain owner-scoped.
- [x] Personal assets and user management routes render the same video backdrop.

## Out of Scope

- Changing provider timeout behavior or backend retry policy.
- Restoring deleted upload files if a historical `referenceId` points to a file that no longer exists.
- Adding new UI for previewing historical reference images.

## Technical Notes

- Relevant specs read:
  - `.trellis/spec/frontend/type-safety.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
  - `.trellis/spec/backend/error-handling.md`
  - `.trellis/spec/guides/cross-layer-thinking-guide.md`
- Data flow: generated response -> backend `image_records.reference_id` -> frontend `ImageRecord.referenceId` -> grouped batch snapshot -> `GenerateImageOptions.referenceId` -> `/api/images/generate`.
