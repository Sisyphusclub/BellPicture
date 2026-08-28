import {
  ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  type AspectRatio,
  type ImageMetadataUpdate,
  type ImageRecord,
  type ImageResolution,
} from '@/types/image';
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
  nextCursor?: string;
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

export async function fetchPublicHistory(
  input: {
    cursor?: string;
    limit?: number;
  } = {},
): Promise<HistoryListResponse> {
  const query = new URLSearchParams();
  if (input.cursor !== undefined) query.set('cursor', input.cursor);
  if (input.limit !== undefined) query.set('limit', String(input.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const response = await publicFetch(buildApiUrl(`/api/history/public${suffix}`));
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isHistoryListResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '公开画廊返回了无法识别的响应。');
  }
  return payload;
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

export async function deletePublicGalleryRecordAsAdmin(id: string): Promise<void> {
  const response = await authedFetch(buildApiUrl(`/api/history/public/${encodeURIComponent(id)}`), {
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

export async function updateHistoryRecord(
  id: string,
  updates: ImageMetadataUpdate,
): Promise<ImageRecord> {
  const response = await authedFetch(buildApiUrl(`/api/history/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isRecordResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '资产更新返回了无法识别的响应。');
  }
  return payload.record;
}

export async function updateHistoryRecords(
  ids: readonly string[],
  updates: ImageMetadataUpdate,
): Promise<ImageRecord[]> {
  const response = await authedFetch(buildApiUrl('/api/history'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, updates }),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isHistoryListResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '批量更新返回了无法识别的响应。');
  }
  return payload.records;
}

export async function deleteHistoryRecords(ids: readonly string[]): Promise<number> {
  const response = await authedFetch(buildApiUrl('/api/history/bulk-delete'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isRecord(payload) || typeof payload.removed !== 'number') {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '批量删除返回了无法识别的响应。');
  }
  return payload.removed;
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value);
}

function isImageResolution(value: unknown): value is ImageResolution {
  return typeof value === 'string' && (IMAGE_RESOLUTIONS as readonly string[]).includes(value);
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
  const referenceIds = value.referenceIds;
  const aspectRatio = value.aspectRatio;
  const elapsedMs = value.elapsedMs;
  const isPublic = value.isPublic;
  const count = value.count;
  const resolution = value.resolution;
  const isFavorite = value.isFavorite;
  const collection = value.collection;
  return (
    (batchId === undefined || typeof batchId === 'string') &&
    (referenceId === undefined || typeof referenceId === 'string') &&
    (referenceIds === undefined || isStringArray(referenceIds)) &&
    (aspectRatio === undefined || isAspectRatio(aspectRatio)) &&
    (elapsedMs === undefined || typeof elapsedMs === 'number') &&
    (count === undefined || typeof count === 'number') &&
    (resolution === undefined || isImageResolution(resolution)) &&
    (isFavorite === undefined || typeof isFavorite === 'boolean') &&
    (collection === undefined || typeof collection === 'string') &&
    typeof isPublic === 'boolean'
  );
}

function isRecordResponse(value: unknown): value is { record: ImageRecord } {
  return isRecord(value) && isImageRecord(value.record);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isHistoryListResponse(value: unknown): value is HistoryListResponse {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.records)) return false;
  return (
    value.records.every(isImageRecord) &&
    (value.nextCursor === undefined || typeof value.nextCursor === 'string')
  );
}
