import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import { Router, type Request, type Response } from 'express';

const HERO_VIDEO_SOURCE =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4';
const FORWARDED_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
] as const;

function copyMediaHeaders(upstream: Headers, response: Response): void {
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.get(name);
    if (value) response.setHeader(name, value);
  }
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader(
    'Access-Control-Expose-Headers',
    'Accept-Ranges, Content-Length, Content-Range, Content-Type, ETag, Last-Modified',
  );
  response.setHeader('Cache-Control', 'public, max-age=3600');
}

async function streamHeroVideo(request: Request, response: Response): Promise<void> {
  const requestHeaders = new Headers();
  if (request.headers.range) requestHeaders.set('range', request.headers.range);

  const upstream = await fetch(HERO_VIDEO_SOURCE, { headers: requestHeaders });
  if (!upstream.ok && upstream.status !== 206) {
    response.status(upstream.status).end();
    return;
  }

  copyMediaHeaders(upstream.headers, response);
  response.status(upstream.status);

  if (!upstream.body) {
    response.end();
    return;
  }

  await pipeline(Readable.fromWeb(upstream.body as unknown as NodeReadableStream), response);
}

export const mediaRouter = Router();

mediaRouter.get('/liquid-glass.mp4', (request, response, next) => {
  void streamHeroVideo(request, response).catch(next);
});
