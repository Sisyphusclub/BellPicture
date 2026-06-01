# Frontend Directory Structure

> **Status**: Verified by the first `frontend/` implementation.

---

## Stack

- Vue 3.4+ (Composition API + `<script setup>` only)
- Vite 5+
- TypeScript (strict)
- Hybrid UI: custom Claude-styled product surfaces + Element Plus utilities
- IndexedDB (image blobs) + localStorage (metadata) for local history
- State: composables only, no Pinia (see `state-management.md`)

The frontend lives in `frontend/` at the repo root, fully independent from
`backend/`.

---

## Folder Layout

```
frontend/
├── index.html
├── src/
│   ├── main.ts                 # Mount Vue app, import global styles, wire auth interceptor
│   ├── App.vue                 # Root layout — mounts <LoginModal/> + auto-opens it on unauthenticated session
│   ├── router/
│   │   └── index.ts            # vue-router config
│   ├── views/                  # Route-level components (one per route)
│   │   ├── GenerateView.vue
│   │   └── HistoryView.vue
│   ├── components/             # Reusable presentational components
│   │   ├── auth/               # LoginModal + future auth surfaces
│   │   ├── common/             # Generic (Button wrappers, layout helpers, AppHeader)
│   │   ├── upload/             # Reference-image upload UI
│   │   └── gallery/            # Result/history display
│   ├── composables/            # Reusable stateful logic (use*.ts)
│   │   ├── useImageGeneration.ts
│   │   ├── useImageHistory.ts
│   │   ├── useFileUpload.ts
│   │   ├── useAuth.ts          # Wraps Better Auth's useSession + signIn/signOut
│   │   └── useAuthModal.ts     # Global modal open/close ref
│   ├── lib/                    # Third-party client singletons (no Vue ref logic of our own)
│   │   └── authClient.ts       # Better Auth Vue client (createAuthClient)
│   ├── services/               # Pure API/IO. No Vue refs here.
│   │   └── api/
│   │       ├── httpClient.ts   # Shared API base URL + publicFetch/authedFetch + 401 handler registration
│   │       ├── imagesApi.ts    # fetch wrappers around /api/images/* (uploads + generation)
│   │       └── historyApi.ts   # fetch wrappers around /api/history/* (private history, public gallery, delete)
│   ├── types/                  # Shared TS types/interfaces
│   │   └── image.ts            # ImageRecord, GenerateRequest, etc.
│   ├── utils/                  # Pure helpers (no IO, no Vue)
│   ├── styles/                 # Global SCSS / CSS variables
│   └── assets/                 # Static assets bundled by Vite
├── public/                     # Verbatim-served static files
├── tests/                      # Vitest tests, mirror src/
├── .env.example
├── README.md                   # Frontend-only dev/build/test notes
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── vitest.config.ts
└── lefthook.yml or husky config
```

### Naming

- Components: `PascalCase.vue` (e.g., `ImageUploader.vue`).
- Composables: `useThing.ts`, exporting a single function `useThing()`.
- Services: `lowerCamelCase.ts`, exporting named functions (no default exports).
- Types: `lowerCamelCase.ts`, exporting `interface`/`type` only.
- Test files: `*.spec.ts` colocated under `tests/` mirroring the source path.

### Key rules

- **`services/` is Vue-free.** No `ref`, `reactive`, `computed`. Pure
  async functions. This makes them reusable from composables AND testable
  with plain Vitest (no `@vue/test-utils` needed).
- **`composables/` wrap services and add reactivity.** They own `ref`s and
  return the reactive surface to components.
- **`components/` don't call services directly.** They consume composables.
  This keeps API/storage decisions in one place.
- **`views/` are thin.** They orchestrate composables and components. No
  business logic.
- **No barrel `index.ts` files.** Import explicit paths.

---

## Environment variables (`.env.example`)

| Variable | Required | Example |
|---|---|---|
| `VITE_API_BASE_URL` | yes | `http://localhost:3000` |
| `VITE_BRAND_ASSET_VERSION` | no | `20260601` |

Vite only exposes vars prefixed with `VITE_`. **Never put secrets in
frontend env vars** — they are bundled into the public JS.

`VITE_BRAND_ASSET_VERSION` is optional because `vite.config.ts` provides a
build-time timestamp fallback. Components that reference replaceable
`public/brand/` files must append this value as a query string, e.g.
`/brand/logo.png?v=${VITE_BRAND_ASSET_VERSION}`, so replacing a logo or brand
image is visible after the next frontend deploy even when an older bare URL is
cached by the browser or CDN.

---

## Production nginx proxy contract

The production `frontend/nginx.conf` proxies `/api/` and `/v1/` to the backend.
Image generation is a synchronous request in the MVP, and the backend provider
timeout defaults to `IMAGE_API_TIMEOUT_MS=120000` (2 minutes). The nginx proxy
read/send timeouts for generated-image endpoints must therefore be greater than
the backend timeout, currently `180s`.

Required shape:

```nginx
location /api/ {
  proxy_pass http://backend:3000/api/;
  proxy_read_timeout 180s;
  proxy_send_timeout 180s;
}

location /v1/ {
  proxy_pass http://backend:3000/v1/;
  proxy_read_timeout 180s;
  proxy_send_timeout 180s;
}
```

Do not rely on nginx defaults here. A default proxy read timeout shorter than
`IMAGE_API_TIMEOUT_MS` can return a gateway 504 while the backend/provider call
is still legitimately running.

## Static asset cache contract

Hashed Vite bundles under `/assets/` are immutable and may keep the long cache
header:

```nginx
location /assets/ {
  try_files $uri =404;
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Replaceable brand files under `public/brand/` must not use a long strong cache.
They are served by fixed names such as `/brand/logo.png`, so stale browser/CDN
entries otherwise survive a deploy. Required shape:

```nginx
location /brand/ {
  try_files $uri =404;
  add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

When adding a new fixed-name brand asset, also version the frontend reference
with `VITE_BRAND_ASSET_VERSION`. Do not rely on users clearing browser cache or
Cloudflare expiring the bare URL.

---

## Forbidden patterns

- ❌ Calling 2API directly from the frontend. All AI requests go through
  the backend (`VITE_API_BASE_URL`).
- ❌ Leaving production `/api/` or `/v1/` proxy timeouts below
  `IMAGE_API_TIMEOUT_MS`; slow valid image generations will surface as 504s.
- ❌ Referencing replaceable files under `/brand/` without a version query.
  Fixed bare URLs such as `/brand/logo.png` can keep serving the previous asset
  from browser/CDN cache after a deploy.
- ❌ Importing from `services/` inside `components/`. Go through a composable.
- ❌ `fetch('/api/...')` scattered across components. All HTTP lives in
  `services/api/`.
- ❌ Importing `services/` from `views/` or `components/`. Views orchestrate
  composables and presentational components only.
- ❌ Mutating localStorage / IndexedDB outside `services/storage/`.
- ❌ Default exports for components, services, or composables. Use named
  exports (Vue SFCs are the one exception — they are inherently default).
