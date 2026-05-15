# Backend Logging Guidelines

> **Status**: Verified against `backend/src/logger.ts` after task
> `05-09-backend-skeleton`. Redact list widened from the planning version
> to a superset that also covers top-level and `env.*` key paths.

---

## Logger choice

- Library: **`pino`** (fast, structured-by-default, JSON output).
- Pretty-print (`pino-pretty`) only in dev (`NODE_ENV !== 'production'`).
- Single instance: `src/logger.ts` exports a configured `pino()` singleton.
  Other modules `import { logger } from '../logger'` — never instantiate a
  second pino.

```ts
// src/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'ref2image-backend' },
  redact: {
    paths: [
      // request headers
      'req.headers.authorization',
      'req.headers.cookie',                 // Better Auth session cookie
      'req.headers["x-api-key"]',
      // top-level keys (when an object containing the secret is logged directly)
      'apiKey',
      'openaiCompatApiKey',
      'IMAGE_API_KEY',
      'OPENAI_COMPAT_API_KEY',
      'GOOGLE_CLIENT_SECRET',
      'BETTER_AUTH_SECRET',
      // one level deep (config / context / provider option objects)
      '*.apiKey',
      '*.openaiCompatApiKey',
      '*.IMAGE_API_KEY',
      '*.OPENAI_COMPAT_API_KEY',
      '*.GOOGLE_CLIENT_SECRET',
      '*.BETTER_AUTH_SECRET',
      // the env object literal exported from config/env.ts
      'env.IMAGE_API_KEY',
      'env.OPENAI_COMPAT_API_KEY',
      'env.GOOGLE_CLIENT_SECRET',
      'env.BETTER_AUTH_SECRET',
    ],
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

The redact list is intentionally a **superset** of the obvious cases: `apiKey`,
`openaiCompatApiKey`, `IMAGE_API_KEY`, and `OPENAI_COMPAT_API_KEY` at the top
level (in case someone logs config objects verbatim) plus `env.IMAGE_API_KEY`
and `env.OPENAI_COMPAT_API_KEY` (in case the env singleton is logged for
debugging). When you add a new provider or inbound API auth config field that
carries a secret, add the same triple — top-level, `*.x`, and any specific path
you can foresee.

---

## Log levels

| Level | When |
|---|---|
| `trace` | Disabled in normal dev. Reserved for ad-hoc deep traces. |
| `debug` | Verbose request/response shape, intermediate values. Off in prod by default. |
| `info` | One-line-per-request summary; provider call started/finished; server lifecycle. |
| `warn` | Recoverable failures, expected error paths (`AppError` subclasses), retries. |
| `error` | Unhandled errors, provider 5xx that bubbled, filesystem failures that block a request. |
| `fatal` | Server cannot continue; followed by `process.exit(1)`. Rare. |

---

## Required fields per request

The request-logger middleware assigns each request a UUID
(`crypto.randomUUID()`) onto `req.requestId`, and emits at least:

- **Inbound log** (`info`): `{ requestId, method, path, ip }`
- **Outbound log** (`info`): `{ requestId, status, durationMs }`

Every log emitted while handling that request must carry `requestId`. Use
`logger.child({ requestId })` once per request and pass that child down,
or thread `requestId` explicitly through service calls.

---

## What to log around the AI provider call

In `TwoApiImageProvider`:

```ts
logger.info({ requestId, model, hasReference: !!referencePath }, 'image generation: provider request');
const start = Date.now();
try {
  const out = await callProvider(...);
  logger.info({ requestId, durationMs: Date.now() - start, outputBytes: out.byteLength }, 'image generation: provider success');
  return out;
} catch (err) {
  logger.warn({ requestId, durationMs: Date.now() - start, err }, 'image generation: provider failure');
  throw mapToAppError(err);
}
```

---

## Forbidden patterns

- ❌ `console.log` / `console.error`. Always `logger.<level>()`.
- ❌ Logging request bodies that may contain image data (huge, binary).
  Log only metadata: size, mime type, count.
- ❌ Logging API keys, env vars, raw `Authorization` headers — even at
  `debug`. This includes `IMAGE_API_KEY`, `OPENAI_COMPAT_API_KEY`, and computed
  bearer strings. Use the redact list, and don't bypass it by interpolating
  into a message string.
- ❌ Logging exceptions as `${err}` (loses stack). Pass `err` as a field:
  `logger.error({ err }, 'message')` — pino serializes it properly.
- ❌ Multi-line log messages or human-prose paragraphs. One short sentence,
  context goes into structured fields.
