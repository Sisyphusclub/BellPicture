import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import {
  generateImage,
  type GenerateImageInput,
  type GenerateImageOutput,
} from '../services/imageGeneration.service.js';
import type { ImageGenerationProvider } from '../services/providers/ImageGenerationProvider.js';
import { readOutput, saveUpload } from '../storage/localStorage.js';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  MAX_COUNT,
  MIN_COUNT,
  type AspectRatio,
} from '../types/image.js';

import '../types/express.js';

const MODEL_CREATED_AT = 1_710_000_000;

const OPENAI_COMPAT_MODEL_IDS = [
  'gpt-image-2',
  'codex-gpt-image-2',
  'auto',
  'gpt-5',
  'gpt-5-1',
  'gpt-5-2',
  'gpt-5-3',
  'gpt-5-3-mini',
  'gpt-5-mini',
] as const;

const SIZE_TO_ASPECT_RATIO: Record<string, AspectRatio> = {
  auto: DEFAULT_ASPECT_RATIO,
  '1024x1024': '1:1',
  '1536x1024': '3:2',
  '1024x1536': '2:3',
  '1792x1024': '16:9',
  '1024x1792': '9:16',
};

const imageResponseFormatSchema = z.enum(['b64_json', 'url']);
type ImageResponseFormat = z.infer<typeof imageResponseFormatSchema>;

const promptSchema = z.string().trim().min(1).max(2000);

const generationBodySchema = z
  .object({
    prompt: promptSchema,
    model: z.string().min(1).max(100).optional(),
    n: z.number().int().min(MIN_COUNT).max(MAX_COUNT).optional(),
    size: z.string().min(1).optional(),
    response_format: imageResponseFormatSchema.optional(),
    stream: z.boolean().optional(),
    partial_images: z.unknown().optional(),
  })
  .passthrough();

const editsBodySchema = z
  .object({
    prompt: z.preprocess(singleFormValue, promptSchema),
    model: z.preprocess(singleFormValue, z.string().min(1).max(100).optional()),
    n: z.preprocess(
      coerceOptionalFormNumber,
      z.number().int().min(MIN_COUNT).max(MAX_COUNT).optional(),
    ),
    size: z.preprocess(singleFormValue, z.string().min(1).optional()),
    response_format: z.preprocess(singleFormValue, imageResponseFormatSchema.optional()),
    mask: z.unknown().optional(),
    stream: z.preprocess(coerceOptionalFormBoolean, z.boolean().optional()),
    partial_images: z.unknown().optional(),
  })
  .passthrough();

const chatMessageSchema = z
  .object({
    role: z.string(),
    content: z.unknown(),
  })
  .passthrough();

const chatBodySchema = z
  .object({
    model: z.string().min(1).max(100).optional(),
    messages: z.array(chatMessageSchema).min(1),
    n: z.number().int().min(MIN_COUNT).max(MAX_COUNT).optional(),
    size: z.string().min(1).optional(),
    stream: z.boolean().optional(),
  })
  .passthrough();

const responsesBodySchema = z
  .object({
    model: z.string().min(1).max(100).optional(),
    input: z.unknown(),
    tools: z.array(z.unknown()).optional(),
    n: z.number().int().min(MIN_COUNT).max(MAX_COUNT).optional(),
    size: z.string().min(1).optional(),
    stream: z.boolean().optional(),
    tool_choice: z.unknown().optional(),
  })
  .passthrough();

interface OpenAIImageItem {
  b64_json?: string;
  url?: string;
}

interface OpenAIImagesResponse {
  created: number;
  data: OpenAIImageItem[];
}

interface SceneInput {
  prompt: string;
  referenceId?: string;
}

interface ImageGenerationToolSelection {
  model?: string;
  size?: string;
}

interface OpenAICompatControllerDeps {
  provider: ImageGenerationProvider;
}

export function buildOpenAICompatController(deps: OpenAICompatControllerDeps): {
  models: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  generations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  edits: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  chatCompletions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  responses: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  return {
    async models(_req, res, next) {
      try {
        res.status(200).json({
          object: 'list',
          data: OPENAI_COMPAT_MODEL_IDS.map((id) => ({
            id,
            object: 'model',
            created: MODEL_CREATED_AT,
            owned_by: 'nebulens',
          })),
        });
      } catch (err) {
        next(err);
      }
    },

    async generations(req, res, next) {
      try {
        const parsed = parseBody(
          generationBodySchema,
          req.body as unknown,
          'Invalid image generation request body',
        );
        rejectUnsupportedStreaming(parsed.stream, parsed.partial_images);

        const result = await generateImage(
          buildGenerateInput({
            prompt: parsed.prompt,
            count: parsed.n ?? DEFAULT_COUNT,
            aspectRatio: aspectRatioForSize(parsed.size),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
          }),
          { provider: deps.provider },
        );

        const body = await buildImagesResponse(req, result, parsed.response_format ?? 'b64_json');
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async edits(req, res, next) {
      try {
        const parsed = parseBody(
          editsBodySchema,
          req.body as unknown,
          'Invalid image edit request body',
        );
        if (parsed.mask !== undefined) {
          throw new AppError('BAD_REQUEST', 'Masks are not supported by this endpoint', 400);
        }
        rejectUnsupportedStreaming(parsed.stream, parsed.partial_images);

        if (!req.file) {
          throw new AppError('BAD_REQUEST', 'Missing "image" form field with a file', 400);
        }

        const reference = await saveUpload(req.file.buffer);
        const result = await generateImage(
          buildGenerateInput({
            prompt: parsed.prompt,
            referenceId: reference.filename,
            count: parsed.n ?? DEFAULT_COUNT,
            aspectRatio: aspectRatioForSize(parsed.size),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
          }),
          { provider: deps.provider },
        );

        const body = await buildImagesResponse(req, result, parsed.response_format ?? 'b64_json');
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async chatCompletions(req, res, next) {
      try {
        const parsed = parseBody(
          chatBodySchema,
          req.body as unknown,
          'Invalid chat completion request body',
        );
        if (parsed.stream === true) {
          throw new AppError('BAD_REQUEST', 'Streaming chat completions are not supported', 400);
        }

        const scene = await extractChatScene(parsed.messages);
        const result = await generateImage(
          buildGenerateInput({
            prompt: scene.prompt,
            count: parsed.n ?? DEFAULT_COUNT,
            aspectRatio: aspectRatioForSize(parsed.size),
            ...(scene.referenceId !== undefined ? { referenceId: scene.referenceId } : {}),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
          }),
          { provider: deps.provider },
        );

        const urls = result.images.map((image) => absoluteOutputUrl(req, image.filename));
        const content = formatGeneratedLinks(urls);
        res.status(200).json({
          id: `chatcmpl-local-${randomUUID()}`,
          object: 'chat.completion',
          created: unixSeconds(),
          model: parsed.model ?? env.IMAGE_MODEL,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content,
              },
              finish_reason: 'stop',
              logprobs: null,
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    async responses(req, res, next) {
      try {
        const parsed = parseBody(
          responsesBodySchema,
          req.body as unknown,
          'Invalid responses request body',
        );
        if (parsed.stream === true) {
          throw new AppError('BAD_REQUEST', 'Streaming responses are not supported', 400);
        }
        if (parsed.input === undefined) {
          throw new AppError('BAD_REQUEST', 'Responses request requires input', 400);
        }

        const imageTool = selectImageGenerationTool(parsed.tools);
        const scene = await extractResponsesScene(parsed.input);
        const model = imageTool?.model ?? parsed.model;
        const size = imageTool?.size ?? parsed.size;
        const result = await generateImage(
          buildGenerateInput({
            prompt: scene.prompt,
            count: parsed.n ?? DEFAULT_COUNT,
            aspectRatio: aspectRatioForSize(size),
            ...(scene.referenceId !== undefined ? { referenceId: scene.referenceId } : {}),
            ...(model !== undefined ? { model } : {}),
          }),
          { provider: deps.provider },
        );

        const urls = result.images.map((image) => absoluteOutputUrl(req, image.filename));
        const outputText = formatGeneratedLinks(urls);
        const imageOutputs = await Promise.all(
          result.images.map(async (image) => ({
            id: `ig_local_${randomUUID()}`,
            type: 'image_generation_call',
            status: 'completed',
            result: (await readOutput(image.filename)).toString('base64'),
          })),
        );

        res.status(200).json({
          id: `resp_local_${randomUUID()}`,
          object: 'response',
          created_at: unixSeconds(),
          status: 'completed',
          model: model ?? env.IMAGE_MODEL,
          output_text: outputText,
          output: [
            ...imageOutputs,
            {
              id: `msg_local_${randomUUID()}`,
              type: 'message',
              role: 'assistant',
              status: 'completed',
              content: [
                {
                  type: 'output_text',
                  text: outputText,
                  annotations: [],
                },
              ],
            },
          ],
          error: null,
          incomplete_details: null,
          parallel_tool_calls: false,
          tool_choice: parsed.tool_choice ?? 'auto',
          tools: [buildResponseTool(imageTool)],
          temperature: null,
          top_p: null,
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  };
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  try {
    return schema.parse(value);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError('BAD_REQUEST', message, 400, err, { issues: err.issues });
    }
    throw err;
  }
}

function singleFormValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : value;
  }
  return value;
}

function coerceOptionalFormNumber(value: unknown): unknown {
  const single = singleFormValue(value);
  if (single === undefined || single === '') return undefined;
  if (typeof single === 'string') return Number(single);
  return single;
}

function coerceOptionalFormBoolean(value: unknown): unknown {
  const single = singleFormValue(value);
  if (single === undefined || single === '') return undefined;
  if (typeof single === 'string') {
    if (single === 'true') return true;
    if (single === 'false') return false;
  }
  return single;
}

function rejectUnsupportedStreaming(stream: boolean | undefined, partialImages: unknown): void {
  if (stream === true) {
    throw new AppError('BAD_REQUEST', 'Streaming image generation is not supported', 400);
  }
  if (partialImages !== undefined) {
    throw new AppError('BAD_REQUEST', 'Partial image streaming is not supported', 400);
  }
}

function aspectRatioForSize(size: string | undefined): AspectRatio {
  if (size === undefined) return DEFAULT_ASPECT_RATIO;
  const aspectRatio = SIZE_TO_ASPECT_RATIO[size];
  if (aspectRatio === undefined) {
    throw new AppError('BAD_REQUEST', `Unsupported image size: ${size}`, 400, undefined, { size });
  }
  return aspectRatio;
}

function buildGenerateInput(input: GenerateImageInput): GenerateImageInput {
  return input;
}

async function buildImagesResponse(
  req: Request,
  result: GenerateImageOutput,
  responseFormat: ImageResponseFormat,
): Promise<OpenAIImagesResponse> {
  const data: OpenAIImageItem[] = [];
  for (const image of result.images) {
    if (responseFormat === 'url') {
      data.push({ url: absoluteOutputUrl(req, image.filename) });
    } else {
      data.push({ b64_json: (await readOutput(image.filename)).toString('base64') });
    }
  }
  return { created: unixSeconds(), data };
}

function absoluteOutputUrl(req: Request, filename: string): string {
  const protocol = firstHeaderSegment(req.get('x-forwarded-proto')) ?? req.protocol ?? 'http';
  const host = req.get('host') ?? `localhost:${env.PORT}`;
  return `${protocol}://${host}/api/outputs/${encodeURIComponent(filename)}`;
}

function firstHeaderSegment(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const first = value.split(',')[0]?.trim();
  return first && first.length > 0 ? first : undefined;
}

function unixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function formatGeneratedLinks(urls: string[]): string {
  const noun = urls.length === 1 ? 'image' : 'images';
  const links = urls.map((url, index) => `![image ${index + 1}](${url})`).join('\n');
  return `Generated ${urls.length} ${noun}:\n\n${links}`;
}

async function extractChatScene(
  messages: Array<z.infer<typeof chatMessageSchema>>,
): Promise<SceneInput> {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user');
  if (!latestUser) {
    throw new AppError('BAD_REQUEST', 'Chat request requires at least one user message', 400);
  }
  return extractChatContentScene(latestUser.content);
}

async function extractChatContentScene(content: unknown): Promise<SceneInput> {
  if (typeof content === 'string') {
    return { prompt: validatePrompt(content, 'messages[].content') };
  }
  if (!Array.isArray(content)) {
    throw new AppError(
      'BAD_REQUEST',
      'User message content must be a string or content array',
      400,
    );
  }

  const textParts: string[] = [];
  let referenceId: string | undefined;
  for (const part of content) {
    if (!isRecord(part)) continue;
    const type = readStringProperty(part, 'type');
    if (type === 'text') {
      const text = readStringProperty(part, 'text');
      if (text === undefined) {
        throw new AppError('BAD_REQUEST', 'Text content parts require text', 400);
      }
      textParts.push(text);
    }
    if (type === 'image_url') {
      const url = readChatImageUrl(part);
      if (isRemoteImageUrl(url)) {
        throw new AppError('BAD_REQUEST', 'Remote image URLs are not supported', 400);
      }
      if (referenceId === undefined) {
        referenceId = await saveDataImageUrl(url);
      }
    }
  }

  const prompt = validatePrompt(textParts.join('\n'), 'messages[].content[].text');
  return referenceId !== undefined ? { prompt, referenceId } : { prompt };
}

function readChatImageUrl(part: Record<string, unknown>): string {
  const imageUrl = part['image_url'];
  if (!isRecord(imageUrl)) {
    throw new AppError('BAD_REQUEST', 'image_url content parts require image_url.url', 400);
  }
  const url = readStringProperty(imageUrl, 'url');
  if (url === undefined) {
    throw new AppError('BAD_REQUEST', 'image_url content parts require image_url.url', 400);
  }
  return url;
}

async function extractResponsesScene(input: unknown): Promise<SceneInput> {
  const textParts: string[] = [];
  let referenceId: string | undefined;

  async function visit(value: unknown): Promise<void> {
    if (typeof value === 'string') {
      textParts.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        await visit(item);
      }
      return;
    }
    if (!isRecord(value)) return;

    const type = readStringProperty(value, 'type');
    if (type === 'input_text' || type === 'text') {
      const text = readStringProperty(value, 'text');
      if (text !== undefined) textParts.push(text);
      return;
    }
    if (type === 'input_image') {
      const imageUrl = readStringProperty(value, 'image_url');
      if (imageUrl === undefined) {
        throw new AppError('BAD_REQUEST', 'input_image items require image_url', 400);
      }
      if (isRemoteImageUrl(imageUrl)) {
        throw new AppError('BAD_REQUEST', 'Remote image URLs are not supported', 400);
      }
      if (referenceId === undefined) {
        referenceId = await saveDataImageUrl(imageUrl);
      }
      return;
    }

    const content = value['content'];
    if (content !== undefined) {
      await visit(content);
    }
  }

  await visit(input);
  const prompt = validatePrompt(textParts.join('\n'), 'input');
  return referenceId !== undefined ? { prompt, referenceId } : { prompt };
}

async function saveDataImageUrl(url: string): Promise<string> {
  if (isRemoteImageUrl(url)) {
    throw new AppError('BAD_REQUEST', 'Remote image URLs are not supported', 400);
  }

  const match = /^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/i.exec(url);
  if (!match) {
    throw new AppError('BAD_REQUEST', 'Only data:image/*;base64 image URLs are supported', 400);
  }

  const buffer = Buffer.from(match[2]!.replace(/\s+/g, ''), 'base64');
  if (buffer.byteLength > env.UPLOAD_MAX_BYTES) {
    throw new AppError(
      'PAYLOAD_TOO_LARGE',
      `Image data URL exceeds ${env.UPLOAD_MAX_BYTES} bytes`,
      413,
      undefined,
      { maxBytes: env.UPLOAD_MAX_BYTES },
    );
  }
  const saved = await saveUpload(buffer);
  return saved.filename;
}

function isRemoteImageUrl(url: string): boolean {
  return /^https?:\/\//iu.test(url);
}

function validatePrompt(value: string, field: string): string {
  const prompt = value.trim();
  if (prompt.length === 0) {
    throw new AppError('BAD_REQUEST', `${field} must provide a non-empty prompt`, 400);
  }
  if (prompt.length > 2000) {
    throw new AppError('BAD_REQUEST', `${field} must be at most 2000 characters`, 400);
  }
  return prompt;
}

function selectImageGenerationTool(
  tools: unknown[] | undefined,
): ImageGenerationToolSelection | undefined {
  if (tools === undefined) return undefined;

  for (const tool of tools) {
    if (!isRecord(tool) || tool['type'] !== 'image_generation') continue;
    const selection: ImageGenerationToolSelection = {};
    const model = tool['model'];
    if (model !== undefined) {
      if (typeof model !== 'string' || model.length === 0) {
        throw new AppError(
          'BAD_REQUEST',
          'image_generation tool model must be a non-empty string',
          400,
        );
      }
      selection.model = model;
    }
    const size = tool['size'];
    if (size !== undefined) {
      if (typeof size !== 'string' || size.length === 0) {
        throw new AppError(
          'BAD_REQUEST',
          'image_generation tool size must be a non-empty string',
          400,
        );
      }
      selection.size = size;
    }
    return selection;
  }

  throw new AppError('BAD_REQUEST', 'Responses endpoint requires an image_generation tool', 400);
}

function buildResponseTool(
  selection: ImageGenerationToolSelection | undefined,
): Record<string, string> {
  return {
    type: 'image_generation',
    ...(selection?.model !== undefined ? { model: selection.model } : {}),
    ...(selection?.size !== undefined ? { size: selection.size } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringProperty(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}
