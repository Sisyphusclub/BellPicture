import {
  ASPECT_RATIOS,
  DEFAULT_IMAGE_RESOLUTION,
  type AspectRatio,
  type DailyCheckInResponse,
  type GenerateRequest,
  type GenerateResponse,
  type GenerateResponseItem,
  type GenerationMode,
  type ImageResolution,
  type QuotaResponse,
  type UploadResponse,
} from '@/types/image';
import { isNumber, isOptionalString, isRecord, readNumber, readString } from '@/utils/narrowing';

import {
  ImageApiError,
  authedFetch,
  buildApiError,
  buildApiUrl,
  parseJsonResponse,
  publicFetch,
  registerUnauthorizedHandler,
} from './httpClient';

export { ImageApiError, buildApiUrl, registerUnauthorizedHandler };

export async function fetchImageQuota(): Promise<QuotaResponse> {
  const response = await authedFetch(buildApiUrl('/api/images/quota'));
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isQuotaResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '额度接口返回了无法识别的响应。');
  }
  return payload;
}

export async function claimDailyCheckIn(): Promise<DailyCheckInResponse> {
  const response = await authedFetch(buildApiUrl('/api/images/quota/check-in'), {
    method: 'POST',
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isDailyCheckInResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '签到接口返回了无法识别的响应。');
  }
  return payload;
}

export async function uploadReferenceImage(
  file: File,
  signal?: AbortSignal,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('image', file);

  const response = await authedFetch(buildApiUrl('/api/images/upload'), {
    method: 'POST',
    body: form,
    ...(signal === undefined ? {} : { signal }),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isUploadResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '上传接口返回了无法识别的响应。');
  }
  return payload;
}

export async function uploadReferenceImages(
  files: readonly File[],
  signal?: AbortSignal,
): Promise<UploadResponse[]> {
  const uploads: UploadResponse[] = [];
  for (const file of files) {
    uploads.push(await uploadReferenceImage(file, signal));
  }
  return uploads;
}

export async function generateImage(
  request: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  const response = await authedFetch(buildApiUrl(generateEndpointForRequest(request)), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    ...(signal === undefined ? {} : { signal }),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isGenerateResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '生成接口返回了无法识别的响应。');
  }
  return payload;
}

function generateEndpointForRequest(request: GenerateRequest): string {
  return request.resolution !== undefined && request.resolution !== DEFAULT_IMAGE_RESOLUTION
    ? '/api/images/generate/high-res'
    : '/api/images/generate';
}

function normalizeReferenceIds(
  referenceIds: string[] | undefined,
  referenceId: string | undefined,
): string[] {
  const raw =
    referenceIds ??
    (isOptionalString(referenceId) && referenceId !== undefined ? [referenceId] : []);
  return Array.from(new Set(raw.map((id) => id.trim()).filter((id) => id.length > 0)));
}

export function toDisplayImageUrl(outputUrl: string): string {
  return /^https?:\/\//u.test(outputUrl) ? outputUrl : buildApiUrl(outputUrl);
}

export async function fetchOutputBlob(outputUrl: string, signal?: AbortSignal): Promise<Blob> {
  const response = await publicFetch(toDisplayImageUrl(outputUrl), {
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw buildApiError(response.status, payload);
  }
  return response.blob();
}

function isQuotaResponse(value: unknown): value is QuotaResponse {
  if (!isRecord(value)) return false;
  return (
    isNumber(readNumber(value, 'total')) &&
    isNumber(readNumber(value, 'remaining')) &&
    typeof value.checkedInToday === 'boolean' &&
    isNumber(readNumber(value, 'dailyCheckInReward')) &&
    (value.permanentTotal === undefined || isNumber(readNumber(value, 'permanentTotal'))) &&
    (value.permanentUsed === undefined || isNumber(readNumber(value, 'permanentUsed'))) &&
    (value.permanentRemaining === undefined || isNumber(readNumber(value, 'permanentRemaining'))) &&
    (value.bonusRemaining === undefined || isNumber(readNumber(value, 'bonusRemaining'))) &&
    (value.bonusExpiresAt === undefined ||
      value.bonusExpiresAt === null ||
      typeof value.bonusExpiresAt === 'string')
  );
}

function isDailyCheckInResponse(value: unknown): value is DailyCheckInResponse {
  return isQuotaResponse(value) && 'claimed' in value && typeof value.claimed === 'boolean';
}

function isUploadResponse(value: unknown): value is UploadResponse {
  if (!isRecord(value)) return false;
  return (
    isStringValue(readString(value, 'id')) &&
    isStringValue(readString(value, 'filename')) &&
    isStringValue(readString(value, 'mime')) &&
    isNumber(readNumber(value, 'size'))
  );
}

function isGenerateResponseItem(value: unknown): value is GenerateResponseItem {
  if (!isRecord(value)) return false;
  return (
    isStringValue(readString(value, 'id')) &&
    isStringValue(readString(value, 'outputUrl')) &&
    isStringValue(readString(value, 'filename')) &&
    isStringValue(readString(value, 'mime')) &&
    isNumber(readNumber(value, 'width')) &&
    isNumber(readNumber(value, 'height'))
  );
}

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (!isRecord(value)) return false;
  if (!isStringValue(readString(value, 'batchId'))) return false;
  if (!isAspectRatio(value.aspectRatio)) return false;
  if (!isGenerationMode(value.generationMode)) return false;
  const images = value.images;
  if (!Array.isArray(images) || images.length === 0) return false;
  return images.every(isGenerateResponseItem);
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value);
}

function isGenerationMode(value: unknown): value is GenerationMode {
  return value === 'text-to-image' || value === 'image-to-image';
}

function isStringValue(value: string | null): value is string {
  return typeof value === 'string';
}

export function createGenerateRequest(input: {
  prompt: string;
  referenceId?: string;
  referenceIds?: string[];
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  isPublic?: boolean;
  demoPresetId?: string;
}): GenerateRequest {
  const request: GenerateRequest = {
    prompt: input.prompt,
  };
  const referenceIds = normalizeReferenceIds(input.referenceIds, input.referenceId);
  if (referenceIds.length > 0) {
    request.referenceIds = referenceIds;
    const firstReferenceId = referenceIds[0];
    if (firstReferenceId !== undefined) request.referenceId = firstReferenceId;
  }
  if (isOptionalString(input.model) && input.model !== undefined) {
    request.model = input.model;
  }
  if (typeof input.count === 'number') {
    request.count = input.count;
  }
  if (input.aspectRatio !== undefined) {
    request.aspectRatio = input.aspectRatio;
  }
  if (input.resolution !== undefined) {
    request.resolution = input.resolution;
  }
  if (input.isPublic !== undefined) {
    request.isPublic = input.isPublic;
  }
  if (input.demoPresetId !== undefined) {
    request.demoPresetId = input.demoPresetId;
  }
  return request;
}
