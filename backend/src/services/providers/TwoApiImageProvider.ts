import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AppError } from '../../errors/AppError.js';
import { logger } from '../../logger.js';
import { mimeFromExt, saveOutput } from '../../storage/localStorage.js';
import {
  ASPECT_SIZE_MAP,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  type AspectRatio,
  type GenerateImageItem,
  type GenerateInput,
  type GenerateOutput,
} from '../../types/image.js';

import type { ImageGenerationProvider } from './ImageGenerationProvider.js';

export interface TwoApiConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  timeoutMs: number;
}

interface OpenAIImageResponse {
  created?: number;
  data?: Array<{ b64_json?: string; revised_prompt?: string }>;
}

type FetchImpl = typeof globalThis.fetch;

export class TwoApiImageProvider implements ImageGenerationProvider {
  private readonly config: TwoApiConfig;
  private readonly fetchImpl: FetchImpl;

  constructor(config: TwoApiConfig, fetchImpl?: FetchImpl) {
    this.config = config;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const model = input.model ?? this.config.defaultModel;
    const aspectRatio: AspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
    const count = input.count ?? DEFAULT_COUNT;
    const sizing = ASPECT_SIZE_MAP[aspectRatio];
    const referencePaths = normalizeReferencePaths(input);
    const hasReference = referencePaths.length > 0;

    const start = Date.now();
    let response: Response;
    try {
      response = hasReference
        ? await this.callEdits(model, input.prompt, referencePaths, count, sizing.size)
        : await this.callGenerations(model, input.prompt, count, sizing.size);
    } catch (err) {
      if (isTimeoutLike(err)) {
        throw new AppError(
          'PROVIDER_TIMEOUT',
          `Image generation timed out after ${this.config.timeoutMs}ms`,
          504,
          err,
        );
      }
      throw new AppError('PROVIDER_ERROR', 'Failed to reach image generation provider', 502, err);
    }

    if (response.status === 429) {
      const summary = await summarizeBody(response);
      logger.warn(
        { upstreamStatus: 429, summary, hasReference },
        'image generation: provider rate-limited',
      );
      throw new AppError(
        'PROVIDER_RATE_LIMITED',
        'Image generation provider rate-limited (429)',
        429,
        undefined,
        { upstreamStatus: 429 },
      );
    }

    if (!response.ok) {
      const summary = await summarizeBody(response);
      logger.warn(
        { upstreamStatus: response.status, summary, hasReference },
        'image generation: provider non-2xx',
      );
      if (isPromptRejectionStatus(response.status)) {
        throw new AppError(
          'PROVIDER_PROMPT_REJECTED',
          'Image generation provider rejected the prompt or reference image',
          422,
          undefined,
          { upstreamStatus: response.status, reason: 'prompt_rejected' },
        );
      }
      throw new AppError(
        'PROVIDER_ERROR',
        `Image generation provider returned ${response.status}`,
        502,
        undefined,
        { upstreamStatus: response.status, reason: 'provider_http_error' },
      );
    }

    let parsed: OpenAIImageResponse;
    try {
      parsed = (await response.json()) as OpenAIImageResponse;
    } catch (err) {
      throw new AppError('PROVIDER_ERROR', 'Provider returned malformed JSON', 502, err);
    }

    const data = parsed.data ?? [];
    if (data.length === 0) {
      throw new AppError(
        'PROVIDER_EMPTY_RESULT',
        'Provider did not return image data',
        502,
        undefined,
        { reason: 'empty_result' },
      );
    }

    const images: GenerateImageItem[] = [];
    for (const item of data) {
      if (typeof item.b64_json !== 'string' || item.b64_json.length === 0) {
        throw new AppError(
          'PROVIDER_EMPTY_RESULT',
          'Provider did not return image data',
          502,
          undefined,
          { reason: 'empty_result' },
        );
      }
      const buffer = Buffer.from(item.b64_json, 'base64');
      const saved = await saveOutput(buffer, 'png');
      images.push({ outputPath: saved.absolutePath, width: sizing.width, height: sizing.height });
    }

    logger.info(
      {
        durationMs: Date.now() - start,
        outputCount: images.length,
        aspectRatio,
        hasReference,
      },
      'image generation: provider success',
    );

    return { images, aspectRatio };
  }

  private async callGenerations(
    model: string,
    prompt: string,
    count: number,
    size: string,
  ): Promise<Response> {
    const url = buildUrl(this.config.baseUrl, 'v1/images/generations');
    logger.info(
      { model, promptPreview: prompt.slice(0, 80), url, count, size },
      'image generation: provider request (text-to-image)',
    );
    return this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: count,
        size,
        response_format: 'b64_json',
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
  }

  private async callEdits(
    model: string,
    prompt: string,
    referencePaths: string[],
    count: number,
    size: string,
  ): Promise<Response> {
    const url = buildUrl(this.config.baseUrl, 'v1/images/edits');
    const referenceFiles = await Promise.all(referencePaths.map((referencePath) => readReferenceFile(referencePath)));

    const form = new FormData();
    for (const file of referenceFiles) {
      form.append('image', new Blob([new Uint8Array(file.buffer)], { type: file.mime }), file.basename);
    }
    form.append('prompt', prompt);
    form.append('model', model);
    form.append('n', String(count));
    form.append('size', size);
    form.append('response_format', 'b64_json');

    logger.info(
      {
        model,
        promptPreview: prompt.slice(0, 80),
        url,
        referenceFiles: referenceFiles.map((file) => file.basename),
        referenceBytes: referenceFiles.reduce((sum, file) => sum + file.buffer.byteLength, 0),
        referenceCount: referenceFiles.length,
        count,
        size,
      },
      'image generation: provider request (image-to-image)',
    );

    return this.fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
  }
}


function normalizeReferencePaths(input: GenerateInput): string[] {
  const raw = input.referencePaths ?? (input.referencePath ? [input.referencePath] : []);
  return Array.from(new Set(raw.filter((item) => item.length > 0)));
}

async function readReferenceFile(
  referencePath: string,
): Promise<{ buffer: Buffer; basename: string; mime: string }> {
  const buffer = await readFile(referencePath);
  const basename = path.basename(referencePath);
  const ext = basename.split('.').pop()?.toLowerCase() ?? 'png';
  const cleanExt = ext === 'jpg' ? 'jpeg' : ext;
  const mime = mimeFromExt(cleanExt);
  return { buffer, basename, mime };
}

function buildUrl(baseUrl: string, suffix: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/${suffix}`;
}

function isTimeoutLike(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' || err.name === 'TimeoutError';
}

function isPromptRejectionStatus(status: number): boolean {
  return status === 400 || status === 422;
}

async function summarizeBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return '<no body>';
  }
}
