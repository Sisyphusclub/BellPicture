import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';
import {
  generateImage,
  type GenerateImageOutput,
} from '../services/imageGeneration.service.js';
import type { ImageGenerationProvider } from '../services/providers/ImageGenerationProvider.js';
import type { QuotaSnapshot } from '../services/quota.service.js';
import type { UserQuotaService } from '../services/userQuota.service.js';
import { saveUpload } from '../storage/localStorage.js';
import { ASPECT_RATIOS, DEFAULT_COUNT, MAX_COUNT, MIN_COUNT } from '../types/image.js';

import '../types/express.js';

const generateBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  referenceId: z.string().min(1).optional(),
  model: z.string().min(1).max(100).optional(),
  count: z.number().int().min(MIN_COUNT).max(MAX_COUNT).optional(),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
});

export interface ImagesControllerDeps {
  provider: ImageGenerationProvider;
  userQuota: UserQuotaService;
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

export function buildImagesController(deps: ImagesControllerDeps): {
  upload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  generate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
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
        let parsed: z.infer<typeof generateBodySchema>;
        try {
          parsed = generateBodySchema.parse(req.body);
        } catch (err) {
          if (err instanceof ZodError) {
            throw new AppError('BAD_REQUEST', 'Invalid generate request body', 400, err, {
              issues: err.issues,
            });
          }
          throw err;
        }

        const quotaPool = deps.userQuota.forUser(user.id);
        const result = await generateImage(
          {
            prompt: parsed.prompt,
            count: parsed.count ?? DEFAULT_COUNT,
            ...(parsed.referenceId !== undefined ? { referenceId: parsed.referenceId } : {}),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
            ...(parsed.aspectRatio !== undefined ? { aspectRatio: parsed.aspectRatio } : {}),
          },
          { provider: deps.provider, quotaPool },
        );

        const body: GenerateResponse = {
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
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}
