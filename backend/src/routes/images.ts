import { Router, type RequestHandler } from 'express';

import {
  buildImagesController,
  type ImagesControllerDeps,
} from '../controllers/images.controller.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { uploadImageMiddleware } from '../middlewares/upload.js';

export interface ImagesRouterDeps extends ImagesControllerDeps {
  /** Optional override for the auth middleware; defaults to `requireAuth`. */
  authMiddleware?: RequestHandler;
  uploadRateLimiter?: RequestHandler;
  generationRateLimiter?: RequestHandler;
}

export function buildImagesRouter(deps: ImagesRouterDeps): Router {
  const router = Router();
  const controller = buildImagesController(deps);

  // All image endpoints require authentication. Each handler reads the
  // authenticated user from `req.user.id` for per-user quota tracking.
  router.use(deps.authMiddleware ?? requireAuth);

  // GET /api/images/quota -> { total, remaining } for the current user's effective quota.
  router.get('/quota', (req, res, next) => {
    void controller.quota(req, res, next);
  });
  router.post('/quota/check-in', (req, res, next) => {
    void controller.checkIn(req, res, next);
  });
  router.post(
    '/upload',
    deps.uploadRateLimiter ?? passThrough,
    uploadImageMiddleware,
    (req, res, next) => {
      void controller.upload(req, res, next);
    },
  );
  router.post('/generate', deps.generationRateLimiter ?? passThrough, (req, res, next) => {
    void controller.generate(req, res, next);
  });
  // POST /api/images/generate/high-res (auth: admin, JSON body) -> 2K/4K image generation.
  router.post(
    '/generate/high-res',
    deps.generationRateLimiter ?? passThrough,
    requireAdmin,
    (req, res, next) => {
      void controller.generateHighRes(req, res, next);
    },
  );

  return router;
}

const passThrough: RequestHandler = (_req, _res, next) => next();
