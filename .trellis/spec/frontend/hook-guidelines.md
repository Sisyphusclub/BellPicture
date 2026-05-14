# Composable Guidelines

> **Status**: Verified by the first `frontend/` implementation. (Vue calls
> these "composables", not "hooks", but this file fills the role of
> `hook-guidelines.md` from the bootstrap scaffold.)

---

## What is a composable

A composable is a **function** that:

- Has a name starting with `use` (`useImageGeneration`, `useFileUpload`).
- Encapsulates reactive state and the logic that drives it.
- Is called from `<script setup>` (or another composable).
- Is **not** a Vue component, not a service, not a store.

Composables are how the project shares stateful logic across components.

---

## Standard shape

```ts
// composables/useImageGeneration.ts
import { ref, readonly } from 'vue';
import { generateImage } from '@/services/api/imagesApi';
import type { GenerateRequest, ImageRecord } from '@/types/image';

export function useImageGeneration() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const lastResult = ref<ImageRecord | null>(null);

  async function generate(req: GenerateRequest): Promise<ImageRecord> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await generateImage(req);
      lastResult.value = result;
      return result;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw error.value;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastResult: readonly(lastResult),
    generate,
  };
}
```

### Conventions

- **Return an object with named refs and methods.** Never return a tuple
  array (Vue community convention is object-shaped, unlike React).
- **Wrap exposed refs in `readonly()`** when callers shouldn't mutate them.
  Mutation happens through the composable's own methods.
- **Errors set `error.value` AND throw.** Components can `await` and
  `try/catch`, OR ignore the throw and read `error.value`. Both work.
- **Never accept reactive props directly.** Take plain values. If reactivity
  is needed, accept `Ref<T>` or `MaybeRefOrGetter<T>` and unwrap explicitly.

---

## Scenario: auth-dependent server-state composables

### 1. Scope / Trigger
- Trigger: a composable reads server state that only exists for authenticated
  users, such as image quota.
- Scope: composables that wrap authenticated API calls and expose shared UI
  state. Backend authorization remains authoritative.

### 2. Signatures
```ts
interface QuotaResponse {
  total: number;
  remaining: number;
}

export function useImageQuota(): {
  quota: Readonly<Ref<QuotaResponse | null>>;
  isLoading: Readonly<Ref<boolean>>;
  error: Readonly<Ref<Error | null>>;
  refresh: () => Promise<void>;
}
```

### 3. Contracts
- Watch `useAuth()` session state when the data depends on login status.
- Do not let a pre-login 401/network failure permanently poison logged-in UI
  state; becoming authenticated must trigger a refresh.
- For authenticated quota fetch failures, show the product default `{ total: 20,
  remaining: 20 }` as an optimistic display only.
- Successful refreshes must replace optimistic data with the server response.
- On logout, clear quota state and invalidate in-flight requests so old user
  data cannot overwrite the logged-out or next-user state.
- Do not call `fetch` directly; use the service layer (`services/api/*`).

### 4. Validation & Error Matrix
| Condition | Expected behavior |
|---|---|
| Initial load while unauthenticated | Quota remains `null`; no permanent `额度暂不可用` after later login |
| Session becomes authenticated | Composable refreshes quota automatically |
| Authenticated quota fetch fails | UI can show optimistic `剩余额度 20`; `error` still records the read failure |
| Later quota refresh succeeds | Server `{ total, remaining }` replaces optimistic fallback |
| User logs out with request in flight | In-flight result is ignored and quota is cleared |

### 5. Good/Base/Bad Cases
- Good: login flips `isAuthenticated` and quota refreshes without a page reload.
- Base: generation success calls `refresh()` so the server count replaces any
  optimistic value.
- Bad: module-level `requested = true` from an unauthenticated failure blocks
  every future logged-in refresh.

### 6. Tests Required
- Composable test: pre-login failure followed by authentication triggers a
  second fetch and fills quota.
- Composable test: authenticated fetch failure yields `{ total: 20, remaining: 20 }`.
- Composable test: successful refresh after fallback replaces remaining with the
  server value.
- Regression test: logout/in-flight requests cannot leak previous user quota.

### 7. Wrong vs Correct
#### Wrong
```ts
let requested = false;
if (!requested) void refresh();
```

#### Correct
```ts
watch([isAuthLoading, isAuthenticated], ([authLoading, authenticated]) => {
  if (authLoading) return;
  if (authenticated) void refresh();
  else clearQuotaAndInvalidateRequests();
}, { immediate: true });
```

---

## Module-level vs. instance-level state

By default, composables hold **per-call state** — calling `useImageGeneration()`
in two components gives two independent `isLoading` refs. This is
intentional.

For **shared state** across components (e.g., the global history list),
declare module-level refs **outside** the function:

```ts
// composables/useImageHistory.ts
import { ref } from 'vue';

const history = ref<ImageRecord[]>([]);  // module-level: shared across all callers
let initialized = false;

export function useImageHistory() {
  if (!initialized) {
    void loadFromIndexedDb();   // see services/storage/indexedDb.ts
    initialized = true;
  }
  return {
    history: readonly(history),
    add(rec: ImageRecord) { /* ... */ },
    remove(id: string) { /* ... */ },
  };
}
```

This pattern replaces Pinia for the MVP. Keep module-level state usage
**explicit and rare** — most composables should be per-instance.

---

## Lifecycle inside composables

- `onMounted`, `onUnmounted`, `watch`, `watchEffect` may be used inside a
  composable; they hook into the **calling component's** lifecycle.
- Always pair side-effect setup with cleanup
  (`onUnmounted(() => removeListener(...))`).
- If a composable is called outside `setup()` (e.g., from another
  composable that's called inside `setup()`), lifecycle hooks still work.
  But **don't call composables conditionally** — they must be called at
  the top of `setup()`.

---

## Forbidden patterns

- ❌ Naming a stateful function without a `use` prefix.
- ❌ Calling a composable inside `if`, `for`, or after an `await`. Same
  rule as React hooks: call at the top, every render.
- ❌ Calling `fetch` / `axios` directly inside a composable. Wrap a
  service in `services/api/`, then call the service.
- ❌ Mutating module-level refs from outside the composable's exported
  methods. Encapsulation matters.
- ❌ Returning raw `ref`s when callers shouldn't write. Use `readonly`.
- ❌ Using composables as a substitute for utility functions. If there's
  no reactive state, it's a util, not a composable — drop the `use`
  prefix and put it in `utils/`.
