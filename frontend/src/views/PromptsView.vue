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

      <dl class="hero-stats" aria-label="提示词库统计">
        <div>
          <dt>{{ promptTemplates.length }}</dt>
          <dd>精选提示词</dd>
        </div>
        <span aria-hidden="true"></span>
        <div>
          <dt>{{ categoryTags.length - 1 }}</dt>
          <dd>内置分类</dd>
        </div>
      </dl>

      <form class="prompt-search" role="search" aria-label="搜索提示词库" @submit.prevent="submitSearch">
        <span class="prompt-search__scope">库检索</span>
        <span class="prompt-search__icon" aria-hidden="true">⌕</span>
        <input
          v-model="searchKeyword"
          type="search"
          aria-label="搜索提示词、风格或元素"
          placeholder="搜索提示词、风格或元素..."
        />
        <button type="submit">搜索</button>
      </form>
    </header>

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

    <div v-if="filteredTemplates.length > 0" class="prompt-card-grid" aria-label="精选提示词卡片列表">
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
          <button type="button" class="prompt-card__copy" @click="copyPrompt(template)">
            复制提示词
          </button>
          <button type="button" class="prompt-card__generate" @click="useTemplate(template)">
            去生成 →
          </button>
        </div>
      </article>
    </div>

    <div v-else class="prompt-empty" role="status">
      <strong>没有找到匹配的提示词</strong>
      <span>试试切换分类，或搜索其它风格与元素。</span>
    </div>
  </section>
</template>

<style scoped>
.prompts-page {
  min-height: 100vh;
  padding: 78px clamp(18px, 4vw, 54px) 88px;
  color: var(--color-ink);
}

.prompt-library-hero {
  display: grid;
  justify-items: center;
  width: min(100%, 1180px);
  margin: 0 auto;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 22px;
  border: 1px solid oklch(100% 0 0deg / 0.72);
  border-radius: var(--radius-pill);
  background: oklch(100% 0 0deg / 0.5);
  color: oklch(41% 0.045 276deg);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  padding: 10px 18px;
}

.prompt-library-hero h1 {
  max-width: 900px;
  margin: 0;
  color: oklch(23% 0.035 274deg);
  font-family: var(--font-display);
  font-size: clamp(52px, 8.8vw, 104px);
  font-weight: 800;
  letter-spacing: -0.075em;
  line-height: 0.95;
}

.hero-subtitle {
  margin: 22px 0 0;
  color: oklch(47% 0.04 276deg / 0.82);
  font-size: clamp(17px, 2vw, 22px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.65;
}

.hero-stats {
  display: inline-grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 26px;
  margin: 30px 0 0;
}

.hero-stats div {
  display: grid;
  gap: 3px;
  min-width: 112px;
}

.hero-stats dt,
.hero-stats dd {
  margin: 0;
}

.hero-stats dt {
  color: oklch(24% 0.036 274deg);
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.045em;
}

.hero-stats dd {
  color: oklch(54% 0.038 276deg / 0.78);
  font-size: 13px;
  font-weight: 800;
}

.hero-stats > span {
  width: 1px;
  height: 38px;
  background: oklch(60% 0.035 276deg / 0.26);
}

.prompt-search {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  width: min(100%, 820px);
  min-height: 66px;
  gap: 12px;
  margin: 34px 0 0;
  border: 1px solid oklch(100% 0 0deg / 0.76);
  border-radius: 999px;
  background: oklch(100% 0 0deg / 0.56);
  padding: 8px;
}

.prompt-search__scope {
  display: inline-flex;
  min-width: 86px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: oklch(19% 0.025 260deg);
  color: white;
  font-size: 14px;
  font-weight: 900;
  padding: 0 18px;
}

.prompt-search__icon {
  display: inline-flex;
  width: 30px;
  justify-content: center;
  color: oklch(52% 0.045 274deg / 0.74);
  font-size: 25px;
  font-weight: 900;
  line-height: 1;
}

.prompt-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: oklch(25% 0.035 274deg);
  font: inherit;
  font-size: 16px;
  font-weight: 650;
}

.prompt-search input::placeholder {
  color: oklch(57% 0.038 276deg / 0.66);
}

.prompt-search button {
  height: 48px;
  border: 0;
  border-radius: var(--radius-pill);
  background: oklch(19% 0.025 260deg);
  color: white;
  cursor: pointer;
  font-size: 15px;
  font-weight: 950;
  padding: 0 28px;
}

.category-cloud {
  display: flex;
  width: min(100%, 1180px);
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 36px auto 40px;
}

.category-cloud button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  border: 1px solid oklch(100% 0 0deg / 0.74);
  border-radius: var(--radius-pill);
  background: oklch(100% 0 0deg / 0.44);
  color: oklch(39% 0.04 276deg / 0.9);
  cursor: pointer;
  font-size: 14px;
  font-weight: 850;
  gap: 4px;
  padding: 0 17px;
}

.category-cloud button span {
  color: oklch(53% 0.04 276deg / 0.66);
  font-weight: 800;
}

.category-cloud button.is-active {
  border-color: oklch(25% 0.032 260deg);
  background: oklch(19% 0.025 260deg);
  color: white;
}

.category-cloud button.is-active span {
  color: oklch(94% 0.006 260deg / 0.78);
}

.prompt-card-grid {
  display: grid;
  width: min(100%, 1240px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
  margin: 0 auto;
}

.prompt-card {
  display: grid;
  overflow: hidden;
  border: 1px solid oklch(100% 0 0deg / 0.66);
  border-radius: 30px;
  background: oklch(100% 0 0deg / 0.5);
}

.prompt-card__media {
  position: relative;
  aspect-ratio: 1 / 0.76;
  margin: 10px 10px 0;
  overflow: hidden;
  border-radius: 23px;
  background: oklch(94% 0.018 270deg / 0.62);
}

.prompt-card__media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.prompt-card__media figcaption {
  position: absolute;
  top: 12px;
  right: 12px;
  max-width: calc(100% - 24px);
  overflow: hidden;
  border: 1px solid oklch(100% 0 0deg / 0.5);
  border-radius: var(--radius-pill);
  background: oklch(100% 0 0deg / 0.72);
  color: oklch(28% 0.032 268deg);
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-card__body {
  display: grid;
  gap: 11px;
  padding: 18px 18px 0;
}

.prompt-card__body h2 {
  margin: 0;
  color: oklch(23% 0.035 274deg);
  font-size: 18px;
  font-weight: 950;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.prompt-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.prompt-card__chips span {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: var(--radius-pill);
  background: oklch(88% 0.04 307deg / 0.55);
  color: oklch(39% 0.085 307deg);
  font-size: 12px;
  font-weight: 900;
  padding: 0 10px;
}

.prompt-card__chips span:nth-child(2n) {
  background: oklch(90% 0.04 218deg / 0.58);
  color: oklch(36% 0.08 238deg);
}

.prompt-card__chips span:nth-child(3n) {
  background: oklch(91% 0.05 78deg / 0.58);
  color: oklch(40% 0.07 72deg);
}

.prompt-card__body p {
  display: -webkit-box;
  min-height: 5.15em;
  margin: 0;
  overflow: hidden;
  color: oklch(43% 0.037 276deg / 0.82);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.72;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.prompt-card__actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 18px;
}

.prompt-card__actions button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 950;
  padding: 0 15px;
}

.prompt-card__copy {
  border: 1px solid oklch(100% 0 0deg / 0.72);
  background: oklch(100% 0 0deg / 0.48);
  color: oklch(31% 0.035 274deg);
}

.prompt-card__generate {
  border: 0;
  background: oklch(18% 0.025 260deg);
  color: white;
}

.prompt-empty {
  display: grid;
  width: min(100%, 680px);
  justify-items: center;
  gap: 8px;
  margin: 0 auto;
  border: 1px solid oklch(100% 0 0deg / 0.66);
  border-radius: 30px;
  background: oklch(100% 0 0deg / 0.42);
  color: oklch(43% 0.037 276deg / 0.82);
  padding: 40px 20px;
  text-align: center;
}

.prompt-empty strong {
  color: oklch(24% 0.035 274deg);
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

  .prompt-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .prompts-page {
    padding: 38px 14px 46px;
  }

  .hero-badge {
    margin-bottom: 18px;
    font-size: 12px;
    padding: 9px 13px;
  }

  .prompt-library-hero h1 {
    font-size: clamp(44px, 17vw, 72px);
  }

  .hero-subtitle {
    margin-top: 16px;
    font-size: 16px;
  }

  .hero-stats {
    gap: 18px;
    margin-top: 24px;
  }

  .hero-stats div {
    min-width: 92px;
  }

  .prompt-search {
    grid-template-columns: 1fr;
    border-radius: 28px;
    padding: 10px;
  }

  .prompt-search__scope,
  .prompt-search button {
    width: 100%;
  }

  .prompt-search__icon {
    display: none;
  }

  .prompt-search input {
    min-height: 46px;
    padding: 0 12px;
    text-align: center;
  }

  .category-cloud {
    justify-content: flex-start;
    gap: 9px;
    margin: 28px auto 30px;
  }

  .category-cloud button {
    min-height: 38px;
    font-size: 12.5px;
    padding: 0 13px;
  }

  .prompt-card-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .prompt-card__actions {
    grid-template-columns: 1fr;
  }
}
</style>
