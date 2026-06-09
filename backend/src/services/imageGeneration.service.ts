import { stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { resolveUploadPath } from '../storage/localStorage.js';
import {
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  MAX_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_COUNT,
  type AspectRatio,
} from '../types/image.js';

import type { ImageGenerationProvider } from './providers/ImageGenerationProvider.js';
import type { QuotaPool } from './quota.service.js';

export type GenerationMode = 'text-to-image' | 'image-to-image';

export interface GenerateImageInput {
  prompt: string;
  referenceId?: string;
  referenceIds?: string[];
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
}

export interface GenerateImageItemOutput {
  /** Output filename (`<uuid>.png`) — also the path segment of outputUrl. */
  filename: string;
  /** Absolute path on disk under OUTPUT_DIR. */
  absolutePath: string;
  mime: string;
  width: number;
  height: number;
}

export interface GenerateImageOutput {
  /** Shared id across every image in this batch (UUID). */
  batchId: string;
  aspectRatio: AspectRatio;
  mode: GenerationMode;
  images: GenerateImageItemOutput[];
}

export interface ImageGenerationDeps {
  provider: ImageGenerationProvider;
  quotaPool?: QuotaPool;
}

/**
 * Orchestrates an image generation request.
 *
 * Pre-flight: when `referenceId` is set, verify the file exists under
 * UPLOAD_DIR before calling the provider. Returns BAD_REQUEST 400 if not —
 * we treat "client sent a stale id" as user error, not internal failure.
 */
export async function generateImage(
  input: GenerateImageInput,
  deps: ImageGenerationDeps,
): Promise<GenerateImageOutput> {
  const referenceIds = normalizeReferenceIds(input);
  const hasReference = referenceIds.length > 0;
  const referencePaths: string[] = [];

  for (const referenceId of referenceIds) {
    const resolved = resolveUploadPath(referenceId);
    try {
      const info = await stat(resolved.absolutePath);
      if (!info.isFile()) {
        throw new Error('not a regular file');
      }
    } catch (err) {
      throw new AppError('BAD_REQUEST', `Reference id not found: ${referenceId}`, 400, err, {
        referenceId,
      });
    }
    referencePaths.push(resolved.absolutePath);
  }

  const count = clampCount(input.count);
  deps.quotaPool?.ensureAvailable(count);
  const aspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  if (!ASPECT_RATIOS.includes(aspectRatio)) {
    throw new AppError('BAD_REQUEST', `Unsupported aspect ratio: ${aspectRatio}`, 400);
  }

  logger.info(
    {
      promptLen: input.prompt.length,
      hasReference,
      referenceCount: referenceIds.length,
      model: input.model ?? '<default>',
      count,
      aspectRatio,
    },
    'image generation: service invoke',
  );

  const result = await deps.provider.generate({
    prompt: input.prompt,
    count,
    aspectRatio,
    ...(referencePaths.length > 0 ? { referencePaths } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
  });

  if (result.images.length === 0) {
    throw new AppError('PROVIDER_EMPTY_RESULT', 'Provider returned zero images', 502, undefined, {
      reason: 'empty_result',
    });
  }

  deps.quotaPool?.consume(result.images.length);

  return {
    batchId: randomUUID(),
    aspectRatio: result.aspectRatio,
    mode: hasReference ? 'image-to-image' : 'text-to-image',
    images: result.images.map((image) => ({
      filename: path.basename(image.outputPath),
      absolutePath: image.outputPath,
      mime: mimeForExt(image.outputPath),
      width: image.width,
      height: image.height,
    })),
  };
}


function normalizeReferenceIds(input: GenerateImageInput): string[] {
  const raw = input.referenceIds ?? (input.referenceId !== undefined ? [input.referenceId] : []);
  const ids = Array.from(new Set(raw.map((id) => id.trim()).filter((id) => id.length > 0)));
  if (ids.length > MAX_REFERENCE_IMAGES) {
    throw new AppError(
      'BAD_REQUEST',
      `referenceIds cannot contain more than ${MAX_REFERENCE_IMAGES} images`,
      400,
      undefined,
      { max: MAX_REFERENCE_IMAGES },
    );
  }
  return ids;
}

function clampCount(value: number | undefined): number {
  if (value === undefined) return DEFAULT_COUNT;
  if (!Number.isInteger(value)) {
    throw new AppError('BAD_REQUEST', `count must be an integer (got ${value})`, 400);
  }
  if (value < MIN_COUNT || value > MAX_COUNT) {
    throw new AppError(
      'BAD_REQUEST',
      `count must be between ${MIN_COUNT} and ${MAX_COUNT} (got ${value})`,
      400,
    );
  }
  return value;
}

function mimeForExt(absPath: string): string {
  const ext = path.extname(absPath).replace(/^\./, '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpeg' || ext === 'jpg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}
