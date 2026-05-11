# ref2image-backend

Express + TypeScript backend for **Ref2Image_Studio**. Proxies image generation
requests to a 2API reverse proxy (OpenAI Images API–compatible). The backend
is intentionally stateless — all persistent history lives on the frontend
(IndexedDB for blobs, localStorage for metadata).

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

## Endpoints

| Method | Path          | Notes                            |
| ------ | ------------- | -------------------------------- |
| GET    | `/api/health` | `{ status, uptimeSec, version }` |

Image generation / upload endpoints land in task 2.

## Layout

See [`.trellis/spec/backend/directory-structure.md`](../.trellis/spec/backend/directory-structure.md).
