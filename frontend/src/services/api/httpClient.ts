import type { ApiErrorEnvelope } from '@/types/image';
import { isRecord } from '@/utils/narrowing';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

let onUnauthorized: (() => void) | null = null;

/**
 * Register a callback fired whenever an API call returns 401 UNAUTHORIZED.
 * Wired at app startup from `main.ts` to the auth modal. Kept here instead
 * of importing a composable so `services/` remains Vue-free.
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

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, { credentials: 'include', ...init });
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

