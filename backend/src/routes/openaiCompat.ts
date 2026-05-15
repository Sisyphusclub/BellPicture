import { Router } from 'express';

import { buildOpenAICompatController } from '../controllers/openaiCompat.controller.js';
import { openaiCompatAuth } from '../middlewares/openaiCompatAuth.js';
import { uploadImageMiddleware } from '../middlewares/upload.js';
import type { ImageGenerationProvider } from '../services/providers/ImageGenerationProvider.js';

export interface OpenAICompatRouterDeps {
  provider: ImageGenerationProvider;
}

export function buildOpenAICompatRouter(deps: OpenAICompatRouterDeps): Router {
  const router = Router();
  const controller = buildOpenAICompatController(deps);

  // Every /v1 endpoint uses inbound API-key auth, not Better Auth sessions.
  router.use(openaiCompatAuth);

  // GET /v1/models (auth: bearer) -> OpenAI-compatible model list envelope.
  router.get('/models', (req, res, next) => {
    void controller.models(req, res, next);
  });

  // POST /v1/images/generations (auth: bearer, JSON body) -> OpenAI ImagesResponse.
  router.post('/images/generations', (req, res, next) => {
    void controller.generations(req, res, next);
  });

  // POST /v1/images/edits (auth: bearer, multipart image + prompt) -> OpenAI ImagesResponse.
  router.post('/images/edits', uploadImageMiddleware, (req, res, next) => {
    void controller.edits(req, res, next);
  });

  // POST /v1/chat/completions (auth: bearer, JSON body) -> chat.completion with image links.
  router.post('/chat/completions', (req, res, next) => {
    void controller.chatCompletions(req, res, next);
  });

  // POST /v1/responses (auth: bearer, JSON body) -> response with image_generation_call outputs.
  router.post('/responses', (req, res, next) => {
    void controller.responses(req, res, next);
  });

  return router;
}
