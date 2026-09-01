import { Router, type RequestHandler } from 'express';

import { getOutput } from '../controllers/outputs.controller.js';
import { optionalAuth } from '../middlewares/optionalAuth.js';

export function buildOutputsRouter(authMiddleware: RequestHandler = optionalAuth): Router {
  const router = Router();

  router.get('/:filename', authMiddleware, (req, res, next) => {
    void getOutput(req, res, next);
  });

  return router;
}
