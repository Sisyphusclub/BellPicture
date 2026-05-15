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
| `prompt`, `model`, `reference_id?`, `aspect_ratio?` | text                         | Provided by the request                                                       |
| `filename`, `mime`, `width`, `height`               | text/int                     | Image metadata                                                                |
| `elapsed_ms?`                                       | int                          | Generation wall clock                                                         |
| `is_public`                                         | int boolean                  | Whether the generated record is shown in the homepage gallery                 |
| `created_at`                                        | int (ms)                     | Sort key                                                                      |

Indexes: `(user_id, created_at)` and `(batch_id)`.

`GET /api/history` returns the current user's records sorted newest-first,
including the required `isPublic` boolean. Image management/history consumes the
full list. The homepage gallery filters the same shared `entries` to
`entry.record.isPublic === true`; do not create a second gallery-only store.
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
