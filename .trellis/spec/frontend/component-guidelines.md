# Vue Component Guidelines

> **Status**: Planning version.

---

## SFC structure (always this order)

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import { useImageGeneration } from '@/composables/useImageGeneration';
import type { GenerateRequest } from '@/types/image';

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
async function handleSubmit() {
  const id = await generate({ prompt: prompt.value });
  emit('generated', id);
}

// 7. Lifecycle (rare; prefer composables for side effects)
</script>

<template>
  <div class="generator">
    <el-input v-model="prompt" type="textarea" :rows="4" />
    <el-button :loading="isLoading" :disabled="!canSubmit" @click="handleSubmit">
      Generate
    </el-button>
    <p v-if="error" class="error">{{ error.message }}</p>
  </div>
</template>

<style scoped>
.generator { display: grid; gap: 12px; }
.error { color: var(--el-color-danger); }
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

## Element Plus usage

- Import components explicitly: `import { ElButton } from 'element-plus'`.
  Don't rely on global registration.
- Import only the styles you need (the project should configure
  `unplugin-element-plus` or import full `element-plus/dist/index.css`
  once in `main.ts` — pick one and stick with it).
- Use Element Plus components for forms, dialogs, tables, messages.
  Avoid hand-rolling alternatives that already exist in EP.
- For toast messages: `ElMessage.success(...)`, `ElMessage.error(...)`.
  Never `alert()`.

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

## Forbidden patterns

- ❌ Options API (`export default { data() {...} }`).
- ❌ Mixins.
- ❌ `v-html` with user-provided content (XSS). If absolutely needed,
  sanitize at the service layer.
- ❌ Inline styles for anything beyond one-off positioning. Use `<style scoped>`.
- ❌ `any` in props/emits.
- ❌ Calling `fetch` / `axios` inside a component.
- ❌ Reaching into another component via `ref` + `expose` to mutate its
  internals. Communicate via props/emits or a shared composable.
- ❌ Watching props to derive new state — use `computed` instead. (Watchers
  are for side effects, not derivation.)
