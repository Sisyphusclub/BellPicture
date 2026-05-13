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
│   │   ├── api/
│   │   │   └── imagesApi.ts    # fetch wrappers around /api/images/* (credentials: include + 401 handler)
│   │   └── storage/
│   │       ├── indexedDb.ts    # Image blob store
│   │       └── localStorageMeta.ts  # Metadata store
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

## Forbidden patterns

- ❌ Calling 2API directly from the frontend. All AI requests go through
  the backend (`VITE_API_BASE_URL`).
- ❌ Importing from `services/` inside `components/`. Go through a composable.
- ❌ `fetch('/api/...')` scattered across components. All HTTP lives in
  `services/api/`.
- ❌ Importing `services/` from `views/` or `components/`. Views orchestrate
  composables and presentational components only.
- ❌ Mutating localStorage / IndexedDB outside `services/storage/`.
- ❌ Default exports for components, services, or composables. Use named
  exports (Vue SFCs are the one exception — they are inherently default).
