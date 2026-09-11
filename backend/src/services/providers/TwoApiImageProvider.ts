import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AppError } from '../../errors/AppError.js';
import { logger } from '../../logger.js';
import { mimeFromExt, removeOutput, saveOutput } from '../../storage/localStorage.js';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  GEMINI_IMAGE_MODEL,
  aspectSizeForResolution,
  type AspectRatio,
  type GenerateImageItem,
  type GenerateInput,
  type GenerateOutput,
  type ImageResolution,
  type ImageQuality,
} from '../../types/image.js';

import type {
  ImageGenerationProvider,
  ProviderCredentialValidationInput,
} from './ImageGenerationProvider.js';

export interface TwoApiConfig {
  baseUrl: string;
  highResBaseUrl?: string;
  apiKey: string;
  modelApiKeys?: Readonly<Record<string, string>>;
  highResApiKey?: string;
  defaultModel: string;
  highResModel?: string;
  timeoutMs: number;
}

interface OpenAIImageResponse {
  created?: number;
  data?: Array<{ b64_json?: string; revised_prompt?: string }>;
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
}

type FetchImpl = typeof globalThis.fetch;

export class TwoApiImageProvider implements ImageGenerationProvider {
  private readonly config: TwoApiConfig;
  private readonly fetchImpl: FetchImpl;

  constructor(config: TwoApiConfig, fetchImpl?: FetchImpl) {
    this.config = config;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async validateCredential(input: ProviderCredentialValidationInput): Promise<void> {
    const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
    const signal =
      input.signal === undefined ? timeoutSignal : AbortSignal.any([input.signal, timeoutSignal]);
    const baseUrl =
      input.credentialGroup === 'high-res'
        ? (this.config.highResBaseUrl ?? this.config.baseUrl)
        : this.config.baseUrl;
    let response: Response;
    try {
      response = await this.fetchImpl(buildUrl(baseUrl, 'v1/models'), {
        method: 'GET',
        headers: { Authorization: `Bearer ${input.credential}` },
        signal,
      });
    } catch (err) {
      if (input.signal?.aborted === true) {
        throw new AppError('REQUEST_ABORTED', 'API Key validation was cancelled', 499, err);
      }
      if (timeoutSignal.aborted || isTimeoutLike(err)) {
        throw new AppError(
          'PROVIDER_KEY_VALIDATION_FAILED',
          'Timed out while validating the API Key',
          504,
          err,
        );
      }
      throw new AppError(
        'PROVIDER_KEY_VALIDATION_FAILED',
        'Failed to reach the image generation provider while validating the API Key',
        502,
        err,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        'PROVIDER_KEY_INVALID',
        'The image generation API Key was rejected',
        400,
        undefined,
        { upstreamStatus: response.status },
      );
    }
    if (!response.ok) {
      throw new AppError(
        'PROVIDER_KEY_VALIDATION_FAILED',
        `Image generation provider returned ${response.status} while validating the API Key`,
        502,
        undefined,
        { upstreamStatus: response.status },
      );
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch (err) {
      if (input.signal?.aborted === true) {
        throw new AppError('REQUEST_ABORTED', 'API Key validation was cancelled', 499, err);
      }
      if (timeoutSignal.aborted || isTimeoutLike(err)) {
        throw new AppError(
          'PROVIDER_KEY_VALIDATION_FAILED',
          'Timed out while reading API Key validation results',
          504,
          err,
        );
      }
      throw new AppError(
        'PROVIDER_KEY_VALIDATION_FAILED',
        'Image generation provider returned malformed model data',
        502,
        err,
      );
    }
    if (!isRecord(parsed) || !Array.isArray(parsed.data)) {
      throw new AppError(
        'PROVIDER_KEY_VALIDATION_FAILED',
        'Image generation provider returned malformed model data',
        502,
      );
    }
    const modelIds = parsed.data.flatMap((model) =>
      isRecord(model) && typeof model.id === 'string' ? [model.id] : [],
    );
    if (!modelIds.includes(input.model)) {
      throw new AppError(
        'PROVIDER_KEY_MODEL_UNAVAILABLE',
        'The API Key group does not provide the configured image model',
        400,
        undefined,
        { model: input.model },
      );
    }
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const aspectRatio: AspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
    const resolution: ImageResolution = input.resolution ?? DEFAULT_IMAGE_RESOLUTION;
    const model = this.modelForResolution(resolution, input.model);
    const baseUrl = this.baseUrlForRequest(model, resolution, input.providerCredentialGroup);
    const apiKey = this.apiKeyForRequest(
      model,
      resolution,
      input.providerCredential,
      input.providerCredentialGroup,
    );
    const count = input.count ?? DEFAULT_COUNT;
    const sizing = aspectSizeForResolution(aspectRatio, resolution);
    if (sizing === undefined) {
      throw new AppError(
        'BAD_REQUEST',
        `Unsupported aspect ratio ${aspectRatio} for image resolution ${resolution}`,
        400,
        undefined,
        { aspectRatio, resolution },
      );
    }
    const referencePaths = normalizeReferencePaths(input);
    const hasReference = referencePaths.length > 0;
    const timeoutSignal = AbortSignal.timeout(this.config.timeoutMs);
    const requestSignal =
      input.signal === undefined ? timeoutSignal : AbortSignal.any([input.signal, timeoutSignal]);

    const start = Date.now();
    const isGemini = model === GEMINI_IMAGE_MODEL;
    let responses: Response[];
    try {
      if (isGemini) {
        responses = await Promise.all(
          Array.from({ length: count }, () =>
            hasReference
              ? this.callGeminiEdits(
                  baseUrl,
                  apiKey,
                  model,
                  input.prompt,
                  referencePaths,
                  aspectRatio,
                  resolution,
                  requestSignal,
                  input.requestId,
                )
              : this.callGeminiGenerations(
                  baseUrl,
                  apiKey,
                  model,
                  input.prompt,
                  aspectRatio,
                  resolution,
                  requestSignal,
                  input.requestId,
                ),
          ),
        );
      } else {
        responses = [
          hasReference
            ? await this.callEdits(
                baseUrl,
                apiKey,
                model,
                input.prompt,
                referencePaths,
                count,
                sizing.size,
                input.quality,
                requestSignal,
                input.requestId,
              )
            : await this.callGenerations(
                baseUrl,
                apiKey,
                model,
                input.prompt,
                count,
                sizing.size,
                input.quality,
                requestSignal,
                input.requestId,
              ),
        ];
      }
    } catch (err) {
      if (input.signal?.aborted === true) {
        throw new AppError('REQUEST_ABORTED', 'Image generation request was cancelled', 499, err);
      }
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

    const response = responses.find((candidate) => !candidate.ok) ?? responses[0];
    if (response === undefined) {
      throw new AppError('PROVIDER_EMPTY_RESULT', 'Provider returned no response', 502);
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
      if (
        input.providerCredential !== undefined &&
        (response.status === 401 || response.status === 403)
      ) {
        throw new AppError(
          'PROVIDER_KEY_INVALID',
          'The saved image generation API Key was rejected',
          400,
          undefined,
          { upstreamStatus: response.status },
        );
      }
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

    const imageData: Array<{ data: string; mimeType?: string }> = [];
    try {
      for (const candidate of responses) {
        const parsed = (await candidate.json()) as OpenAIImageResponse | GeminiImageResponse;
        if (isGemini) {
          imageData.push(...extractGeminiImageData(parsed as GeminiImageResponse));
        } else {
          imageData.push(
            ...((parsed as OpenAIImageResponse).data ?? []).flatMap((item) =>
              typeof item.b64_json === 'string' && item.b64_json.length > 0
                ? [{ data: item.b64_json }]
                : [],
            ),
          );
        }
      }
    } catch (err) {
      if (input.signal?.aborted === true) {
        throw new AppError('REQUEST_ABORTED', 'Image generation request was cancelled', 499, err);
      }
      if (timeoutSignal.aborted || isTimeoutLike(err)) {
        throw new AppError(
          'PROVIDER_TIMEOUT',
          `Image generation timed out after ${this.config.timeoutMs}ms`,
          504,
          err,
        );
      }
      throw new AppError('PROVIDER_ERROR', 'Provider returned malformed JSON', 502, err);
    }

    if (imageData.length === 0) {
      throw new AppError(
        'PROVIDER_EMPTY_RESULT',
        'Provider did not return image data',
        502,
        undefined,
        { reason: 'empty_result' },
      );
    }

    const images: GenerateImageItem[] = [];
    try {
      for (const item of imageData) {
        requestSignal.throwIfAborted();
        const buffer = Buffer.from(item.data, 'base64');
        const saved = await saveOutput(buffer, extensionForMime(item.mimeType));
        if (requestSignal.aborted) {
          await removeOutput(saved.absolutePath);
          requestSignal.throwIfAborted();
        }
        images.push({ outputPath: saved.absolutePath, width: sizing.width, height: sizing.height });
      }
    } catch (err) {
      await Promise.all(images.map((image) => removeOutput(image.outputPath)));
      if (input.signal?.aborted === true) {
        throw new AppError('REQUEST_ABORTED', 'Image generation request was cancelled', 499, err);
      }
      if (timeoutSignal.aborted) {
        throw new AppError(
          'PROVIDER_TIMEOUT',
          `Image generation timed out after ${this.config.timeoutMs}ms`,
          504,
          err,
        );
      }
      throw err;
    }

    logger.info(
      {
        durationMs: Date.now() - start,
        outputCount: images.length,
        aspectRatio,
        resolution,
        highResProvider: baseUrl !== this.config.baseUrl,
        hasReference,
      },
      'image generation: provider success',
    );

    return { images, aspectRatio, model };
  }

  private baseUrlForRequest(
    model: string,
    resolution: ImageResolution,
    providerCredentialGroup: 'standard' | 'high-res' | undefined,
  ): string {
    if (providerCredentialGroup === 'high-res') {
      return this.config.highResBaseUrl ?? this.config.baseUrl;
    }
    if (this.config.modelApiKeys?.[model] !== undefined) return this.config.baseUrl;
    if (resolution === DEFAULT_IMAGE_RESOLUTION) return this.config.baseUrl;
    return this.config.highResBaseUrl ?? this.config.baseUrl;
  }

  private apiKeyForRequest(
    model: string,
    resolution: ImageResolution,
    providerCredential: string | undefined,
    providerCredentialGroup: 'standard' | 'high-res' | undefined,
  ): string {
    if (
      providerCredential !== undefined &&
      (resolution === DEFAULT_IMAGE_RESOLUTION || providerCredentialGroup === 'high-res')
    ) {
      return providerCredential;
    }
    const modelApiKey = this.config.modelApiKeys?.[model];
    if (modelApiKey !== undefined) return modelApiKey;
    if (resolution === DEFAULT_IMAGE_RESOLUTION) {
      return this.config.apiKey;
    }
    return this.config.highResApiKey ?? this.config.apiKey;
  }

  private modelForResolution(
    resolution: ImageResolution,
    requestedModel: string | undefined,
  ): string {
    if (
      resolution !== DEFAULT_IMAGE_RESOLUTION &&
      this.config.highResModel !== undefined &&
      (requestedModel === undefined || requestedModel === this.config.defaultModel)
    ) {
      return this.config.highResModel;
    }
    return requestedModel ?? this.config.defaultModel;
  }

  private async callGeminiGenerations(
    baseUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    aspectRatio: AspectRatio,
    resolution: ImageResolution,
    signal: AbortSignal,
    requestId?: string,
  ): Promise<Response> {
    return this.callGemini(
      baseUrl,
      apiKey,
      model,
      [{ text: prompt }],
      aspectRatio,
      resolution,
      signal,
      requestId,
    );
  }

  private async callGeminiEdits(
    baseUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    referencePaths: string[],
    aspectRatio: AspectRatio,
    resolution: ImageResolution,
    signal: AbortSignal,
    requestId?: string,
  ): Promise<Response> {
    const referenceFiles = await Promise.all(
      referencePaths.map((referencePath) => readReferenceFile(referencePath)),
    );
    const parts = [
      { text: prompt },
      ...referenceFiles.map((file) => ({
        inlineData: { mimeType: file.mime, data: file.buffer.toString('base64') },
      })),
    ];
    return this.callGemini(
      baseUrl,
      apiKey,
      model,
      parts,
      aspectRatio,
      resolution,
      signal,
      requestId,
    );
  }

  private async callGemini(
    baseUrl: string,
    apiKey: string,
    model: string,
    parts: Array<Record<string, unknown>>,
    aspectRatio: AspectRatio,
    resolution: ImageResolution,
    signal: AbortSignal,
    requestId?: string,
  ): Promise<Response> {
    const url = buildUrl(baseUrl, `v1beta/models/${encodeURIComponent(model)}:generateContent`);
    logger.info(
      { requestId, model, promptLength: parts.length, url, aspectRatio, resolution },
      'image generation: provider request (gemini generateContent)',
    );
    return this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio,
            imageSize: geminiImageSize(resolution),
          },
        },
      }),
      signal,
    });
  }

  private async callGenerations(
    baseUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    count: number,
    size: string,
    quality: ImageQuality | undefined,
    signal: AbortSignal,
    requestId?: string,
  ): Promise<Response> {
    const url = buildUrl(baseUrl, 'v1/images/generations');
    logger.info(
      { requestId, model, promptLength: prompt.length, url, count, size, quality },
      'image generation: provider request (text-to-image)',
    );
    return this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: count,
        size,
        ...(quality === undefined ? {} : { quality }),
        response_format: 'b64_json',
      }),
      signal,
    });
  }

  private async callEdits(
    baseUrl: string,
    apiKey: string,
    model: string,
    prompt: string,
    referencePaths: string[],
    count: number,
    size: string,
    quality: ImageQuality | undefined,
    signal: AbortSignal,
    requestId?: string,
  ): Promise<Response> {
    const url = buildUrl(baseUrl, 'v1/images/edits');
    const referenceFiles = await Promise.all(
      referencePaths.map((referencePath) => readReferenceFile(referencePath)),
    );

    const form = new FormData();
    for (const file of referenceFiles) {
      form.append(
        'image',
        new Blob([new Uint8Array(file.buffer)], { type: file.mime }),
        file.basename,
      );
    }
    form.append('prompt', prompt);
    form.append('model', model);
    form.append('n', String(count));
    form.append('size', size);
    if (quality !== undefined) form.append('quality', quality);
    form.append('response_format', 'b64_json');

    logger.info(
      {
        requestId,
        model,
        promptLength: prompt.length,
        url,
        referenceFiles: referenceFiles.map((file) => file.basename),
        referenceBytes: referenceFiles.reduce((sum, file) => sum + file.buffer.byteLength, 0),
        referenceCount: referenceFiles.length,
        count,
        size,
        quality,
      },
      'image generation: provider request (image-to-image)',
    );

    return this.fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function geminiImageSize(resolution: ImageResolution): '1K' | '2K' | '4K' {
  if (resolution === '4k') return '4K';
  if (resolution === '2k') return '2K';
  return '1K';
}

function extractGeminiImageData(
  response: GeminiImageResponse,
): Array<{ data: string; mimeType?: string }> {
  return (response.candidates ?? []).flatMap((candidate) =>
    (candidate.content?.parts ?? []).flatMap((part) => {
      const inlineData = part.inlineData;
      return inlineData?.data
        ? [
            {
              data: inlineData.data,
              ...(inlineData.mimeType ? { mimeType: inlineData.mimeType } : {}),
            },
          ]
        : [];
    }),
  );
}

function extensionForMime(mimeType: string | undefined): 'png' | 'jpeg' | 'webp' {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpeg';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
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
