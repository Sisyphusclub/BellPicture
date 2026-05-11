import cors from 'cors';
import express, { type Express } from 'express';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { healthRouter } from './routes/health.js';
import type { ImageGenerationProvider } from './services/providers/ImageGenerationProvider.js';

export interface AppDeps {
  /**
   * Kept on AppDeps for forward-compat with task 2 (image endpoints). The
   * skeleton's only route (`/api/health`) does not call the provider yet —
   * it is wired through `createApp` so the test harness can pass a fake.
   */
  provider: ImageGenerationProvider;
}

export function createApp(_deps: AppDeps): Express {
  const app = express();

  app.use(requestLogger);
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', healthRouter);

  app.use(errorHandler);
  return app;
}
