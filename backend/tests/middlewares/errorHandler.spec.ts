import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../src/errors/AppError.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { requestLogger } from '../../src/middlewares/requestLogger.js';

function buildApp(route: RequestHandler): express.Express {
  const app = express();
  app.use(requestLogger);
  app.get('/throw', route);
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('returns the documented JSON shape for AppError', async () => {
    const app = buildApp((_req, _res, next) => {
      next(new AppError('PROVIDER_TIMEOUT', 'upstream took too long', 504));
    });

    const res = await request(app).get('/throw');

    expect(res.status).toBe(504);
    expect(res.body).toMatchObject({
      error: {
        code: 'PROVIDER_TIMEOUT',
        message: 'upstream took too long',
      },
    });
    expect(typeof res.body.error.requestId).toBe('string');
    expect(res.body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns INTERNAL 500 for unknown errors and does not leak the stack', async () => {
    const app = buildApp((_req, _res, next) => {
      next(new Error('boom — should not leak'));
    });

    const res = await request(app).get('/throw');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
    });
    expect(typeof res.body.error.requestId).toBe('string');
    expect(res.text).not.toContain('boom');
    expect(res.text).not.toMatch(/\n\s*at\s+/);
  });
});
