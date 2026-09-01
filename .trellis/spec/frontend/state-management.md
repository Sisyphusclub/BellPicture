# Frontend State Management

> **Decision**: Use React local state, focused Context providers, and small
> external stores. No Redux, Zustand, MobX, or equivalent library is required.

## State Placement

Choose the narrowest owner that satisfies the workflow.

| State                         | Owner            | Examples                                             |
| ----------------------------- | ---------------- | ---------------------------------------------------- |
| Ephemeral control state       | component        | open menu, active carousel slide, hover pause        |
| Page workflow state           | route hook/view  | generation form, staged filters, selection           |
| Cross-route application state | Context provider | authenticated user, toast feedback                   |
| Shared reactive cache         | external store   | auth modal, image detail modal, public gallery cache |
| Server data and IO            | service + hook   | history, quota, admin users, generation              |
| URL navigation state          | React Router     | current route and redirects                          |

Do not duplicate a value in two layers. Derive values such as `isAuthenticated`,
visible records, result counts, or button-disabled state from their source data.

## Local and Page State

Use `useState` for independent values. Use `useReducer` when transitions are
interdependent enough that named events clarify the workflow. Keep form drafts in
the form or view that owns submit/reset behavior.

The history page deliberately distinguishes staged filters from applied filters:
editing controls must not issue a new query until the user chooses to apply them.

## Authentication

`AuthProvider` wraps the application and combines the Better Auth React session
with the backend profile. It exposes user, loading, authentication status, admin
status, refresh, login, registration, and logout actions through `useAuth()`.

- The backend remains authoritative for authorization.
- UI visibility based on `isAdmin` improves usability but is not a security
  boundary.
- A fetched profile is valid only for the current Better Auth session user id.
  On account switch, expose the new normalized session user until its matching
  profile arrives; never fall back to a non-null profile from the prior account.
- A 401 from protected image APIs opens the shared login modal through the
  registered unauthorized handler.

## Modal and Toast State

Login and image-detail modal state can be opened from services/hooks outside a
single route, so they use small external stores. Toast state is rendered by a
provider because feedback belongs to the global shell.

- Keep modal payload and visibility in the same store to avoid stale content.
- Closing a modal clears state that should not leak into the next opening.
- Toasts are transient status feedback, not persistent error storage.

## Server-Backed Data

API services perform network IO and runtime response validation. Hooks translate
service results into React state and user actions.

- Do not optimistically remove data unless failure recovery is implemented or the
  operation's semantics make rollback trivial.
- After a successful mutation, update the owning cache or refetch it.
- When an admin mutation changes the currently authenticated user's server-backed quota, call the
  shared quota refresh action so every mounted quota consumer observes the new snapshot. Mutations
  for another user must not overwrite the current user's quota cache.
- Admin quota saves are intentionally silent on success because the updated table row and shared
  quota consumers provide immediate confirmation; keep the ToastProvider notification for failures.
- Preserve owner-scoped private-history identifiers such as `referenceIds` for
  regeneration rather than reconstructing them from visual state. Public
  gallery payloads must not carry reusable reference ids.
- Public gallery moderation updates only the public cache; it does not delete the
  owner's private history.

## Persistence

The backend is the source of truth for generated records and quota. Browser
storage is permitted only for explicitly local preferences or compatibility
caches. Treat persisted JSON as `unknown`, validate versions and fields, and
recover to a valid empty/default state when data is malformed.

## Concurrency

- Guard against stale asynchronous responses.
- Shared authenticated caches carry an explicit owner id plus request
  generation. Account switch/logout increments the generation and clears the
  visible snapshot before any new request can settle; fetch and mutation
  handlers verify both values before committing.
- Disable duplicate destructive or generation submits while a request is active.
- Always clear loading state in `finally`.
- Keep the previous successful result visible during a non-destructive refresh
  when doing so helps continuity; distinguish it from the current loading state.

## Adding a State Library

Do not add one by default. Reconsider only when several independent route trees
must coordinate complex transactional state and the current Context/external
store approach causes measured correctness or performance problems. Document the
problem and migration cost before adding the dependency.

## Forbidden Patterns

- A single application-wide object containing all state.
- Context for page-local input values.
- Mutable module globals without `useSyncExternalStore` subscription semantics.
- Treating UI role checks as authorization.
- Copying server records into multiple unsynchronized caches.
- Casting browser storage or API responses to trusted types.
