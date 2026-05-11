import cors from 'cors';
import express, { type Express } from 'express';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { healthRouter } from './routes/health.js';
import { buildImagesRouter } from './routes/images.js';
import { outputsRouter } from './routes/outputs.js';
import type { ImageGenerationProvider } from './services/providers/ImageGenerationProvider.js';

export interface AppDeps {
  provider: ImageGenerationProvider;
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.use(requestLogger);
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', healthRouter);
  app.use('/api/images', buildImagesRouter({ provider: deps.provider }));
  app.use('/api/outputs', outputsRouter);

  app.use(errorHandler);
  return app;
}
