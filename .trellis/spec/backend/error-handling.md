# Backend Error Handling

> **Status**: Updated for task `08-28-fix-security-races-resources` against
> `AppError`, generation cancellation, output streaming, and media proxy errors.

---

## Goals

1. Frontend always receives a predictable JSON error shape.
2. Logs always carry enough context to debug without exposing secrets.
3. Throwing is the default; nothing returns `null` to mean "failure".

---

## Error class hierarchy

Single tagged base class in `src/errors/AppError.ts`:

```ts
export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED" // missing or invalid Better Auth session
  | "FORBIDDEN" // authenticated user lacks required role
  | "NOT_FOUND"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "PROVIDER_ERROR" // 2API returned non-2xx or invalid payload
  | "PROVIDER_PROMPT_REJECTED" // 2API rejected prompt/reference content
  | "PROVIDER_EMPTY_RESULT" // 2API returned no image payload
  | "PROVIDER_TIMEOUT" // request exceeded IMAGE_API_TIMEOUT_MS
  | "PROVIDER_RATE_LIMITED" // 2API returned 429
  | "REQUEST_ABORTED" // caller disconnected/cancelled; internal status 499
  | "QUOTA_EXHAUSTED" // per-user daily image quota would overflow
  | "STORAGE_ERROR" // local fs read/write failed
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly cause?: unknown,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

Throw `AppError` everywhere the failure is "expected" (validation,
provider failures, storage failures). Let unexpected errors bubble — the
final middleware turns them into `500 INTERNAL`.

---

## HTTP error response shape

The error middleware always returns:

```json
{
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "Image generation timed out after 120000ms",
    "requestId": "<uuid>",
    "details": { "...": "..." }
  }
}
```

- `code` is the `AppError.code`, or `INTERNAL` for non-`AppError` throws.
- `message` is safe to display to end users — never include secrets, env
  vars, or stack traces here.
- `requestId` is set by the request-logger middleware (one UUID per
  request) and is included in all logs for that request.
- `details` is included **only when the thrown AppError set it** (it is
  `undefined`-omitted otherwise). Use it for validation field names
  (`{ issues: [...] }`), reference ids the client sent, or upstream
  status codes. Never put provider response bodies, header values, or
  raw error stacks here — those leak to the frontend.

---

## Final error middleware (sketch)

`src/middlewares/errorHandler.ts`:

```ts
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req as any).requestId as string;

  if (err instanceof AppError) {
    logger.warn(
      { requestId, code: err.code, cause: err.cause, details: err.details },
      err.message,
    );
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  logger.error({ requestId, err }, "Unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL", message: "Internal server error", requestId },
  });
};
```

Mounted **last** in `app.ts`, after all routes.

---

## Provider failure mapping

`TwoApiImageProvider` must translate raw HTTP / network errors into
`AppError` instances:

| Trigger                                                   | AppError.code              | HTTP                                                                                                    |
| --------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Caller signal aborted before/during fetch or JSON read    | `REQUEST_ABORTED`          | 499; normally no response because the client disconnected                                               |
| Provider timeout signal aborted during fetch or JSON read | `PROVIDER_TIMEOUT`         | 504                                                                                                     |
| 2API 429                                                  | `PROVIDER_RATE_LIMITED`    | 429 (the only upstream status we surface as-is)                                                         |
| 2API 400 / 422                                            | `PROVIDER_PROMPT_REJECTED` | 422 (`details = { upstreamStatus, reason: "prompt_rejected" }`)                                         |
| 2API other 4xx                                            | `PROVIDER_ERROR`           | 502 (configuration/auth/provider failure, `details.reason = "provider_http_error"`)                     |
| 2API 5xx                                                  | `PROVIDER_ERROR`           | 502                                                                                                     |
| Malformed JSON                                            | `PROVIDER_ERROR`           | 502                                                                                                     |
| Missing / empty image data                                | `PROVIDER_EMPTY_RESULT`    | 502 (`details.reason = "empty_result"`)                                                                 |
| Local file-read fails before fetch (image-to-image)       | `PROVIDER_ERROR`           | 502 (treated as "provider unreachable" — the file should have existed if the service did the preflight) |

Always log the upstream status + a redacted summary of the response body
(no `Authorization` header echoes, no API key fragments).
Never send the upstream response body to the frontend. The frontend should branch
on stable `code` values and safe `details.reason` values, not provider prose.

## Upload / validation failure mapping

The image endpoints add validation errors at the upload + controller
boundary:

| Trigger                                                                  | AppError.code            | HTTP                                          |
| ------------------------------------------------------------------------ | ------------------------ | --------------------------------------------- |
| zod schema fails on JSON body                                            | `BAD_REQUEST`            | 400 (`details.issues` = `ZodError.issues`)    |
| Multer rejects oversize upload (`LIMIT_FILE_SIZE`)                       | `PAYLOAD_TOO_LARGE`      | 413 (`details.field` = the multipart field)   |
| Multer sees an unexpected field name                                     | `BAD_REQUEST`            | 400                                           |
| Multipart request with no file                                           | `BAD_REQUEST`            | 400                                           |
| Magic-bytes sniff doesn't recognize the upload                           | `UNSUPPORTED_MEDIA_TYPE` | 415 (`details.firstBytes` = first 12 bytes)   |
| `referenceId` not `<uuid>.<ext>`                                         | `BAD_REQUEST`            | 400                                           |
| `referenceId` does not match a file on disk                              | `BAD_REQUEST`            | 400 (`details.referenceId` = the id)          |
| `referenceIds` contains more than `MAX_REFERENCE_IMAGES` ids             | `BAD_REQUEST`            | 400                                           |
| Any id in `referenceIds` does not match a file on disk                   | `BAD_REQUEST`            | 400 (`details.referenceId` = the failing id)  |
| Reference id has no ownership metadata                                   | `BAD_REQUEST`            | 400 (`details.referenceId` = the id)          |
| Reference id is registered to another authenticated user                 | `FORBIDDEN`              | 403 before file access/provider call          |
| `/api/images/generate` receives `resolution: "2k"` or `"4k"`             | `BAD_REQUEST`            | 400 (`details.issues` from zod)               |
| `/api/images/generate/high-res` omits `resolution` or sends `"standard"` | `BAD_REQUEST`            | 400 (`details.issues` from zod)               |
| `4k` generation uses unsupported aspect ratio (`1:1`, `3:2`, `2:3`)      | `BAD_REQUEST`            | 400 (`details = { aspectRatio, resolution }`) |
| `GET /api/outputs/:filename` filename malformed                          | `BAD_REQUEST`            | 400                                           |
| `GET /api/outputs/:filename` file missing                                | `NOT_FOUND`              | 404                                           |
| Output exists but stat/open fails with permissions or other I/O error    | `STORAGE_ERROR`          | 500; preserve the underlying cause            |

## Auth failure mapping

The username auth wrapper and `requireAuth` middleware translate expected auth
failures into `AppError` or Better Auth-compatible client errors with Chinese
messages:

| Trigger                                                             | AppError.code     | HTTP                                              |
| ------------------------------------------------------------------- | ----------------- | ------------------------------------------------- |
| `POST /api/auth/sign-up/username` body is missing username/password | `BAD_REQUEST`     | 400 (`details.issues` from zod)                   |
| Username fails `^[a-z0-9_]{3,32}$` after normalization              | `BAD_REQUEST`     | 400 (`details.field = "username"`)                |
| Username already exists                                             | `BAD_REQUEST`     | 400 (`details.field = "username"`)                |
| Registration password shorter than 8 chars                          | `BAD_REQUEST`     | 400 (`details.field = "password"`)                |
| Product-unsupported email auth routes are called                    | `BAD_REQUEST`     | 400                                               |
| `auth.api.getSession` returns null (no cookie / expired)            | `UNAUTHORIZED`    | 401                                               |
| `auth.api.getSession` throws unexpectedly                           | `UNAUTHORIZED`    | 401 (cause attached; logged at `error`)           |
| Authenticated non-admin calls admin-only endpoint                   | `FORBIDDEN`       | 403                                               |
| Per-user daily quota would overflow on atomic `reserve`             | `QUOTA_EXHAUSTED` | 429 (`details = { requested, remaining, total }`) |

The `openaiCompatAuth` middleware (mounted on `/v1/*`) translates inbound API-key
failures into the same error envelope:

| Trigger                                             | AppError.code  | HTTP |
| --------------------------------------------------- | -------------- | ---- |
| Missing `Authorization` header                      | `UNAUTHORIZED` | 401  |
| Header does not use `Bearer <token>`                | `UNAUTHORIZED` | 401  |
| Bearer token does not match `OPENAI_COMPAT_API_KEY` | `UNAUTHORIZED` | 401  |

Never include the presented token or configured key in `message`, `details`, or
logs. Use a timing-safe comparison and keep `IMAGE_API_KEY` out of inbound auth.

The frontend's `imagesApi` wrapper recognises 401 and triggers the
registered unauthorized handler — keep the error envelope shape
(`{ error: { code, message, requestId } }`) so the SPA can branch on
`code === 'UNAUTHORIZED'` without parsing message text.

---

## Scenario: cancellation and streamed-resource failures

### 1. Scope / Trigger

- Trigger: generation, media proxying, and output delivery continue after the
  initial HTTP handler starts. Client disconnects and mid-stream failures must
  cancel work without being misreported as normal 404s or causing a second
  response write.

### 2. Signatures

```ts
generateImage(input: GenerateImageInput & { signal?: AbortSignal }): Promise<GenerateImageOutput>;
provider.generate(input: GenerateInput & { signal?: AbortSignal }): Promise<GenerateOutput>;
statOutput(filename: string): Promise<{ size: number }>;
createOutputReadStream(filename: string): ReadStream;
```

### 3. Contracts

- Convert `req.aborted` and a premature `res.close` into one `AbortSignal` and
  pass it through provider fetch/JSON reading, output writes/copies, demo delay,
  and every pre-persistence checkpoint.
- Combine caller cancellation with the provider timeout, but map them by source:
  caller -> `REQUEST_ABORTED`; deadline -> `PROVIDER_TIMEOUT`.
- Cancellation releases reserved quota, removes generated outputs, and skips
  history and optional demo-cache persistence.
- Output delivery runs `stat` first to set `Content-Length`, then pipelines a
  read stream into the response with backpressure. Only a nested Node `ENOENT`
  cause becomes 404; permission and storage faults remain 500.
- The media proxy uses a 30-second upstream deadline and aborts upstream fetch/
  pipeline when downstream closes. If an upstream stream fails after headers
  were sent, destroy the response; do not call the JSON error middleware.

### 4. Validation & Error Matrix

| Condition                                            | Result                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Browser cancels before provider completes            | Abort upstream; 499 internally; no quota/history/output          |
| Provider exceeds configured generation timeout       | 504 `PROVIDER_TIMEOUT`                                           |
| Media upstream exceeds 30 seconds before headers     | 504 `PROVIDER_TIMEOUT`                                           |
| Media/output client closes mid-stream                | Abort pipeline/upstream; no second response                      |
| Output stat cause is `ENOENT`                        | 404 `NOT_FOUND`                                                  |
| Output stat cause is `EACCES`, `EPERM`, or other I/O | 500 `STORAGE_ERROR`                                              |
| Stream fails after response headers                  | Destroy response and log; never `next(err)` into JSON middleware |

### 5. Good/Base/Bad Cases

- Good: stopping generation aborts provider work and restores the reservation.
- Base: a missing output is reported as 404 before headers are sent.
- Bad: treating every `STORAGE_ERROR` as missing hides disk/permission incidents.
- Bad: aborting only browser `fetch`; paid server work then continues and the UI
  falsely reports that generation stopped.

### 6. Tests Required

- Controller/provider tests abort during fetch, JSON parsing, and output save,
  asserting `REQUEST_ABORTED`, cleanup, and no history/cache write.
- Output route tests distinguish `ENOENT` from permission/I/O causes and verify
  stream-based delivery.
- Media route tests assert deadline cancellation, downstream-close cancellation,
  and response destruction for an upstream error after headers.

### 7. Wrong vs Correct

#### Wrong

```ts
const buffer = await readOutput(filename);
if (error.code === "STORAGE_ERROR") throw notFound();
res.end(buffer);
```

#### Correct

```ts
const { size } = await statOutput(filename);
res.setHeader("Content-Length", size);
await pipeline(createOutputReadStream(filename), res, { signal });
```

---

## Forbidden patterns

- ❌ `try { ... } catch { /* swallow */ }`. If you catch, either re-throw
  with context or convert to a typed `AppError`. Empty catches hide bugs.
- ❌ Sending the raw upstream error body to the frontend (could leak the
  fact that we're talking to 2API, or leak headers).
- ❌ `res.status(500).send('Error')` ad-hoc. All errors go through the
  middleware.
- ❌ Logging `process.env.IMAGE_API_KEY` or `Authorization` header values
  in any form (full or partial).
- ❌ Returning sentinel values (`null`, `-1`, `''`) to signal failure from
  service functions. Throw.
- ❌ Calling `next(err)` after a streaming response has sent headers. Destroy
  the response or let the pipeline close it; a JSON error envelope can no
  longer be written coherently.

---

## Validation errors

Use a schema validator (suggested: `zod`) at the controller boundary.
Translate `ZodError` into `AppError('BAD_REQUEST', ..., 400, err, { issues })`
inside the controller, so services receive only well-typed inputs.
