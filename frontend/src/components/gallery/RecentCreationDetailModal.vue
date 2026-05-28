<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

import type { HistoryEntry } from '@/types/image';
import { formatFullDateTime } from '@/utils/format';

interface Props {
  entry: HistoryEntry | null;
  canDelete?: boolean;
  isDeleting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canDelete: false,
  isDeleting: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'copy-prompt', entry: HistoryEntry): void;
  (e: 'delete', entry: HistoryEntry): void;
}>();

const closeButtonRef = ref<HTMLButtonElement | null>(null);

function requestClose(): void {
  emit('close');
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    requestClose();
  }
}

function handleCopyPrompt(): void {
  if (!props.entry) return;
  emit('copy-prompt', props.entry);
}

function handleDelete(): void {
  if (!props.entry || props.isDeleting) return;
  emit('delete', props.entry);
}

watch(
  () => props.entry,
  (next, prev) => {
    if (next && !prev) {
      document.addEventListener('keydown', handleKeydown);
      void nextTick(() => {
        closeButtonRef.value?.focus();
      });
    } else if (!next && prev) {
      document.removeEventListener('keydown', handleKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="entry" class="recent-detail" @click.self="requestClose">
      <article
        class="recent-detail__shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-detail-title"
        tabindex="-1"
      >
        <div class="recent-detail__stage" aria-label="图片预览">
          <img
            :src="entry.imageUrl"
            alt="选中的最近创作图片"
            decoding="async"
            :width="entry.record.width"
            :height="entry.record.height"
          />
        </div>

        <aside class="recent-detail__inspector" aria-label="提示词与操作">
          <button
            ref="closeButtonRef"
            type="button"
            class="recent-detail__close"
            aria-label="关闭图片详情"
            @click="requestClose"
          >
            ×
          </button>

          <section class="recent-detail__prompt-card" aria-labelledby="recent-detail-title">
            <header class="recent-detail__prompt-header">
              <h2 id="recent-detail-title">提示词</h2>
              <button
                type="button"
                class="recent-detail__copy"
                aria-label="复制提示词"
                @click="handleCopyPrompt"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16">
                  <path
                    d="M5.2 4.4V3.1c0-.7.5-1.2 1.2-1.2h6.1c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2h-1.3"
                  />
                  <rect width="8.5" height="8.5" x="2.3" y="5.6" rx="1.2" />
                </svg>
                <span>复制</span>
              </button>
            </header>
            <div class="recent-detail__prompt-scroll" tabindex="0" aria-label="提示词内容">
              <p class="recent-detail__prompt">{{ entry.record.prompt }}</p>
            </div>
          </section>

          <p class="recent-detail__meta" aria-label="图片元数据">
            <span>{{ entry.record.model }}</span>
            <span aria-hidden="true">·</span>
            <time :datetime="entry.record.createdAt">{{
              formatFullDateTime(entry.record.createdAt)
            }}</time>
          </p>

          <div class="recent-detail__actions" aria-label="图片操作">
            <a class="recent-detail__save" :href="entry.imageUrl" download aria-label="保存图片">
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="M10 3.2v8.3" />
                <path d="m6.8 8.4 3.2 3.2 3.2-3.2" />
                <path d="M4.2 14.8h11.6" />
              </svg>
              <span>保存</span>
            </a>
            <button
              type="button"
              class="recent-detail__remix"
              aria-label="复制提示词做同款"
              @click="handleCopyPrompt"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="M10 2.7 11.4 7l4.3 1.4-4.3 1.4L10 14.1 8.6 9.8 4.3 8.4 8.6 7 10 2.7Z" />
                <path d="m15.4 12.2.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" />
              </svg>
              <span>做同款</span>
            </button>
            <button
              v-if="canDelete"
              type="button"
              class="recent-detail__delete"
              :disabled="isDeleting"
              aria-label="从公开画廊删除图片"
              @click="handleDelete"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="M3.5 5.2h13" />
                <path d="M7.2 5.2V3.7c0-.7.5-1.2 1.2-1.2h3.2c.7 0 1.2.5 1.2 1.2v1.5" />
                <path d="M15.1 5.2 14.4 16c-.1.8-.7 1.4-1.5 1.4H7.1c-.8 0-1.5-.6-1.5-1.4L4.9 5.2" />
                <path d="M8.3 8.4v5.6M11.7 8.4v5.6" />
              </svg>
              <span>{{ isDeleting ? '删除中' : '删除' }}</span>
            </button>
          </div>
        </aside>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.recent-detail {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  align-items: center;
  justify-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 38% 50%, var(--color-inspection-surface-soft), transparent 42%),
    var(--color-inspection-backdrop);
  padding: clamp(18px, 3.6vw, 44px);
  backdrop-filter: blur(16px) brightness(0.56);
  -webkit-backdrop-filter: blur(16px) brightness(0.56);
}

.recent-detail__shell {
  --recent-detail-shell-height: min(720px, calc(100dvh - clamp(36px, 7.2vw, 88px)));
  --recent-detail-stage-padding: clamp(10px, 1.6vw, 18px);

  position: relative;
  display: grid;
  width: min(100%, 1180px);
  height: var(--recent-detail-shell-height);
  max-height: var(--recent-detail-shell-height);
  grid-template-columns: minmax(0, 1fr) minmax(280px, 330px);
  align-items: stretch;
  gap: clamp(22px, 3.6vw, 46px);
}

.recent-detail__stage {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  padding: var(--recent-detail-stage-padding);
}

.recent-detail__stage img {
  display: block;
  width: auto;
  height: auto;
  max-width: min(100%, 820px);
  max-height: calc(var(--recent-detail-shell-height) - (var(--recent-detail-stage-padding) * 2));
  object-fit: contain;
  border-radius: 18px;
  background: var(--color-inspection-surface-soft);
}

.recent-detail__inspector {
  position: relative;
  display: grid;
  align-self: center;
  align-content: start;
  gap: 14px;
  width: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  color: var(--color-inspection-foreground);
}

.recent-detail__close {
  position: absolute;
  top: -48px;
  right: 0;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--color-inspection-border);
  border-radius: 50%;
  background: var(--color-inspection-surface);
  color: var(--color-inspection-foreground);
  cursor: pointer;
  font-size: 23px;
  line-height: 1;
}

.recent-detail__prompt-card {
  display: grid;
  min-height: 0;
  gap: var(--space-sm);
  border: 1px solid var(--color-inspection-border);
  border-radius: var(--radius-md);
  background: var(--color-inspection-surface);
  padding: 18px;
  overflow: hidden;
}

.recent-detail__prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recent-detail__prompt-header h2 {
  margin: 0;
  color: var(--color-inspection-muted);
  font-size: var(--text-caption-size);
  font-weight: 800;
  letter-spacing: 0.18em;
}

.recent-detail__copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--color-inspection-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 0;
}

.recent-detail__copy svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.recent-detail__prompt-scroll {
  max-height: min(34dvh, 260px);
  overflow: auto;
  padding-right: 4px;
}

.recent-detail__prompt {
  margin: 0;
  color: var(--color-inspection-foreground);
  font-size: 13px;
  letter-spacing: 0.01em;
  line-height: 1.68;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.recent-detail__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--color-on-dark-soft);
  font-size: 12px;
  line-height: 1.4;
}

.recent-detail__meta span:first-child,
.recent-detail__meta time {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-detail__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.recent-detail__save,
.recent-detail__remix,
.recent-detail__delete {
  display: inline-flex;
  height: var(--control-height-lg);
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: var(--text-body-sm-size);
  font-weight: 800;
  text-decoration: none;
}

.recent-detail__save svg,
.recent-detail__remix svg,
.recent-detail__delete svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
}

.recent-detail__remix svg {
  fill: currentColor;
  stroke-width: 0;
}

.recent-detail__save {
  border: 1px solid var(--color-inspection-border);
  background: var(--color-inspection-surface-soft);
  color: var(--color-inspection-foreground);
}

.recent-detail__remix {
  border: 0;
  background: var(--color-inspection-accent);
  color: var(--color-on-accent);
}

.recent-detail__delete {
  grid-column: 1 / -1;
  border: 1px solid rgba(255, 142, 118, 0.46);
  background: rgba(84, 28, 22, 0.42);
  color: #ffd8cf;
}

.recent-detail__delete:disabled {
  cursor: wait;
  opacity: 0.62;
}

.recent-detail__close:focus-visible,
.recent-detail__copy:focus-visible,
.recent-detail__prompt-scroll:focus-visible,
.recent-detail__save:focus-visible,
.recent-detail__remix:focus-visible,
.recent-detail__delete:focus-visible {
  outline: 3px solid var(--color-inspection-focus);
  outline-offset: 3px;
}

.recent-detail__close:hover,
.recent-detail__copy:hover,
.recent-detail__save:hover,
.recent-detail__delete:not(:disabled):hover {
  filter: brightness(1.08);
}

.recent-detail__remix:hover {
  background: var(--color-inspection-accent-hover);
}

@media (max-width: 900px) {
  .recent-detail {
    align-items: start;
    overflow: auto;
    padding: 18px;
  }

  .recent-detail__shell {
    height: auto;
    max-height: none;
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .recent-detail__stage {
    min-height: 44vh;
    overflow: visible;
    padding: 0;
  }

  .recent-detail__stage img {
    max-width: 100%;
    max-height: 58vh;
  }

  .recent-detail__close {
    top: -6px;
    right: 0;
    transform: translateY(-100%);
  }

  .recent-detail__inspector {
    align-content: start;
  }
}

@media (max-width: 520px) {
  .recent-detail {
    align-items: stretch;
    padding: max(14px, env(safe-area-inset-top)) 12px calc(92px + env(safe-area-inset-bottom));
  }

  .recent-detail__shell {
    min-height: 100%;
    gap: 12px;
  }

  .recent-detail__stage {
    min-height: 42vh;
    padding-top: 42px;
  }

  .recent-detail__stage img {
    max-height: 52vh;
    border-radius: 14px;
  }

  .recent-detail__close {
    top: 0;
    right: 0;
    transform: none;
  }

  .recent-detail__prompt-card {
    border-radius: 16px;
    padding: 15px;
  }

  .recent-detail__prompt-scroll {
    max-height: 168px;
  }

  .recent-detail__actions {
    grid-template-columns: 1fr;
  }
}
</style>
