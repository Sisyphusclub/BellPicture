<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

interface CategoryTag {
  label: string;
  count: number;
}

interface PromptTemplate {
  id: string;
  title: string;
  source: string;
  categories: string[];
  imageUrl: string;
  prompt: string;
}

const router = useRouter();

const searchKeyword = ref('');
const selectedCategory = ref('全部');

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function templateImageDataUri(title: string, category: string, hue: number): string {
  const safeTitle = escapeSvgText(title);
  const safeCategory = escapeSvgText(category);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 684" role="img" aria-label="${safeTitle} 示例图">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 92% 86%)" />
      <stop offset="0.48" stop-color="hsl(${(hue + 42) % 360} 88% 76%)" />
      <stop offset="1" stop-color="hsl(${(hue + 86) % 360} 86% 90%)" />
    </linearGradient>
    <radialGradient id="glow" cx="72%" cy="28%" r="58%">
      <stop offset="0" stop-color="white" stop-opacity="0.72" />
      <stop offset="1" stop-color="white" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="900" height="684" rx="48" fill="url(#bg)" />
  <circle cx="682" cy="172" r="210" fill="url(#glow)" />
  <path d="M92 534C211 394 306 429 413 305c95-110 193-134 395-76v355H92Z" fill="white" fill-opacity="0.34" />
  <path d="M128 168c118-92 224-84 318 22s194 111 318 18" fill="none" stroke="white" stroke-width="32" stroke-linecap="round" stroke-opacity="0.58" />
  <rect x="96" y="402" width="708" height="164" rx="34" fill="white" fill-opacity="0.54" />
  <text x="132" y="474" fill="#211f1c" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" font-size="42" font-weight="800">${safeTitle}</text>
  <text x="132" y="528" fill="#4b4540" font-family="'Noto Sans SC', 'Microsoft YaHei', sans-serif" font-size="25" font-weight="700">${safeCategory} · 内置模板图</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const promptTemplates: PromptTemplate[] = [
  {
    id: 'iphone-app-dashboard',
    title: '移动应用仪表盘界面',
    source: '内置模板',
    categories: ['UI/界面', '品牌'],
    imageUrl: templateImageDataUri('移动应用仪表盘界面', 'UI/界面', 218),
    prompt:
      '为创意效率工具生成一个干净的移动应用仪表盘界面，柔和玻璃面板，蓝粉渐变背景，圆角信息卡片，优雅字体，iOS 设计语言，高保真界面稿，不出现设备外框。',
  },
  {
    id: 'cinematic-fashion-portrait',
    title: '电影感时尚人像',
    source: '内置模板',
    categories: ['人像摄影', '时尚'],
    imageUrl: templateImageDataUri('电影感时尚人像', '人像摄影', 328),
    prompt:
      '拍摄一张电影感时尚人像，自信模特穿着米白色廓形大衣，柔和轮廓光，浅景深，杂志大片构图，温暖胶片颗粒，高级造型，色彩自然但有戏剧张力。',
  },
  {
    id: 'retro-summer-poster',
    title: '复古夏日旅行海报',
    source: '内置模板',
    categories: ['海报插画', '插画艺术'],
    imageUrl: templateImageDataUri('复古夏日旅行海报', '海报插画', 32),
    prompt:
      '绘制一张复古夏日旅行海报，阳光海滩，醒目的几何形状，暖橙与青蓝配色，轻微纸张纹理，预留大标题区域，复古丝网印刷风格，干净商业海报版式。',
  },
  {
    id: 'minimal-product-studio',
    title: '极简产品棚拍',
    source: '内置模板',
    categories: ['产品电商', '摄影'],
    imageUrl: templateImageDataUri('极简产品棚拍', '产品电商', 186),
    prompt:
      '生成一张高级棚拍产品图，极简智能手表放在哑光石质底座上，柔和蓝粉渐变背景，扩散反光，精准高光，干净阴影，高端电商广告风格。',
  },
  {
    id: 'soft-3d-icon-set',
    title: '柔和 3D 图标组',
    source: '内置模板',
    categories: ['3D 渲染', 'UI/界面'],
    imageUrl: templateImageDataUri('柔和 3D 图标组', '3D 渲染', 262),
    prompt:
      '为 AI 设计平台生成一组柔和 3D 图标，半透明玻璃材质，圆润黏土形态，淡蓝与珊瑚色，棚拍灯光，等距视角构图，干净白色背景。',
  },
  {
    id: 'anime-city-evening',
    title: '雨后动漫城市傍晚',
    source: '内置模板',
    categories: ['二次元', '风景城市'],
    imageUrl: templateImageDataUri('雨后动漫城市傍晚', '二次元', 204),
    prompt:
      '绘制一条雨后傍晚的动漫城市街道，发光店招，路面积水倒影，轻柔微风，孤独自行车，公寓暖光，情绪化电影氛围，背景细节丰富。',
  },
  {
    id: 'cyberpunk-game-character',
    title: '赛博朋克游戏角色',
    source: '内置模板',
    categories: ['赛博朋克', '角色设计', '游戏'],
    imageUrl: templateImageDataUri('赛博朋克游戏角色', '赛博朋克', 286),
    prompt:
      '设计一个赛博朋克游戏角色概念，霓虹夹克，全息面罩，雨夜小巷，洋红与青蓝电光，全身姿态，服装设计细节完整，高质量概念设定图。',
  },
  {
    id: 'organic-architecture-villa',
    title: '有机现代山坡别墅',
    source: '内置模板',
    categories: ['建筑', '风景城市'],
    imageUrl: templateImageDataUri('有机现代山坡别墅', '建筑', 96),
    prompt:
      '渲染一栋嵌入绿色山坡的有机现代别墅，流动混凝土曲线，大面积玻璃透出温暖木质内饰，日落光线，安静奢华的建筑可视化，真实又带梦幻感。',
  },
  {
    id: 'dessert-brand-campaign',
    title: '甜品品牌广告大片',
    source: '内置模板',
    categories: ['美食', '产品电商'],
    imageUrl: templateImageDataUri('甜品品牌广告大片', '美食', 346),
    prompt:
      '生成一张俏皮甜品品牌广告图，草莓慕斯蛋糕与奶油缎带、莓果漂浮在空中，粉色背景，诱人的光泽质感，干净商业构图，高级美食摄影。',
  },
  {
    id: 'abstract-logo-system',
    title: '抽象标志设计系统',
    source: '内置模板',
    categories: ['Logo 设计', '品牌'],
    imageUrl: templateImageDataUri('抽象标志设计系统', 'Logo 设计', 232),
    prompt:
      '为未来感创意工作室生成一套抽象 Logo 设计系统，几何符号探索，黑色与象牙白展示板，精致网格，微妙蓝色点缀，高级品牌识别提案，简洁且有记忆点。',
  },
  {
    id: 'botanical-illustration',
    title: '植物杂志插画',
    source: '内置模板',
    categories: ['插画艺术', '其他'],
    imageUrl: templateImageDataUri('植物杂志插画', '插画艺术', 136),
    prompt:
      '绘制一张植物主题杂志插画，夸张大花朵，细腻墨线，半透明水彩晕染，奶油色纸张背景，优雅版面，诗意构图，柔和蓝粉点缀。',
  },
  {
    id: 'futuristic-sneaker-render',
    title: '未来感运动鞋渲染',
    source: '内置模板',
    categories: ['产品电商', '3D 渲染', '时尚'],
    imageUrl: templateImageDataUri('未来感运动鞋渲染', '产品电商', 18),
    prompt:
      '生成一张未来感运动鞋产品渲染图，鞋子悬浮在光滑亚克力平台上，动态缎带形体，冷蓝与珊瑚红灯光，极简广告构图，高端运动时尚大片。',
  },
];

const categoryTags = computed<CategoryTag[]>(() => {
  const totals = new Map<string, number>();
  for (const template of promptTemplates) {
    for (const category of template.categories) {
      totals.set(category, (totals.get(category) ?? 0) + 1);
    }
  }
  return [
    { label: '全部', count: promptTemplates.length },
    ...Array.from(totals, ([label, count]) => ({ label, count })),
  ];
});

const filteredTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return promptTemplates.filter((template) => {
    const matchesCategory =
      selectedCategory.value === '全部' || template.categories.includes(selectedCategory.value);
    const searchableText = [template.title, template.source, template.prompt, ...template.categories]
      .join(' ')
      .toLowerCase();
    const matchesKeyword = keyword.length === 0 || searchableText.includes(keyword);

    return matchesCategory && matchesKeyword;
  });
});

function selectCategory(category: string): void {
  selectedCategory.value = category;
}

function submitSearch(): void {
  if (searchKeyword.value.trim().length === 0) {
    ElMessage.info('请输入要搜索的提示词、风格或元素。');
  }
}

async function copyPrompt(template: PromptTemplate): Promise<void> {
  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    ElMessage.error('当前浏览器不支持自动复制。');
    return;
  }

  try {
    await clipboard.writeText(template.prompt);
    ElMessage.success('提示词已复制。');
  } catch {
    ElMessage.error('复制失败，请手动复制提示词。');
  }
}

function useTemplate(template: PromptTemplate): void {
  void router.push({
    path: '/generate',
    query: { prompt: template.prompt },
  });
}
</script>

<template>
  <section class="prompts-page" aria-labelledby="prompts-title">
    <header class="prompt-library-hero">
      <p class="hero-badge">精选提示词库 · 内置静态模板</p>
      <h1 id="prompts-title">发现无尽创意</h1>
      <p class="hero-subtitle">探索精选提示词，一键生成你的专属大作</p>
    </header>

    <section class="prompt-library-panel" aria-label="提示词库工作区">
      <div class="prompt-library-panel__top">
        <div>
          <p class="prompt-library-panel__eyebrow">提示词库</p>
          <h2>快速检索模板</h2>
        </div>
        <dl class="prompt-library-stats" aria-label="提示词库统计">
          <div>
            <dt>{{ promptTemplates.length }}</dt>
            <dd>精选提示词</dd>
          </div>
          <div>
            <dt>{{ categoryTags.length - 1 }}</dt>
            <dd>内置分类</dd>
          </div>
        </dl>
      </div>

      <div class="prompt-library-controls">
        <form
          class="prompt-search"
          role="search"
          aria-label="搜索提示词库"
          @submit.prevent="submitSearch"
        >
          <span class="prompt-search__scope">库检索</span>
          <span class="prompt-search__icon" aria-hidden="true">⌕</span>
          <input
            v-model="searchKeyword"
            type="search"
            aria-label="搜索提示词、风格或元素"
            placeholder="搜索提示词、风格或元素..."
          />
          <button type="submit" class="prompt-btn prompt-btn--primary">搜索</button>
        </form>

        <nav class="category-cloud" aria-label="提示词分类">
          <button
            v-for="category in categoryTags"
            :key="category.label"
            type="button"
            :class="{ 'is-active': selectedCategory === category.label }"
            @click="selectCategory(category.label)"
          >
            {{ category.label }} <span>({{ category.count }})</span>
          </button>
        </nav>
      </div>

      <div
        v-if="filteredTemplates.length > 0"
        class="prompt-card-grid"
        aria-label="精选提示词卡片列表"
      >
        <article v-for="template in filteredTemplates" :key="template.id" class="prompt-card">
          <figure class="prompt-card__media">
            <img :src="template.imageUrl" :alt="`${template.title} 提示词示例图`" loading="lazy" />
            <figcaption>{{ template.source }}</figcaption>
          </figure>

          <div class="prompt-card__body">
            <h2>{{ template.title }}</h2>
            <div class="prompt-card__chips" aria-label="提示词分类标签">
              <span v-for="category in template.categories" :key="category">{{ category }}</span>
            </div>
            <p>{{ template.prompt }}</p>
          </div>

          <div class="prompt-card__actions">
            <button
              type="button"
              class="prompt-btn prompt-btn--ghost prompt-card__copy"
              @click="copyPrompt(template)"
            >
              复制提示词
            </button>
            <button
              type="button"
              class="prompt-btn prompt-btn--primary prompt-card__generate"
              @click="useTemplate(template)"
            >
              去生成
            </button>
          </div>
        </article>
      </div>

      <div v-else class="prompt-empty" role="status">
        <strong>没有找到匹配的提示词</strong>
        <span>试试切换分类，或搜索其它风格与元素。</span>
      </div>
    </section>
  </section>
</template>

<style scoped>
.prompts-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: min(100%, 1240px);
  min-height: 100vh;
  margin: 0 auto;
  padding: 72px clamp(18px, 4vw, 40px) 88px;
  color: var(--color-ink);
}

.prompt-library-hero {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-card-solid);
  color: oklch(44% 0.012 78deg);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.35;
  padding: 8px 14px;
}

.prompt-library-hero h1 {
  max-width: 720px;
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: clamp(34px, 4.2vw, 56px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.06;
}

.hero-subtitle {
  max-width: 560px;
  margin: 0;
  color: var(--color-muted);
  font-size: clamp(15px, 1.6vw, 18px);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.6;
}

.prompt-library-panel {
  display: grid;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-md) var(--space-lg);
  border: 1px solid var(--color-hairline);
  border-radius: 24px;
  background: oklch(99.1% 0.004 88deg / 0.94);
  box-shadow: none;
}

.prompt-library-panel__top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
}

.prompt-library-panel__top h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.prompt-library-panel__eyebrow {
  margin: 0 0 6px;
  color: oklch(44% 0.012 78deg);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.prompt-library-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.prompt-library-stats div {
  display: grid;
  min-width: 92px;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card-solid);
}

.prompt-library-stats dt,
.prompt-library-stats dd {
  margin: 0;
}

.prompt-library-stats dt {
  color: var(--color-ink);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.035em;
}

.prompt-library-stats dd {
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 700;
}

.prompt-library-controls {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--color-hairline);
  border-radius: 20px;
  background: oklch(97.6% 0.006 88deg / 0.72);
}

.prompt-search {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 52px;
  gap: 10px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card-solid);
  padding: 4px;
  box-shadow: none;
}

.prompt-search:focus-within {
  border-color: var(--color-accent-active);
  outline: 2px solid oklch(78% 0.13 57deg / 0.28);
  outline-offset: 2px;
}

.prompt-search__scope {
  display: inline-flex;
  min-width: 74px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: calc(var(--radius-sm) - 4px);
  background: oklch(93.4% 0.018 82deg / 0.72);
  color: var(--color-body-strong);
  font-size: 13px;
  font-weight: 800;
  padding: 0 14px;
}

.prompt-search__icon {
  display: inline-flex;
  width: 28px;
  justify-content: center;
  color: var(--color-muted);
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.prompt-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
}

.prompt-search input::placeholder {
  color: var(--color-muted-soft);
}

.prompt-btn {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 800;
  padding: 0 16px;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    opacity 140ms ease;
}

.prompt-btn:focus-visible,
.category-cloud button:focus-visible {
  outline: 3px solid oklch(78% 0.13 57deg / 0.72);
  outline-offset: 3px;
}

.prompt-btn--primary {
  border: 0;
  background: linear-gradient(180deg, oklch(27% 0.012 76deg), var(--color-primary));
  color: var(--color-on-primary);
  box-shadow:
    inset -4px -6px 25px 0 rgba(201, 201, 201, 0.08),
    inset 4px 4px 10px 0 rgba(29, 29, 29, 0.24);
}

.prompt-btn--primary:hover {
  background: var(--color-primary-active);
}

.prompt-btn--ghost {
  border: 1px solid var(--color-hairline);
  background: var(--color-surface-glass-strong);
  color: var(--color-ink);
}

.prompt-btn--ghost:hover {
  background: var(--color-surface-card-solid);
}

.category-cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
}

.category-cloud button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: var(--color-surface-card-solid);
  color: var(--color-body-strong);
  cursor: pointer;
  font-size: 13px;
  font-weight: 750;
  gap: 4px;
  padding: 0 13px;
}

.category-cloud button:hover {
  background: oklch(96.2% 0.008 88deg / 0.92);
}

.category-cloud button span {
  color: var(--color-muted);
  font-weight: 700;
}

.category-cloud button.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.category-cloud button.is-active span {
  color: oklch(94% 0.006 80deg / 0.78);
}

.prompt-card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.prompt-card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: 18px;
  background: var(--color-surface-card-solid);
  box-shadow: none;
}

.prompt-card__media {
  position: relative;
  aspect-ratio: 1 / 0.72;
  margin: 10px 10px 0;
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: 14px;
  background: oklch(94.5% 0.01 88deg / 0.82);
}

.prompt-card__media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.prompt-card__media figcaption {
  position: absolute;
  top: 10px;
  right: 10px;
  max-width: calc(100% - 20px);
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: oklch(99% 0.004 88deg / 0.9);
  color: var(--color-body-strong);
  font-size: 12px;
  font-weight: 800;
  padding: 5px 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-card__body {
  display: grid;
  gap: 10px;
  padding: 16px 16px 0;
}

.prompt-card__body h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.25;
}

.prompt-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prompt-card__chips span {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  background: oklch(96.5% 0.008 88deg / 0.86);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 800;
  padding: 0 9px;
}

.prompt-card__body p {
  display: -webkit-box;
  min-height: 5.1em;
  margin: 0;
  overflow: hidden;
  color: var(--color-muted);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.prompt-card__actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 16px;
}

.prompt-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  border: 1px solid var(--color-hairline);
  border-radius: 18px;
  background: var(--color-surface-card-solid);
  color: var(--color-muted);
  padding: 42px 20px;
  text-align: center;
  box-shadow: none;
}

.prompt-empty strong {
  color: var(--color-ink);
  font-size: 18px;
}

@media (max-width: 1280px) {
  .prompt-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .prompts-page {
    padding-top: 56px;
  }

  .prompt-library-panel__top {
    align-items: flex-start;
    flex-direction: column;
  }

  .prompt-library-stats {
    width: 100%;
  }

  .prompt-library-stats div {
    flex: 1;
  }

  .prompt-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .prompts-page {
    gap: 20px;
    padding: 34px 14px 96px;
  }

  .hero-badge {
    font-size: 11px;
    padding: 7px 11px;
  }

  .prompt-library-hero h1 {
    font-size: clamp(32px, 10vw, 44px);
  }

  .hero-subtitle {
    font-size: 15px;
  }

  .prompt-library-panel {
    padding: 12px;
    border-radius: 20px;
  }

  .prompt-library-controls {
    padding: 10px;
    border-radius: 16px;
  }

  .prompt-library-stats {
    flex-direction: column;
  }

  .prompt-library-stats div {
    width: 100%;
  }

  .prompt-search {
    grid-template-columns: 1fr;
    padding: 8px;
  }

  .prompt-search__scope,
  .prompt-search button {
    width: 100%;
  }

  .prompt-search__icon {
    display: none;
  }

  .prompt-search input {
    min-height: 42px;
    padding: 0 10px;
    text-align: center;
  }

  .category-cloud {
    gap: 7px;
  }

  .category-cloud button {
    min-height: 34px;
    font-size: 12.5px;
    padding: 0 11px;
  }

  .prompt-card-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .prompt-card__actions {
    grid-template-columns: 1fr;
  }
}
</style>
