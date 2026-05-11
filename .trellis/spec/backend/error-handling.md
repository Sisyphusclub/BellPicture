# Backend Error Handling

> **Status**: Planning version. Re-verify against actual `errors/AppError.ts`
> and `middlewares/errorHandler.ts` once they land.

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
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'PROVIDER_ERROR'        // 2API returned non-2xx or invalid payload
  | 'PROVIDER_TIMEOUT'      // request exceeded IMAGE_API_TIMEOUT_MS
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
    "requestId": "<uuid>"
  }
}
```

- `code` is the `AppError.code`, or `INTERNAL` for non-`AppError` throws.
- `message` is safe to display to end users — never include secrets, env
  vars, or stack traces here.
- `requestId` is set by the request-logger middleware (one UUID per
  request) and is included in all logs for that request.
- `details` may be added when useful to the frontend (e.g., validation
  field names) but never for provider responses.

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
| 2API 4xx | `PROVIDER_ERROR` | 502 (don't pass through 4xx; the client called *us* correctly) |
| 2API 5xx | `PROVIDER_ERROR` | 502 |
| Malformed JSON / missing image data | `PROVIDER_ERROR` | 502 |

Always log the upstream status + a redacted summary of the response body
(no `Authorization` header echoes, no API key fragments).

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
