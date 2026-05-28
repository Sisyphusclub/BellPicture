<script setup lang="ts">
import { computed } from 'vue';

import type { HistoryEntry } from '@/types/image';
import { formatBytes, formatClockTime } from '@/utils/format';

interface Props {
  entries: HistoryEntry[];
}

interface DateGroup {
  key: string;
  label: string;
  entries: HistoryEntry[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'expand', entry: HistoryEntry): void;
  (e: 'remove', entry: HistoryEntry): void;
}>();

const groupedEntries = computed<DateGroup[]>(() => {
  const groups = new Map<string, DateGroup>();
  const sortedEntries = [...props.entries].sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt));

  for (const entry of sortedEntries) {
    const key = dateGroupKey(entry.record.createdAt);
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }
    groups.set(key, {
      key,
      label: dateGroupLabel(entry.record.createdAt),
      entries: [entry],
    });
  }

  return Array.from(groups.values());
});

function fileSizeLabel(entry: HistoryEntry): string {
  return entry.size === undefined ? '本地缓存' : formatBytes(entry.size);
}

function dateGroupKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dateGroupLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function assetMetaLabel(entry: HistoryEntry): string {
  return [
    formatClockTime(entry.record.createdAt),
    entry.record.aspectRatio ?? '智能比例',
    `${entry.record.width} × ${entry.record.height}`,
    fileSizeLabel(entry),
  ].join(' · ');
}

function publicationLabel(entry: HistoryEntry): string {
  return entry.record.isPublic ? '公开' : '私有';
}
</script>

<template>
  <div v-if="entries.length > 0" class="history-grid" aria-label="资产列表">
    <section v-for="group in groupedEntries" :key="group.key" class="history-group">
      <header class="history-group__header">
        <h2>{{ group.label }}</h2>
        <span>{{ group.entries.length }} 项</span>
      </header>

      <div class="history-group__assets">
        <article
          v-for="entry in group.entries"
          :key="entry.record.id"
          class="history-tile"
        >
          <div class="history-tile__preview">
            <button
              type="button"
              class="history-tile__thumb image-surface"
              :aria-label="`查看资产详情：${entry.record.prompt}`"
              @click="emit('expand', entry)"
            >
              <img
                :src="entry.imageUrl"
                alt="生成资产预览"
                loading="lazy"
                decoding="async"
                :width="entry.record.width"
                :height="entry.record.height"
              />
              <span
                class="history-tile__badge"
                :class="{ 'history-tile__badge--published': entry.record.isPublic }"
              >
                {{ publicationLabel(entry) }}
              </span>
            </button>
            <button
              type="button"
              class="history-tile__remove"
              :aria-label="`删除资产：${entry.record.prompt}`"
              @click="emit('remove', entry)"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
                <path d="m9 11 .4 6" />
                <path d="m15 11-.4 6" />
                <path d="M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </div>

          <p class="history-tile__meta">{{ assetMetaLabel(entry) }}</p>
        </article>
      </div>
    </section>
  </div>
  <div v-else class="history-empty">
    <p>暂无符合条件的资产。</p>
  </div>
</template>

<style scoped>
.history-grid {
  display: grid;
  gap: var(--space-xl);
}

.history-group {
  display: grid;
  gap: var(--space-sm);
}

.history-group__header {
  display: grid;
  grid-template-columns: auto minmax(40px, 1fr) auto;
  align-items: center;
  gap: 12px;
  color: var(--color-muted);
}

.history-group__header::after {
  content: '';
  height: 1px;
  background: var(--color-hairline-soft);
}

.history-group__header h2 {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 750;
  letter-spacing: 0.01em;
}

.history-group__header span {
  font-size: var(--text-label-size);
  font-weight: 700;
}

.history-group__assets {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 18px;
}

.history-tile {
  position: relative;
  width: 196px;
  content-visibility: auto;
  contain-intrinsic-size: 196px 236px;
}

.history-tile__preview {
  position: relative;
}

.history-tile__thumb {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 1 / 1;
  place-items: center;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-hairline-soft);
  border-radius: 10px;
  background: var(--color-surface-card-solid);
  box-shadow: none;
  cursor: pointer;
}

.history-tile__thumb:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.history-tile__thumb img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  border-radius: inherit;
  background: oklch(96.5% 0.006 88deg);
}

.history-tile__badge {
  position: absolute;
  top: 7px;
  right: 7px;
  display: inline-flex;
  min-height: 20px;
  align-items: center;
  border: 1px solid oklch(100% 0 0 / 0.32);
  border-radius: var(--radius-pill);
  background: oklch(18% 0.01 88deg / 0.42);
  color: oklch(99% 0.004 88deg);
  font-size: 11px;
  font-weight: 760;
  padding: 0 7px;
  white-space: nowrap;
}

.history-tile__badge--published {
  background: oklch(35% 0.045 145deg / 0.5);
}

.history-tile__remove {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: oklch(50% 0.006 88deg / 0.78);
  color: oklch(99% 0.004 88deg);
  cursor: pointer;
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 160ms ease-out,
    transform 160ms ease-out,
    background 160ms ease-out;
}

.history-tile__preview:hover .history-tile__remove,
.history-tile__preview:focus-within .history-tile__remove {
  opacity: 1;
  transform: translateY(0);
}

.history-tile__remove:hover {
  background: oklch(42% 0.02 88deg / 0.9);
}

.history-tile__remove:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.history-tile__meta {
  overflow: hidden;
  margin: 6px 0 0;
  color: var(--color-muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  border: 1px solid var(--color-hairline);
  border-radius: 22px;
  background: oklch(99.1% 0.004 88deg / 0.82);
  color: var(--color-muted);
}

.history-empty p {
  margin: 0;
}

@media (max-width: 720px) {
  .history-group__assets {
    gap: 14px;
  }

  .history-tile {
    width: calc(50% - 7px);
  }
}

@media (max-width: 420px) {
  .history-tile {
    width: 100%;
  }
}
</style>
