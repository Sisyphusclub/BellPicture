export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'PAYLOAD_TOO_LARGE'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_PROMPT_REJECTED'
  | 'PROVIDER_EMPTY_RESULT'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMITED'
  | 'REQUEST_ABORTED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'STORAGE_ERROR'
  | 'INTERNAL';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    cause?: unknown,
    details?: Record<string, unknown>,
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    if (details !== undefined) {
      this.details = details;
    }
  }
}
