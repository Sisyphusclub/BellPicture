# Admin-only demo generation mode

## Goal

Add a demo generation mode that lets administrators trigger a polished, deterministic image-generation walkthrough without contacting the external provider. The flow should feel like a real generation request: submit a preset prompt, wait about two seconds, then show a saved output image through the existing result, preview, history, and gallery paths.

## Requirements

- Demo mode is available to admins only.
- The frontend must hide demo controls from ordinary users.
- The backend must enforce admin-only access even if a non-admin manually sends `demoPresetId`.
- Demo generation must wait roughly two seconds in production before returning.
- Demo generation must not call the external image provider.
- Demo generation must not consume the user's daily quota.
- Demo responses must match the normal `/api/images/generate` response shape.
- Demo outputs must be persisted like normal generated images so preview, download, owner history, and optional public-gallery behavior keep working.

## Acceptance Criteria

- [ ] Admins see a demo generation control on the generation UI.
- [ ] Ordinary users do not see the demo generation control.
- [ ] `POST /api/images/generate` with `demoPresetId` returns `403 FORBIDDEN` for a non-admin user.
- [ ] `POST /api/images/generate` with `demoPresetId` returns a normal generated-image response for an admin user.
- [ ] Demo generation does not call `ImageGenerationProvider.generate`.
- [ ] Demo generation does not decrement the user's daily quota.
- [ ] The demo output is stored in `image_records` and served by `/api/outputs/:filename`.
- [ ] Backend and frontend tests, lint, and typecheck pass.

## Definition of Done

- Tests added for backend permission and provider-bypass behavior.
- Tests added for frontend admin-only visibility and request payload.
- Cross-layer request type updated consistently.
- Code committed after checks pass.

## Technical Approach

Add an optional `demoPresetId` field to the existing generation request contract. The controller keeps the normal code path unchanged when `demoPresetId` is absent. When it is present, the controller checks persisted admin status, calls a demo generation service, persists the result with `insertImageRecords()`, and returns the same response shape as a provider-backed generation.

The demo service will generate a deterministic PNG locally and save it through the existing `saveOutput()` helper. This keeps output filenames, `/api/outputs`, history records, and frontend display behavior identical to real generation. The frontend adds a compact admin-only demo button that submits the preset prompt with `demoPresetId`.

## Decision (ADR-lite)

**Context**: The app already has a synchronous generation API and all result surfaces expect a normal generated-image response. A frontend-only fake would skip history, preview, quota, and backend security semantics.

**Decision**: Implement demo mode as an admin-only branch inside the existing backend generation endpoint, with a matching admin-only frontend control.

**Consequences**: The user experience stays realistic and testable. Demo mode remains coupled to the existing synchronous API, which is acceptable for the MVP. If future demo assets need to be curated by admins, this can evolve into a preset registry backed by storage or the database.

## Out of Scope

- Public demo mode for ordinary users.
- A preset-management UI.
- Multiple curated demo presets.
- Async job streaming or progress polling.
- Charging quota for demo generations.

## Technical Notes

- Relevant backend files: `backend/src/controllers/images.controller.ts`, `backend/src/services/imageGeneration.service.ts`, `backend/src/storage/localStorage.ts`, `backend/src/services/adminUser.service.ts`.
- Relevant frontend files: `frontend/src/views/GenerateView.vue`, `frontend/src/composables/useImageGeneration.ts`, `frontend/src/services/api/imagesApi.ts`, `frontend/src/types/image.ts`.
- Relevant specs read: backend directory/error/quality guidelines, frontend component/type-safety guidelines, cross-layer thinking guide.
