import type { AspectRatio, ImageResolution } from '@/types/image';

export interface CreationTemplateSettings {
  aspectRatio: AspectRatio;
  count: number;
  resolution: ImageResolution;
  isPublic: boolean;
}

export interface CreationTemplate {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  prompt: string;
  settings: CreationTemplateSettings;
}

const standard = (aspectRatio: AspectRatio, count = 1): CreationTemplateSettings => ({
  aspectRatio,
  count,
  resolution: 'standard',
  isPublic: false,
});

export const CREATION_TEMPLATES: readonly CreationTemplate[] = [
  {
    id: 'motion-editorial',
    title: '动感运动海报',
    category: '平面设计',
    imageUrl: '/media/templates/template-01.webp',
    prompt:
      '一张当代运动杂志封面，跑者在田径跑道上冲刺，大胆排版与身体动势交错，粗糙颗粒，克制暖色，高对比编辑摄影。',
    settings: standard('2:3', 2),
  },
  {
    id: 'cinematic-musician',
    title: '电影感舞台人像',
    category: '人像摄影',
    imageUrl: '/media/templates/template-02.webp',
    prompt:
      '空旷音乐厅中的钢琴演奏者，电影感侧光，深色木质空间，低饱和度，细腻胶片颗粒，安静且充满叙事感。',
    settings: standard('3:2'),
  },
  {
    id: 'botanical-editorial',
    title: '植物编辑视觉',
    category: '品牌视觉',
    imageUrl: '/media/templates/template-03.webp',
    prompt:
      '花卉摄影与实验排版组成的编辑视觉，柔和灰调，珊瑚红局部点缀，大量留白，高级艺术刊物版式。',
    settings: standard('3:2', 2),
  },
  {
    id: 'future-stadium',
    title: '未来建筑场景',
    category: '建筑空间',
    imageUrl: '/media/templates/template-04.webp',
    prompt:
      '晨雾中的未来感运动场，冷静的流线建筑与清晨自然光，湿润地面反射，无人环境，超广角建筑摄影。',
    settings: standard('16:9'),
  },
  {
    id: 'stage-portrait',
    title: '克制舞台肖像',
    category: '人像摄影',
    imageUrl: '/media/templates/template-05.webp',
    prompt:
      '舞台侧光中的音乐人肖像，极简背景，克制的电影色彩，真实皮肤质感，轻微颗粒，高级人物专访摄影。',
    settings: standard('2:3'),
  },
  {
    id: 'midnight-cafe',
    title: '深夜植物咖啡馆',
    category: '建筑空间',
    imageUrl: '/media/templates/template-06.webp',
    prompt:
      '被热带植物包围的深夜咖啡馆，潮湿空气，柔和暖灯与室外冷色形成对比，贴近现实的电影场景，空间细节丰富。',
    settings: standard('16:9', 2),
  },
  {
    id: 'track-campaign',
    title: '跑道品牌大片',
    category: '商业摄影',
    imageUrl: '/media/templates/template-07.webp',
    prompt:
      '黄昏跑道上的运动品牌大片，低机位追拍，衣料与步伐清晰锐利，背景带有速度感，真实广告摄影。',
    settings: standard('16:9'),
  },
  {
    id: 'quiet-recital',
    title: '独奏会纪实',
    category: '纪实影像',
    imageUrl: '/media/templates/template-08.webp',
    prompt: '小型独奏会的纪实摄影，演奏者被一束暖色顶光照亮，观众隐入暗部，真实颗粒与克制对比。',
    settings: standard('3:2'),
  },
  {
    id: 'floral-packaging',
    title: '花植包装提案',
    category: '品牌视觉',
    imageUrl: '/media/templates/template-09.webp',
    prompt: '现代花植香氛包装提案，纸张压纹与植物标本并置，灰白背景，局部珊瑚色识别，柔和棚拍光。',
    settings: standard('1:1', 2),
  },
  {
    id: 'mist-pavilion',
    title: '雾中公共建筑',
    category: '建筑空间',
    imageUrl: '/media/templates/template-10.webp',
    prompt:
      '薄雾中的当代公共建筑，弧形混凝土结构与湿润草地，清晨自然光，宁静无人，建筑竞赛级可视化。',
    settings: standard('16:9'),
  },
  {
    id: 'editorial-profile',
    title: '音乐人侧写',
    category: '人像摄影',
    imageUrl: '/media/templates/template-11.webp',
    prompt:
      '音乐人侧面肖像，黑色幕布背景，单一硬光塑造轮廓，肤色自然，服装极简，文化杂志封面摄影。',
    settings: standard('2:3', 2),
  },
  {
    id: 'rainy-greenhouse',
    title: '雨夜温室空间',
    category: '概念场景',
    imageUrl: '/media/templates/template-12.webp',
    prompt: '雨夜玻璃温室内的安静餐吧，叶片与玻璃布满水汽，暖灯映在深色地面，电影感广角空间摄影。',
    settings: standard('16:9'),
  },
] as const;

export const TEMPLATE_CATEGORIES = [
  '全部',
  ...new Set(CREATION_TEMPLATES.map((template) => template.category)),
] as const;
