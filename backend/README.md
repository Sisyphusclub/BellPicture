# Nebulens backend

Express + TypeScript backend for **Nebulens**. It proxies image generation
requests to an OpenAI Images API-compatible provider and persists users,
quotas, and image history in SQLite. Uploaded references and generated outputs
are stored on disk and should use persistent volumes in production.

## Stack

- Node.js 20+
- TypeScript (strict, ESM)
- Express 4 · pino · cors
- Vitest · ESLint · Prettier · husky + lint-staged

## Setup

```bash
npm install
cp .env.example .env   # then fill in IMAGE_API_KEY
```

## Scripts

| Command                           | What it does                                   |
| --------------------------------- | ---------------------------------------------- |
| `npm run dev`                     | tsx-watch dev server on `$PORT` (default 3000) |
| `npm run build`                   | Compile to `dist/` (see `tsconfig.build.json`) |
| `npm start`                       | Run compiled server (`node dist/index.js`)     |
| `npm run typecheck`               | `tsc --noEmit` over src + tests                |
| `npm run lint`                    | ESLint flat-config check                       |
| `npm run lint:fix`                | ESLint with `--fix`                            |
| `npm run format` / `format:check` | Prettier write / check-only                    |
| `npm test`                        | Vitest one-shot                                |
| `npm run test:watch`              | Vitest watch mode                              |
| `npm run storage:report-orphans`  | Report output files without history records    |

## Endpoints

| Method | Path                     | Notes                                                                                        |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------- |
| GET    | `/api/health/live`       | Process liveness                                                                             |
| GET    | `/api/health/ready`      | SQLite and writable-storage readiness                                                        |
| POST   | `/api/images/upload`     | multipart `image`; size cap `UPLOAD_MAX_BYTES`; magic-bytes MIME sniff (PNG/JPEG/WebP only)  |
| POST   | `/api/images/generate`   | JSON `{ prompt, referenceId?, model? }`; routes to 2API edits when `referenceId` is provided |
| GET    | `/api/outputs/:filename` | Streams public images anonymously; private images require owner/admin session or signed URL  |

### Upload response

```json
{ "id": "<uuid>.png", "filename": "<uuid>.png", "mime": "image/png", "size": 12345 }
```

### Generate response

```json
{
  "id": "<uuid>.png",
  "outputUrl": "/api/outputs/<uuid>.png",
  "filename": "<uuid>.png",
  "mime": "image/png",
  "width": 1024,
  "height": 1024,
  "generationMode": "text-to-image"
}
```

### Errors

All errors follow `{ error: { code, message, requestId, details? } }`. New codes
introduced by image endpoints: `PROVIDER_RATE_LIMITED` (429), `NOT_FOUND` (404).

## Layout

See [`.trellis/spec/backend/directory-structure.md`](../.trellis/spec/backend/directory-structure.md).
