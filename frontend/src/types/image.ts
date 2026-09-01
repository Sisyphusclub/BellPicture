export type GenerationMode = 'text-to-image' | 'image-to-image';

export const ASPECT_RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const ASPECT_CHOICES = ['auto', ...ASPECT_RATIOS] as const;
export type AspectChoice = (typeof ASPECT_CHOICES)[number];

export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  '1:1': '1:1（正方形）',
  '3:2': '3:2（横向）',
  '2:3': '2:3（纵向）',
  '16:9': '16:9（宽屏）',
  '9:16': '9:16（竖屏）',
};

export const ASPECT_CHOICE_LABELS: Record<AspectChoice, string> = {
  auto: '智能',
  '1:1': '1:1（正方形）',
  '3:2': '3:2（横向）',
  '2:3': '2:3（纵向）',
  '16:9': '16:9（宽屏）',
  '9:16': '9:16（竖屏）',
};

export const DEFAULT_ASPECT_CHOICE: AspectChoice = 'auto';
export const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1';
export const IMAGE_RESOLUTIONS = ['standard', '2k', '4k'] as const;
export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number];
export const FOUR_K_ASPECT_RATIOS = ['16:9', '9:16'] as const;
export const IMAGE_RESOLUTION_LABELS: Record<ImageResolution, string> = {
  standard: '1K',
  '2k': '2K',
  '4k': '4K',
};
export const DEFAULT_IMAGE_RESOLUTION: ImageResolution = 'standard';
export const IMAGE_GENERATION_CREDIT_COST = 1;
export const DEFAULT_COUNT = 1;
export const MIN_COUNT = 1;
export const MAX_COUNT = 4;
export const MAX_REFERENCE_IMAGES = 4;

export interface ImageRecord {
  id: string;
  /** Shared across every record in the same generate batch. Optional for entries
   * created before this field was introduced. */
  batchId?: string;
  createdAt: string;
  prompt: string;
  model: string;
  referenceId?: string;
  referenceIds?: readonly string[];
  aspectRatio?: AspectRatio;
  width: number;
  height: number;
  count?: number;
  resolution?: ImageResolution;
  /** Wall-clock ms from request start to image saved. Optional. */
  elapsedMs?: number;
  isPublic: boolean;
  isFavorite?: boolean;
  collection?: string;
}

export interface GenerationSettingsSnapshot {
  prompt: string;
  model: string;
  count: number;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  isPublic: boolean;
  referenceIds: readonly string[];
}

export interface ImageMetadataUpdate {
  isFavorite?: boolean;
  isPublic?: boolean;
  collection?: string | null;
}

export interface UploadResponse {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

export interface GenerateRequest {
  prompt: string;
  referenceId?: string;
  referenceIds?: readonly string[];
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  isPublic?: boolean;
  demoPresetId?: string;
}

export interface GenerateResponseItem {
  id: string;
  outputUrl: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
}

export interface GenerateResponse {
  batchId: string;
  aspectRatio: AspectRatio;
  generationMode: GenerationMode;
  images: GenerateResponseItem[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

export interface QuotaResponse {
  total: number;
  remaining: number;
  checkedInToday: boolean;
  dailyCheckInReward: number;
  permanentTotal?: number;
  permanentUsed?: number;
  permanentRemaining?: number;
  bonusRemaining?: number;
  bonusExpiresAt?: string | null;
}

export interface DailyCheckInResponse extends QuotaResponse {
  claimed: boolean;
}

export interface HistoryEntry {
  record: ImageRecord;
  imageUrl: string;
  size?: number;
}

export interface GeneratedBatchResult {
  batchId: string;
  aspectRatio: AspectRatio;
  generationMode: GenerationMode;
  entries: HistoryEntry[];
}
