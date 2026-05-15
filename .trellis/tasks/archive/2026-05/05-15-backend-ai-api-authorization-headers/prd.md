# Backend AI API authorization headers

## Goal

Ensure every backend outbound AI API call sends the provider auth key using the required `Authorization: Bearer <auth-key>` request header. The immediate fix is for the currently implemented image provider calls.

## What I already know

- User provided the upstream API requirement: all AI `/v1/*` interfaces require `Authorization: Bearer <auth-key>`.
- Listed upstream endpoints: `GET /v1/models`, `POST /v1/images/generations`, `POST /v1/images/edits`, `POST /v1/chat/completions`, `POST /v1/responses`.
- Current backend implementation only calls `POST /v1/images/generations` and `POST /v1/images/edits` through `backend/src/services/providers/TwoApiImageProvider.ts`.
- Current provider already sends bearer auth, but the header key is lowercase `authorization`; tests also assert lowercase.
- `IMAGE_API_KEY` remains server-side only and must not be logged.

## Assumptions

- This task should update currently implemented backend calls, not add new model-list/chat/responses features.
- The requirement is to use the canonical `Authorization` header spelling in provider fetch options and tests.

## Requirements

- Use `Authorization: Bearer ${apiKey}` for `POST /v1/images/generations`.
- Use `Authorization: Bearer ${apiKey}` for `POST /v1/images/edits`.
- Keep `Content-Type: application/json` only on JSON generations requests.
- Do not set multipart `Content-Type` on edits requests; keep letting `FormData`/undici set the boundary.
- Do not log `IMAGE_API_KEY` or the computed bearer token.
- Do not add unsupported backend endpoints for `/v1/models`, `/v1/chat/completions`, or `/v1/responses` in this task.

## Acceptance Criteria

- [ ] Provider unit tests assert `Authorization: Bearer sk-test` for text-to-image.
- [ ] Provider unit tests assert `Authorization: Bearer sk-test` for image-to-image.
- [ ] Image edits test still asserts no manual multipart `Content-Type`.
- [ ] Backend lint, typecheck, tests, and build pass.
- [ ] Backend spec documents the outbound AI provider auth-header contract.

## Definition of Done

- Implementation completed via Trellis implementation flow.
- Trellis check verifies backend behavior and required commands.
- Spec updated because this is an external provider request contract.
- Work commits created before `/trellis:finish-work`.

## Out of Scope

- Adding `GET /v1/models` support.
- Adding chat completions or responses endpoints.
- Changing frontend API contracts.
- Changing env variable names or storing auth keys outside `IMAGE_API_KEY`.

## Technical Approach

- Update `TwoApiImageProvider` request headers from lowercase `authorization` to canonical `Authorization` in both generation and edit calls.
- Update provider unit tests to assert the canonical header key and retain the no-multipart-content-type assertion.
- Update backend code-spec with a small executable contract for outbound AI API auth headers.

## Technical Notes

- Main target: `backend/src/services/providers/TwoApiImageProvider.ts`.
- Test target: `backend/tests/services/providers/TwoApiImageProvider.spec.ts`.
- Spec target: `.trellis/spec/backend/directory-structure.md`.
