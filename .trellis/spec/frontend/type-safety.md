# Frontend Type Safety

> **Status**: Verified by the first `frontend/` implementation.

---

## TypeScript settings (non-negotiable)

`tsconfig.json` uses the React JSX transform and strict bundler settings:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] },
  },
}
```

`strict: true` is the floor, not the ceiling.

---

## Typing component APIs

- **Props**: declare an interface and destructure it in a named function
  component.
- **Callbacks**: type domain callbacks explicitly, for example
  `onOpen: (record: ImageRecord) => void`.
- **DOM events**: use React event types such as
  `React.ChangeEvent<HTMLInputElement>` when inference does not suffice.
- **DOM refs**: use `useRef<HTMLDivElement | null>(null)`.
- **Children**: use `PropsWithChildren` or `ReactNode` only when the component
  actually accepts children.

---

## Shared types live in `src/types/`

```ts
// src/types/image.ts
export type GenerationMode = "text-to-image" | "image-to-image";

export interface ImageRecord {
  id: string;
  createdAt: string;
  prompt: string;
  model: string;
  referenceId?: string;
  referenceIds?: readonly string[];
  width: number;
  height: number;
  isPublic: boolean;
}

export interface UploadResponse {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

export interface GenerateRequest {
  prompt: string;
  referenceId?: string;
  referenceIds?: readonly string[];
  model?: string;
  isPublic?: boolean;
}

export interface GenerateResponse {
  id: string;
  outputUrl: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
  generationMode: GenerationMode;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}
```

Types describing the **wire format** between frontend and backend live here so
both sides of the boundary agree. Backend re-declares them in `backend/src/` —
there is no shared package in MVP. Keep them in sync manually; flag drift in PRs.

---

## Validation at the boundary

The frontend uses fetch wrappers that return typed payloads, but the
runtime validity comes from the backend. The frontend should still:

- **Narrow `unknown` from `response.json()` before use.** Either with a
  small hand-written type guard or `zod` (preferred if added).
- **Never `as`-cast** an API response. `as` defeats type safety.
- **Validate localStorage reads**, since older versions may have written
  a different shape. The schemaVersion field gates this.

```ts
import { isRecord, isString, readNumber, readString } from "@/utils/narrowing";

function isImageRecord(value: unknown): value is ImageRecord {
  if (!isRecord(value)) return false;
  const id = readString(value, "id");
  const createdAt = readString(value, "createdAt");
  const prompt = readString(value, "prompt");
  const model = readString(value, "model");
  const width = readNumber(value, "width");
  const height = readNumber(value, "height");
  const referenceId = value.referenceId;

  return (
    isString(id) &&
    isString(createdAt) &&
    isString(prompt) &&
    isString(model) &&
    typeof width === "number" &&
    typeof height === "number" &&
    (referenceId === undefined || isString(referenceId))
  );
}
```

(If the project later adopts `zod`, replace these guards with schemas.)

---

## Scenario: Image generation API contract

### 1. Scope / Trigger

- Trigger: The frontend consumes backend image endpoints and persists generated
  image metadata locally. This is a cross-layer request/response contract.

### 2. Signatures

- `POST /api/images/upload` with multipart field `image: File`.
- `POST /api/images/generate` with JSON `GenerateRequest`.
- `POST /api/images/generate/high-res` with JSON `GenerateRequest` plus
  `resolution: '2k' | '4k'`; authenticated and admin-only.
- `GET /api/history/public` returns all public image records, newest first, and
  does not require auth.
- `DELETE /api/history/public/:id` is authenticated and admin-only. It removes
  one image from the public gallery by setting `image_records.is_public = false`;
  it does not delete the owner's `/api/history` record or the output file.
- `GET /api/outputs/:filename` returns image bytes.
- `services/api/imagesApi.ts` exports `uploadReferenceImage(file)`,
  `uploadReferenceImages(files)`, `generateImage(request)`,
  `fetchOutputBlob(outputUrl)`, and
  `toDisplayImageUrl(outputUrl)`.

### 3. Contracts

- Upload response: `{ id, filename, mime, size }`.
- Generate request: `{ prompt, referenceId?, referenceIds?, model?, count?, aspectRatio?, resolution?, isPublic?, demoPresetId? }`.
  New call sites send `referenceIds` for image-to-image; `referenceId` remains
  a legacy/back-compat field populated with the first id when useful.
- Standard generation uses `/api/images/generate`; omit `resolution` or send
  only `resolution: 'standard'`. The backend rejects `resolution: '2k' | '4k'`
  on this endpoint.
- Admin high-resolution generation uses `/api/images/generate/high-res` and
  requires `resolution: '2k' | '4k'`. `2k` supports every current aspect ratio;
  `4k` supports only `16:9` and `9:16`, matching the upstream GPT Image 2
  limits. Frontend admin controls auto-switch to `16:9` when selecting `4k`
  from an unsupported aspect choice.
- `imagesApi.generateImage(request)` is the only frontend routing point:
  `resolution !== 'standard'` calls `/api/images/generate/high-res`; all other
  requests call `/api/images/generate`.
- The generator UI exposes a directly visible `标准 / 2K / 4K` clarity
  segmented control only when `useAuth().isAdmin` is true. Do not hide 2K/4K
  behind a secondary menu; admins must see the available resolutions at a
  glance. Non-admin UI must not render the selector or send a high-resolution
  field; backend authorization remains authoritative.
- `demoPresetId` remains a legacy admin-only backend path for tests and
  compatibility. The generator UI must not expose a demo button; configured demo
  prompts are submitted as ordinary `prompt` values and matched on the backend.
  Demo preset and configured demo prompt cache paths stay standard-only.
- Regeneration from history may reuse existing `referenceIds`; this is still
  a normal `GenerateRequest` and must NOT re-upload original files when the
  frontend already has persisted backend reference ids.
- Generate response: `{ batchId, aspectRatio, generationMode, images }` where each image has `{ id, outputUrl, filename, mime, width, height }` and `generationMode` is `'text-to-image' | 'image-to-image'`.
- History record response: `ImageRecord` includes required `isPublic: boolean`
  and optional `referenceIds: readonly string[]`; `referenceId` mirrors the
  first id for legacy callers. Treat both fields as immutable API data in UI
  computed values and tests.
  image management keeps the owner-scoped `/api/history` list, while the
  homepage gallery hydrates `/api/history/public` for all accounts' public
  records.
- Admin gallery moderation calls `deletePublicGalleryRecordAsAdmin(id)` from
  `usePublicGallery.removeAsAdmin(id)`. On success, remove the record from the
  module-level public gallery cache; do not mutate private history state.
- Error response: `{ error: { code, message, requestId, details? } }`.
  Generation UI must map backend provider errors to user-facing Chinese
  explanations instead of rendering only `生成失败`:
  - `PROVIDER_TIMEOUT` -> explain that the upstream generation service exceeded
    the waiting window and suggest retrying with fewer references or a simpler
    prompt.
  - `PROVIDER_PROMPT_REJECTED` -> explain that the prompt/reference likely did
    not pass upstream safety policy and suggest more neutral style/quality
    wording.
  - `PROVIDER_EMPTY_RESULT` -> explain that upstream returned no image result
    and suggest a clearer, less constrained prompt.
  - Legacy `PROVIDER_ERROR` with `details.upstreamStatus` 400 / 422 or
    `details.reason = "prompt_rejected"` should use the same prompt-policy
    message for backward compatibility.
- Env: `VITE_API_BASE_URL` is required for real backend calls; default local
  development value is `http://localhost:3000`.

### 4. Validation & Error Matrix

| Condition                                                     | Frontend behavior                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Empty prompt                                                  | Generation hook throws before network IO                                                             |
| Upload response shape invalid                                 | Throw `ImageApiError` with `INVALID_RESPONSE`                                                        |
| Generate response shape invalid                               | Throw `ImageApiError` with `INVALID_RESPONSE`                                                        |
| Backend error envelope present                                | Throw `ImageApiError(status, code, message, requestId, details)`                                     |
| Non-admin high-res request                                    | Backend returns `FORBIDDEN`; frontend should not expose the high-res selector                        |
| Standard endpoint receives `2k`/`4k`                          | Backend returns `BAD_REQUEST`; frontend service must route high-res requests to `/high-res`          |
| High-res endpoint receives `standard` or missing `resolution` | Backend returns `BAD_REQUEST`                                                                        |
| `4k` with unsupported aspect ratio                            | Backend returns `BAD_REQUEST`; admin UI switches unsupported choices to `16:9` or downgrades to `2k` |
| `PROVIDER_TIMEOUT` during generate                            | Show an upstream-timeout message with retry/simplification guidance                                  |
| `PROVIDER_PROMPT_REJECTED` during generate                    | Show a safety-policy message with prompt/reference wording guidance                                  |
| `PROVIDER_EMPTY_RESULT` during generate                       | Show an empty-result message with prompt adjustment guidance                                         |
| Non-JSON or malformed error body                              | Throw `ImageApiError(status, 'HTTP_ERROR', ...)`                                                     |
| localStorage schema mismatch                                  | Ignore stored payload and return an empty history                                                    |
| Existing history `referenceIds`                               | Send them directly in `GenerateRequest.referenceIds`; do not call upload first                       |
| More than 4 reference images                                  | UI must not send more than `MAX_REFERENCE_IMAGES`; backend rejects extra ids                         |
| Anonymous gallery delete                                      | Backend returns `UNAUTHORIZED`; frontend opens login through `authedFetch`                           |
| Non-admin gallery delete                                      | Backend returns `FORBIDDEN`; frontend shows the localized API message                                |
| Missing/non-public gallery id                                 | Backend returns `NOT_FOUND`; frontend keeps the public gallery cache unchanged                       |

### 5. Good/Base/Bad Cases

- Good: prompt + optional image uploads, generate returns a valid output URL,
  output blob is fetched, and metadata/blob are persisted together.
- Base: prompt-only generation skips upload and records `generationMode` as
  `text-to-image`.
- Admin high-res: admin selects 4K from the clarity selector, UI switches to
  `16:9`, `imagesApi` posts to `/api/images/generate/high-res`, and returned
  records preserve the backend `width`/`height`.
- Demo prompt: an exact configured prompt still travels through
  `generateImage({ prompt, ... })`; the frontend does not add `demoPresetId` or
  branch on demo state.
- Regenerate: a history batch whose first/any record has `referenceIds` sends
  those ids back to `/api/images/generate` and records `generationMode` as
  `image-to-image`.
- Multi-reference: selecting, dropping, or pasting several images uploads them
  via `uploadReferenceImages()` and sends the returned ids as `referenceIds`.
- Admin moderation: an admin can remove another user's public image from the
  homepage gallery; that owner's private history still contains the record with
  `isPublic: false`.
- Bad: invalid backend JSON is never cast; it becomes a typed `ImageApiError`.
- Bad: a non-admin component path constructs `{ resolution: '4k' }`; backend
  still rejects direct calls, but the frontend has drifted from the product
  contract.

### 6. Tests Required

- Stub `fetch` for upload/generate wrappers and assert method, URL, payload,
  narrowing, and error conversion.
- API wrapper: assert `resolution: '4k'` routes to
  `/api/images/generate/high-res` and keeps the high-resolution payload.
- View/hook: assert admins directly see and can choose `2k`/`4k`, `4k`
  sends `16:9`, and non-admins do not render or send the clarity selector.
- Use `fake-indexeddb` for blob persistence and assert blob round-trip.
- Seed localStorage with valid, invalid, and wrong-version payloads and assert
  schema-gated reads.
- Render critical components/hooks and assert user-facing error/status
  behavior, not implementation internals.
- Regression: regenerating a saved image-to-image batch asserts `referenceIds`
  is present and `referenceFiles` is absent; regenerating a saved text-to-image
  batch asserts no reference id field is sent.
- Admin gallery delete: backend route test asserts `DELETE /api/history/public/:id`
  hides the record from public listing but preserves owner history, and frontend
  tests assert only admins see gallery delete controls and `usePublicGallery`
  calls the authenticated delete endpoint.
- Demo prompt regression: frontend view tests assert `.prompt-showcase__demo`
  does not render for ordinary users or admins; backend tests own cache-hit and
  cache-miss behavior.

### 7. Wrong vs Correct

#### Wrong

```ts
const payload = (await response.json()) as GenerateResponse;
return payload.outputUrl;
```

#### Correct

```ts
const payload: unknown = await response.json();
if (!isGenerateResponse(payload)) {
  throw new ImageApiError(
    response.status,
    "INVALID_RESPONSE",
    "Generation returned an invalid response",
  );
}
return payload.outputUrl;
```

#### Wrong

```ts
// Deletes the owner's private history when the admin only meant to moderate the gallery.
await deleteHistoryRecord(id);
```

#### Correct

```ts
await deletePublicGalleryRecordAsAdmin(id);
updatePublicGalleryCache((records) => records.filter((record) => record.id !== id));
```

#### Wrong

```ts
// Drops the image-to-image input; the retry silently becomes text-to-image.
return {
  prompt: batch.prompt,
  model: batch.model,
};
```

#### Correct

```ts
const referenceIds = batch.entries.flatMap(
  (entry) =>
    entry.record.referenceIds ??
    (entry.record.referenceId ? [entry.record.referenceId] : []),
);
return {
  prompt: batch.prompt,
  model: batch.model,
  ...(referenceIds.length > 0 ? { referenceIds } : {}),
};
```

---

## Forbidden patterns

- ❌ `any`. ESLint blocks it. Use `unknown` and narrow.
- ❌ `as Foo` on values from `JSON.parse` / `response.json()` / localStorage.
  Validate, then narrow.
- ❌ `// @ts-ignore` / `// @ts-expect-error` without a one-line comment
  explaining why and a tracking TODO.
- ❌ Re-declaring the same type in multiple files. Put it in `src/types/`
  and import.
- ❌ Using `Object`, `Function`, `{}` as types. Use `unknown` /
  specific signatures / `Record<string, unknown>`.
- ❌ Type assertions to widen a value (`x as string`) when narrowing
  would work (`typeof x === 'string'`).
- ❌ Optional chaining as error suppression (`obj?.method?.()` to "make
  the error go away"). Address the nullability properly.
