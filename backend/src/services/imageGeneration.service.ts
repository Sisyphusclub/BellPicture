import { stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { removeOutput, resolveUploadPath } from '../storage/localStorage.js';
import {
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  IMAGE_RESOLUTIONS,
  MAX_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_COUNT,
  isAspectRatioSupportedForResolution,
  type AspectRatio,
  type GenerateOutput,
  type ImageResolution,
} from '../types/image.js';

import type { ImageGenerationProvider } from './providers/ImageGenerationProvider.js';
import type { QuotaPool } from './quota.service.js';
import { assertReferenceUploadOwnedBy } from './referenceUpload.service.js';

export type GenerationMode = 'text-to-image' | 'image-to-image';

export interface GenerateImageInput {
  prompt: string;
  referenceId?: string;
  referenceIds?: string[];
  model?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  userId?: string;
  requestId?: string;
  signal?: AbortSignal;
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
  /** Provider-selected model after any resolution-specific override. */
  model?: string;
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
    throwIfAborted(input.signal);
    if (input.userId !== undefined) {
      assertReferenceUploadOwnedBy(referenceId, input.userId);
    }
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
  const aspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  if (!ASPECT_RATIOS.includes(aspectRatio)) {
    throw new AppError('BAD_REQUEST', `Unsupported aspect ratio: ${aspectRatio}`, 400);
  }
  const resolution = input.resolution ?? DEFAULT_IMAGE_RESOLUTION;
  if (!IMAGE_RESOLUTIONS.includes(resolution)) {
    throw new AppError('BAD_REQUEST', `Unsupported image resolution: ${resolution}`, 400);
  }
  if (!isAspectRatioSupportedForResolution(aspectRatio, resolution)) {
    throw new AppError(
      'BAD_REQUEST',
      `Unsupported aspect ratio ${aspectRatio} for image resolution ${resolution}`,
      400,
      undefined,
      { aspectRatio, resolution },
    );
  }

  logger.info(
    {
      requestId: input.requestId,
      promptLen: input.prompt.length,
      hasReference,
      referenceCount: referenceIds.length,
      model: input.model ?? '<default>',
      count,
      aspectRatio,
      resolution,
    },
    'image generation: service invoke',
  );

  throwIfAborted(input.signal);
  const reservation = deps.quotaPool?.reserve(count);
  let generatedResult: GenerateOutput | undefined;
  try {
    generatedResult = await deps.provider.generate({
      prompt: input.prompt,
      count,
      aspectRatio,
      ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
      ...(input.signal !== undefined ? { signal: input.signal } : {}),
      ...(input.resolution !== undefined ? { resolution } : {}),
      ...(referencePaths.length > 0 ? { referencePaths } : {}),
      ...(input.model !== undefined ? { model: input.model } : {}),
    });

    if (generatedResult.images.length === 0) {
      throw new AppError('PROVIDER_EMPTY_RESULT', 'Provider returned zero images', 502, undefined, {
        reason: 'empty_result',
      });
    }
    if (generatedResult.images.length > count) {
      await Promise.all(generatedResult.images.map((image) => removeOutput(image.outputPath)));
      throw new AppError(
        'INTERNAL',
        'Provider returned more images than requested',
        500,
        undefined,
        {
          requested: count,
          received: generatedResult.images.length,
        },
      );
    }
    if (input.signal?.aborted === true) {
      await Promise.all(generatedResult.images.map((image) => removeOutput(image.outputPath)));
      throw requestAbortedError(input.signal.reason);
    }
    reservation?.commit(generatedResult.images.length);

    return {
      batchId: randomUUID(),
      aspectRatio: generatedResult.aspectRatio,
      mode: hasReference ? 'image-to-image' : 'text-to-image',
      ...(generatedResult.model !== undefined ? { model: generatedResult.model } : {}),
      images: generatedResult.images.map((image) => ({
        filename: path.basename(image.outputPath),
        absolutePath: image.outputPath,
        mime: mimeForExt(image.outputPath),
        width: image.width,
        height: image.height,
      })),
    };
  } catch (err) {
    if (generatedResult !== undefined) {
      await Promise.all(
        generatedResult.images.map(async (image) => {
          try {
            await removeOutput(image.outputPath);
          } catch (cleanupError) {
            logger.warn(
              { requestId: input.requestId, outputPath: image.outputPath, err: cleanupError },
              'image generation: failed to remove output after settlement error',
            );
          }
        }),
      );
    }
    if (reservation !== undefined) {
      try {
        reservation.release();
      } catch (releaseError) {
        logger.error(
          { requestId: input.requestId, err: releaseError },
          'image generation: failed to release quota reservation',
        );
      }
    }
    throw err;
  }
}

export async function assertReferenceImagesOwnedByUser(
  referenceIds: readonly string[],
  userId: string,
  signal?: AbortSignal,
): Promise<void> {
  for (const referenceId of referenceIds) {
    throwIfAborted(signal);
    assertReferenceUploadOwnedBy(referenceId, userId);
    const resolved = resolveUploadPath(referenceId);
    try {
      const info = await stat(resolved.absolutePath);
      if (!info.isFile()) throw new Error('not a regular file');
    } catch (err) {
      throw new AppError('BAD_REQUEST', `Reference id not found: ${referenceId}`, 400, err, {
        referenceId,
      });
    }
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw requestAbortedError(signal.reason);
}

function requestAbortedError(cause: unknown): AppError {
  return new AppError('REQUEST_ABORTED', 'Image generation request was cancelled', 499, cause);
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
