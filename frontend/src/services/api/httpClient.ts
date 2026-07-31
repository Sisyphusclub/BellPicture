import type { ApiErrorEnvelope } from '@/types/image';
import { isRecord } from '@/utils/narrowing';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const NETWORK_ERROR_MESSAGE = '无法连接到服务器，请检查网络或稍后重试。';

let onUnauthorized: (() => void) | null = null;

/**
 * Register a callback fired whenever an API call returns 401 UNAUTHORIZED.
 * Wired at app startup from `main.tsx` to the auth modal. Kept here instead
 * of importing a React hook so `services/` remains framework-neutral.
 */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

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

export async function publicFetch(input: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    throw new ImageApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE, undefined, {
      cause: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, { credentials: 'include', ...init });
  } catch (err) {
    // Native fetch failures (TypeError: Failed to fetch, DNS, CORS, abort, etc.)
    // throw raw English Error instances. Wrap them in an ImageApiError carrying
    // a Simplified-Chinese message so every API caller in the app sees a
    // localized failure shape and never leaks a browser-native string to the UI.
    throw new ImageApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE, undefined, {
      cause: err instanceof Error ? err.message : String(err),
    });
  }
  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
  return response;
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    return null;
  }
}

export function buildApiError(status: number, payload: unknown): ImageApiError {
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
