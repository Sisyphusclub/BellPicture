import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

const DEFAULT_SIGNED_OUTPUT_TTL_SECONDS = 60 * 60;

export function createSignedOutputPath(
  filename: string,
  nowMs = Date.now(),
  ttlSeconds = DEFAULT_SIGNED_OUTPUT_TTL_SECONDS,
): string {
  const expiresAt = Math.floor(nowMs / 1000) + ttlSeconds;
  const signature = sign(filename, expiresAt);
  return `/api/outputs/${encodeURIComponent(filename)}?expires=${expiresAt}&signature=${signature}`;
}

export function isValidSignedOutputRequest(input: {
  filename: string;
  expires: unknown;
  signature: unknown;
  nowMs?: number;
}): boolean {
  if (typeof input.expires !== 'string' || typeof input.signature !== 'string') return false;
  if (!/^\d{10}$/.test(input.expires) || !/^[0-9a-f]{64}$/i.test(input.signature)) return false;

  const expiresAt = Number(input.expires);
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < nowSeconds) return false;

  const expected = Buffer.from(sign(input.filename, expiresAt), 'hex');
  const actual = Buffer.from(input.signature, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sign(filename: string, expiresAt: number): string {
  return createHmac('sha256', env.BETTER_AUTH_SECRET)
    .update(`${filename}\n${expiresAt}`)
    .digest('hex');
}
