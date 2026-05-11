# State Management

> **Status**: Planning version. **MVP uses composables only — no Pinia, no
> Vuex.** This is an explicit decision, not an oversight.

---

## State categories

| Category | Where it lives | Example |
|---|---|---|
| Component-local | `ref`/`reactive` inside `<script setup>` | The current input value of a form field |
| Cross-component reactive | Module-level `ref` inside a composable (see below) | The list of generated images shown in the gallery |
| Server / async | A composable that wraps a service call | "Is the generation request currently in flight?" |
| Persistent (durable) | IndexedDB (blobs) + localStorage (metadata) | The user's image history across page reloads |
| Route | `vue-router` query/params | The currently-open history entry id |

There is **no global store object**. Shared state is co-located with the
composable that owns it.

---

## Cross-component shared state pattern

```ts
// composables/useImageHistory.ts
import { ref, readonly } from 'vue';
import * as historyStore from '@/services/storage/indexedDb';
import * as metaStore from '@/services/storage/localStorageMeta';
import type { ImageRecord } from '@/types/image';

const records = ref<ImageRecord[]>([]);  // module-level → shared
let hydrated = false;

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  records.value = await metaStore.listAll();
}

export function useImageHistory() {
  void hydrate();   // safe to call repeatedly; idempotent

  async function add(rec: ImageRecord, blob: Blob) {
    await historyStore.putBlob(rec.id, blob);
    await metaStore.put(rec);
    records.value = [rec, ...records.value];
  }

  async function remove(id: string) {
    await historyStore.deleteBlob(id);
    await metaStore.remove(id);
    records.value = records.value.filter((r) => r.id !== id);
  }

  return {
    records: readonly(records),
    add,
    remove,
  };
}
```

Two callers share `records` because the `ref` is declared at module scope.
This is the **only** way to share state in this project; no other singleton
pattern is permitted.

---

## Persistent storage layout

### IndexedDB (`services/storage/indexedDb.ts`)

- Database: `ref2image-studio`
- Object store: `images`
  - Key: `id` (UUID string, also the metadata key)
  - Value: `Blob` (PNG/JPEG/WebP from the backend)
- Why IndexedDB: localStorage cannot store binary efficiently; quota is
  too small for image data. IndexedDB handles megabyte-sized blobs.

### localStorage (`services/storage/localStorageMeta.ts`)

- Key: `ref2image:history` (single JSON array)
- Value: `ImageRecord[]` — small per-record metadata
  (`id`, `createdAt`, `prompt`, `model`, `referenceId?`, `width`, `height`)
- Why split: localStorage is synchronous and easy to read on app boot;
  metadata is small enough to fit. Only the heavy blobs go to IndexedDB.
- **Versioning**: include a `schemaVersion: 1` at the top level of the
  JSON. Any breaking change bumps the version and provides a migration.

---

## Anti-patterns specifically forbidden in this project

- ❌ **Pinia / Vuex / a global event bus.** If the next feature genuinely
  needs Pinia, that's a PRD-level conversation, not a quiet add.
- ❌ **`provide` / `inject` as a global state mechanism.** Allowed for
  legitimate dependency injection (e.g., a theme token), forbidden as a
  store substitute.
- ❌ **Persisting state to localStorage from arbitrary components.** All
  writes go through `services/storage/*`.
- ❌ **Storing blobs in localStorage.** Use IndexedDB.
- ❌ **Watchers that write back to the source they watch** (infinite-loop
  hazard). If you find yourself doing this, use `computed` instead.
- ❌ **Caching server data in module-level refs without a refresh path.**
  If a composable holds remote data, it must expose a `refresh()` method.

---

## When this file changes

If the team decides to add Pinia (e.g., feature growth makes composable
state-sharing unwieldy), update this file **first** with the migration
plan and the rule for what belongs in a Pinia store vs. a composable.
Otherwise the codebase ends up with two competing patterns.
