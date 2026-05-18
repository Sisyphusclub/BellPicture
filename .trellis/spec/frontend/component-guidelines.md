# Vue Component Guidelines

> **Status**: Verified by the first `frontend/` implementation.

---

## SFC structure (always this order)

```vue
<script setup lang="ts">
// 1. Imports
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { useImageGeneration } from '@/composables/useImageGeneration';

// 2. Props / Emits / defineModel
interface Props {
  initialPrompt?: string;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  initialPrompt: '',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'generated', imageId: string): void;
}>();

// 3. Composables
const { generate, isLoading, error } = useImageGeneration();

// 4. Local state
const prompt = ref(props.initialPrompt);

// 5. Computed
const canSubmit = computed(() => !props.disabled && prompt.value.trim().length > 0);

// 6. Methods
async function handleSubmit(): Promise<void> {
  const result = await generate({ prompt: prompt.value });
  ElMessage.success('图片已生成并保存到历史记录。');
  emit('generated', result.record.id);
}

// 7. Lifecycle (rare; prefer composables for side effects)
</script>

<template>
  <form class="generator" @submit.prevent="handleSubmit">
    <label>
      <span class="field-label">提示词</span>
      <textarea v-model="prompt" class="textarea-field" />
    </label>
    <p v-if="error" class="error">{{ error.message }}</p>
    <button type="submit" class="claude-button claude-button--primary" :disabled="!canSubmit">
      生成图片
    </button>
  </form>
</template>

<style scoped>
.generator { display: grid; gap: var(--space-md); }
.error { color: var(--color-danger); }
</style>
```

### Required conventions

- **`<script setup lang="ts">` only.** No Options API. No plain JS components.
- **Props typed via `defineProps<Interface>()`.** Use `withDefaults` for
  defaults; never rely on undefined-as-default in template.
- **Emits typed via the call-signature form** (`defineEmits<{ (e: 'x', p: T): void }>()`).
- **`<style scoped>`** by default. Global styles only in `src/styles/`.
- **One component per file.** No nested component definitions.

---

## Props

- Treat props as **read-only**. Never mutate (`props.x = ...` is a runtime warning).
- For two-way binding, use `defineModel<T>()` (Vue 3.4+).
- Boolean props default to `false`. Don't ship `disabled = true` defaults.
- Pass primitives where possible. If you must pass an object, document
  whether the parent owns the reference (default: yes — child does not mutate).

---

## Hybrid UI and Element Plus usage

### Design Decision: Hybrid Claude UI

**Context**: The product UI needs Claude-style warm surfaces, serif display
headlines, coral CTAs, and dark navy status panels. Element Plus is useful for
utility primitives, but its default visual system fights those product surfaces.

**Options Considered**:
1. Theme Element Plus globally.
2. Build every primitive from scratch.
3. Use custom Claude-styled product surfaces plus Element Plus utilities.

**Decision**: Use custom SFCs and CSS tokens for product-defining UI, and use
Element Plus only for low-risk utilities such as `ElMessage`, `ElDialog`, and
form validation helpers when needed.

**Example**:
```ts
import { ElMessage } from 'element-plus';

ElMessage.success('图片已生成并保存到历史记录。');
```

**Extensibility**: If future screens need tables, complex dialogs, or date
pickers, prefer Element Plus utilities there. Do not use Element Plus as the
primary source of layout, cards, CTA buttons, upload zones, galleries, or hero
surfaces.

### Element Plus rules

- Do not register Element Plus globally with `app.use(ElementPlus)`.
- Import utility APIs/components explicitly from `element-plus`.
- Import `element-plus/dist/index.css` once in `src/main.ts`.
- For toast messages: `ElMessage.success(...)`, `ElMessage.error(...)`.
  Never `alert()`.
- Product surfaces use project classes and tokens from `src/styles/`, not
  `el-card`, `el-button`, or `el-upload` as their primary UI.

---

## User-facing language

### Convention: Simplified Chinese UI copy

**What**: All user-facing page copy is Simplified Chinese by default: visible
text, labels, buttons, empty states, validation messages, status messages,
toasts, `aria-label`s, image `alt` text, `index.html` metadata, and frontend
README usage guidance.

**Why**: The product targets a Chinese UI. Leaving backend/browser/runtime
English errors or default English placeholders in the page creates an
inconsistent experience and makes future screens drift.

**Example**:
```ts
ElMessage.error('生成失败，请稍后重试。');
```

**Allowed English**: Code identifiers, route paths, API fields, env keys, model
names (`gpt-image-2`), brand/product names (`Ref2Image Studio`), and technical
terms (`Vue`, `Vite`, `IndexedDB`, `localStorage`, `PNG/JPEG/WebP`) may remain
English where translating would reduce clarity.

### Convention: Wrap native fetch failures at the service layer

**What**: Components and composables must NOT render `Error.message` straight
from a native `fetch` rejection (e.g. `TypeError: Failed to fetch`, DNS,
CORS, abort). Such errors must be caught at the `services/api/httpClient.ts`
boundary and rethrown as `ImageApiError(0, 'NETWORK_ERROR', '<Simplified
Chinese fallback>')`. Every API helper (`historyApi`, `imagesApi`, …) routes
through `authedFetch`, which performs the wrap. Composables therefore receive
an `ImageApiError` whose `.message` is already user-ready Chinese and can
bind it directly to the template.

**Why**: Native fetch failures are `Error` subclasses, so the common pattern
`err instanceof Error ? err : new Error('<中文兜底>')` short-circuits and leaks
English strings to the page. This silently violated the Simplified-Chinese
contract on `/history` once already; wrapping at the single chokepoint
prevents every future API caller from re-tripping it.

**Example** (the chokepoint):
```ts
// services/api/httpClient.ts
const NETWORK_ERROR_MESSAGE = '无法连接到服务器，请检查网络或稍后重试。';

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, { credentials: 'include', ...init });
  } catch (cause) {
    throw new ImageApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE, undefined, {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
  }
  if (response.status === 401 && onUnauthorized) onUnauthorized();
  return response;
}
```

**Caller-side rule**: In composables, render `err instanceof ImageApiError`
messages directly; reserve the `new Error('<中文兜底>')` fallback for the
truly-unknown non-Error path as defense-in-depth, not as the primary i18n
mechanism.

**Cross-layer note**: Any code that builds a user-facing message from an
`ImageApiError.code` (e.g. `useImageGeneration.messageForImageApiError`)
must include an explicit `case 'NETWORK_ERROR'` that returns `error.message`
verbatim. Falling into a `status === N` default branch will render
`状态码 0` and obscure the network failure.

---

## Composition rules

- Components consume composables; **components do not consume `services/`
  directly**. Wrap any service in a composable first.
- A component should be < ~200 lines including template. If it's growing,
  extract child components or move logic into a composable.
- Side effects (fetch, storage I/O, listeners) live in composables, not
  in component lifecycle hooks. The component just calls
  `const { ... } = useThing()`.

---

## Modal accessibility contract

### Convention: Page-level modal a11y baseline

**What**: Every custom (non-`ElDialog`) modal/overlay component must implement
all six behaviors below. Missing any one of them is a review-blocking defect.

1. **`role="dialog"`** on the focusable surface and **`aria-modal="true"`**.
2. **`aria-labelledby`** pointing at the visible title node (or `aria-label`
   if there is no visible title).
3. **Backdrop click closes** the modal — bind on the backdrop element with
   `@click.self="close"` so inside-panel clicks don't bubble out.
4. **Escape key closes** the modal — register a `keydown` listener on
   `document` while open, and remove it on close / `onBeforeUnmount`.
5. **Initial focus** moves into the panel when the modal opens (the close
   button is the simplest target). Use `await nextTick()` before focusing
   so the element exists in the DOM.
6. **Close button** has a Simplified-Chinese `aria-label` (e.g.
   `aria-label="关闭图片详情"`); icon-only buttons must never ship without one.

**Why**: We hit this twice in a row — the original `/history` detail modal
and the new `RecentCreationDetailModal` both shipped without Esc and without
initial focus, and check caught the second one. Keyboard users were locked
into clicking the close icon, and screen readers had no announced
boundary.

**Example** (shape, not the full SFC):
```vue
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const closeBtn = ref<HTMLButtonElement | null>(null);

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close');
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown);
      await nextTick();
      closeBtn.value?.focus();
    } else {
      document.removeEventListener('keydown', onKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-modal-title"
      class="modal-panel"
    >
      <h2 id="my-modal-title">详情</h2>
      <button
        ref="closeBtn"
        type="button"
        aria-label="关闭详情"
        class="modal-close"
        @click="emit('close')"
      >
        ×
      </button>
      <!-- body -->
    </div>
  </div>
</template>
```

**Related**: When `ElDialog` would do, prefer it — it implements the contract
for free. Custom modals are only justified when the product surface needs
visuals/transitions that `ElDialog` can't deliver cleanly (see the Hybrid
Claude UI decision above).

### Convention: Composer-like popup surfaces

**What**: Modal, dialog, popover, dropdown, and popup-contained preview surfaces
must use the home composer visual vocabulary: warm off-white background, subtle
hairline border, generous radius, and no `box-shadow`. Avoid decorative
`backdrop-filter` / glass blur on popup surfaces; popup-contained images,
labels, and hint pills should also avoid shadows.

**Why**: Popup chrome should feel like the input composer, not like a separate
floating SaaS layer. Drop shadows and glass blur made recent detail, history,
login, and ratio-picker popups visually drift from the product's restrained
workstation style.

**Example**:
```vue
<template>
  <div class="detail-backdrop" @click.self="emit('close')">
    <article class="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <h2 id="detail-title">图片详情</h2>
    </article>
  </div>
</template>

<style scoped>
.detail-backdrop {
  background: oklch(95.5% 0.008 86deg / 0.72);
}

.detail-panel {
  border: 1px solid var(--color-hairline);
  border-radius: 28px;
  background: oklch(99.1% 0.004 88deg / 0.96);
  box-shadow: none;
}
</style>
```

**Related**: Element Plus dialogs are teleported outside the component subtree,
so scoped overrides for `.el-dialog` must use a reliable global hook (for
example `:global(.login-modal.el-dialog)`) and should set `box-shadow: none` on
the actual rendered dialog.

---

## Forbidden patterns

- ❌ Options API (`export default { data() {...} }`).
- ❌ Mixins.
- ❌ `v-html` with user-provided content (XSS). If absolutely needed,
  sanitize at the service layer.
- ❌ Inline styles for anything beyond one-off positioning. Use `<style scoped>`.
- ❌ `any` in props/emits.
- ❌ New English user-facing copy unless it is an allowed brand, model,
  route/API/env key, or technical term.
- ❌ Importing from `services/` inside components or views; go through a
  composable.
- ❌ Calling `fetch` / `axios` inside a component.
- ❌ Reaching into another component via `ref` + `expose` to mutate its
  internals. Communicate via props/emits or a shared composable.
- ❌ Watching props to derive new state — use `computed` instead. (Watchers
  are for side effects, not derivation.)
