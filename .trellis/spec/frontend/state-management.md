# State Management

> **Status**: Updated for task `05-13-history-upload-to-backend`. **History is
> now backend-sourced.** IndexedDB + localStorage history modules were removed;
> `useImageHistory` hydrates from `GET /api/history`. **MVP still uses
> composables only — no Pinia, no Vuex.** This is an explicit decision, not an
> oversight.

---

## State categories

| Category                 | Where it lives                                                                  | Example                                           |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| Component-local          | `ref`/`reactive` inside `<script setup>`                                        | The current input value of a form field           |
| Cross-component reactive | Module-level `ref` inside a composable (see below)                              | The list of generated images shown in the gallery |
| Server / async           | A composable that wraps a service call                                          | "Is the generation request currently in flight?"  |
| Persistent (durable)     | **Backend SQLite** via `/api/history` (records) + `OUTPUT_DIR` files (binaries) | The user's image history across devices           |
| Route                    | `vue-router` query/params                                                       | The currently-open history entry id               |

There is **no global store object**. Shared state is co-located with the
composable that owns it.

---

## Cross-component shared state pattern

```ts
// composables/useImageHistory.ts (sketch — see source for the full version)
import { ref, readonly, computed } from "vue";
import { fetchHistory, deleteHistoryBatch } from "@/services/api/historyApi";
import { buildApiUrl } from "@/services/api/imagesApi";
import type { ImageRecord, HistoryEntry } from "@/types/image";

const records = ref<ImageRecord[]>([]); // module-level → shared
let hydrated = false;

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  records.value = await fetchHistory();
}

const entries = computed<HistoryEntry[]>(() =>
  records.value.map((record) => ({
    record,
    imageUrl: buildApiUrl(`/api/outputs/${record.id}`),
  })),
);

export function useImageHistory() {
  void hydrate(); // idempotent

  function add(rec: ImageRecord) {
    // Backend already persisted the row during /api/images/generate.
    // The composable only keeps the local ref in sync so the UI updates instantly.
    records.value = [rec, ...records.value.filter((r) => r.id !== rec.id)];
    return entries.value[0]!;
  }

  async function removeBatch(batchId: string) {
    await deleteHistoryBatch(batchId);
    records.value = records.value.filter(
      (r) => (r.batchId ?? r.id) !== batchId,
    );
  }

  return {
    records: readonly(records),
    entries,
    add,
    removeBatch,
    refresh: async () => {
      hydrated = false;
      await hydrate();
    },
  };
}
```

Two callers share `records` because the `ref` is declared at module scope.
This is the **only** way to share state in this project; no other singleton
pattern is permitted.

---

## Persistent storage layout

### Backend SQLite — owned by `backend/src/db/schema.ts`

History records live in the `image_records` table:

| Column                                              | Type                         | Notes                                                                         |
| --------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `id`                                                | text PK                      | UUID with extension (e.g. `<uuid>.png`); also the filename under `OUTPUT_DIR` |
| `batch_id`                                          | text                         | Shared across every record in the same generate batch                         |
| `user_id`                                           | text FK → `user.id`, cascade | The owner                                                                     |
| `prompt`, `model`, `reference_id?`, `reference_ids?`, `aspect_ratio?` | text                         | Provided by the request; `reference_ids` is JSON text for up to 4 ids         |
| `filename`, `mime`, `width`, `height`               | text/int                     | Image metadata                                                                |
| `elapsed_ms?`                                       | int                          | Generation wall clock                                                         |
| `is_public`                                         | int boolean                  | Whether the generated record is shown in the homepage gallery                 |
| `created_at`                                        | int (ms)                     | Sort key                                                                      |

Indexes: `(user_id, created_at)` and `(batch_id)`.

`GET /api/history` returns the current user's records sorted newest-first,
including the required `isPublic` boolean. Image management/history consumes the
full owner-scoped list. The homepage gallery uses `usePublicGallery`, hydrated
from public `GET /api/history/public`, so it can show public records from every
account without exposing private history or delete permissions.
For image-to-image records, `ImageRecord.referenceIds` is the canonical
multi-reference snapshot. `ImageRecord.referenceId` remains as the first id for
legacy batches and older UI code. Regenerate flows must read `referenceIds`
first, fall back to `referenceId`, and pass the resulting ids through
`GenerateImageOptions.referenceIds` without re-uploading existing history
references.

Reference image composer state has two distinct operations:
- User add flows (file picker, drag-and-drop, paste) call `useFileUpload().selectFiles(files)` so repeated adds append to the current selection up to `MAX_REFERENCE_IMAGES`.
- Snapshot hydration flows (edit/regenerate pending generations or saved batches) call `replaceFiles(files)` or clear the local files before setting reused history ids, so stale references from the previous composer state are not mixed into the snapshot.

Regression tests for the generation view should cover both sides when touched:
repeated user adds submit every selected `referenceFiles`, while history
regeneration sends persisted `referenceIds` without re-uploading files.
`DELETE /api/history/batch/:batchId` and `/api/history/:id` remove rows but
leave `OUTPUT_DIR` files in place (file cleanup is PR3's responsibility once
files are per-user).

### Image binaries — `backend/tmp/outputs/<id>`

The frontend simply points `<img src>` at `${API_BASE_URL}/api/outputs/<id>`;
no client-side blob cache. As of PR2 the endpoint is **unauthenticated**;
PR3 will introduce per-user output directories with authed access.

### What was removed in PR2

- `frontend/src/services/storage/indexedDb.ts` — gone
- `frontend/src/services/storage/localStorageMeta.ts` — gone
- `frontend/src/services/storage/` directory — gone (no IndexedDB / localStorage history paths remain)
- Existing local history from PR1 sessions is **not migrated**; users see an empty list until they generate again

---

## Authenticated server-state hydration

Private server state must wait for auth before hydrating. A composable that reads an authenticated endpoint such as `GET /api/history` must observe `useAuth()` and only call the service after `isLoading === false` and `isAuthenticated === true`.

**Contract**:
- Auth loading: do not request private data and do not clear existing state yet.
- Authenticated: hydrate once, expose a `refresh()` path that can re-run the fetch.
- Anonymous: clear private in-memory state, clear hydration errors, reset the hydration guard, and do not call the private endpoint.
- Manual `refresh()` while anonymous: clear private state and return without network I/O.

**Why**: `authedFetch` opens the login modal on `401`. If anonymous page load hydrates private state, discovery/prompts/history routes can trigger a login modal without the user clicking “登录”. Public browsing must stay available; the login modal is user-initiated unless a protected action explicitly requires it.

**Example**:
```ts
export function useImageHistory() {
  const { isAuthenticated, isLoading } = useAuth();

  watch(
    [isLoading, isAuthenticated],
    ([authLoading, authenticated]) => {
      if (authLoading) return;
      if (authenticated) {
        void hydrate();
        return;
      }
      records.value = [];
      hydrateError.value = null;
      hydrated = false;
    },
    { immediate: true },
  );

  async function refresh(): Promise<void> {
    if (!isAuthenticated.value) {
      records.value = [];
      hydrateError.value = null;
      hydrated = false;
      return;
    }
    hydrated = false;
    await hydrate();
  }
}
```

**Required tests**:
- Anonymous mount: assert `fetch` is not called and exposed entries are empty.
- Authenticated mount: assert the private endpoint hydrates records.
- Anonymous `refresh()`: assert no network request and state is cleared.
- UI regression: mounting the app anonymously must not call `useAuthModal().open()`.

**Wrong vs correct**:
```ts
// Wrong: anonymous visitors hit /api/history and a 401 opens LoginModal.
export function useImageHistory() {
  void hydrate();
}

// Correct: private hydration is gated by loaded authenticated state.
if (!isAuthLoading.value && isAuthenticated.value) {
  void hydrate();
}
```

---

## Anti-patterns specifically forbidden in this project

- ❌ **Pinia / Vuex / a global event bus.** If the next feature genuinely
  needs Pinia, that's a PRD-level conversation, not a quiet add.
- ❌ **`provide` / `inject` as a global state mechanism.** Allowed for
  legitimate dependency injection (e.g., a theme token), forbidden as a
  store substitute.
- ❌ **Reintroducing IndexedDB / localStorage for history.** Backend is the
  source of truth; if offline support is wanted later, that's a deliberate
  spec change with a sync strategy, not an ad-hoc cache.
- ❌ **Watchers that write back to the source they watch** (infinite-loop
  hazard). If you find yourself doing this, use `computed` instead.
- ❌ **Caching server data in module-level refs without a refresh path.**
  If a composable holds remote data, it must expose a `refresh()` method.

---

## When this file changes

If the team decides to add Pinia (e.g., feature growth makes composable
state-sharing unwieldy), update this file **first** with the migration
plan and the rule for what belongs in a Pinia store vs. a composable.
Same applies if local caching of history is reintroduced — describe the
sync/conflict model here before adding code.
