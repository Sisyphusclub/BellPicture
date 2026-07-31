# React and beUI Migration Decision

## Findings

- The current frontend is Vue 3.5, Vue Router, Element Plus, Vite, and Vitest.
- beUI publishes animated React components through the shadcn registry. It is not a Vue component package.
- The documented beUI runtime dependencies are `clsx`, `motion`, and `tailwind-merge`.
- beUI's theme contract targets Tailwind CSS v4 and can reuse shadcn-generated tokens.
- Better Auth 1.6.11 exposes a React client from `better-auth/react`; the existing username plugin remains available from `better-auth/client/plugins`.
- Existing files under `src/services/api`, `src/types`, and `src/utils` are framework-neutral and should remain the API/type source of truth.

## Selected Approach

Perform an in-place React migration inside `frontend/`:

1. Retain Vite, TypeScript strict mode, service modules, types, utilities, assets, environment variables, and route URLs.
2. Replace Vue dependencies and SFCs with React 19, React Router, React hooks/providers, and TSX components.
3. Replace Element Plus surfaces with native accessible controls and focused local components.
4. Configure Tailwind CSS v4, shadcn aliases, `components.json`, and the `cn` utility.
5. Install `clsx`, `motion`, and `tailwind-merge` so beUI registry components can be added without another framework migration.
6. Migrate behavior-focused tests to React Testing Library and keep API/service tests unchanged where possible.

## Compatibility Boundaries

- Backend endpoints, authentication semantics, quota enforcement, image records, and output URLs do not change.
- Better Auth React client replaces only the framework adapter.
- Public media and generated images remain the visible asset source.
- The Squarespace-derived `design.md` remains authoritative for layout, typography, color, radii, and motion.

## Source References

- https://pro.beui.dev/components/installation
- https://beui.dev/docs/ai-agents
- https://beui.dev/docs/theme
- Better Auth 1.6.11 React and username client documentation
