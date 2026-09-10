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

export async function saveImageApiKey(apiKey: string): Promise<ImageApiKeyStatus> {
  return requestStatus(
    await authedFetch(buildApiUrl(ENDPOINT), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }),
  );
}

export async function deleteImageApiKey(): Promise<ImageApiKeyStatus> {
  return requestStatus(
    await authedFetch(buildApiUrl(ENDPOINT), {
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
  if (!value.configured) return keys.length === 1 && keys[0] === 'configured';
  return (
    keys.length === 2 &&
    keys.includes('configured') &&
    keys.includes('keySuffix') &&
    typeof value.keySuffix === 'string' &&
    value.keySuffix.length > 0 &&
    value.keySuffix.length <= 4
  );
}
