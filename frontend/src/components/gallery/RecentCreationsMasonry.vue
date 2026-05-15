<script setup lang="ts">
import { computed } from 'vue';

import type { HistoryEntry } from '@/types/image';

interface Props {
  entries: HistoryEntry[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', entry: HistoryEntry): void;
}>();

const visibleEntries = computed(() => props.entries.slice(0, 40));
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
      <article v-for="entry in visibleEntries" :key="entry.record.id" class="recent-card">
        <button
          type="button"
          class="recent-card__button"
          :aria-label="`查看图片详情：${entry.record.prompt}`"
          @click="emit('select', entry)"
        >
          <img :src="entry.imageUrl" alt="最近生成图片预览" />
          <span class="recent-card__shade" aria-hidden="true" />
          <span class="recent-card__meta">
            <strong>{{ entry.record.prompt }}</strong>
            <span>{{ entry.record.width }} × {{ entry.record.height }}</span>
          </span>
        </button>
      </article>
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
  width: min(100% - 48px, 980px);
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
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.recent-creations__header p:last-child {
  max-width: 420px;
  margin: 0;
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.7;
}

.recent-creations__masonry {
  column-count: 4;
  column-gap: 12px;
}

.recent-card {
  display: inline-block;
  width: 100%;
  margin: 0 0 12px;
  break-inside: avoid;
}

.recent-card__button {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  padding: 0;
  border: 1px solid rgba(44, 39, 33, 0.08);
  border-radius: 10px;
  background: var(--color-surface-card-solid);
  box-shadow: 0 8px 20px rgba(45, 38, 30, 0.08);
  cursor: pointer;
}

.recent-card__button:hover,
.recent-card__button:focus-visible {
  outline: none;
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(45, 38, 30, 0.14);
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
  color: white;
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

.recent-creations__empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  gap: 8px;
  border: 1px dashed rgba(44, 39, 33, 0.14);
  border-radius: 24px;
  background: oklch(99% 0.004 88deg / 0.68);
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
    width: min(100% - 32px, 980px);
    margin-top: 44px;
  }

  .recent-creations__masonry {
    column-count: 3;
  }
}

@media (max-width: 560px) {
  .recent-creations__masonry {
    column-count: 2;
  }
}
</style>
