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

Vite only exposes vars prefixed with `VITE_`. **Never put secrets in
frontend env vars** — they are bundled into the public JS.

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

## Scenario: fixed Nebulens brand logo asset

### 1. Scope / Trigger

- Trigger: adding or replacing the fixed sidebar logo served from Vite
  `public/` and production nginx.
- Scope: `frontend/public/brand/logo.png`, `AppHeader.vue`, Header component
  tests, the Vite production copy, and nginx `/brand/` caching.

### 2. Signatures

```text
Source file: frontend/public/brand/logo.png
Public URL:  /brand/logo.png
Rendered by: <img class="sidebar-brand__mark" src="/brand/logo.png" alt="Nebulens 标志" />
Desktop CSS: 42px x 42px
Mobile CSS:  32px x 32px
```

### 3. Contracts

- The committed source must be a 256x256 RGBA PNG with transparent corners,
  non-empty visible pixels, and a silhouette that remains legible at 32px.
- `AppHeader` must keep the Simplified-Chinese alt label `Nebulens 标志` and
  the containing link's full Nebulens accessible name.
- Vite must copy the file unchanged to `dist/brand/logo.png` during build.
- Production nginx must revalidate fixed brand assets rather than cache them as
  immutable:

```nginx
location /brand/ {
  try_files $uri =404;
  add_header Cache-Control "public, max-age=0, must-revalidate";
}
```

### 4. Validation & Error Matrix

| Condition | Expected behavior |
|---|---|
| Source file missing | Header test/build verification fails; do not ship a broken image URL |
| PNG is non-square or not 256x256 | Asset validation fails before commit |
| Corners are opaque or key-color pixels remain | Transparency validation fails; regenerate or reprocess the asset |
| Header path differs from `/brand/logo.png` | Component test fails |
| Built hash differs from source hash | Build verification fails |
| `/brand/` is placed under immutable caching | Review-blocking stale-logo risk |

### 5. Good/Base/Bad Cases

- Good: a clean RGBA mark loads from `/brand/logo.png`, renders at 42px, and
  retains its silhouette at the 32px mobile breakpoint.
- Base: replacing the PNG at the same path requires no component API change and
  nginx revalidates the next request.
- Bad: committing a chroma-key source, an opaque app-icon tile, a text-heavy
  wordmark, or a fixed URL cached as immutable.

### 6. Tests Required

- Component: assert `src`, `alt`, desktop size, and mobile size.
- Asset: assert 256x256 RGBA, transparent corners, non-empty alpha bounds, and
  zero visible chroma-key pixels.
- Build: compare SHA-256 for `public/brand/logo.png` and
  `dist/brand/logo.png`.
- Browser: verify natural 256x256 dimensions, rendered 42px/32px dimensions,
  visual transparency, and no console errors.

### 7. Wrong vs Correct

#### Wrong

```vue
<img src="/brand/logo-key.png" alt="logo" />
```

#### Correct

```vue
<img class="sidebar-brand__mark" src="/brand/logo.png" alt="Nebulens 标志" />
```

---

## Forbidden patterns

- ❌ Calling 2API directly from the frontend. All AI requests go through
  the backend (`VITE_API_BASE_URL`).
- ❌ Leaving production `/api/` or `/v1/` proxy timeouts below
  `IMAGE_API_TIMEOUT_MS`; slow valid image generations will surface as 504s.
- ❌ Importing from `services/` inside `components/`. Go through a composable.
- ❌ `fetch('/api/...')` scattered across components. All HTTP lives in
  `services/api/`.
- ❌ Importing `services/` from `views/` or `components/`. Views orchestrate
  composables and presentational components only.
- ❌ Mutating localStorage / IndexedDB outside `services/storage/`.
- ❌ Default exports for components, services, or composables. Use named
  exports (Vue SFCs are the one exception — they are inherently default).
