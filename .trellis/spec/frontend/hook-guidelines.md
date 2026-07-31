# React Hook Guidelines

> **Status**: Verified against the React implementation in `frontend/`.

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

## Forbidden Patterns

- Conditional hook calls.
- Empty dependency arrays that capture changing values.
- Disabling `react-hooks/exhaustive-deps` to silence a design problem.
- Fetch/JSON parsing copied into multiple hooks.
- Global mutable caches without a subscription contract.
- Returning JSX from a `.ts` hook module.
- Context as a replacement for all local state.
