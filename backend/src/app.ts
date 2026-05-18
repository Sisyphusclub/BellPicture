import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './config/auth.js';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { buildUsernameAuthRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { buildHistoryRouter } from './routes/history.js';
import { buildImagesRouter } from './routes/images.js';
import { buildOpenAICompatRouter } from './routes/openaiCompat.js';
import { outputsRouter } from './routes/outputs.js';
import type { ImageGenerationProvider } from './services/providers/ImageGenerationProvider.js';
import { createUserQuotaService, type UserQuotaService } from './services/userQuota.service.js';

export interface AppDeps {
  provider: ImageGenerationProvider;
  userQuota?: UserQuotaService;
  /** Override the auth middleware. Tests can inject a stub that attaches `req.user` synchronously. */
  authMiddleware?: RequestHandler;
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.use(requestLogger);
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use('/api/auth', buildUsernameAuthRouter());

  // Better Auth handler must come BEFORE express.json() so OAuth callbacks
  // are not consumed by the JSON middleware.
  const authNodeHandler = toNodeHandler(auth);
  app.all('/api/auth/*', (req, res) => {
    void authNodeHandler(req, res);
  });

  app.use(express.json({ limit: '1mb' }));

  const userQuota = deps.userQuota ?? createUserQuotaService();

  app.use('/v1', buildOpenAICompatRouter({ provider: deps.provider }));

  app.use('/api', healthRouter);
  app.use(
    '/api/images',
    buildImagesRouter({
      provider: deps.provider,
      userQuota,
      ...(deps.authMiddleware !== undefined ? { authMiddleware: deps.authMiddleware } : {}),
    }),
  );
  app.use(
    '/api/history',
    buildHistoryRouter(
      deps.authMiddleware !== undefined ? { authMiddleware: deps.authMiddleware } : {},
    ),
  );
  app.use('/api/outputs', outputsRouter);

  app.use(errorHandler);
  return app;
}
