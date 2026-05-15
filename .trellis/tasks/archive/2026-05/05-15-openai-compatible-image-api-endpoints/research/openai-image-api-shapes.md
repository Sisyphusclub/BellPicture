# Research: OpenAI-compatible image API shapes

- **Query**: Research the public OpenAI-compatible API shapes needed for backend task `.trellis/tasks/05-15-openai-compatible-image-api-endpoints`, covering `/v1/models`, `/v1/images/generations`, `/v1/images/edits`, image-oriented `/v1/chat/completions`, image-oriented `/v1/responses`, and mapping to this repo's current image service constraints.
- **Scope**: mixed
- **Date**: 2026-05-15

## Findings

### Files Found

| File Path | Description |
|---|---|
| `backend/src/types/image.ts` | Local image API constants: supported aspect ratios, size mapping, count bounds, and provider input/output types. |
| `backend/src/services/imageGeneration.service.ts` | Core `generateImage({ prompt, referenceId?, model?, count?, aspectRatio? })` orchestration, reference lookup, count validation, quota consumption, and local output metadata. |
| `backend/src/controllers/images.controller.ts` | Existing first-party `/api/images/generate` schema and local output response shape (`outputUrl: /api/outputs/<filename>`). |
| `backend/src/services/providers/TwoApiImageProvider.ts` | Current outbound OpenAI-compatible Images API client; sends JSON generations and multipart edits, requires upstream bearer auth, saves returned `b64_json` to local output files. |
| `backend/src/routes/images.ts` | Existing first-party image routes gated by Better Auth session middleware. |
| `backend/src/routes/outputs.ts` and `backend/src/controllers/outputs.controller.ts` | Public local output file serving route, currently `GET /api/outputs/:filename`. |
| `backend/src/storage/localStorage.ts` | Upload/output persistence helpers, MIME sniffing, and local file read/write boundaries. |
| `backend/src/config/env.ts` | Existing env contract; only provider-side `IMAGE_API_KEY` exists today, no dedicated inbound `/v1/*` bearer key was found. |
| `.trellis/spec/backend/directory-structure.md` | Backend structure and locked outbound `/v1/images/*` provider-auth contracts. |
| `.trellis/spec/backend/quality-guidelines.md` | Endpoint/testing requirements and backend implementation constraints. |
| `.trellis/tasks/archive/2026-05/05-15-backend-ai-api-authorization-headers/prd.md` | Prior task notes listing upstream `/v1/*` endpoints and the bearer header requirement. |

### External References

- [OpenAI Node SDK `models.ts`](https://github.com/openai/openai-node/blob/master/src/resources/models.ts) — generated from OpenAI OpenAPI spec; confirms `GET /models` uses bearer auth and model fields `id`, `created`, `object`, `owned_by`.
- [OpenAI Node SDK `core/pagination.ts`](https://github.com/openai/openai-node/blob/master/src/core/pagination.ts) — confirms list envelope shape `{ object, data }` for non-cursor list pages.
- [OpenAI Node SDK `images.ts`](https://github.com/openai/openai-node/blob/master/src/resources/images.ts) — generated API types for image generations/edits request params and `ImagesResponse` / `Image` response items.
- [OpenAI Node SDK `chat/completions.ts`](https://github.com/openai/openai-node/blob/master/src/resources/chat/completions/completions.ts) — generated Chat Completions request/response types; confirms chat supports image inputs through `image_url` content parts but response modalities are text/audio, not image objects.
- [OpenAI Node SDK `responses.ts`](https://github.com/openai/openai-node/blob/master/src/resources/responses/responses.ts) — generated Responses request/response types; confirms `tools: [{ type: "image_generation" }]` and generated images in `output[]` items of type `image_generation_call` with base64 `result`.
- [OpenAI OpenAPI spec](https://github.com/openai/openai-openapi/blob/master/openapi.yaml) — official OpenAPI source used by generated SDKs.

Note: direct `platform.openai.com/docs/*` pages returned HTTP 403 to the CLI environment, so this research relies on the official generated OpenAI SDK source and OpenAPI repository instead of live rendered docs pages.

---

## 1. `GET /v1/models` response envelope and per-model fields

### Public shape

The OpenAI SDK calls `GET /models` with bearer auth; under a `/v1` base URL this is `GET /v1/models`.

Minimal response envelope:

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-image-2",
      "object": "model",
      "created": 1710000000,
      "owned_by": "system"
    }
  ]
}
```

Per-model fields from `openai-node/src/resources/models.ts`:

| Field | Type | Notes |
|---|---:|---|
| `id` | string | Model identifier used in API requests. |
| `object` | string literal | Always `"model"`. |
| `created` | integer | Unix timestamp in seconds. |
| `owned_by` | string | Owner/organization label. |

List envelope fields from `openai-node/src/core/pagination.ts`:

| Field | Type | Notes |
|---|---:|---|
| `object` | string | For models, OpenAI examples use `"list"`. |
| `data` | array | Array of model objects. |

### Repo mapping

- No current local `/v1/models` route was found.
- Existing default model is `env.IMAGE_MODEL`, defaulting to `gpt-image-2` in `backend/src/config/env.ts:61`.
- Pragmatic compatibility decision: return at least the configured image model and any aliases this backend explicitly supports for the compatibility layer. Use the envelope above, not the existing first-party `/api` response style.
- All `/v1/*` endpoints in this task should require `Authorization: Bearer <auth-key>` before returning model data.

---

## 2. `POST /v1/images/generations` request and response shapes

### Public request shape

Official image-generation request is JSON. Core fields:

| Field | Type | Notes |
|---|---:|---|
| `prompt` | string | Required. Text description. |
| `model` | string | Optional in OpenAI; local backend can default to `env.IMAGE_MODEL`. |
| `n` | integer | Number of images. OpenAI allows up to 10 for many image models; local backend max is 2. |
| `size` | string | Common values include `1024x1024`, `1536x1024`, `1024x1536`, `1792x1024`, `1024x1792`, or `auto` depending on model. |
| `response_format` | `"url"` or `"b64_json"` | For DALL-E models this selects URL vs base64. GPT image models generally return base64; URL output is not supported by GPT image models in the current SDK comments. |
| `quality` | string | Model-dependent (`standard`, `hd`, `low`, `medium`, `high`, `auto`). |
| `style` | string | DALL-E 3 only (`vivid`, `natural`). |
| `background`, `moderation`, `output_format`, `output_compression`, `partial_images`, `stream`, `user` | optional | GPT image / streaming / abuse-tracking related. |

Minimal JSON request:

```json
{
  "model": "gpt-image-2",
  "prompt": "a warm cream canvas",
  "n": 1,
  "size": "1024x1024",
  "response_format": "b64_json"
}
```

### Public response shape

`ImagesResponse` from the OpenAI SDK:

```json
{
  "created": 1710000000,
  "data": [
    {
      "b64_json": "<base64 image bytes>",
      "revised_prompt": "optional revised prompt"
    }
  ]
}
```

URL-like output shape:

```json
{
  "created": 1710000000,
  "data": [
    {
      "url": "https://example.test/api/outputs/<uuid>.png",
      "revised_prompt": "optional revised prompt"
    }
  ]
}
```

Additional optional top-level fields in current SDK types include `background`, `output_format`, `quality`, `size`, and `usage`.

### Repo mapping

Current code already performs the outbound provider version of this request:

- `TwoApiImageProvider.callGenerations()` posts to `<base>/v1/images/generations` (`backend/src/services/providers/TwoApiImageProvider.ts:139`).
- It sends `content-type: application/json` and `Authorization: Bearer ${apiKey}` (`backend/src/services/providers/TwoApiImageProvider.ts:145-149`).
- It sends `{ model, prompt, n: count, size, response_format: 'b64_json' }` (`backend/src/services/providers/TwoApiImageProvider.ts:150-156`).
- It currently requires upstream `b64_json` and saves each returned image locally (`backend/src/services/providers/TwoApiImageProvider.ts:110-118`).

Compatibility-layer mapping onto `generateImage()`:

| OpenAI field | Local service field / behavior |
|---|---|
| `prompt` | `prompt` required. Existing first-party schema caps prompt at 2000 chars (`backend/src/controllers/images.controller.ts:19-25`); public OpenAI allows larger, but local service constraint can remain as task policy. |
| `model` | `model` optional; default should be `env.IMAGE_MODEL` if omitted. |
| `n` | `count`; default 1; reject values outside 1..2 because `MAX_COUNT = 2` (`backend/src/types/image.ts:5-7`, `backend/src/services/imageGeneration.service.ts:132-144`). |
| `size` | Map to `aspectRatio` using `ASPECT_SIZE_MAP` (`backend/src/types/image.ts:15-20`). Suggested exact mapping: `1024x1024 -> 1:1`, `1536x1024 -> 3:2`, `1024x1536 -> 2:3`, `1792x1024 -> 16:9`, `1024x1792 -> 9:16`, missing/`auto -> 1:1`. Reject unsupported sizes unless a compatibility fallback is intentionally chosen. |
| `response_format: "b64_json"` | Read saved `absolutePath` files and return `data[].b64_json`. This is the most OpenAI-exact mode and matches current provider behavior. |
| `response_format: "url"` or omitted URL-like mode | Return `data[].url` pointing at this backend's output route (`/api/outputs/<filename>`). OpenAI URLs are temporary absolute URLs; this repo currently has relative local output URLs in first-party responses (`backend/src/controllers/images.controller.ts:154-166`). |

Pragmatic response decision:

- Use OpenAI's `created` + `data` envelope for `/v1/images/generations`.
- For `b64_json`, include only `b64_json` per item plus optional `revised_prompt` if available. Current local service does not preserve upstream `revised_prompt`, so it will usually be omitted.
- For URL-like output, include `url` per item. Prefer absolute URL if the compatibility layer can derive backend origin from request headers or config; otherwise document that relative URLs are returned.

---

## 3. `POST /v1/images/edits` multipart request conventions and response shape

### Public request shape

Official image-edits request is `multipart/form-data`, not JSON. Core fields:

| Field | Type | Notes |
|---|---:|---|
| `image` | file or repeated/array files | Required. GPT image models support PNG/WebP/JPG, up to multiple images depending on model; DALL-E 2 is stricter. |
| `prompt` | string | Required. Text edit instruction. |
| `mask` | file | Optional inpainting mask. |
| `model` | string | Optional; OpenAI defaults differ by model family. |
| `n` | integer | Number of edited images. Local backend max is 2. |
| `size` | string | Same practical size/aspect mapping as generations. |
| `response_format` | `"url"` or `"b64_json"` | SDK notes URL format is DALL-E 2-specific while GPT image models always return base64. |
| `quality`, `input_fidelity`, `background`, `output_format`, `output_compression`, `partial_images`, `stream`, `user` | optional | Model-dependent. |

Multipart convention:

```text
POST /v1/images/edits
Authorization: Bearer <auth-key>
Content-Type: multipart/form-data; boundary=...

image=<file>
prompt=reshape it
model=gpt-image-2
n=1
size=1024x1024
response_format=b64_json
```

Do not manually set the multipart boundary when using `FormData`; the HTTP library should set `Content-Type`.

### Public response shape

Non-streaming edits use the same `ImagesResponse` shape as generations:

```json
{
  "created": 1710000000,
  "data": [
    {
      "b64_json": "<base64 edited image bytes>",
      "revised_prompt": "optional revised prompt"
    }
  ]
}
```

or URL-like:

```json
{
  "created": 1710000000,
  "data": [
    {
      "url": "https://example.test/api/outputs/<uuid>.png"
    }
  ]
}
```

### Repo mapping

Current provider code already performs the outbound multipart version:

- Routes reference-image requests to `<base>/v1/images/edits` (`backend/src/services/providers/TwoApiImageProvider.ts:168`).
- Builds `FormData` with `image`, `prompt`, `model`, `n`, `size`, and `response_format: b64_json` (`backend/src/services/providers/TwoApiImageProvider.ts:179-185`).
- Sends only `Authorization` for multipart and intentionally does not set `content-type` (`backend/src/services/providers/TwoApiImageProvider.ts:200-203`; test assertion in `backend/tests/services/providers/TwoApiImageProvider.spec.ts:120-124`).

Compatibility-layer mapping onto existing service constraints:

| OpenAI multipart field | Local behavior |
|---|---|
| `image` | Save the uploaded file using existing `saveUpload(buffer)` (`backend/src/storage/localStorage.ts:153-175`), then pass the resulting filename as `referenceId` to `generateImage()`. |
| `prompt` | Pass to `generateImage({ prompt, referenceId })`. |
| `model` | Pass through if present. |
| `n` | Map to `count`; reject outside 1..2. |
| `size` | Map to `aspectRatio` as in generations. |
| `response_format` | Shape response as `data[].b64_json` or `data[].url`; underlying provider call can continue requesting `b64_json` and saving local files. |
| `mask` | Existing `generateImage()` has no mask input. Pragmatic MVP subset should either reject `mask` with 400 or explicitly document that masks are unsupported. Do not silently pretend to honor it. |
| multiple `image` files | Existing `generateImage()` accepts one `referenceId`; MVP subset should support one `image` file and reject multiples unless the service/provider interface is extended. |

---

## 4. Image-oriented `POST /v1/chat/completions`

### Public chat request/response shape

Official Chat Completions creates a chat-completion object:

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "gpt-image-2",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "..."
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

Public input supports image inputs through message content parts:

```json
{
  "model": "gpt-image-2",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Generate a warm cream canvas" },
        { "type": "image_url", "image_url": { "url": "data:image/png;base64,...", "detail": "auto" } }
      ]
    }
  ]
}
```

Important finding: the official Chat Completions response does not define a first-class generated-image result object. The SDK comments and types show:

- Chat request messages can include image inputs (`ChatCompletionContentPartImage` with `type: "image_url"`).
- Chat response `choices[].message.content` is text/refusal content, and `modalities` currently covers text/audio output, not image output.
- Therefore there is no exact official OpenAI chat-completions image-generation output shape equivalent to `ImagesResponse.data[]` or Responses `image_generation_call.result`.

### Pragmatic image-scene subset for this repo

For compatibility with OpenAI-compatible clients that insist on `/v1/chat/completions` for image generation, use a conservative, text-based ChatCompletion envelope:

1. Accept a standard chat request with `model` and `messages`.
2. Extract a single image scene prompt from the latest user message:
   - string `content` -> prompt;
   - array `content` -> concatenate `text` parts as the prompt;
   - optional first `image_url` part can be treated as a reference image only if the implementation can convert it to a local upload/reference (`data:` URL is the simplest local-only case).
3. Call `generateImage({ prompt, referenceId?, model?, count?, aspectRatio? })`.
4. Return one `chat.completion` choice whose assistant `message.content` contains Markdown links to local outputs, for example:

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
        "content": "Generated 1 image:\n\n![image 1](/api/outputs/<uuid>.png)"
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

Compatibility caveat: adding a custom `images` field to `choices[].message` or the top level may help local clients but is not part of the official ChatCompletion schema. The most compatible baseline is Markdown/text URLs in `message.content`.

---

## 5. Image-oriented `POST /v1/responses`

### Public request shape

Official Responses create call posts to `/responses` with bearer auth, so under a `/v1` base URL this is `POST /v1/responses`.

Core request fields relevant to image-oriented behavior:

| Field | Type | Notes |
|---|---:|---|
| `model` | string | Optional in the generated SDK type, but practical clients usually send it. |
| `input` | string or response input array | Text/image/file inputs. Image inputs use `type: "input_image"` with `image_url` or `file_id`. |
| `tools` | array | To request generated images, include an image-generation tool: `{ "type": "image_generation" }`. |
| `tool_choice` | object/string | Can steer/force tool use; OpenAI support is model/tool dependent. |
| `include`, `max_output_tokens`, `metadata`, `temperature`, `top_p`, `stream`, `user`/`safety_identifier` | optional | General Responses API fields. |

Image-generation tool options from SDK types include:

```json
{
  "type": "image_generation",
  "action": "generate",
  "model": "gpt-image-2",
  "size": "1024x1024",
  "quality": "auto",
  "output_format": "png"
}
```

`action` may be `generate`, `edit`, or `auto`. Tool support and exact behavior are model-dependent.

### Public response envelope

Common non-streaming Responses envelope fields:

```json
{
  "id": "resp_...",
  "object": "response",
  "created_at": 1710000000,
  "status": "completed",
  "model": "gpt-image-2",
  "output_text": "",
  "output": [],
  "error": null,
  "incomplete_details": null,
  "parallel_tool_calls": true,
  "tool_choice": "auto",
  "tools": [],
  "temperature": null,
  "top_p": null,
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  }
}
```

Where generated images appear:

```json
{
  "type": "image_generation_call",
  "id": "ig_local_<uuid>",
  "status": "completed",
  "result": "<base64 image bytes>"
}
```

That item appears inside `response.output[]`. Official SDK type says `result` is the generated image encoded in base64 or `null`; it does not define a URL field for image-generation-call output.

### Pragmatic subset for this repo

1. Treat `input` as the prompt source:
   - string `input` -> prompt;
   - array messages/content -> concatenate `input_text` or text message content;
   - optional first `input_image.image_url` can become a local reference only if it can be converted/saved locally.
2. Treat `tools` containing `{ "type": "image_generation" }` as explicit image generation; if no such tool exists, either reject as unsupported for this image-only compatibility endpoint or return a text-only response. For this task's image-oriented scope, explicit image tool should be the supported path.
3. Map tool `model` and `size` to `generateImage()` `model` and `aspectRatio`.
4. Because official Responses image-generation tool does not expose `n`, default to one image. If a local extension such as top-level `n` or `image_count` is accepted, cap it at 2 and document it as non-OpenAI-standard.
5. Return each local saved output as an `output[]` item of type `image_generation_call` with `result` base64 for exact compatibility. If URL discoverability is needed, include Markdown links in an additional `message` output item or `output_text`, but that is a pragmatic extension because the official image-generation-call object has no `url` field.

Example local-compatible response:

```json
{
  "id": "resp_local_<uuid>",
  "object": "response",
  "created_at": 1710000000,
  "status": "completed",
  "model": "gpt-image-2",
  "output_text": "Generated 1 image: /api/outputs/<uuid>.png",
  "output": [
    {
      "id": "ig_local_<uuid>",
      "type": "image_generation_call",
      "status": "completed",
      "result": "<base64 image bytes>"
    },
    {
      "id": "msg_local_<uuid>",
      "type": "message",
      "role": "assistant",
      "status": "completed",
      "content": [
        {
          "type": "output_text",
          "text": "Generated 1 image: /api/outputs/<uuid>.png",
          "annotations": []
        }
      ]
    }
  ],
  "error": null,
  "incomplete_details": null,
  "parallel_tool_calls": false,
  "tool_choice": "auto",
  "tools": [
    { "type": "image_generation" }
  ],
  "temperature": null,
  "top_p": null,
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  }
}
```

---

## 6. Mapping all conventions onto this repo's constraints

### Existing local contracts

Relevant current code facts:

- `GenerateImageInput` is `{ prompt, referenceId?, model?, count?, aspectRatio? }` (`backend/src/services/imageGeneration.service.ts:22-28`).
- `generateImage()` resolves an optional `referenceId` to an upload path, validates `count`, validates `aspectRatio`, calls the provider, consumes quota, and returns local filenames/paths/mime/width/height (`backend/src/services/imageGeneration.service.ts:60-129`).
- `MAX_COUNT = 2` (`backend/src/types/image.ts:5-7`).
- Supported aspect ratios and sizes are:
  - `1:1 -> 1024x1024`
  - `3:2 -> 1536x1024`
  - `2:3 -> 1024x1536`
  - `16:9 -> 1792x1024`
  - `9:16 -> 1024x1792`
  (`backend/src/types/image.ts:1-20`).
- Existing first-party generate response uses `{ batchId, aspectRatio, generationMode, images: [{ id, outputUrl, filename, mime, width, height }] }` and `outputUrl: /api/outputs/<filename>` (`backend/src/controllers/images.controller.ts:154-166`).
- Output files can be read from disk with `readOutput(filename)` (`backend/src/storage/localStorage.ts:134-151`) and served as bytes by `GET /api/outputs/:filename` (`backend/src/controllers/outputs.controller.ts:9-38`).
- Existing first-party `/api/images/*` routes use Better Auth session middleware (`backend/src/routes/images.ts:16-18`). This is not the same as the task's required `Authorization: Bearer <auth-key>` for public `/v1/*` AI compatibility endpoints.
- Existing env has provider-side `IMAGE_API_KEY`; no inbound compatibility auth key variable was found in `backend/src/config/env.ts`.

### Proposed endpoint-by-endpoint compatibility decisions

| Endpoint | Request parser | Local service call | Response shape |
|---|---|---|---|
| `GET /v1/models` | No body; require bearer auth. | No provider call required for MVP; list configured/supported local model IDs. | `{ object: "list", data: [{ id, object: "model", created, owned_by }] }`. |
| `POST /v1/images/generations` | JSON body; support `prompt`, `model`, `n`, `size`, `response_format`. | `generateImage({ prompt, model, count: n ?? 1, aspectRatio: sizeToAspect(size) })`. | OpenAI `ImagesResponse`: `{ created, data: [{ b64_json }] }` or `{ created, data: [{ url }] }`. |
| `POST /v1/images/edits` | Multipart body; support one `image`, `prompt`, `model`, `n`, `size`, `response_format`. | Save uploaded image, then `generateImage({ prompt, referenceId, model, count, aspectRatio })`. | Same `ImagesResponse` as generations. |
| `POST /v1/chat/completions` | JSON body; parse latest user text/image_url as one image scene. | `generateImage({ prompt, referenceId?, model, count?, aspectRatio? })`; pragmatic subset can produce one choice with one batch. | Standard `chat.completion`; generated image URLs appear as Markdown text in `choices[0].message.content` because official schema has no first-class image-generation output object. |
| `POST /v1/responses` | JSON body; require `tools` containing `{ type: "image_generation" }`; parse `input` as prompt/reference. | `generateImage({ prompt, referenceId?, model, count?, aspectRatio? })`; default count 1 unless local extension is accepted. | Standard `response`; generated images appear in `output[]` as `{ type: "image_generation_call", status: "completed", result: "<base64>" }`; optional text message can expose local URLs. |

### Cross-cutting local rules for `/v1/*`

- **Bearer auth**: every `/v1/*` AI endpoint in this task should reject missing/invalid `Authorization: Bearer <auth-key>` before parsing/processing. Existing Better Auth session middleware is for `/api/*`, not sufficient for OpenAI-compatible API-key clients.
- **Count**: public OpenAI image endpoints allow more images than this repo. Local compatibility should return 400 for `n > 2` rather than silently clamping, because `generateImage()` already rejects out-of-range count.
- **Size/aspect**: use exact mapping to existing aspect ratios. Reject unsupported sizes unless compatibility with legacy square sizes (`256x256`, `512x512`) is intentionally more important than accurate output dimensions.
- **B64 vs URL**: existing provider returns/saves b64-derived local files. For exact OpenAI compatibility, read saved local files for b64 responses. For URL-like outputs, use `/api/outputs/<filename>` and prefer absolute URLs when possible.
- **Unsupported official fields**: `mask`, multiple edit images, streaming (`stream: true`), partial images, and GPT-specific quality/background/output-format controls are not represented in `generateImage()` today. The compatibility layer should either reject them with clear 400 errors or explicitly document no-op behavior; silent no-op is risky for image edits.
- **Usage**: exact token/image-token accounting is not available locally. For chat/responses, either omit `usage` where optional or return zero-valued placeholders if client compatibility requires the field.

### Related Specs

- `.trellis/spec/backend/directory-structure.md` — backend layout, env rules, outbound provider auth, no manual multipart content-type, and current `/v1/images/*` provider scope.
- `.trellis/spec/backend/quality-guidelines.md` — controller/service separation, endpoint comments, `AppError`, testing expectations, no raw `process.env` reads outside `config/env.ts`.
- `.trellis/spec/frontend/type-safety.md` — first-party frontend image API shape for existing `/api/images/*` endpoints; useful only to avoid confusing first-party shape with OpenAI-compatible `/v1/*` shape.
- `.trellis/tasks/archive/2026-05/05-15-backend-ai-api-authorization-headers/prd.md` — prior note that all AI `/v1/*` interfaces require `Authorization: Bearer <auth-key>` and listed the same endpoint family.

## Caveats / Not Found

- No existing inbound `/v1/*` Express routes were found.
- No existing dedicated inbound API-key env var or middleware was found; only `IMAGE_API_KEY` exists today and is used for outbound provider authorization.
- Official Chat Completions has image input support but no exact official generated-image output object; Markdown/text URLs in `message.content` are the pragmatic compatible subset.
- Official Responses image-generation support is tool/model dependent; the exact generated image output object is `output[].type === "image_generation_call"` with base64 `result`, not a URL.
- Direct rendered OpenAI docs pages could not be fetched from this CLI due HTTP 403; official generated SDK and OpenAPI sources were fetched successfully.
