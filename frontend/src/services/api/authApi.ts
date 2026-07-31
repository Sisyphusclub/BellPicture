import { isRecord, readString } from '@/utils/narrowing';

import {
  ImageApiError,
  authedFetch,
  buildApiError,
  buildApiUrl,
  parseJsonResponse,
} from './httpClient';

export interface AuthUserProfile {
  id: string;
  email: string;
  username?: string | null;
  name?: string;
  image?: string | null;
  isAdmin: boolean;
}

interface AuthMeResponse {
  user: AuthUserProfile;
}

export async function fetchAuthProfile(): Promise<AuthUserProfile> {
  const response = await authedFetch(buildApiUrl('/api/auth/me'));
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isAuthMeResponse(payload)) {
    throw new ImageApiError(
      response.status,
      'INVALID_RESPONSE',
      '登录状态接口返回了无法识别的响应。',
    );
  }
  return payload.user;
}

function isAuthUserProfile(value: unknown): value is AuthUserProfile {
  if (!isRecord(value)) return false;
  const id = readString(value, 'id');
  const email = readString(value, 'email');
  const username = value.username;
  const name = value.name;
  const image = value.image;
  return (
    typeof id === 'string' &&
    typeof email === 'string' &&
    (username === undefined || username === null || typeof username === 'string') &&
    (name === undefined || typeof name === 'string') &&
    (image === undefined || image === null || typeof image === 'string') &&
    typeof value.isAdmin === 'boolean'
  );
}

function isAuthMeResponse(value: unknown): value is AuthMeResponse {
  if (!isRecord(value)) return false;
  return isAuthUserProfile(value.user);
}
