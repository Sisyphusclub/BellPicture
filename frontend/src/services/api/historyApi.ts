import { ASPECT_RATIOS, type AspectRatio, type ImageRecord } from '@/types/image';
import { isNumber, isRecord, readNumber, readString } from '@/utils/narrowing';

import {
  ImageApiError,
  authedFetch,
  buildApiError,
  buildApiUrl,
  parseJsonResponse,
  publicFetch,
} from './httpClient';

export interface HistoryListResponse {
  records: ImageRecord[];
}

export async function fetchHistory(): Promise<ImageRecord[]> {
  const response = await authedFetch(buildApiUrl('/api/history'));
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isHistoryListResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '历史接口返回了无法识别的响应。');
  }
  return payload.records;
}

export async function fetchPublicHistory(): Promise<ImageRecord[]> {
  const response = await publicFetch(buildApiUrl('/api/history/public'));
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isHistoryListResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '公开画廊返回了无法识别的响应。');
  }
  return payload.records;
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const response = await authedFetch(buildApiUrl(`/api/history/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    const payload = await parseJsonResponse(response);
    throw buildApiError(response.status, payload);
  }
}

export async function deleteHistoryBatch(batchId: string): Promise<void> {
  const response = await authedFetch(
    buildApiUrl(`/api/history/batch/${encodeURIComponent(batchId)}`),
    { method: 'DELETE' },
  );
  if (!response.ok && response.status !== 204) {
    const payload = await parseJsonResponse(response);
    throw buildApiError(response.status, payload);
  }
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value);
}

function isImageRecord(value: unknown): value is ImageRecord {
  if (!isRecord(value)) return false;
  const id = readString(value, 'id');
  const createdAt = readString(value, 'createdAt');
  const prompt = readString(value, 'prompt');
  const model = readString(value, 'model');
  const width = readNumber(value, 'width');
  const height = readNumber(value, 'height');
  if (typeof id !== 'string') return false;
  if (typeof createdAt !== 'string') return false;
  if (typeof prompt !== 'string') return false;
  if (typeof model !== 'string') return false;
  if (!isNumber(width) || !isNumber(height)) return false;
  const batchId = value.batchId;
  const referenceId = value.referenceId;
  const aspectRatio = value.aspectRatio;
  const elapsedMs = value.elapsedMs;
  const isPublic = value.isPublic;
  return (
    (batchId === undefined || typeof batchId === 'string') &&
    (referenceId === undefined || typeof referenceId === 'string') &&
    (aspectRatio === undefined || isAspectRatio(aspectRatio)) &&
    (elapsedMs === undefined || typeof elapsedMs === 'number') &&
    typeof isPublic === 'boolean'
  );
}

function isHistoryListResponse(value: unknown): value is HistoryListResponse {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.records)) return false;
  return value.records.every(isImageRecord);
}
