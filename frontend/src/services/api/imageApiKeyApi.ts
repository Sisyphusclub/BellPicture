import type { ImageApiKeyStatus } from '@/types/settings';
import { isRecord } from '@/utils/narrowing';

import {
  ImageApiError,
  authedFetch,
  buildApiError,
  buildApiUrl,
  parseJsonResponse,
} from './httpClient';

const ENDPOINT = '/api/settings/image-api-key';

export async function fetchImageApiKeyStatus(): Promise<ImageApiKeyStatus> {
  return requestStatus(await authedFetch(buildApiUrl(ENDPOINT)));
}

export async function saveImageApiKey(
  apiKey: string,
  group: 'standard' | 'high-res' = 'standard',
): Promise<ImageApiKeyStatus> {
  return requestStatus(
    await authedFetch(buildApiUrl(ENDPOINT), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group === 'standard' ? { apiKey } : { apiKey, group }),
    }),
  );
}

export async function deleteImageApiKey(
  group: 'standard' | 'high-res' = 'standard',
): Promise<ImageApiKeyStatus> {
  return requestStatus(
    await authedFetch(buildApiUrl(group === 'standard' ? ENDPOINT : `${ENDPOINT}?group=${group}`), {
      method: 'DELETE',
    }),
  );
}

async function requestStatus(response: Response): Promise<ImageApiKeyStatus> {
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isImageApiKeyStatus(payload)) {
    throw new ImageApiError(
      response.status,
      'INVALID_RESPONSE',
      '生图 API Key 接口返回了无法识别的响应。',
    );
  }
  return payload;
}

function isImageApiKeyStatus(value: unknown): value is ImageApiKeyStatus {
  if (!isRecord(value) || typeof value.configured !== 'boolean') return false;
  const keys = Object.keys(value);
  const allowed = ['configured', 'keySuffix', 'highResConfigured', 'highResKeySuffix'];
  if (keys.some((key) => !allowed.includes(key))) return false;
  if (value.configured !== isValidSuffix(value.keySuffix)) return false;
  if (value.highResConfigured !== undefined && typeof value.highResConfigured !== 'boolean') {
    return false;
  }
  const highResConfigured = value.highResConfigured === true;
  return highResConfigured === isValidSuffix(value.highResKeySuffix);
}

function isValidSuffix(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= 4;
}
