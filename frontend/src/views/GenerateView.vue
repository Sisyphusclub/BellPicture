<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import GenerationStatusPanel from '@/components/gallery/GenerationStatusPanel.vue';
import ResultPreview from '@/components/gallery/ResultPreview.vue';
import ImageDropzone from '@/components/upload/ImageDropzone.vue';
import { useFileUpload } from '@/composables/useFileUpload';
import { useImageGeneration, type GenerateImageOptions } from '@/composables/useImageGeneration';

const route = useRoute();
const { selectedFile, previewUrl, validationMessage, selectFile, clear } = useFileUpload();
const { generate, isLoading, error, lastResult, statusMessage } = useImageGeneration();

const prompt = ref('');
const model = ref('gpt-image-2');

const canGenerate = computed(() => prompt.value.trim().length > 0 && !isLoading.value);

watch(
  () => route.query.prompt,
  (value) => {
    const nextPrompt = readQueryString(value);
    if (nextPrompt) prompt.value = nextPrompt;
  },
  { immediate: true },
);

async function handleSubmit(): Promise<void> {
  if (!canGenerate.value) return;
  const options: GenerateImageOptions = {
    prompt: prompt.value,
    model: model.value,
  };
  if (selectedFile.value) options.referenceFile = selectedFile.value;

  try {
    await generate(options);
    ElMessage.success('图片已生成，并保存到历史记录。');
  } catch (unknownError) {
    ElMessage.error(messageForError(unknownError));
  }
}

function readQueryString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function messageForError(unknownError: unknown): string {
  if (unknownError instanceof Error) return unknownError.message;
  return '生成失败，请稍后重试。';
}
</script>

<template>
  <section class="hero-band">
    <div class="container hero-band__grid">
      <div class="hero-band__copy">
        <p class="section-kicker">参考图生图</p>
        <h1 class="display-heading">输入提示词和参考图，在本地保留每一次生成结果。</h1>
        <p class="hero-band__lede">
          描述你想要的画面，也可以附上一张参考图来指定构图、主体或风格；后端完成生成后会自动保存到浏览器历史记录。
        </p>
        <div class="hero-band__actions">
          <a class="claude-button claude-button--primary" href="#studio-form">开始生成</a>
          <RouterLink class="claude-button claude-button--secondary" to="/history"
            >浏览历史</RouterLink
          >
        </div>
      </div>
      <div class="hero-band__mockup" aria-label="产品流程摘要">
        <span class="hero-band__mockup-label">studio.pipeline</span>
        <ol>
          <li><span>01</span> 上传参考图</li>
          <li><span>02</span> 将提示词发送到后端</li>
          <li><span>03</span> 把图片保存到 IndexedDB</li>
        </ol>
      </div>
    </div>
  </section>

  <section id="studio-form" class="studio-section">
    <div class="container studio-section__grid">
      <form class="generator-card" @submit.prevent="handleSubmit">
        <div>
          <p class="section-kicker">生成</p>
          <h2>提示词工作区</h2>
          <p>默认使用提示词生成；需要延续构图、主体或风格时，可以添加参考图。</p>
        </div>

        <label>
          <span class="field-label">提示词</span>
          <textarea
            v-model="prompt"
            class="textarea-field"
            placeholder="一张温暖的编辑风主视觉：玻璃工作台、珊瑚色便签和深海军蓝界面面板……"
            :disabled="isLoading"
          />
        </label>

        <ImageDropzone
          :file="selectedFile"
          :preview-url="previewUrl"
          :validation-message="validationMessage"
          :disabled="isLoading"
          @select="selectFile"
          @clear="clear"
        />

        <details class="advanced-card">
          <summary>高级设置</summary>
          <label>
            <span class="field-label">模型</span>
            <select v-model="model" class="select-field" :disabled="isLoading">
              <option value="gpt-image-2">gpt-image-2</option>
            </select>
          </label>
        </details>

        <p v-if="error" class="generator-card__error" role="alert">{{ error.message }}</p>

        <button type="submit" class="claude-button claude-button--primary" :disabled="!canGenerate">
          {{ isLoading ? '正在生成…' : '生成图片' }}
        </button>
      </form>

      <div class="studio-section__side">
        <GenerationStatusPanel :message="statusMessage" :is-loading="isLoading" />
        <ResultPreview :result="lastResult" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-band {
  padding: var(--space-section) 0;
}

.hero-band__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: var(--space-xxl);
  align-items: center;
}

.hero-band__copy {
  display: grid;
  gap: var(--space-lg);
}

.hero-band .display-heading {
  max-width: 780px;
  font-size: clamp(42px, 6vw, 66px);
}

.hero-band__lede {
  max-width: 680px;
  margin: 0;
  color: var(--color-body-strong);
  font-size: 18px;
}

.hero-band__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.hero-band__mockup {
  display: grid;
  gap: var(--space-lg);
  border-radius: var(--radius-xl);
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  padding: var(--space-xl);
}

.hero-band__mockup-label {
  color: var(--color-primary);
  font-family: var(--font-code);
  font-size: 14px;
}

.hero-band__mockup ol {
  display: grid;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero-band__mockup li {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  border-radius: var(--radius-md);
  background: var(--color-surface-dark-elevated);
  color: var(--color-on-dark);
  padding: var(--space-md);
}

.hero-band__mockup li span {
  color: var(--color-on-dark-soft);
  font-family: var(--font-code);
}

.studio-section {
  padding: 0 0 var(--space-section);
}

.studio-section__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(320px, 0.8fr);
  gap: var(--space-xl);
  align-items: start;
}

.generator-card,
.studio-section__side {
  display: grid;
  gap: var(--space-lg);
}

.generator-card {
  border-radius: var(--radius-lg);
  background: var(--color-surface-card);
  padding: var(--space-xl);
}

.generator-card h2 {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.generator-card p {
  margin: var(--space-xs) 0 0;
}

.advanced-card {
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-canvas);
  padding: var(--space-md);
}

.advanced-card summary {
  cursor: pointer;
  color: var(--color-ink);
  font-weight: 500;
}

.advanced-card label {
  display: block;
  margin-top: var(--space-md);
}

.generator-card__error {
  border-left: 4px solid var(--color-error);
  color: var(--color-error);
  padding-left: var(--space-sm);
}

@media (max-width: 920px) {
  .hero-band__grid,
  .studio-section__grid {
    grid-template-columns: 1fr;
  }
}
</style>
