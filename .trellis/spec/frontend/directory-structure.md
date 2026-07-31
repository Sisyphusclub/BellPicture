# Frontend Directory Structure

> **Status**: Verified against the React implementation in `frontend/`.

## Runtime Layout

```text
frontend/
├── components.json            # shadcn/beUI aliases and component settings
├── public/
│   ├── brand/                 # product identity assets
│   └── media/                 # local landing and fallback media
├── src/
│   ├── main.tsx               # React root, router, auth, toast providers
│   ├── App.tsx                # global shell and route surface
│   ├── router/
│   │   └── index.tsx          # route table and fallback redirect
│   ├── views/                 # route-level composition
│   ├── components/
│   │   ├── auth/              # login and account surfaces
│   │   ├── common/            # navigation and app-wide feedback
│   │   ├── gallery/           # reusable image presentation
│   │   ├── ui/                # shadcn/beUI-compatible primitives
│   │   └── upload/            # reference-image input
│   ├── hooks/                 # React state, effects, and providers
│   ├── services/api/          # fetch wrappers and runtime validation
│   ├── lib/                   # third-party clients and low-level helpers
│   ├── types/                 # shared frontend/backend contracts
│   ├── utils/                 # pure transformations and browser utilities
│   └── styles/
│       ├── tokens.css         # shared design tokens
│       └── base.css           # Tailwind import and application styles
└── tests/                     # route, component, service, and utility tests
```

## Ownership Boundaries

### `views/`

Views correspond to routes and orchestrate page-level workflows. They may call
hooks and compose components, but should not contain fetch parsing or duplicate
reusable controls. The current routes are `/`, `/generate`, `/history`, and
`/admin/users`.

### `components/`

Components expose focused, typed props. Domain components belong in their domain
folder. Generic primitives belong in `components/ui/` and follow the aliases in
`components.json`. Do not place route data fetching in visual primitives.

### `hooks/`

Hooks own reusable stateful behavior, subscriptions, effects, and provider-backed
application state. Hooks may call services. They must not return JSX unless the
file defines a provider component, in which case use the `.tsx` extension.

### `services/api/`

Services are React-free. They own URLs, HTTP methods, credentials,
serialization, response narrowing, and normalized API errors. They never call hooks or update
component state directly.

### `lib/`

Library adapters and infrastructure helpers live here. Examples are the Better
Auth client, external-store helpers, and the `cn()` class-name utility. Keep
product workflow logic in hooks or services instead.

### `types/` and `utils/`

Shared wire types live in `types/`. Pure formatters, download helpers, and
narrowing helpers live in `utils/`. Neither directory should import React.

## Import Rules

- Use the `@/` alias for cross-directory source imports.
- Relative imports are acceptable within a tightly coupled folder.
- Import types with `import type` when no runtime value is needed.
- Avoid barrel files that hide dependency direction or create cycles.
- Services and utilities must not import from views, components, or hooks.
- Components must not import from views.

## File Naming

- React components and views: `PascalCase.tsx`.
- Hooks: `useCamelCase.ts` or `.tsx` for provider JSX.
- Services, utilities, and libraries: `camelCase.ts`.
- Tests mirror the subject name and use `.spec.ts` or `.spec.tsx`.
- CSS uses kebab-case selectors and BEM-like modifiers where a dedicated class is
  clearer than a utility list.

## Adding a Feature

1. Put backend wire types in `src/types/` if they are shared.
2. Add or extend a validated service in `src/services/api/`.
3. Put reusable behavior in a hook only when more than one component benefits or
   when the effect/state lifecycle is meaningfully complex.
4. Build reusable interface pieces in the closest domain component folder.
5. Compose the workflow in a route view.
6. Add focused tests at the lowest useful layer.

Do not add a new state library, styling system, icon set, or component framework
without an architectural need and an update to these specifications.
