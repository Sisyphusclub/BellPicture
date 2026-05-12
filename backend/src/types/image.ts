export const ASPECT_RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1';
export const DEFAULT_COUNT = 2;
export const MIN_COUNT = 1;
export const MAX_COUNT = 4;

export interface AspectSize {
  size: string;
  width: number;
  height: number;
}

export const ASPECT_SIZE_MAP: Record<AspectRatio, AspectSize> = {
  '1:1': { size: '1024x1024', width: 1024, height: 1024 },
  '3:2': { size: '1536x1024', width: 1536, height: 1024 },
  '2:3': { size: '1024x1536', width: 1024, height: 1536 },
  '16:9': { size: '1792x1024', width: 1792, height: 1024 },
  '9:16': { size: '1024x1792', width: 1024, height: 1792 },
};

export interface GenerateInput {
  prompt: string;
  /**
   * Optional reference image path under UPLOAD_DIR.
   * Routes the request to /v1/images/edits.
   */
  referencePath?: string;
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
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
}
