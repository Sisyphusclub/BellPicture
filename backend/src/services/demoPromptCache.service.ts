import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import { AppError } from '../errors/AppError.js';
import {
  copyInternalOutputToSavedOutput,
  copyOutputToInternalOutput,
  internalOutputFileExists,
  readInternalOutputTextFile,
  writeInternalOutputFile,
} from '../storage/localStorage.js';
import { type AspectRatio } from '../types/image.js';

import type { GenerateImageOutput } from './imageGeneration.service.js';

const CACHE_FILE_PREFIX = 'demo-prompt-';
const CACHE_META_PREFIX = 'demo-prompt-meta-';

export interface DemoPromptCacheConfig {
  prompts: readonly string[];
  delayMs: number;
}

export interface DemoPromptCacheHit {
  key: string;
}

interface DemoPromptMeta {
  width: number;
  height: number;
  mime: string;
  aspectRatio: AspectRatio;
  mode: GenerateImageOutput['mode'];
}

export function findDemoPromptCacheHit(
  prompt: string,
  config: DemoPromptCacheConfig,
): DemoPromptCacheHit | null {
  const normalizedPrompt = normalizePrompt(prompt);
  if (normalizedPrompt.length === 0) return null;

  for (const configuredPrompt of config.prompts) {
    if (normalizePrompt(configuredPrompt) === normalizedPrompt) {
      return {
        key: cacheKey(normalizedPrompt),
      };
    }
  }
  return null;
}

export async function readCachedDemoPromptImage(
  hit: DemoPromptCacheHit,
  config: DemoPromptCacheConfig,
  modeOverride?: GenerateImageOutput['mode'],
): Promise<GenerateImageOutput | null> {
  const meta = await readCacheMeta(hit.key);
  if (meta === null) return null;

  const imageFilename = cacheImageFilename(hit.key);
  const hasImage = await internalOutputFileExists(imageFilename);
  if (!hasImage) return null;

  if (config.delayMs > 0) await delay(config.delayMs);

  const saved = await copyInternalOutputToSavedOutput(imageFilename);

  return {
    batchId: randomUUID(),
    aspectRatio: meta.aspectRatio,
    mode: modeOverride ?? meta.mode,
    images: [
      {
        filename: saved.filename,
        absolutePath: saved.absolutePath,
        mime: saved.mime,
        width: meta.width,
        height: meta.height,
      },
    ],
  };
}

export async function writeDemoPromptCache(
  hit: DemoPromptCacheHit,
  result: GenerateImageOutput,
): Promise<void> {
  const firstImage = result.images[0];
  if (firstImage === undefined) return;
  if (firstImage.mime !== 'image/png') {
    throw new AppError('STORAGE_ERROR', 'Demo prompt cache only supports PNG outputs', 500, undefined, {
      mime: firstImage.mime,
    });
  }

  const meta: DemoPromptMeta = {
    width: firstImage.width,
    height: firstImage.height,
    mime: firstImage.mime,
    aspectRatio: result.aspectRatio,
    mode: result.mode,
  };

  await copyOutputToInternalOutput(firstImage.absolutePath, cacheImageFilename(hit.key));
  await writeInternalOutputFile(cacheMetaFilename(hit.key), JSON.stringify(meta));
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/gu, '');
}

function cacheKey(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 32);
}

function cacheImageFilename(key: string): string {
  return `${CACHE_FILE_PREFIX}${key}.png`;
}

function cacheMetaFilename(key: string): string {
  return `${CACHE_META_PREFIX}${key}.json`;
}

async function readCacheMeta(key: string): Promise<DemoPromptMeta | null> {
  let raw: string;
  try {
    raw = await readInternalOutputTextFile(cacheMetaFilename(key));
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isDemoPromptMeta(parsed)) return null;
  return parsed;
}

function isDemoPromptMeta(value: unknown): value is DemoPromptMeta {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['width'] === 'number' &&
    typeof record['height'] === 'number' &&
    record['mime'] === 'image/png' &&
    isAspectRatio(record['aspectRatio']) &&
    (record['mode'] === 'text-to-image' || record['mode'] === 'image-to-image')
  );
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return value === '1:1' || value === '3:2' || value === '2:3' || value === '16:9' || value === '9:16';
}
