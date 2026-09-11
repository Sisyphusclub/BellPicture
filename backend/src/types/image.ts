export const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const IMAGE_RESOLUTIONS = ['standard', '2k', '4k'] as const;
export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number];
export const HIGH_RES_IMAGE_RESOLUTIONS = ['2k', '4k'] as const;
export type HighImageResolution = (typeof HIGH_RES_IMAGE_RESOLUTIONS)[number];

export const IMAGE_QUALITIES = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];
export const QUALITY_CAPABLE_IMAGE_MODELS = [
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
] as const;

export const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1';
export const DEFAULT_IMAGE_RESOLUTION: ImageResolution = 'standard';
export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';
export const STANDARD_IMAGE_GENERATION_CREDIT_COST = 1;
export const HIGH_RES_IMAGE_GENERATION_CREDIT_COST = 3;
export const SUNBURST_HIGH_RES_IMAGE_GENERATION_CREDIT_COST = 4;
export const DEFAULT_COUNT = 1;
export const MIN_COUNT = 1;
export const MAX_COUNT = 4;
export const MAX_REFERENCE_IMAGES = 4;

export interface AspectSize {
  size: string;
  width: number;
  height: number;
}

export const ASPECT_SIZE_MAP: Record<AspectRatio, AspectSize> = {
  '1:1': { size: '1024x1024', width: 1024, height: 1024 },
  '3:4': { size: '1024x1360', width: 1024, height: 1360 },
  '4:3': { size: '1360x1024', width: 1360, height: 1024 },
  '16:9': { size: '1792x1024', width: 1792, height: 1024 },
  '9:16': { size: '1024x1792', width: 1024, height: 1792 },
  '2:3': { size: '1024x1536', width: 1024, height: 1536 },
  '3:2': { size: '1536x1024', width: 1536, height: 1024 },
};

export const RESOLUTION_SIZE_MAP: Record<
  ImageResolution,
  Partial<Record<AspectRatio, AspectSize>>
> = {
  standard: ASPECT_SIZE_MAP,
  '2k': {
    '1:1': { size: '2048x2048', width: 2048, height: 2048 },
    '3:4': { size: '1536x2048', width: 1536, height: 2048 },
    '4:3': { size: '2048x1536', width: 2048, height: 1536 },
    '16:9': { size: '2048x1152', width: 2048, height: 1152 },
    '9:16': { size: '1152x2048', width: 1152, height: 2048 },
    '2:3': { size: '1360x2048', width: 1360, height: 2048 },
    '3:2': { size: '2048x1360', width: 2048, height: 1360 },
  },
  '4k': {
    '1:1': { size: '4096x4096', width: 4096, height: 4096 },
    '3:4': { size: '3072x4096', width: 3072, height: 4096 },
    '4:3': { size: '4096x3072', width: 4096, height: 3072 },
    '16:9': { size: '3840x2160', width: 3840, height: 2160 },
    '9:16': { size: '2160x3840', width: 2160, height: 3840 },
    '2:3': { size: '2720x4096', width: 2720, height: 4096 },
    '3:2': { size: '4096x2720', width: 4096, height: 2720 },
  },
};

export function aspectSizeForResolution(
  aspectRatio: AspectRatio,
  resolution: ImageResolution = DEFAULT_IMAGE_RESOLUTION,
): AspectSize | undefined {
  return RESOLUTION_SIZE_MAP[resolution][aspectRatio];
}

export function isAspectRatioSupportedForResolution(
  aspectRatio: AspectRatio,
  resolution: ImageResolution = DEFAULT_IMAGE_RESOLUTION,
): boolean {
  return aspectSizeForResolution(aspectRatio, resolution) !== undefined;
}

export function imageGenerationCreditCost(
  resolution: ImageResolution = DEFAULT_IMAGE_RESOLUTION,
  model?: string,
): number {
  if (resolution === DEFAULT_IMAGE_RESOLUTION) return STANDARD_IMAGE_GENERATION_CREDIT_COST;
  return model === 'gpt-image-2.5-sunburst'
    ? SUNBURST_HIGH_RES_IMAGE_GENERATION_CREDIT_COST
    : HIGH_RES_IMAGE_GENERATION_CREDIT_COST;
}

export function supportsImageQuality(model: string | undefined): boolean {
  return QUALITY_CAPABLE_IMAGE_MODELS.includes(
    model as (typeof QUALITY_CAPABLE_IMAGE_MODELS)[number],
  );
}

export interface GenerateInput {
  prompt: string;
  requestId?: string;
  signal?: AbortSignal;
  /** Server-resolved credential for this request. Never accepted from an HTTP request body. */
  providerCredential?: string;
  /**
   * Optional reference image path under UPLOAD_DIR.
   * Routes the request to /v1/images/edits.
   *
   * @deprecated Use referencePaths for new call sites.
   */
  referencePath?: string;
  /**
   * Optional reference image paths under UPLOAD_DIR.
   * Routes the request to /v1/images/edits and appends each item as an
   * `image` multipart field.
   */
  referencePaths?: string[];
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  quality?: ImageQuality;
}

export interface GenerateImageItem {
  /** Absolute path under OUTPUT_DIR. */
  outputPath: string;
  width: number;
  height: number;
}

export interface GenerateOutput {
  images: GenerateImageItem[];
  aspectRatio: AspectRatio;
  /** Provider-selected model after any resolution-specific override. */
  model?: string;
}
