import { stat } from 'node:fs/promises';
import path from 'node:path';

import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { resolveUploadPath } from '../storage/localStorage.js';

import type { ImageGenerationProvider } from './providers/ImageGenerationProvider.js';

export type GenerationMode = 'text-to-image' | 'image-to-image';

export interface GenerateImageInput {
  prompt: string;
  referenceId?: string;
  model?: string;
}

export interface GenerateImageOutput {
  /** Output filename (`<uuid>.png`) — also the path segment of outputUrl. */
  filename: string;
  /** Absolute path on disk under OUTPUT_DIR. */
  absolutePath: string;
  mime: string;
  width: number;
  height: number;
  mode: GenerationMode;
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

  logger.info(
    {
      promptLen: input.prompt.length,
      hasReference,
      model: input.model ?? '<default>',
    },
    'image generation: service invoke',
  );

  const result = await deps.provider.generate({
    prompt: input.prompt,
    ...(referencePath !== undefined ? { referencePath } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
  });

  return {
    filename: path.basename(result.outputPath),
    absolutePath: result.outputPath,
    // The provider currently writes PNGs; if it ever writes another format,
    // the saveOutput call would carry a different extension. Derive from
    // the actual filename so we stay honest.
    mime: mimeForExt(result.outputPath),
    width: result.width,
    height: result.height,
    mode: hasReference ? 'image-to-image' : 'text-to-image',
  };
}

function mimeForExt(absPath: string): string {
  const ext = path.extname(absPath).replace(/^\./, '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpeg' || ext === 'jpg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}
