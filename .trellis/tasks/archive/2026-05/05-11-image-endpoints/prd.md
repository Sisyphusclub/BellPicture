# Image endpoints: /api/images/generate + upload

## Goal

Expose the image generation API surface on the Express backend so the Vue
frontend can: (1) submit a prompt and receive a generated image, and (2)
optionally attach a reference image to drive image-to-image generation. The
project is named **Ref2Image_Studio**, so image-to-image with references is
a first-class feature, not a stretch goal.

This task takes the skeleton from task `05-09-backend-skeleton` from
"runnable but routeless" to "frontend can call it end-to-end".

---

## What I already know (from repo inspection)

### Backend skeleton (already in place)

- `backend/src/app.ts` — `createApp({ provider })`. Wires CORS, requestLogger,
  JSON parser, `/api`, errorHandler. Only `/api/health` is mounted today.
- `backend/src/services/providers/TwoApiImageProvider.ts` — implements
  `ImageGenerationProvider.generate({ prompt, referencePath?, model? })`.
  Currently calls `/v1/images/generations`; throws BAD_REQUEST 400 when
  `referencePath` is set. Timeout + 4xx/5xx → PROVIDER_ERROR 502 and
  AbortError → PROVIDER_TIMEOUT 504 already implemented.
- `backend/src/storage/localStorage.ts` — `saveOutput`/`readOutput` with
  extension allow-list (`png/jpg/jpeg/webp`) and path-traversal guard. No
  upload helper yet.
- `backend/src/errors/AppError.ts` — `ErrorCode` union ready;
  `PROVIDER_RATE_LIMITED` will be added in this task.

### Spec contracts (already locked)

- `directory-structure.md` already names the targets:
  `routes/images.ts`, `controllers/images.controller.ts`,
  `services/imageGeneration.service.ts`, `middlewares/upload.ts`.
- `database-guidelines.md` locks `tmp/uploads/<uuid>.<ext>`, MIME allow-list
  `image/png | image/jpeg | image/webp`, `fs/promises` only, helpers under
  `storage/`.
- `error-handling.md` locks zod-at-controller → `AppError('BAD_REQUEST',
  ..., 400, err, { issues })`.

### Frontend expectations

- `state-management.md` declares `ImageRecord.referenceId?: string`, so the
  frontend already plans to keep upload ids and reuse them across multiple
  generates.

---

## Decisions Locked

1. **Endpoint topology — A. Two-step.** `POST /api/images/upload` (multipart)
   returns `{ id, ... }`. `POST /api/images/generate` accepts JSON `{ prompt,
   referenceId? }`. Frontend can preview / retry / change-prompt without
   re-uploading.
2. **Provider abstraction — A. Single `generate()` with internal branch.**
   Keep `ImageGenerationProvider.generate({ prompt, referencePath?, model? })`
   signature. Remove the BAD_REQUEST throw on `referencePath`; instead branch
   to 2API `/v1/images/edits` (multipart) when set, `/v1/images/generations`
   (JSON) when not.
3. **Output return shape — A. URL pointer.** `generate` returns JSON
   `{ id, outputUrl: '/api/outputs/<filename>', filename, mime, width, height,
   generationMode: 'text-to-image' | 'image-to-image' }`. `GET
   /api/outputs/:filename` lives in this task (not deferred).
4. **MVP guards in** (all four selected):
   - **`UPLOAD_MAX_BYTES`** env (default 10 MB); multer `limits.fileSize`
     → 413 `PAYLOAD_TOO_LARGE` on overflow.
   - **Magic-bytes MIME** sniff (PNG / JPEG / WebP); declared MIME is
     ignored. Mismatch → 415 `UNSUPPORTED_MEDIA_TYPE`.
   - **referenceId preflight**: existence + path-in-UPLOAD_DIR check
     before calling the provider. Missing → 400 `BAD_REQUEST`.
   - **2API HTTP 429 → 429 `PROVIDER_RATE_LIMITED`** (new ErrorCode),
     not the generic PROVIDER_ERROR 502.

---

## Requirements

### Endpoints

#### `POST /api/images/upload`

- Content-Type: `multipart/form-data`
- Form field: `image` (single file, exactly one)
- Multer config: `memoryStorage`, `limits.fileSize = UPLOAD_MAX_BYTES`
- Validation pipeline:
  1. Multer enforces `fileSize` → exceed throws → mapped to 413.
  2. Magic-bytes sniff on the first 12 bytes vs PNG/JPEG/WebP signatures.
  3. Save via `storage/localStorage.saveUpload(buf, sniffedExt)` →
     `tmp/uploads/<uuid>.<ext>` (uuid is the response id; ext is normalized
     `png|jpeg|webp`).
- Response 200: `{ id: string, filename: string, mime: string, size: number }`
  (`id` and `filename` minus extension are the same uuid).

#### `POST /api/images/generate`

- Content-Type: `application/json`
- Body (zod-validated):
  ```ts
  {
    prompt: string (min 1, max 2000),
    referenceId?: string (uuid),
    model?: string (default from env IMAGE_MODEL),
  }
  ```
- Pipeline:
  1. Controller zod-parses body → on error, AppError(BAD_REQUEST, 400,
     ..., { issues }).
  2. Service: if `referenceId` set, resolve it to an absolute path under
     `UPLOAD_DIR`; if missing on disk → AppError(BAD_REQUEST, 400,
     'Reference id not found', { referenceId }).
  3. Call `provider.generate({ prompt, referencePath?, model })`.
  4. Wrap returned `{ outputPath, width, height }` into the response shape,
     deriving `outputUrl = '/api/outputs/<basename>'` and
     `generationMode` from whether referenceId was set.
- Response 200: `{ id, outputUrl, filename, mime, width, height, generationMode }`.

#### `GET /api/outputs/:filename`

- Pass `params.filename` straight to `storage.readOutput(filename)` so the
  existing path-traversal / invalid-filename guard applies (returns
  AppError(STORAGE_ERROR, 500) on the guard — we'll add a 400 mapping in the
  controller for "obviously bad filename" cases via zod-string-min check).
- Stream the file with the right `Content-Type` (`image/png` / `image/jpeg`
  / `image/webp` from extension; the storage helper already normalizes
  `jpg`→`jpeg`).
- 404 if file not found.

### Provider extension

`TwoApiImageProvider.generate(input)` behavior change:

- **Text-to-image** (no `referencePath`): unchanged from today —
  `/v1/images/generations`, JSON body.
- **Image-to-image** (`referencePath` present):
  - Read the file from disk (`fs/promises.readFile`).
  - Build `FormData` with: `image` (Blob from the buffer + basename),
    `prompt`, `model`, `n: '1'`, `size: '1024x1024'`, `response_format:
    'b64_json'`.
  - Headers: only `Authorization: Bearer ${apiKey}` — let FormData set the
    multipart boundary.
  - `fetch(<base>/v1/images/edits, { method: 'POST', headers, body: form,
    signal: AbortSignal.timeout(timeoutMs) })`.
  - Response parsing identical to today (extract `data[0].b64_json`, decode,
    write via `saveOutput`).
- **429 mapping** (applies to both branches): if `response.status === 429`,
  throw `AppError('PROVIDER_RATE_LIMITED', 'Image provider rate-limited',
  429, undefined, { upstreamStatus: 429 })` BEFORE the generic
  `!response.ok` branch.

### Storage helper additions

```ts
saveUpload(buf: Buffer): Promise<SavedFile>;  // sniffs ext from magic bytes
                                              // throws UNSUPPORTED_MEDIA_TYPE
                                              // on no match.
readUpload(filename: string): Promise<{ buffer: Buffer; absolutePath: string }>;
resolveUploadPath(referenceId: string): string;  // builds expected path,
                                                  // applies traversal guard,
                                                  // does NOT check existence
                                                  // (that's the caller's job).
```

Magic-bytes signatures:
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- JPEG: `FF D8 FF`
- WebP: bytes 0–3 `52 49 46 46` ("RIFF") AND bytes 8–11 `57 45 42 50` ("WEBP")

### Error mapping summary

| Trigger | AppError.code | HTTP |
|---|---|---|
| zod validation fail | `BAD_REQUEST` | 400 |
| referenceId missing on disk | `BAD_REQUEST` | 400 |
| Upload no file in form | `BAD_REQUEST` | 400 |
| Upload too large | `PAYLOAD_TOO_LARGE` | 413 |
| Magic-bytes mismatch / unknown | `UNSUPPORTED_MEDIA_TYPE` | 415 |
| 2API 429 | `PROVIDER_RATE_LIMITED` | 429 |
| 2API other 4xx | `PROVIDER_ERROR` | 502 |
| 2API 5xx | `PROVIDER_ERROR` | 502 |
| fetch AbortError | `PROVIDER_TIMEOUT` | 504 |
| Output file not found in GET | `STORAGE_ERROR` | 404 (mapped down from 500) |
| Bad filename in GET | `BAD_REQUEST` | 400 |

### New / changed env vars

| Variable | Required | Default | Notes |
|---|---|---|---|
| `UPLOAD_MAX_BYTES` | no | `10485760` (10 MB) | Multer file size cap. Positive integer; non-numeric / ≤0 → throws on import. |

`.env.example` and `config/env.ts` updated accordingly.

### Deps

- `multer` + `@types/multer`
- `zod`

---

## Acceptance Criteria

- [ ] `curl -F image=@a.png POST /api/images/upload` → 200 `{ id, filename, mime: 'image/png', size }`.
- [ ] Same call with a `.txt` file with `Content-Type: image/png` → 415 (magic-bytes catches the forgery).
- [ ] Upload of an 11 MB file with default config → 413.
- [ ] `curl -H 'content-type: application/json' -d '{"prompt":"red cube"}' POST /api/images/generate` → 200 with `generationMode: 'text-to-image'` and a `GET outputUrl` that returns the image bytes with `Content-Type: image/png`.
- [ ] Same with `referenceId` from a prior upload → 200 with `generationMode: 'image-to-image'`, provider called against `/v1/images/edits` (asserted in unit test).
- [ ] Generate with non-existent `referenceId` → 400.
- [ ] Generate with empty prompt → 400 with `details.issues` listing the zod failure.
- [ ] Stub 2API 429 → 429 response body `{ error.code: 'PROVIDER_RATE_LIMITED' }`.
- [ ] Stub 2API 500 → 502 `PROVIDER_ERROR`; stub AbortError → 504 `PROVIDER_TIMEOUT`.
- [ ] `GET /api/outputs/../escape.png` → 400.
- [ ] `GET /api/outputs/<nonexistent>.png` → 404.
- [ ] All new endpoints traced by request-logger middleware (`requestId` echoed in all error responses).
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all green.

## Definition of Done

- Implementation matches the contract above (no surprises).
- Unit tests added per slice; integration tests via supertest for
  `/upload`, `/generate`, `/outputs`.
- `.env.example` and `config/env.ts` updated with `UPLOAD_MAX_BYTES`.
- `error-handling.md` spec updated to add the new 429 row and the upload
  413/415 rows (Phase 3.3).
- `backend/README.md` endpoints table updated.

---

## Out of Scope (explicit)

- Authentication, rate limiting at our gateway, multi-tenant boundaries.
- Async job queue; everything is synchronous request/response.
- Cleanup cron for `tmp/uploads` and `tmp/outputs` (deferred — inherits
  task 1's "out of scope").
- Batch generation (`n > 1`).
- Variable size / aspect ratio in same request (locked to `1024x1024`).
- Multi-reference composite (only one reference image per generate).
- Webhook / SSE for generation completion.
- Output cleanup tied to generate response success.
- Frontend integration (frontend task lands separately).

---

## Technical Approach

### File layout (touches)

```
backend/
├── src/
│   ├── app.ts                                   (modify: mount images/outputs)
│   ├── errors/AppError.ts                       (modify: + PROVIDER_RATE_LIMITED)
│   ├── config/env.ts                            (modify: + UPLOAD_MAX_BYTES)
│   ├── middlewares/upload.ts                    (new)
│   ├── routes/images.ts                         (new)
│   ├── routes/outputs.ts                        (new)
│   ├── controllers/images.controller.ts         (new)
│   ├── controllers/outputs.controller.ts        (new)
│   ├── services/imageGeneration.service.ts      (new)
│   ├── services/providers/TwoApiImageProvider.ts (modify: branch + 429)
│   ├── storage/localStorage.ts                  (modify: + saveUpload/readUpload/resolveUploadPath/magic-bytes)
│   └── types/image.ts                           (modify if needed: response shape exports)
└── tests/                                        (new tests for each new module + extend provider/storage)
```

### Controllers stay thin

Per spec convention. Controllers:
1. zod-parse / multer-pop file.
2. Convert zod error to `AppError(BAD_REQUEST, ...)`.
3. Call the service / storage helper.
4. Shape the response.

Services never touch `req`/`res`.

### Implementation Plan (single PR, ordered slices)

1. **Types + errors + env** — add `PROVIDER_RATE_LIMITED` to ErrorCode;
   update `.env.example` + `config/env.ts` with `UPLOAD_MAX_BYTES`; add tests.
2. **Storage** — `saveUpload`, `readUpload`, `resolveUploadPath`, magic-bytes
   helper; tests (happy + each MIME + forgery + traversal).
3. **Provider extension** — branch on `referencePath`; 429 mapping; extend
   existing test file with three new cases.
4. **Upload middleware** — multer memoryStorage wrapper; tests as part of
   the upload controller test below.
5. **Service** — `imageGeneration.service.ts` — `generateImage({ prompt,
   referenceId?, model })` returns the saved `{ filename, width, height,
   mime, generationMode }`. Preflight-checks referenceId. Unit test with
   a stub provider.
6. **Controllers + routes** — `images.controller.ts` (`upload`, `generate`),
   `outputs.controller.ts` (read-back), `routes/images.ts`, `routes/outputs.ts`,
   mount in `app.ts`. Integration tests via supertest.
7. **README + spec drift queue** — note 429 row + 413/415 rows in
   error-handling.md for the Phase 3.3 update.

---

## Decision (ADR-lite)

**Context**: Backend skeleton (task 05-09) intentionally stopped at
`/api/health`. The frontend is gated on a working image API; both
text-to-image and image-to-image are first-class because the product is
literally named "Ref2Image_Studio". Need a coherent contract that the
frontend's `ImageRecord` schema can talk to without contortion.

**Decision**:

- Two-step upload → generate, because frontend's `ImageRecord.referenceId?`
  already presumes upload-id-then-reference. Lets users retry / re-prompt
  with the same reference without re-uploading.
- One provider method (`generate`) with internal branch on `referencePath`,
  to keep the controller / service code path single and the interface stable.
- Output returned as URL pointer + a `GET /api/outputs/:filename` route,
  to avoid base64-bloated responses and to let the frontend stream-download
  to IndexedDB.
- Magic-bytes MIME check + multer size cap + referenceId preflight +
  429 rate-limit mapping all in MVP — each protects one specific class of
  bug that's expensive to retrofit later.

**Consequences**:

- `ImageGenerationProvider` interface stays unchanged; future providers can
  ignore image-to-image by throwing BAD_REQUEST themselves when they see
  `referencePath`.
- `tmp/` still grows unbounded; cleanup is a future task.
- A frontend retry that wants a different ref must call `/upload` again
  (referenceIds aren't user-mutable; that's fine).
- One new ErrorCode (`PROVIDER_RATE_LIMITED`); error-handling.md needs the
  matrix update in Phase 3.3.

---

## Technical Notes

- `multer.memoryStorage` chosen over disk storage so magic-bytes runs
  before any disk I/O. 10 MB memory ceiling acceptable.
- `FormData` for the edits call uses the global Web `FormData` (Node 20 ships
  it). The `image` field is a `Blob` wrapping the file buffer. No need to
  set `Content-Type` manually.
- 429 mapping intentionally rides on `response.status === 429` rather than
  parsing the upstream JSON — simpler and adequate.
- The current `localStorage.readOutput` returns `STORAGE_ERROR 500` for
  "invalid filename" / "file not found"; the new controller will translate
  to 400 / 404 by checking `err.code` after the throw. Spec drift to note:
  the helper could be split into two errors (bad-name vs missing-file), but
  that's a refactor outside this task's scope.
- Tests stub `fetch` exactly like the existing TwoApiImageProvider tests
  for the new image-to-image case; assert `body instanceof FormData`,
  `calledUrl ends with '/v1/images/edits'`, and the form fields by reading
  the request.
