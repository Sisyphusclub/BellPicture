# React Hook Guidelines

> **Status**: Updated for task `08-28-fix-security-races-resources` with
> account-scoped async cache and paginated gallery contracts.

Hooks encapsulate reusable stateful behavior. Pure calculations belong in
utilities; HTTP contracts belong in services; markup belongs in components.

## When to Add a Hook

Add a hook when behavior:

- uses React state, effects, refs, context, or external-store subscriptions;
- is shared by more than one component; or
- makes a route component materially easier to understand.

Do not add a hook around a single pure function or a one-line state value merely
to reduce line count.

## Rules

- Name hooks `useCamelCase` and call them only at component/hook top level.
- Return an object when consumers benefit from named fields.
- Use `useCallback` for functions passed through Context or used as effect
  dependencies; do not memoize every local callback by default.
- Use `useMemo` for referential stability or expensive work, not semantic
  correctness.
- Keep effect dependency lists complete. Restructure unstable dependencies rather
  than suppressing the lint rule.
- Effects synchronize with systems outside React. Derive render data during
  render when no external synchronization is involved.
- Store mutable request ids, timer ids, and DOM handles in refs.
- Clean up timers, media-query listeners, and subscriptions.

## Async State

Hooks that call services expose the states the UI needs: loading, data, error,
and explicit actions. Catch `unknown`, normalize it to an `Error`, and give the
view enough information to render a useful state.

```ts
interface UseRecordsResult {
  records: readonly ImageRecord[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
```

- Prevent stale responses from overwriting newer state by using request ids,
  abort signals, or an equivalent ordering guard.
- For authenticated module-level caches, ordering alone is insufficient: bind
  state to `ownerUserId` and require both the user id and monotonically
  increasing request generation to match before committing fetch or mutation
  results. Increment the generation and expose an empty snapshot immediately on
  logout/account switch.
- Use `void action()` only when the rejection is handled inside the action.
- Reset errors at the start of a retry when the interface should leave the error
  state immediately.
- Do not duplicate API validation in hooks; services return typed results or
  normalized errors.

## Providers

Providers are reserved for state that crosses unrelated route branches or must be
available at the application shell. Current examples are authentication and
toast feedback.

- Keep Context values small and domain-specific.
- Memoize provider values when they contain functions or objects.
- Throw a clear error when a required provider-backed hook is used outside its
  provider.
- Do not put page-local forms, filters, or modal drafts in Context.

## External Stores

Module-level caches that need React subscriptions use `useSyncExternalStore`
through the helper in `src/lib/externalStore.ts`. A store must expose stable
`subscribe` and `getSnapshot` behavior. Mutations notify subscribers after the
cache is updated.

Use this pattern only when the same cache is intentionally shared across mounted
components. Route-local data should stay in the route's hook.

## Domain Boundaries

- `useAuth` owns session/profile state and exposes authentication actions.
- `useAuthModal` and `useImageDetailModalState` own shared modal state.
- Image generation, quota, history, public gallery, upload, and admin-user hooks
  call the corresponding API services and expose UI-ready state.
- `useMediaQuery` owns browser media-query subscription and cleanup.

## Testing Hooks

Prefer testing hooks through the component behavior they enable. Test a hook
directly only when it contains meaningful state transitions that would be awkward
to cover through a route/component. Stub the service boundary rather than React
internals.

## Scenario: account-scoped history and paginated gallery caches

### 1. Scope / Trigger

- Trigger: module-level history survives route mounts while authentication can
  change and requests can resolve out of order; public gallery hydration now
  consumes an opaque cursor page contract.

### 2. Signatures

```ts
interface HistoryState {
  ownerUserId: string | null;
  records: ImageRecord[];
  isHydrating: boolean;
  hydrateError: Error | null;
}

fetchPublicHistory(input?: { cursor?: string; limit?: number }): Promise<{
  records: ImageRecord[];
  nextCursor?: string;
}>;
```

### 3. Contracts

- `useImageHistory` derives the active cache owner from `useAuth().user.id`.
  While state belongs to another owner, render the stable empty snapshot; never
  render old records until an effect catches up.
- `resetForUser` increments `requestGeneration`, clears records/errors/loading,
  and sets the new owner. Fetch, delete, update, bulk mutation, and generation
  result handlers may commit only when captured generation and user id still
  match current state.
- `AuthProvider` may expose a fetched profile only when `profile.id` equals the
  current Better Auth session user id. During a switch, fall back to the new
  session user instead of briefly retaining the old profile.
- `usePublicGallery` replaces records on refresh, appends and de-duplicates on
  `loadMore`, and treats an absent `nextCursor` as end-of-list. A request
  generation guard prevents refresh/load-more responses from overwriting each
  other.

### 4. Validation & Error Matrix

| Condition                                          | Hook behavior                                     |
| -------------------------------------------------- | ------------------------------------------------- |
| A history response arrives after logout            | Discard; cache remains empty                      |
| A response arrives after session switched A -> B   | Discard unless owner is B and generation matches  |
| A mutation started as A resolves while B is active | Return service result but do not mutate B cache   |
| Auth session is B while loaded profile is A        | Expose normalized B session user, never A profile |
| Public page contains a duplicate id                | Keep one record                                   |
| `nextCursor` absent                                | `hasMore=false`; `loadMore` is a no-op            |
| Public refresh races load-more                     | Only the latest request generation commits        |

### 5. Good/Base/Bad Cases

- Good: A logs out and B logs in before A's slow response; B sees an empty/
  loading state and then only B's history.
- Base: repeated gallery hydration after the final page performs no request.
- Bad: a module-global `records` array with a single `hydrated` boolean; it has
  no identity boundary and can expose A data to B.
- Bad: profile fallback `profile ?? sessionUser`; an old non-null profile wins
  during an account switch.

### 6. Tests Required

- Deferred-promise hook test resolves B before A and then A, asserting only B
  remains visible; repeat for logout and late mutation/generation responses.
- Auth provider test changes session user before the old profile request settles
  and asserts the old id/admin flag is never exposed.
- Gallery hook/API tests cover initial page, cursor request, append de-duplication,
  end-of-list, refresh race, and malformed response rejection.

### 7. Wrong vs Correct

#### Wrong

```ts
const records = await fetchHistory();
store.set({ records });
```

#### Correct

```ts
const owner = user.id;
const request = ++requestGeneration;
const records = await fetchHistory();
if (request !== requestGeneration || store.getSnapshot().ownerUserId !== owner)
  return;
store.set((state) => ({ ...state, records }));
```

## Forbidden Patterns

- Conditional hook calls.
- Empty dependency arrays that capture changing values.
- Disabling `react-hooks/exhaustive-deps` to silence a design problem.
- Fetch/JSON parsing copied into multiple hooks.
- Global mutable caches without a subscription contract.
- Returning JSX from a `.ts` hook module.
- Context as a replacement for all local state.
