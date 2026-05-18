# Backend Error Handling

> **Status**: Verified against `backend/src/errors/AppError.ts` +
> `backend/src/middlewares/errorHandler.ts` after task `05-11-image-endpoints`.
> ErrorCode union extended; details now included in the JSON response body
> when set.

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
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'           // missing or invalid Better Auth session
  | 'NOT_FOUND'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'PROVIDER_ERROR'        // 2API returned non-2xx or invalid payload
  | 'PROVIDER_TIMEOUT'      // request exceeded IMAGE_API_TIMEOUT_MS
  | 'PROVIDER_RATE_LIMITED' // 2API returned 429
  | 'STORAGE_ERROR'         // local fs read/write failed
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly cause?: unknown,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
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
    logger.warn({ requestId, code: err.code, cause: err.cause, details: err.details }, err.message);
    res.status(err.status).json({
      error: { code: err.code, message: err.message, requestId },
    });
    return;
  }

  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error', requestId },
  });
};
```

Mounted **last** in `app.ts`, after all routes.

---

## Provider failure mapping

`TwoApiImageProvider` must translate raw HTTP / network errors into
`AppError` instances:

| Trigger | AppError.code | HTTP |
|---|---|---|
| `AbortError` from `fetch` | `PROVIDER_TIMEOUT` | 504 |
| 2API 429 | `PROVIDER_RATE_LIMITED` | 429 (the only upstream status we surface as-is) |
| 2API other 4xx | `PROVIDER_ERROR` | 502 (don't pass through 4xx; the client called *us* correctly) |
| 2API 5xx | `PROVIDER_ERROR` | 502 |
| Malformed JSON / missing image data | `PROVIDER_ERROR` | 502 |
| Local file-read fails before fetch (image-to-image) | `PROVIDER_ERROR` | 502 (treated as "provider unreachable" — the file should have existed if the service did the preflight) |

Always log the upstream status + a redacted summary of the response body
(no `Authorization` header echoes, no API key fragments).

## Upload / validation failure mapping

The image endpoints add validation errors at the upload + controller
boundary:

| Trigger | AppError.code | HTTP |
|---|---|---|
| zod schema fails on JSON body | `BAD_REQUEST` | 400 (`details.issues` = `ZodError.issues`) |
| Multer rejects oversize upload (`LIMIT_FILE_SIZE`) | `PAYLOAD_TOO_LARGE` | 413 (`details.field` = the multipart field) |
| Multer sees an unexpected field name | `BAD_REQUEST` | 400 |
| Multipart request with no file | `BAD_REQUEST` | 400 |
| Magic-bytes sniff doesn't recognize the upload | `UNSUPPORTED_MEDIA_TYPE` | 415 (`details.firstBytes` = first 12 bytes) |
| `referenceId` not `<uuid>.<ext>` | `BAD_REQUEST` | 400 |
| `referenceId` does not match a file on disk | `BAD_REQUEST` | 400 (`details.referenceId` = the id) |
| `GET /api/outputs/:filename` filename malformed | `BAD_REQUEST` | 400 |
| `GET /api/outputs/:filename` file missing | `NOT_FOUND` | 404 |

## Auth failure mapping

The username auth wrapper and `requireAuth` middleware translate expected auth
failures into `AppError` or Better Auth-compatible client errors with Chinese
messages:

| Trigger | AppError.code | HTTP |
|---|---|---|
| `POST /api/auth/sign-up/username` body is missing username/password | `BAD_REQUEST` | 400 (`details.issues` from zod) |
| Username fails `^[a-z0-9_]{3,32}$` after normalization | `BAD_REQUEST` | 400 (`details.field = "username"`) |
| Username already exists | `BAD_REQUEST` | 400 (`details.field = "username"`) |
| Registration password shorter than 8 chars | `BAD_REQUEST` | 400 (`details.field = "password"`) |
| Product-unsupported email auth routes are called | `BAD_REQUEST` | 400 |
| `auth.api.getSession` returns null (no cookie / expired) | `UNAUTHORIZED` | 401 |
| `auth.api.getSession` throws unexpectedly | `UNAUTHORIZED` | 401 (cause attached; logged at `error`) |
| Per-user daily quota would overflow on `consume` | `QUOTA_EXHAUSTED` | 429 (`details = { requested, remaining, total }`) |

The `openaiCompatAuth` middleware (mounted on `/v1/*`) translates inbound API-key
failures into the same error envelope:

| Trigger | AppError.code | HTTP |
|---|---|---|
| Missing `Authorization` header | `UNAUTHORIZED` | 401 |
| Header does not use `Bearer <token>` | `UNAUTHORIZED` | 401 |
| Bearer token does not match `OPENAI_COMPAT_API_KEY` | `UNAUTHORIZED` | 401 |

Never include the presented token or configured key in `message`, `details`, or
logs. Use a timing-safe comparison and keep `IMAGE_API_KEY` out of inbound auth.

The frontend's `imagesApi` wrapper recognises 401 and triggers the
registered unauthorized handler — keep the error envelope shape
(`{ error: { code, message, requestId } }`) so the SPA can branch on
`code === 'UNAUTHORIZED'` without parsing message text.

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

---

## Validation errors

Use a schema validator (suggested: `zod`) at the controller boundary.
Translate `ZodError` into `AppError('BAD_REQUEST', ..., 400, err, { issues })`
inside the controller, so services receive only well-typed inputs.
