import { Router, type RequestHandler } from 'express';

import {
  buildUserSettingsController,
  type UserSettingsControllerDeps,
} from '../controllers/userSettings.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export interface UserSettingsRouterDeps extends UserSettingsControllerDeps {
  authMiddleware?: RequestHandler;
  mutationRateLimiter?: RequestHandler;
}

export function buildUserSettingsRouter(deps: UserSettingsRouterDeps): Router {
  const router = Router();
  const controller = buildUserSettingsController(deps);
  router.use(deps.authMiddleware ?? requireAuth);

  router.get('/image-api-key', (req, res, next) => {
    void controller.getImageApiKey(req, res, next);
  });
  router.put('/image-api-key', deps.mutationRateLimiter ?? passThrough, (req, res, next) => {
    void controller.updateImageApiKey(req, res, next);
  });
  router.delete('/image-api-key', deps.mutationRateLimiter ?? passThrough, (req, res, next) => {
    void controller.deleteImageApiKey(req, res, next);
  });

  return router;
}

const passThrough: RequestHandler = (_req, _res, next) => next();
