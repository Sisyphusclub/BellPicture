<script setup lang="ts">
interface Props {
  message: string;
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
});
</script>

<template>
  <aside class="status-panel" aria-live="polite">
    <div class="status-panel__header">
      <span
        class="status-panel__dot"
        :class="{ 'status-panel__dot--active': isLoading }"
        aria-hidden="true"
      />
      <span>{{ isLoading ? '工作台正在生成' : '工作台状态' }}</span>
    </div>
    <p>{{ message }}</p>
    <div class="status-panel__code" aria-hidden="true">
      <span>ref2image.generate()</span>
      <span>模式：提示词 + 可选参考图</span>
      <span>历史：本地 IndexedDB</span>
    </div>
    <div v-if="isLoading" class="status-panel__progress" aria-hidden="true">
      <span />
    </div>
  </aside>
</template>

<style scoped>
.status-panel {
  display: grid;
  gap: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  padding: var(--space-lg);
}

.status-panel__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-on-dark);
  font-weight: 500;
}

.status-panel__dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-muted-soft);
}

.status-panel__dot--active {
  background: var(--color-primary);
  box-shadow: 0 0 0 6px rgba(204, 120, 92, 0.18);
}

.status-panel p {
  margin: 0;
  color: var(--color-on-dark-soft);
}

.status-panel__code {
  display: grid;
  gap: var(--space-xs);
  overflow-x: auto;
  border-radius: var(--radius-md);
  background: var(--color-surface-dark-soft);
  color: var(--color-on-dark-soft);
  font-family: var(--font-code);
  font-size: 13px;
  padding: var(--space-md);
  white-space: nowrap;
}

.status-panel__progress {
  overflow: hidden;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-dark-elevated);
}

.status-panel__progress span {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}
</style>
