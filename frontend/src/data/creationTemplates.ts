import type { AspectRatio, ImageResolution, HistoryEntry } from '@/types/image';

import manifest from './creationTemplates.json';

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
  sourceUrl: string;
  sourceTitle: string;
  sourcePath: string;
  width: number;
  height: number;
}

const isAspectRatio = (value: unknown): value is AspectRatio =>
  value === '1:1' || value === '3:2' || value === '2:3' || value === '16:9' || value === '9:16';

const isImageResolution = (value: unknown): value is ImageResolution =>
  value === 'standard' || value === '2k' || value === '4k';

function normalizeTemplate(value: (typeof manifest)[number]): CreationTemplate {
  if (!isAspectRatio(value.aspectRatio) || !isImageResolution(value.resolution)) {
    throw new Error(`Invalid GPT Image 2 template metadata: ${value.id}`);
  }
  return {
    id: value.id,
    title: value.title,
    category: value.category,
    imageUrl: value.imageUrl,
    prompt: value.prompt,
    settings: {
      aspectRatio: value.aspectRatio,
      count: value.count,
      resolution: value.resolution,
      isPublic: value.isPublic,
    },
    sourceUrl: value.sourceUrl,
    sourceTitle: value.sourceTitle,
    sourcePath: value.sourcePath,
    width: value.width,
    height: value.height,
  };
}

export const CREATION_TEMPLATES: readonly CreationTemplate[] = manifest.map(normalizeTemplate);

export const TEMPLATE_CATEGORIES = [
  '全部',
  ...new Set(CREATION_TEMPLATES.map((template) => template.category)),
] as const;

export function orderTemplatesWithAnimeLast(
  templates: readonly CreationTemplate[],
): CreationTemplate[] {
  const anime: CreationTemplate[] = [];
  const general: CreationTemplate[] = [];

  for (const template of templates) {
    (template.category === '动漫漫画' ? anime : general).push(template);
  }

  return [...general, ...anime];
}

export function templateToHistoryEntry(template: CreationTemplate): HistoryEntry {
  return {
    record: {
      id: `nebulens-${template.id}`,
      createdAt: '2026-08-26T00:00:00.000Z',
      prompt: template.prompt,
      model: 'gpt-image-2',
      aspectRatio: template.settings.aspectRatio,
      width: template.width,
      height: template.height,
      count: template.settings.count,
      resolution: template.settings.resolution,
      isPublic: true,
    },
    imageUrl: template.imageUrl,
  };
}
