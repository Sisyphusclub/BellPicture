<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useResponsiveMasonryColumnCount } from '@/composables/useResponsiveMasonryColumnCount';
import type { HistoryEntry } from '@/types/image';

interface Props {
  entries: HistoryEntry[];
  canDelete?: boolean;
  deletingId?: string | null;
}

interface MasonryColumn {
  id: string;
  entries: HistoryEntry[];
}

const props = withDefaults(defineProps<Props>(), {
  canDelete: false,
  deletingId: null,
});

const emit = defineEmits<{
  (e: 'select', entry: HistoryEntry): void;
  (e: 'delete', entry: HistoryEntry): void;
}>();

const { columnCount } = useResponsiveMasonryColumnCount();
const confirmingDeleteId = ref<string | null>(null);

const visibleEntries = computed(() => props.entries.slice(0, 40));
const masonryColumns = computed(() =>
  distributeMasonryColumns(visibleEntries.value, columnCount.value),
);

function distributeMasonryColumns(
  entries: HistoryEntry[],
  targetColumnCount: number,
): MasonryColumn[] {
  const safeColumnCount = Math.max(1, targetColumnCount);
  const columns: MasonryColumn[] = Array.from({ length: safeColumnCount }, (_value, index) => ({
    id: `masonry-column-${index + 1}`,
    entries: [],
  }));
  const columnScores = Array.from({ length: safeColumnCount }, () => 0);

  entries.forEach((entry, index) => {
    const targetIndex = index < safeColumnCount ? index : shortestColumnIndex(columnScores);
    const column = columns[targetIndex];
    if (!column) return;

    column.entries.push(entry);
    columnScores[targetIndex] = (columnScores[targetIndex] ?? 0) + estimateEntryHeight(entry);
  });

  return columns;
}

function shortestColumnIndex(scores: number[]): number {
  let shortestIndex = 0;
  let shortestScore = scores[0] ?? 0;

  for (let index = 1; index < scores.length; index += 1) {
    const score = scores[index] ?? 0;
    if (score < shortestScore) {
      shortestIndex = index;
      shortestScore = score;
    }
  }

  return shortestIndex;
}

function estimateEntryHeight(entry: HistoryEntry): number {
  const { width, height } = entry.record;
  if (width <= 0 || height <= 0) return 1;
  return height / width;
}

function handleDeleteClick(entry: HistoryEntry): void {
  const id = entry.record.id;
  if (props.deletingId === id) return;
  if (confirmingDeleteId.value !== id) {
    confirmingDeleteId.value = id;
    return;
  }
  confirmingDeleteId.value = null;
  emit('delete', entry);
}

watch(
  () => [props.entries, props.deletingId] as const,
  () => {
    if (props.deletingId !== null) {
      confirmingDeleteId.value = null;
      return;
    }
    if (!props.entries.some((entry) => entry.record.id === confirmingDeleteId.value)) {
      confirmingDeleteId.value = null;
    }
  },
);
</script>

<template>
  <section class="recent-creations" aria-labelledby="recent-creations-title">
    <div class="recent-creations__header">
      <h2 id="recent-creations-title">画廊</h2>
      <p>从画廊中预览灵感，点击图片查看提示词细节。</p>
    </div>

    <div
      v-if="visibleEntries.length > 0"
      class="recent-creations__masonry"
      aria-label="最近生成图片"
    >
      <div v-for="column in masonryColumns" :key="column.id" class="recent-creations__column">
        <article
          v-for="entry in column.entries"
          :key="entry.record.id"
          class="recent-card"
          :class="{ 'recent-card--confirm-delete': confirmingDeleteId === entry.record.id }"
        >
          <button
            type="button"
            class="recent-card__button image-surface"
            :aria-label="`查看图片详情：${entry.record.prompt}`"
            @click="emit('select', entry)"
          >
            <img
              :src="entry.imageUrl"
              alt="最近生成图片预览"
              loading="lazy"
              decoding="async"
              :width="entry.record.width"
              :height="entry.record.height"
            />
            <span class="recent-card__shade" aria-hidden="true" />
            <span class="recent-card__meta">
              <strong>{{ entry.record.prompt }}</strong>
              <span>{{ entry.record.width }} × {{ entry.record.height }}</span>
            </span>
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="recent-card__delete"
            :disabled="deletingId === entry.record.id"
            :aria-label="
              confirmingDeleteId === entry.record.id
                ? `确认从画廊删除：${entry.record.prompt}`
                : `从画廊删除：${entry.record.prompt}`
            "
            @click.stop="handleDeleteClick(entry)"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            <span>{{
              deletingId === entry.record.id
                ? '删除中'
                : confirmingDeleteId === entry.record.id
                  ? '确认删除'
                  : '删除'
            }}</span>
          </button>
        </article>
      </div>
    </div>

    <div v-else class="recent-creations__empty">
      <span aria-hidden="true">✦</span>
      <h3>画廊还是空的</h3>
      <p>开启公开后生成图片，它们会自动出现在这里。</p>
    </div>
  </section>
</template>

<style scoped>
.recent-creations {
  width: min(100% - var(--space-xxl), var(--content-width-narrow));
  margin: 62px auto 120px;
}

.recent-creations__header {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-bottom: 28px;
  text-align: center;
}

.recent-creations__header h2 {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: var(--text-section-title-size);
  font-weight: var(--font-weight-title);
  letter-spacing: -0.03em;
  line-height: 1.12;
}

.recent-creations__header p:last-child {
  max-width: 420px;
  margin: 0;
  color: var(--color-muted);
  font-size: var(--text-label-size);
  line-height: 1.7;
}

.recent-creations__masonry {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
  gap: var(--space-sm);
}

.recent-creations__column {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--space-sm);
}

.recent-card {
  position: relative;
  width: 100%;
  content-visibility: auto;
  contain-intrinsic-size: 260px 340px;
}

.recent-card__button {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border-radius: calc(var(--radius-image) - 2px);
  box-shadow: var(--shadow-soft);
  cursor: pointer;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;
}

.recent-card__button:hover {
  box-shadow: var(--shadow-surface);
  transform: translateY(-2px);
}

.recent-card__button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
  box-shadow: var(--shadow-surface);
}

.recent-card__button img {
  display: block;
  width: 100%;
  height: auto;
}

.recent-card__shade {
  position: absolute;
  inset: auto 0 0;
  height: 44%;
  background: linear-gradient(to top, rgba(22, 20, 18, 0.72), rgba(22, 20, 18, 0));
  opacity: 0;
  transition: opacity 160ms ease;
}

.recent-card__meta {
  position: absolute;
  right: 10px;
  bottom: 10px;
  left: 10px;
  display: grid;
  gap: 3px;
  color: var(--color-on-dark);
  opacity: 0;
  text-align: left;
  transform: translateY(6px);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.recent-card__meta strong {
  overflow: hidden;
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-card__meta span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
}

.recent-card__button:hover .recent-card__shade,
.recent-card__button:focus-visible .recent-card__shade,
.recent-card__button:hover .recent-card__meta,
.recent-card__button:focus-visible .recent-card__meta {
  opacity: 1;
  transform: translateY(0);
}

.recent-card__delete {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: var(--radius-pill);
  background: rgba(32, 28, 26, 0.78);
  color: var(--color-on-dark);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  opacity: 0;
  padding: 0 9px;
  transform: translateY(-4px);
  transition:
    background-color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
}

.recent-card__delete svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.recent-card:hover .recent-card__delete,
.recent-card--confirm-delete .recent-card__delete,
.recent-card__delete:focus-visible {
  opacity: 1;
  transform: translateY(0);
}

.recent-card__delete:not(:disabled):hover {
  background: rgba(136, 45, 39, 0.9);
}

.recent-card--confirm-delete .recent-card__delete {
  background: rgba(136, 45, 39, 0.92);
}

.recent-card__delete:disabled {
  cursor: wait;
  opacity: 0.8;
}

.recent-card__delete:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.recent-creations__empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  gap: var(--space-xs);
  border: 1px dashed var(--color-hairline);
  border-radius: var(--radius-panel);
  background: var(--color-surface-card);
  color: var(--color-muted);
  text-align: center;
}

.recent-creations__empty span {
  color: var(--color-accent);
  font-size: 24px;
}

.recent-creations__empty h3,
.recent-creations__empty p {
  margin: 0;
}

.recent-creations__empty h3 {
  color: var(--color-ink);
  font-size: 16px;
}

.recent-creations__empty p {
  font-size: 13px;
}

@media (max-width: 860px) {
  .recent-creations {
    width: min(100% - 32px, 960px);
    margin-top: 44px;
  }

  .recent-creations__masonry {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .recent-creations__masonry {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recent-card__delete {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
