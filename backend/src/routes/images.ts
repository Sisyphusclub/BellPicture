import { Router } from 'express';

import { buildImagesController } from '../controllers/images.controller.js';
import { uploadImageMiddleware } from '../middlewares/upload.js';
import type { ImageGenerationDeps } from '../services/imageGeneration.service.js';

export function buildImagesRouter(deps: ImageGenerationDeps): Router {
  const router = Router();
  const controller = buildImagesController(deps);

  router.post('/upload', uploadImageMiddleware, (req, res, next) => {
    void controller.upload(req, res, next);
  });
  router.post('/generate', (req, res, next) => {
    void controller.generate(req, res, next);
  });

  return router;
}
