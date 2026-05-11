import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AppError } from '../../errors/AppError.js';
import { logger } from '../../logger.js';
import { mimeFromExt, saveOutput } from '../../storage/localStorage.js';
import type { GenerateInput, GenerateOutput } from '../../types/image.js';

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

const DEFAULT_SIZE = '1024x1024';
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;

export class TwoApiImageProvider implements ImageGenerationProvider {
  private readonly config: TwoApiConfig;
  private readonly fetchImpl: FetchImpl;

  constructor(config: TwoApiConfig, fetchImpl?: FetchImpl) {
    this.config = config;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const model = input.model ?? this.config.defaultModel;
    const hasReference = typeof input.referencePath === 'string' && input.referencePath.length > 0;

    const start = Date.now();
    let response: Response;
    try {
      response = hasReference
        ? await this.callEdits(model, input.prompt, input.referencePath as string)
        : await this.callGenerations(model, input.prompt);
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
      throw new AppError(
        'PROVIDER_ERROR',
        `Image generation provider returned ${response.status}`,
        502,
        undefined,
        { upstreamStatus: response.status },
      );
    }

    let parsed: OpenAIImageResponse;
    try {
      parsed = (await response.json()) as OpenAIImageResponse;
    } catch (err) {
      throw new AppError('PROVIDER_ERROR', 'Provider returned malformed JSON', 502, err);
    }

    const first = parsed.data?.[0];
    if (!first || typeof first.b64_json !== 'string' || first.b64_json.length === 0) {
      throw new AppError('PROVIDER_ERROR', 'Provider response missing b64_json data', 502);
    }

    const buffer = Buffer.from(first.b64_json, 'base64');
    const saved = await saveOutput(buffer, 'png');

    logger.info(
      {
        durationMs: Date.now() - start,
        outputPath: saved.absolutePath,
        outputBytes: buffer.byteLength,
        hasReference,
      },
      'image generation: provider success',
    );

    return {
      outputPath: saved.absolutePath,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };
  }

  private async callGenerations(model: string, prompt: string): Promise<Response> {
    const url = buildUrl(this.config.baseUrl, 'v1/images/generations');
    logger.info(
      { model, promptPreview: prompt.slice(0, 80), url },
      'image generation: provider request (text-to-image)',
    );
    return this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: DEFAULT_SIZE,
        response_format: 'b64_json',
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
  }

  private async callEdits(model: string, prompt: string, referencePath: string): Promise<Response> {
    const url = buildUrl(this.config.baseUrl, 'v1/images/edits');
    const buffer = await readFile(referencePath);
    const basename = path.basename(referencePath);
    const ext = basename.split('.').pop()?.toLowerCase() ?? 'png';
    const mime =
      ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';

    // Sanity-check the MIME using the same helper so unsupported extensions
    // never silently leak upstream.
    mimeFromExt(ext === 'jpg' ? 'jpeg' : ext);

    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(buffer)], { type: mime }), basename);
    form.append('prompt', prompt);
    form.append('model', model);
    form.append('n', '1');
    form.append('size', DEFAULT_SIZE);
    form.append('response_format', 'b64_json');

    logger.info(
      {
        model,
        promptPreview: prompt.slice(0, 80),
        url,
        referenceFile: basename,
        referenceBytes: buffer.byteLength,
      },
      'image generation: provider request (image-to-image)',
    );

    return this.fetchImpl(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
  }
}

function buildUrl(baseUrl: string, suffix: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/${suffix}`;
}

function isTimeoutLike(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'AbortError' || err.name === 'TimeoutError';
}

async function summarizeBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return '<no body>';
  }
}
