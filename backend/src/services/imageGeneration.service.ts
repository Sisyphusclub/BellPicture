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
  MIN_COUNT,
  type AspectRatio,
} from '../types/image.js';

import type { ImageGenerationProvider } from './providers/ImageGenerationProvider.js';

export type GenerationMode = 'text-to-image' | 'image-to-image';

export interface GenerateImageInput {
  prompt: string;
  referenceId?: string;
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
  const hasReference = typeof input.referenceId === 'string' && input.referenceId.length > 0;
  let referencePath: string | undefined;

  if (hasReference) {
    const resolved = resolveUploadPath(input.referenceId as string);
    try {
      const info = await stat(resolved.absolutePath);
      if (!info.isFile()) {
        throw new Error('not a regular file');
      }
    } catch (err) {
      throw new AppError(
        'BAD_REQUEST',
        `Reference id not found: ${input.referenceId as string}`,
        400,
        err,
        { referenceId: input.referenceId },
      );
    }
    referencePath = resolved.absolutePath;
  }

  const count = clampCount(input.count);
  const aspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  if (!ASPECT_RATIOS.includes(aspectRatio)) {
    throw new AppError('BAD_REQUEST', `Unsupported aspect ratio: ${aspectRatio}`, 400);
  }

  logger.info(
    {
      promptLen: input.prompt.length,
      hasReference,
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
    ...(referencePath !== undefined ? { referencePath } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
  });

  if (result.images.length === 0) {
    throw new AppError('PROVIDER_ERROR', 'Provider returned zero images', 502);
  }

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
