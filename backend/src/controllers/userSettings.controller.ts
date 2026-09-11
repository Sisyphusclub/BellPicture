import type { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import type { ImageGenerationProvider } from '../services/providers/ImageGenerationProvider.js';
import type {
  UserImageApiKeyService,
  UserImageApiKeyStatus,
} from '../services/userImageApiKey.service.js';

import '../types/express.js';

const updateImageApiKeySchema = z.object({
  apiKey: z.string().min(1).max(4096),
  group: z.enum(['standard', 'high-res']).default('standard'),
});

export interface UserSettingsControllerDeps {
  provider: ImageGenerationProvider;
  userImageApiKeys: UserImageApiKeyService;
}

function requireUser(req: Request): { id: string } {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  return req.user;
}

export function buildUserSettingsController(deps: UserSettingsControllerDeps): {
  getImageApiKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  updateImageApiKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  deleteImageApiKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  return {
    async getImageApiKey(req, res, next) {
      try {
        const user = requireUser(req);
        res.status(200).json(deps.userImageApiKeys.getStatus(user.id));
      } catch (err) {
        next(err);
      }
    },

    async updateImageApiKey(req, res, next) {
      try {
        const user = requireUser(req);
        const parsed = parseUpdateBody(req.body);
        const apiKey = parsed.apiKey.trim();
        if (apiKey.length === 0) {
          throw new AppError('BAD_REQUEST', 'API Key 不能为空。', 400);
        }
        if (deps.provider.validateCredential === undefined) {
          throw new AppError(
            'INTERNAL',
            'The configured image provider does not support credential validation',
            500,
          );
        }
        await deps.provider.validateCredential({
          credential: apiKey,
          model:
            parsed.group === 'high-res'
              ? (env.HIGH_RES_IMAGE_MODEL ?? env.IMAGE_MODEL)
              : env.IMAGE_MODEL,
          credentialGroup: parsed.group,
          requestId: req.requestId,
        });
        const body: UserImageApiKeyStatus = deps.userImageApiKeys.save(
          user.id,
          apiKey,
          parsed.group,
        );
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },

    async deleteImageApiKey(req, res, next) {
      try {
        const user = requireUser(req);
        const group = req.query.group === 'high-res' ? 'high-res' : 'standard';
        const body: UserImageApiKeyStatus = deps.userImageApiKeys.remove(user.id, group);
        res.status(200).json(body);
      } catch (err) {
        next(err);
      }
    },
  };
}

function parseUpdateBody(body: unknown): z.infer<typeof updateImageApiKeySchema> {
  try {
    return updateImageApiKeySchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError('BAD_REQUEST', 'Invalid image API Key request body', 400, err, {
        issues: err.issues,
      });
    }
    throw err;
  }
}
