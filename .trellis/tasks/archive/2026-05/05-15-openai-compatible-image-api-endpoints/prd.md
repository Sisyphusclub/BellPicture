# OpenAI-compatible image API endpoints

## Goal

Expose an OpenAI-compatible `/v1` image API surface on the backend so API clients can call Ref2Image Studio with familiar OpenAI-style endpoints while the server continues to use the existing image provider, local output storage, and error envelope conventions.

## Requirements

### Cross-cutting `/v1` API rules

- Add a backend `/v1` router mounted from `createApp()`.
- Every endpoint in this task requires `Authorization: Bearer <auth-key>` before processing AI work:
  - Missing header -> `401 UNAUTHORIZED`.
  - Non-`Bearer` scheme -> `401 UNAUTHORIZED`.
  - Wrong token -> `401 UNAUTHORIZED`.
- Use a dedicated inbound env key for API clients, `OPENAI_COMPAT_API_KEY`; keep `IMAGE_API_KEY` server-side and provider-only.
- Never log the raw inbound bearer token, computed bearer token, `OPENAI_COMPAT_API_KEY`, or `IMAGE_API_KEY`.
- Add `OPENAI_COMPAT_API_KEY` to `config/env.ts`, `.env.example`, logger redaction, and test setup.
- Do not apply Better Auth session middleware or per-user daily quota to `/v1/*`; this API-key surface is separate from the first-party browser `/api/images/*` flow.
- Use the existing `AppError` + final `errorHandler` flow for errors.
- Reject unsupported streaming requests with `400 BAD_REQUEST` rather than hanging or silently downgrading.

### Supported model list

`GET /v1/models` returns an OpenAI-style list envelope with exactly these model IDs, in this order:

1. `gpt-image-2`
2. `codex-gpt-image-2`
3. `auto`
4. `gpt-5`
5. `gpt-5-1`
6. `gpt-5-2`
7. `gpt-5-3`
8. `gpt-5-3-mini`
9. `gpt-5-mini`

Response shape:

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-image-2",
      "object": "model",
      "created": 1710000000,
      "owned_by": "ref2image"
    }
  ]
}
```

### Shared image request mapping

- `n` maps to the existing `count` behavior.
- Default `n` is `1`.
- Valid `n` range is `1..MAX_COUNT`; current backend `MAX_COUNT` is `2`, so `n = 2` must return two images and `n > 2` must return `400 BAD_REQUEST`.
- Supported `size` mappings:
  - missing or `auto` -> `1:1`
  - `1024x1024` -> `1:1`
  - `1536x1024` -> `3:2`
  - `1024x1536` -> `2:3`
  - `1792x1024` -> `16:9`
  - `1024x1792` -> `9:16`
- Unsupported `size` values return `400 BAD_REQUEST`.
- `response_format` supports `b64_json` and `url`; default to `b64_json` for `/v1/images/*`.
- URL responses should use absolute URLs derived from the inbound request host and the existing `/api/outputs/:filename` route.
- Base64 responses should read the generated local output files and return each image as `data[].b64_json`.

### `POST /v1/images/generations`

- Accept JSON body.
- Required field:
  - `prompt`: non-empty string, max 2000 chars.
- Optional fields:
  - `model`: string, defaults through existing provider/service behavior.
  - `n`: integer in `1..MAX_COUNT`.
  - `size`: supported mapping above.
  - `response_format`: `b64_json` or `url`.
- Ignore non-substantive OpenAI optional fields that the current backend does not model (`quality`, `style`, `background`, `moderation`, `output_format`, `output_compression`, `user`) to preserve client compatibility.
- Reject `stream: true` and `partial_images` with `400 BAD_REQUEST` because the backend has no streaming generation path.
- Call `generateImage({ prompt, model?, count, aspectRatio })` without a quota pool.
- Return OpenAI ImagesResponse:

```json
{
  "created": 1710000000,
  "data": [
    { "b64_json": "<base64 image bytes>" }
  ]
}
```

or:

```json
{
  "created": 1710000000,
  "data": [
    { "url": "http://localhost:3000/api/outputs/<filename>.png" }
  ]
}
```

### `POST /v1/images/edits`

- Accept `multipart/form-data` with one file field named `image`.
- Required fields:
  - `image`: PNG/JPEG/WebP file, validated with existing upload magic-byte rules.
  - `prompt`: non-empty string, max 2000 chars.
- Optional fields:
  - `model`
  - `n`
  - `size`
  - `response_format`
- Save the uploaded image with existing local upload storage, then call `generateImage({ prompt, referenceId, model?, count, aspectRatio })` without a quota pool.
- Return the same OpenAI ImagesResponse shape as generations.
- Reject masks and multiple input images for this MVP:
  - `mask` file/text present -> `400 BAD_REQUEST`.
  - More than one image file -> `400 BAD_REQUEST`.

### `POST /v1/chat/completions` image-scene subset

- Accept JSON body shaped like an OpenAI chat completion request.
- Required prompt source:
  - Use the latest `messages[]` item with `role: "user"`.
  - If `content` is a string, use it as the prompt.
  - If `content` is an array, concatenate `text` content parts as the prompt.
- Optional reference image:
  - Accept the first `image_url.url` content part only when it is a `data:image/...;base64,...` URL that can be saved locally.
  - Reject remote `http(s)` image URLs with `400 BAD_REQUEST`; do not fetch user-provided URLs server-side.
- Support top-level `model`, `n`, and `size` as local image-scene extensions; `n` maps to image count and returns all generated image links in one assistant message.
- Reject `stream: true` with `400 BAD_REQUEST`.
- Return a standard `chat.completion` envelope; generated image URLs appear as Markdown in `choices[0].message.content` because Chat Completions has no official generated-image output object.

Example response:

```json
{
  "id": "chatcmpl-local-<uuid>",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "gpt-image-2",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Generated 2 images:\n\n![image 1](http://localhost:3000/api/outputs/a.png)\n![image 2](http://localhost:3000/api/outputs/b.png)"
      },
      "finish_reason": "stop",
      "logprobs": null
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

### `POST /v1/responses` image-scene subset

- Accept JSON body shaped like an OpenAI Responses request.
- Prompt source:
  - string `input` -> prompt.
  - input arrays/messages -> concatenate text-like `input_text` or message text content.
- Optional reference image:
  - Accept `input_image.image_url` only when it is a local `data:image/...;base64,...` URL.
  - Reject remote `http(s)` image URLs with `400 BAD_REQUEST`.
- If `tools` is present and contains no `{ "type": "image_generation" }`, return `400 BAD_REQUEST` for this image-only compatibility endpoint.
- If an image-generation tool contains `model` or `size`, prefer those over top-level request values.
- Support top-level `n` as a local extension capped by `MAX_COUNT`; default `n` is `1`.
- Reject `stream: true` with `400 BAD_REQUEST`.
- Return a standard `response` envelope with:
  - one `output[]` item per generated image: `{ "type": "image_generation_call", "status": "completed", "result": "<base64>" }`.
  - one assistant message item exposing generated image URLs as text for local discoverability.
  - zero-valued usage because local token accounting is unavailable.

## Acceptance Criteria

- [ ] `GET /v1/models` requires bearer auth and returns all required model IDs in an OpenAI list envelope.
- [ ] `POST /v1/images/generations` requires bearer auth, accepts `n = 2`, calls the existing provider/service once, and returns two image items.
- [ ] `POST /v1/images/generations` supports `response_format: "b64_json"` and `response_format: "url"`.
- [ ] `POST /v1/images/generations` rejects missing prompt, unsupported size, `n > MAX_COUNT`, and `stream: true` with typed 400 errors.
- [ ] `POST /v1/images/edits` accepts one multipart `image`, saves it as a reference, calls image-to-image generation, and returns the OpenAI ImagesResponse shape.
- [ ] `POST /v1/images/edits` rejects missing image, masks, multiple images, unsupported MIME, unsupported size, and invalid `n`.
- [ ] `POST /v1/chat/completions` extracts the latest user prompt, supports `n = 2`, and returns a `chat.completion` containing generated image Markdown links.
- [ ] `POST /v1/responses` extracts a prompt, supports image-generation tool requests, and returns `image_generation_call.result` base64 outputs.
- [ ] All `/v1/*` tests cover missing/invalid/valid bearer auth.
- [ ] Existing `/api/images/*`, `/api/history/*`, `/api/outputs/*`, and provider outbound behavior remain unchanged.
- [ ] Backend `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.

## Definition of Done

- Tests added or updated for every new endpoint and major failure path.
- No real network calls in tests; use fake `ImageGenerationProvider`.
- New env var is documented and available in test setup.
- No secrets or raw bearer headers appear in logs.
- Code remains strictly typed with no `any` or type-erasure shortcuts.
- No frontend changes unless a backend contract forces test fixture updates.

## Technical Approach

- Add a dedicated OpenAI-compatible route/controller layer, likely under `backend/src/routes/` and `backend/src/controllers/`, rather than changing existing first-party `/api/images` routes.
- Add a small inbound bearer-auth middleware for `/v1/*`; it compares the token against `env.OPENAI_COMPAT_API_KEY` and throws `AppError('UNAUTHORIZED', ...)` on failure.
- Reuse `generateImage()` for all generation paths. Do not duplicate provider calls in controllers.
- Reuse existing upload/output storage helpers for multipart edits, data-URL reference images, base64 output encoding, and local output URLs.
- Keep controller logic focused on request parsing, compatibility mapping, and response formatting; services/provider remain request/response framework agnostic.
- Add focused integration tests with `createApp({ provider: fakeProvider })` and `supertest`.

## Decision (ADR-lite)

**Context**: The project already has `IMAGE_API_KEY`, but existing specs state it is server-side provider configuration and routes/controllers should not own outbound provider authentication. The new `/v1/*` surface needs inbound client authentication.

**Decision**: Add a dedicated inbound `OPENAI_COMPAT_API_KEY` and keep `IMAGE_API_KEY` provider-only.

**Consequences**: This requires one new env variable and `.env.example` update, but prevents API clients from needing the upstream provider key and keeps the existing provider-secret boundary intact.

## Out of Scope

- Streaming image generation, partial images, SSE, or chunked responses.
- Mask/inpainting support for edits.
- Multiple reference images in one edit request.
- Fetching remote user-provided image URLs from the backend.
- Exact token/usage accounting.
- OpenAI file IDs, uploads API, or persistent model metadata.
- Frontend UI changes.
- Raising `MAX_COUNT` beyond the current backend cap of `2`.

## Research References

- [`research/openai-image-api-shapes.md`](research/openai-image-api-shapes.md) — OpenAI-compatible model/image/chat/responses envelopes and repo mapping.

## Technical Notes

- Current app has no `/v1` router; `createApp()` currently mounts `/api`, `/api/images`, `/api/history`, and `/api/outputs`.
- Existing first-party image routes are Better Auth session routes; do not reuse that auth model for `/v1/*`.
- Existing provider already calls upstream `/v1/images/generations` and `/v1/images/edits` using canonical `Authorization: Bearer ${IMAGE_API_KEY}`.
- Existing local count cap is `MAX_COUNT = 2`; this task must make `n = 2` work but must not silently clamp higher values.
- Existing `readOutput()` can supply generated bytes for `b64_json` responses without importing `fs` in controllers.
