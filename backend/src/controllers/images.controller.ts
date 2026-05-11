import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { AppError } from '../errors/AppError.js';
import {
  generateImage,
  type GenerateImageOutput,
  type ImageGenerationDeps,
} from '../services/imageGeneration.service.js';
import { saveUpload } from '../storage/localStorage.js';

const generateBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  referenceId: z.string().min(1).optional(),
  model: z.string().min(1).max(100).optional(),
});

export interface UploadResponse {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

export interface GenerateResponse {
  id: string;
  outputUrl: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
  generationMode: GenerateImageOutput['mode'];
}

export function buildImagesController(deps: ImageGenerationDeps): {
  upload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  generate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  return {
    async upload(req, res, next) {
      try {
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

        const result = await generateImage(
          {
            prompt: parsed.prompt,
            ...(parsed.referenceId !== undefined ? { referenceId: parsed.referenceId } : {}),
            ...(parsed.model !== undefined ? { model: parsed.model } : {}),
          },
          deps,
        );

        const body: GenerateResponse = {
          id: result.filename,
          outputUrl: `/api/outputs/${result.filename}`,
          filename: result.filename,
          mime: result.mime,
          width: result.width,
          height: result.height,
          generationMode: result.mode,
        };
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}
