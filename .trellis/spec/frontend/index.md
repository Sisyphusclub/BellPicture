# Frontend Specifications

> **Status**: Verified against the React migration in `frontend/`.

These documents define the frontend conventions for Nebulens. They describe the
current React implementation rather than the legacy frontend.

| Guide                                             | Scope                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| [Directory Structure](./directory-structure.md)   | React 19 + Vite layout and ownership boundaries                          |
| [Component Guidelines](./component-guidelines.md) | TSX components, shadcn/beUI primitives, accessibility, and responsive UI |
| [Hook Guidelines](./hook-guidelines.md)           | React hooks, providers, asynchronous state, and reusable behavior        |
| [State Management](./state-management.md)         | Local state, Context, external stores, and server-backed data            |
| [Type Safety](./type-safety.md)                   | Strict TypeScript and runtime boundary validation                        |
| [Quality Guidelines](./quality-guidelines.md)     | Testing, linting, build checks, accessibility, and visual QA             |

## Stack Snapshot

- React 19 and React DOM
- React Router 7
- Vite 8 and TypeScript 5.6 in strict mode
- Tailwind CSS 4 with design tokens in CSS
- shadcn-compatible component layout with beUI dependencies
- Lucide React icons and Motion for purposeful animation
- Better Auth React client
- Vitest, React Testing Library, and jsdom

## Architectural Rules

- Views own route composition; components own reusable interface surfaces.
- Hooks own reusable React state and effects; services own network IO.
- API payloads are `unknown` until validated at the boundary.
- Shared backend contract types live in `src/types/`.
- Prefer local state. Add Context only for cross-route application concerns.
- Preserve keyboard access, visible focus, reduced motion, and mobile layouts.
- Keep the prompt-first beUI landing composition isolated from denser product
  workbench screens; both use shared dark semantic tokens and brand assets.

## Required Checks

Run these from `frontend/` before handing off a change:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run format:check
```
