import { Buffer } from 'node:buffer';

import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { requestLogger } from '../../src/middlewares/requestLogger.js';
import { uploadImageMiddleware } from '../../src/middlewares/upload.js';

function buildApp(): Express {
  const app = express();
  app.use(requestLogger);
  app.post('/upload', uploadImageMiddleware, (req: Request, res: Response) => {
    res.status(200).json({
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      original: req.file?.originalname,
    });
  });
  app.use(errorHandler);
  return app;
}

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('uploadImageMiddleware', () => {
  it('accepts a single `image` field and exposes req.file', async () => {
    const app = buildApp();
    const fakeBytes = Buffer.concat([PNG_PREFIX, Buffer.alloc(128, 0)]);
    const res = await request(app)
      .post('/upload')
      .attach('image', fakeBytes, { filename: 'ref.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.size).toBe(fakeBytes.length);
    expect(res.body.original).toBe('ref.png');
    expect(res.body.mimetype).toBe('image/png');
  });

  it('rejects oversize uploads with 413 PAYLOAD_TOO_LARGE', async () => {
    const app = buildApp();
    // 11 MiB body, default UPLOAD_MAX_BYTES is 10 MiB
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0x41);
    const res = await request(app).post('/upload').attach('image', oversized, 'big.png');

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects requests missing the `image` field with 400', async () => {
    const app = buildApp();
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects multipart with an unexpected field name', async () => {
    const app = buildApp();
    const res = await request(app).post('/upload').attach('payload', Buffer.from('x'), 'x.png');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});
