import type {
  ApiErrorEnvelope,
  GenerateRequest,
  GenerateResponse,
  GenerationMode,
  UploadResponse,
} from '@/types/image';
import { isNumber, isOptionalString, isRecord, readNumber, readString } from '@/utils/narrowing';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export class ImageApiError extends Error {
  public override readonly name = 'ImageApiError';

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function uploadReferenceImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('image', file);

  const response = await fetch(buildApiUrl('/api/images/upload'), {
    method: 'POST',
    body: form,
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildError(response.status, payload);
  if (!isUploadResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '上传接口返回了无法识别的响应。');
  }
  return payload;
}

export async function generateImage(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(buildApiUrl('/api/images/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildError(response.status, payload);
  if (!isGenerateResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '生成接口返回了无法识别的响应。');
  }
  return payload;
}

export async function fetchOutputBlob(outputUrl: string): Promise<Blob> {
  const response = await fetch(buildApiUrl(outputUrl));
  if (!response.ok) {
    const payload = await parseJsonResponse(response);
    throw buildError(response.status, payload);
  }
  return response.blob();
}

export function toDisplayImageUrl(outputUrl: string): string {
  return buildApiUrl(outputUrl);
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    return null;
  }
}

function buildError(status: number, payload: unknown): ImageApiError {
  if (isApiErrorEnvelope(payload)) {
    const { error } = payload;
    return new ImageApiError(status, error.code, error.message, error.requestId, error.details);
  }
  return new ImageApiError(status, 'HTTP_ERROR', `请求失败，状态码 ${status}。`);
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value)) return false;
  const error = value.error;
  if (!isRecord(error)) return false;
  const details = error.details;
  return (
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.requestId === 'string' &&
    (details === undefined || isRecord(details))
  );
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

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (!isRecord(value)) return false;
  return (
    isStringValue(readString(value, 'id')) &&
    isStringValue(readString(value, 'outputUrl')) &&
    isStringValue(readString(value, 'filename')) &&
    isStringValue(readString(value, 'mime')) &&
    isNumber(readNumber(value, 'width')) &&
    isNumber(readNumber(value, 'height')) &&
    isGenerationMode(value.generationMode)
  );
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
  return request;
}
