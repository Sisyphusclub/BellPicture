# Hide Demo Button and Cache Demo Prompt Images

## Goal

Hide the visible demo-generation button from the image generator, then make curated demo prompts behave like normal prompts: first run them through the normal provider path to prepare images, and on later matching requests wait about four seconds before returning the prepared image.

## Requirements

* Remove the visible "演示" controls from the generator UI for all users, including admins.
* Keep ordinary prompt submission as the only user-facing way to trigger generation.
* Add backend prompt matching for configured demo prompts. Matching should trim surrounding whitespace and compare the full prompt text.
* When a configured demo prompt has no prepared image yet, use the normal provider-backed generation path and persist/cache the first generated image for later demo reuse.
* When a configured demo prompt already has a prepared image, wait roughly four seconds before returning it through the same `/api/images/generate` response shape.
* Cached demo responses must be persisted to the requester's history like normal generated images.
* Cached demo responses must not call the external provider again and must not consume the user's daily quota.
* Keep the existing admin-only `demoPresetId` branch for backward compatibility and tests, but do not expose it in the UI.

## Acceptance Criteria

* [ ] No "演示" button renders on the generate view for admins or ordinary users.
* [ ] Submitting a configured prompt with no cache calls the normal provider and stores a prepared demo image.
* [ ] Submitting the same configured prompt again waits about four seconds, returns the prepared image, skips provider calls, and skips quota consumption.
* [ ] The cached response has the normal `{ batchId, aspectRatio, generationMode, images }` shape.
* [ ] Cached responses create regular history records with the submitted prompt and public/private visibility.
* [ ] Non-configured prompts keep the existing provider and quota behavior.

## Definition of Done

* Backend tests cover cache miss, cache hit, quota behavior, and response shape.
* Frontend tests cover hidden demo controls and normal prompt submission behavior.
* Lint and typecheck pass for changed packages.

## Technical Approach

Create a backend demo-prompt cache service that maps exact configured prompt text to a cached output file under `OUTPUT_DIR`. The controller checks this service before normal generation. On cache miss, the controller continues through the existing `generateImage()` path, consumes quota normally, persists history normally, then stores the first generated image as the prepared demo output. On cache hit, the controller returns a generated-output object built from the cached file after the configurable delay and persists it through the existing `persistGeneratedImages()` helper.

Configuration should be environment-driven so the final two user-provided demo prompts can be added without code edits. Use a delimiter-based env value for the prompt list and keep an empty default so local/test behavior is unchanged until prompts are configured.

## Decision (ADR-lite)

**Context**: The previous admin demo button made demo mode visible and relied on an explicit `demoPresetId`. The new behavior should feel like a normal prompt workflow while avoiding repeated external provider calls during live demonstrations.

**Decision**: Hide the frontend control and move the demo trigger to backend exact prompt matching with lazy cache preparation.

**Consequences**: The first run of each configured prompt still costs provider time and quota, which is useful for preparing the asset with the real model. Later demo runs are deterministic and cheap. Operators must configure the exact prompt text and warm the cache once before a live demo.

## Out of Scope

* A preset-management UI.
* Publicly listing which prompts are demo prompts.
* Fuzzy prompt matching or multilingual aliases.
* Automatically calling the provider at server startup.

## Technical Notes

* Relevant frontend files: `frontend/src/views/GenerateView.vue`, `frontend/tests/views/GenerateView.spec.ts`.
* Relevant backend files: `backend/src/controllers/images.controller.ts`, `backend/src/services/imageGeneration.service.ts`, `backend/src/services/demoGeneration.service.ts`, `backend/src/storage/localStorage.ts`, `backend/tests/controllers/images.controller.spec.ts`.
* Relevant specs: `.trellis/spec/backend/error-handling.md`, `.trellis/spec/backend/quality-guidelines.md`, `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/type-safety.md`, `.trellis/spec/frontend/quality-guidelines.md`.
* The two exact demo prompts are still needed from the user for real configuration and cache warming.
