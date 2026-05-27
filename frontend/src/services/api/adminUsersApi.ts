import type {
  AdminUser,
  AdminUserResponse,
  AdminUsersResponse,
  CreateAdminUserRequest,
  UpdateAdminUserQuotaRequest,
} from '@/types/admin';
import { isNumber, isRecord, readNumber, readString } from '@/utils/narrowing';

import { ImageApiError, authedFetch, buildApiError, buildApiUrl, parseJsonResponse } from './httpClient';

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await authedFetch(buildApiUrl('/api/admin/users'));
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isAdminUsersResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '用户管理接口返回了无法识别的响应。');
  }
  return payload.users;
}

export async function createAdminUser(request: CreateAdminUserRequest): Promise<AdminUser> {
  const response = await authedFetch(buildApiUrl('/api/admin/users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isAdminUserResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '创建用户接口返回了无法识别的响应。');
  }
  return payload.user;
}

export async function updateAdminUserQuota(
  userId: string,
  request: UpdateAdminUserQuotaRequest,
): Promise<AdminUser> {
  const response = await authedFetch(buildApiUrl(`/api/admin/users/${encodeURIComponent(userId)}/quota`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) throw buildApiError(response.status, payload);
  if (!isAdminUserResponse(payload)) {
    throw new ImageApiError(response.status, 'INVALID_RESPONSE', '额度接口返回了无法识别的响应。');
  }
  return payload.user;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const response = await authedFetch(buildApiUrl(`/api/admin/users/${encodeURIComponent(userId)}`), {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    const payload = await parseJsonResponse(response);
    throw buildApiError(response.status, payload);
  }
}

function isAdminQuotaState(value: unknown): value is AdminUser['quota'] {
  if (!isRecord(value)) return false;
  return (
    isNumber(readNumber(value, 'total')) &&
    isNumber(readNumber(value, 'usedToday')) &&
    isNumber(readNumber(value, 'remainingToday'))
  );
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!isRecord(value)) return false;
  const id = readString(value, 'id');
  const name = readString(value, 'name');
  const email = readString(value, 'email');
  const createdAt = readString(value, 'createdAt');
  const username = value.username;
  return (
    typeof id === 'string' &&
    (username === null || typeof username === 'string') &&
    typeof name === 'string' &&
    typeof email === 'string' &&
    typeof value.isAdmin === 'boolean' &&
    typeof createdAt === 'string' &&
    isAdminQuotaState(value.quota)
  );
}

function isAdminUsersResponse(value: unknown): value is AdminUsersResponse {
  if (!isRecord(value)) return false;
  return Array.isArray(value.users) && value.users.every(isAdminUser);
}

function isAdminUserResponse(value: unknown): value is AdminUserResponse {
  if (!isRecord(value)) return false;
  return isAdminUser(value.user);
}
