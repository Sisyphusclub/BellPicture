# Admin High Resolution Generation

## Goal

Add an admin-only high-resolution image generation path so administrators can choose standard, 2K, or 4K output from the generator UI while normal users remain limited to the existing standard endpoint and sizes.

## What I Already Know

- The existing authenticated app endpoint is `POST /api/images/generate`.
- The new high-resolution capability should have a dedicated call URL.
- Only admins may use the 2K/4K path, and the UI should expose clarity selection only to admins.
- The current backend provider sends an OpenAI-compatible `size` string to `/v1/images/generations` or `/v1/images/edits`.
- Existing aspect ratios are `1:1`, `3:2`, `2:3`, `16:9`, and `9:16`.
- Existing standard sizes range from `1024x1024` to `1792x1024`.
- Admin status is already represented by `user.isAdmin` and checked through `isUserAdmin` / `requireAdmin`.

## Assumptions

- "Dedicated call URL" means a new application API endpoint, not a separate upstream provider origin.
- The high-resolution endpoint should use the same prompt/reference/count/aspect payload shape as normal generation, plus a required `resolution` of `2k` or `4k`.
- Standard generation stays on `/api/images/generate`; 2K/4K generation goes to `/api/images/generate/high-res`.
- Demo preset and demo prompt cache outputs remain standard-only so a high-resolution request never returns a cached 1024px image.

## Requirements

- Add `POST /api/images/generate/high-res` under the existing authenticated images router.
- Enforce admin-only access server-side for the high-resolution endpoint.
- Reject high-resolution values on the normal `/api/images/generate` endpoint.
- Add a typed `resolution` contract: `standard`, `2k`, `4k`.
- Map `resolution + aspectRatio` to explicit provider `size` strings.
- Keep text-to-image and image-to-image high-resolution generation supported.
- Show a clarity selector in the generator composer only for admins.
- Send high-resolution requests to the dedicated frontend API URL only when an admin selects 2K or 4K.
- Preserve existing normal-user UI and request behavior.
- Add focused backend and frontend tests for route access, request routing, provider size mapping, and admin-only UI visibility.

## Acceptance Criteria

- [ ] Non-admin users calling `/api/images/generate/high-res` receive `403 FORBIDDEN` before provider/quota work.
- [ ] Admins calling `/api/images/generate/high-res` with `resolution: "2k"` or `"4k"` reach the provider with the expected `resolution`.
- [ ] `/api/images/generate` rejects `resolution: "2k"` or `"4k"`.
- [ ] `TwoApiImageProvider` sends 2K and 4K `size` payloads for representative aspect ratios.
- [ ] Admin UI exposes a Simplified-Chinese clarity selector with standard, 2K, and 4K choices.
- [ ] Normal-user UI does not render the clarity selector or send high-resolution fields.
- [ ] Focused tests plus lint/type-check pass where practical.
- [ ] API contract specs are updated if the request shape changes.

## Out of Scope

- Adding separate upstream provider credentials or a second provider origin.
- Changing quota cost by resolution.
- Adding database columns for resolution history.
- Upscaling existing history images.
- Exposing 2K/4K through the OpenAI-compatible `/v1/*` endpoints.

## Technical Notes

- Backend files: `backend/src/types/image.ts`, `backend/src/routes/images.ts`, `backend/src/controllers/images.controller.ts`, `backend/src/services/imageGeneration.service.ts`, `backend/src/services/providers/TwoApiImageProvider.ts`.
- Frontend files: `frontend/src/types/image.ts`, `frontend/src/services/api/imagesApi.ts`, `frontend/src/composables/useImageGeneration.ts`, `frontend/src/views/GenerateView.vue`.
- Tests: `backend/tests/controllers/images.controller.spec.ts`, `backend/tests/services/providers/TwoApiImageProvider.spec.ts`, `frontend/tests/services/imagesApi.spec.ts`, `frontend/tests/composables/useImageGeneration.spec.ts`, `frontend/tests/views/GenerateView.spec.ts`.
- Relevant specs: `.trellis/spec/backend/error-handling.md`, `.trellis/spec/backend/quality-guidelines.md`, `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/type-safety.md`, `.trellis/spec/guides/cross-layer-thinking-guide.md`.

## Research References

- [`research/upstream-image-size-support.md`](research/upstream-image-size-support.md) - notes on upstream image size parameters and legal high-resolution dimensions.
