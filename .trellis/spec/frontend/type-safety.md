# Frontend Type Safety

> **Status**: Planning version.

---

## TypeScript settings (non-negotiable)

`tsconfig.json` extends `@vue/tsconfig/tsconfig.dom.json` (or equivalent)
with:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`strict: true` is the floor, not the ceiling.

---

## Typing component APIs

- **Props**: `defineProps<Interface>()`. Don't use the runtime form
  (`defineProps({ x: { type: String } })`) — TS form gives full inference.
- **Emits**: `defineEmits<{ (e: 'foo', payload: T): void }>()`.
- **Refs to DOM nodes**: `const el = ref<HTMLDivElement | null>(null)`.
- **Refs to component instances**: `ref<InstanceType<typeof Child> | null>(null)`.

---

## Shared types live in `src/types/`

```ts
// src/types/image.ts
export interface ImageRecord {
  id: string;                // UUID, stable across IndexedDB + metadata stores
  createdAt: string;         // ISO 8601
  prompt: string;
  model: string;             // e.g., 'gpt-image-2'
  referenceId?: string;      // id of the reference image, if any
  width: number;
  height: number;
}

export interface GenerateRequest {
  prompt: string;
  referenceId?: string;
  /** Override default model. */
  model?: string;
}

export interface GenerateResponse {
  record: ImageRecord;
  /** Returned as a URL pointing at the backend's tmp/outputs file. */
  imageUrl: string;
}
```

Types describing the **wire format** between frontend and backend live
here so both sides of the boundary agree. (Backend re-declares them in
`backend/src/types/` — there is no shared package in MVP. Keep them in
sync manually; flag drift in PRs.)

---

## Validation at the boundary

The frontend uses fetch wrappers that return typed payloads, but the
runtime validity comes from the backend. The frontend should still:

- **Narrow `unknown` from `response.json()` before use.** Either with a
  small hand-written type guard or `zod` (preferred if added).
- **Never `as`-cast** an API response. `as` defeats type safety.
- **Validate localStorage reads**, since older versions may have written
  a different shape. The schemaVersion field gates this.

```ts
function isImageRecord(v: unknown): v is ImageRecord {
  return typeof v === 'object' && v !== null
    && typeof (v as any).id === 'string'
    && typeof (v as any).prompt === 'string'
    && typeof (v as any).createdAt === 'string';
}
```

(If the project later adopts `zod`, replace these guards with schemas.)

---

## Forbidden patterns

- ❌ `any`. ESLint blocks it. Use `unknown` and narrow.
- ❌ `as Foo` on values from `JSON.parse` / `response.json()` / localStorage.
  Validate, then narrow.
- ❌ `// @ts-ignore` / `// @ts-expect-error` without a one-line comment
  explaining why and a tracking TODO.
- ❌ Re-declaring the same type in multiple files. Put it in `src/types/`
  and import.
- ❌ Using `Object`, `Function`, `{}` as types. Use `unknown` /
  specific signatures / `Record<string, unknown>`.
- ❌ Type assertions to widen a value (`x as string`) when narrowing
  would work (`typeof x === 'string'`).
- ❌ Optional chaining as error suppression (`obj?.method?.()` to "make
  the error go away"). Address the nullability properly.
