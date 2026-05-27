# Frontend Type Safety

> **Status**: Verified by the first `frontend/` implementation.

---

## TypeScript settings (non-negotiable)

`tsconfig.json` extends `@vue/tsconfig/tsconfig.dom.json` (or equivalent)
with:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
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

- **Props**: `defineProps<Interface>()`. Don't use the runtime form
  (`defineProps({ x: { type: String } })`) — TS form gives full inference.
- **Emits**: `defineEmits<{ (e: 'foo', payload: T): void }>()`.
- **Refs to DOM nodes**: `const el = ref<HTMLDivElement | null>(null)`.
- **Refs to component instances**: `ref<InstanceType<typeof Child> | null>(null)`.

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
- `GET /api/history/public` returns all public image records, newest first, and
  does not require auth.
- `GET /api/outputs/:filename` returns image bytes.
- `services/api/imagesApi.ts` exports `uploadReferenceImage(file)`,
  `generateImage(request)`, `fetchOutputBlob(outputUrl)`, and
  `toDisplayImageUrl(outputUrl)`.

### 3. Contracts

- Upload response: `{ id, filename, mime, size }`.
- Generate request: `{ prompt, referenceId?, model?, count?, aspectRatio?, isPublic? }`.
- Regeneration from history may reuse an existing `referenceId`; this is still
  a normal `GenerateRequest` and must NOT re-upload the original file when the
  frontend already has a persisted backend reference id.
- Generate response: `{ batchId, aspectRatio, generationMode, images }` where each image has `{ id, outputUrl, filename, mime, width, height }` and `generationMode` is `'text-to-image' | 'image-to-image'`.
- History record response: `ImageRecord` includes required `isPublic: boolean`;
  image management keeps the owner-scoped `/api/history` list, while the
  homepage gallery hydrates `/api/history/public` for all accounts' public
  records.
- Error response: `{ error: { code, message, requestId, details? } }`.
- Env: `VITE_API_BASE_URL` is required for real backend calls; default local
  development value is `http://localhost:3000`.

### 4. Validation & Error Matrix

| Condition                        | Frontend behavior                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Empty prompt                     | Composable throws `Error('Describe the image before generating.')` before network IO |
| Upload response shape invalid    | Throw `ImageApiError` with `INVALID_RESPONSE`                                        |
| Generate response shape invalid  | Throw `ImageApiError` with `INVALID_RESPONSE`                                        |
| Backend error envelope present   | Throw `ImageApiError(status, code, message, requestId, details)`                     |
| Non-JSON or malformed error body | Throw `ImageApiError(status, 'HTTP_ERROR', ...)`                                     |
| localStorage schema mismatch     | Ignore stored payload and return an empty history                                    |
| Existing history `referenceId`   | Send it directly in `GenerateRequest.referenceId`; do not call upload first          |

### 5. Good/Base/Bad Cases

- Good: prompt + optional image uploads, generate returns a valid output URL,
  output blob is fetched, and metadata/blob are persisted together.
- Base: prompt-only generation skips upload and records `generationMode` as
  `text-to-image`.
- Regenerate: a history batch whose first/any record has `referenceId` sends
  that id back to `/api/images/generate` and records `generationMode` as
  `image-to-image`.
- Bad: invalid backend JSON is never cast; it becomes a typed `ImageApiError`.

### 6. Tests Required

- Stub `fetch` for upload/generate wrappers and assert method, URL, payload,
  narrowing, and error conversion.
- Use `fake-indexeddb` for blob persistence and assert blob round-trip.
- Seed localStorage with valid, invalid, and wrong-version payloads and assert
  schema-gated reads.
- Mount critical components/composables and assert user-facing error/status
  behavior, not implementation internals.
- Regression: regenerating a saved image-to-image batch asserts `referenceId`
  is present and `referenceFile` is absent; regenerating a saved text-to-image
  batch asserts no `referenceId` is sent.

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
// Drops the image-to-image input; the retry silently becomes text-to-image.
return {
  prompt: batch.prompt,
  model: batch.model,
};
```

#### Correct

```ts
const referenceId = batch.entries.find((entry) => entry.record.referenceId)?.record.referenceId;
return {
  prompt: batch.prompt,
  model: batch.model,
  ...(referenceId ? { referenceId } : {}),
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
