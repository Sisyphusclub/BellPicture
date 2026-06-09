import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger.js';
import { generateDemoImage } from '../services/demoGeneration.service.js';
import {
  findDemoPromptCacheHit,
  readCachedDemoPromptImage,
  writeDemoPromptCache,
  type DemoPromptCacheConfig,
} from '../services/demoPromptCache.service.js';
import { isUserAdmin } from '../services/adminUser.service.js';
import { insertImageRecords, type NewImageRecord } from '../services/history.service.js';
import { generateImage, type GenerateImageOutput } from '../services/imageGeneration.service.js';
import type { ImageGenerationProvider } from '../services/providers/ImageGenerationProvider.js';
import type { QuotaSnapshot } from '../services/quota.service.js';
import type { UserQuotaService } from '../services/userQuota.service.js';
import { saveUpload } from '../storage/localStorage.js';
import {
  ASPECT_RATIOS,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  HIGH_RES_IMAGE_RESOLUTIONS,
  MAX_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_COUNT,
} from '../types/image.js';

import '../types/express.js';

const generateBaseBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  referenceId: z.string().min(1).optional(),
  referenceIds: z.array(z.string().min(1)).min(1).max(MAX_REFERENCE_IMAGES).optional(),
  model: z.string().min(1).max(100).optional(),
  count: z.number().int().min(MIN_COUNT).max(MAX_COUNT).optional(),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  isPublic: z.boolean().optional(),
});

const generateBodySchema = generateBaseBodySchema.extend({
  demoPresetId: z.string().min(1).max(100).optional(),
  resolution: z.literal(DEFAULT_IMAGE_RESOLUTION).optional(),
});

const highResGenerateBodySchema = generateBaseBodySchema.extend({
  resolution: z.enum(HIGH_RES_IMAGE_RESOLUTIONS),
  demoPresetId: z.never().optional(),
});

export interface ImagesControllerDeps {
  provider: ImageGenerationProvider;
  userQuota: UserQuotaService;
  demoGenerationDelayMs?: number;
  demoPromptCache?: DemoPromptCacheConfig;
}

export interface UploadResponse {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

export interface GenerateImageResponseItem {
  id: string;
  outputUrl: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
}

export interface GenerateResponse {
  batchId: string;
  aspectRatio: string;
  generationMode: GenerateImageOutput['mode'];
  images: GenerateImageResponseItem[];
}

export type QuotaResponse = QuotaSnapshot;

function requireUser(req: Request): { id: string } {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  return req.user;
}

function normalizeReferenceIds(
  referenceIds: string[] | undefined,
  referenceId: string | undefined,
): string[] {
  const raw = referenceIds ?? (referenceId !== undefined ? [referenceId] : []);
  return Array.from(new Set(raw.map((id) => id.trim()).filter((id) => id.length > 0)));
}

export function buildImagesController(deps: ImagesControllerDeps): {
  upload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  generate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  generateHighRes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  quota: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  return {
    async quota(req, res, next) {
      try {
        const user = requireUser(req);
        const pool = deps.userQuota.forUser(user.id);
        const body: QuotaResponse = pool.snapshot();
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async upload(req, res, next) {
      try {
        requireUser(req);
        if (!req.file) {
          throw new AppError('BAD_REQUEST', 'Missing "image" form field with a file', 400);
        }
        const saved = await saveUpload(req.file.buffer);
        const body: UploadResponse = {
          id: saved.filename,
          filename: saved.filename,
          mime: saved.mime,
          size: saved.size,
        };
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async generate(req, res, next) {
      try {
        const user = requireUser(req);
        const parsed = parseGenerateBody(generateBodySchema, req.body);

        const referenceIds = normalizeReferenceIds(parsed.referenceIds, parsed.referenceId);
        if (parsed.demoPresetId !== undefined) {
          if (!isUserAdmin(user.id)) {
            throw new AppError('FORBIDDEN', '需要管理员权限。', 403);
          }
          if (referenceIds.length > 0) {
            throw new AppError('BAD_REQUEST', '演示模式不支持参考图。', 400);
          }

          const result = await generateDemoImage({
            presetId: parsed.demoPresetId,
            ...(deps.demoGenerationDelayMs !== undefined
              ? { delayMs: deps.demoGenerationDelayMs }
              : {}),
          });
          persistGeneratedImages({
            result,
            userId: user.id,
            prompt: parsed.prompt,
            ...(parsed.model !== undefined ? { requestedModel: parsed.model } : {}),
            referenceIds,
            isPublic: parsed.isPublic ?? false,
            requestId: req.requestId,
          });
          res.status(200).json(responseFromGeneratedResult(result));
          return;
        }

        const hasReferenceContext = referenceIds.length > 0;
        const promptCacheHit =
          deps.demoPromptCache !== undefined
            ? findDemoPromptCacheHit(parsed.prompt, deps.demoPromptCache)
            : null;
        if (promptCacheHit !== null && deps.demoPromptCache !== undefined) {
          const cachedResult = await readCachedDemoPromptImage(
            promptCacheHit,
            deps.demoPromptCache,
            hasReferenceContext ? 'image-to-image' : undefined,
          );
          if (cachedResult !== null) {
            persistGeneratedImages({
              result: cachedResult,
              userId: user.id,
              prompt: parsed.prompt,
              ...(parsed.model !== undefined ? { requestedModel: parsed.model } : {}),
              referenceIds,
              isPublic: parsed.isPublic ?? false,
              requestId: req.requestId,
            });
            res.status(200).json(responseFromGeneratedResult(cachedResult));
            return;
          }
        }

        const quotaPool = deps.userQuota.forUser(user.id);
        const result = await generateImage(
          {
            prompt: parsed.prompt,
            count: parsed.count ?? DEFAULT_COUNT,
            ...(referenceIds.length > 0 ? { referenceIds } : {}),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
            ...(parsed.aspectRatio !== undefined ? { aspectRatio: parsed.aspectRatio } : {}),
          },
          { provider: deps.provider, quotaPool },
        );
        if (promptCacheHit !== null && !hasReferenceContext) {
          await writeDemoPromptCache(promptCacheHit, result);
        }

        persistGeneratedImages({
          result,
          userId: user.id,
          prompt: parsed.prompt,
          ...(parsed.model !== undefined ? { requestedModel: parsed.model } : {}),
          referenceIds,
          isPublic: parsed.isPublic ?? false,
          requestId: req.requestId,
        });
        res.status(200).json(responseFromGeneratedResult(result));
      } catch (err) {
        next(err);
      }
    },

    async generateHighRes(req, res, next) {
      try {
        const user = requireUser(req);
        const parsed = parseGenerateBody(highResGenerateBodySchema, req.body);
        const referenceIds = normalizeReferenceIds(parsed.referenceIds, parsed.referenceId);
        const quotaPool = deps.userQuota.forUser(user.id);
        const result = await generateImage(
          {
            prompt: parsed.prompt,
            count: parsed.count ?? DEFAULT_COUNT,
            ...(referenceIds.length > 0 ? { referenceIds } : {}),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
            ...(parsed.aspectRatio !== undefined ? { aspectRatio: parsed.aspectRatio } : {}),
            resolution: parsed.resolution,
          },
          { provider: deps.provider, quotaPool },
        );

        persistGeneratedImages({
          result,
          userId: user.id,
          prompt: parsed.prompt,
          ...(parsed.model !== undefined ? { requestedModel: parsed.model } : {}),
          referenceIds,
          isPublic: parsed.isPublic ?? false,
          requestId: req.requestId,
        });
        res.status(200).json(responseFromGeneratedResult(result));
      } catch (err) {
        next(err);
      }
    },
  };
}

function parseGenerateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError('BAD_REQUEST', 'Invalid generate request body', 400, err, {
        issues: err.issues,
      });
    }
    throw err;
  }
}

function persistGeneratedImages(input: {
  result: GenerateImageOutput;
  userId: string;
  prompt: string;
  requestedModel?: string;
  referenceIds: string[];
  isPublic: boolean;
  requestId: string;
}): void {
  const createdAt = new Date();
  const model = input.result.model ?? input.requestedModel ?? env.IMAGE_MODEL;
  const records: NewImageRecord[] = input.result.images.map((image) => ({
    id: image.filename,
    batchId: input.result.batchId,
    userId: input.userId,
    prompt: input.prompt,
    model,
    ...(input.referenceIds[0] !== undefined ? { referenceId: input.referenceIds[0] } : {}),
    ...(input.referenceIds.length > 0 ? { referenceIds: input.referenceIds } : {}),
    ...(input.result.aspectRatio !== undefined ? { aspectRatio: input.result.aspectRatio } : {}),
    filename: image.filename,
    mime: image.mime,
    width: image.width,
    height: image.height,
    isPublic: input.isPublic,
    createdAt,
  }));
  try {
    insertImageRecords(records);
  } catch (insertErr) {
    // Quota may already be consumed by real generation. Demo mode also returns
    // saved files, so keep the user-visible result consistent and log for ops.
    logger.error(
      {
        requestId: input.requestId,
        userId: input.userId,
        batchId: input.result.batchId,
        err: insertErr,
      },
      'images.generate: failed to persist image_records',
    );
  }
}

function responseFromGeneratedResult(result: GenerateImageOutput): GenerateResponse {
  return {
    batchId: result.batchId,
    aspectRatio: result.aspectRatio,
    generationMode: result.mode,
    images: result.images.map((image) => ({
      id: image.filename,
      outputUrl: `/api/outputs/${image.filename}`,
      filename: image.filename,
      mime: image.mime,
      width: image.width,
      height: image.height,
    })),
  };
}
