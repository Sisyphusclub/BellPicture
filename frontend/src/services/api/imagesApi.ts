import {
  ASPECT_RATIOS,
  type AspectRatio,
  type GenerateRequest,
  type GenerateResponse,
  type GenerateResponseItem,
  type GenerationMode,
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

export async function uploadReferenceImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('image', file);

  const response = await authedFetch(buildApiUrl('/api/images/upload'), {
    method: 'POST',
    body: form,
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isUploadResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '上传接口返回了无法识别的响应。');
  }
  return payload;
}

export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await authedFetch(buildApiUrl('/api/images/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isGenerateResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '生成接口返回了无法识别的响应。');
  }
  return payload;
}

export function toDisplayImageUrl(outputUrl: string): string {
  return buildApiUrl(outputUrl);
}

function isQuotaResponse(value: unknown): value is QuotaResponse {
  if (!isRecord(value)) return false;
  return isNumber(readNumber(value, 'total')) && isNumber(readNumber(value, 'remaining'));
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
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
}): GenerateRequest {
  const request: GenerateRequest = {
    prompt: input.prompt,
  };
  if (isOptionalString(input.referenceId) && input.referenceId !== undefined) {
    request.referenceId = input.referenceId;
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
  return request;
}
