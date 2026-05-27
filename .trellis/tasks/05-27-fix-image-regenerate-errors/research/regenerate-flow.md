# Regenerate Flow Research

## Findings

- Completed generation batches are rendered from `useImageHistory().batches`.
- `GroupedBatch` stores `entries`, and each `HistoryEntry.record` can carry `referenceId`.
- `GenerateView.createSnapshotFromDisplayedBatch()` currently loses `referenceId` because `PendingGeneration` only supports `referenceFile`.
- `useImageGeneration.generate()` can derive a backend `referenceId` from an uploaded `referenceFile`, but cannot accept an already persisted `referenceId`.
- Backend `generateImage()` already accepts `referenceId`, resolves it under `UPLOAD_DIR`, and returns `image-to-image` mode when present.

## Implementation Direction

- Add `referenceId?: string` to frontend generation options and pending snapshots.
- Prefer `referenceFile` upload when present; otherwise reuse `referenceId`.
- Build saved-batch snapshots from the first entry that has a `referenceId`.
- When reusing saved image-to-image results, send `referenceId` directly to `/api/images/generate`.
