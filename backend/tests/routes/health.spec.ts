import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';

const fakeProvider: ImageGenerationProvider = {
  generate: vi.fn(async () => ({
    images: [{ outputPath: '/dev/null/fake.png', width: 1024, height: 1024 }],
    aspectRatio: '1:1' as const,
  })),
};

describe('GET /api/health', () => {
  it('returns 200 with status, uptimeSec, and version', async () => {
    const app = createApp({ provider: fakeProvider });
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.uptimeSec).toBe('number');
    expect(res.body.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version.length).toBeGreaterThan(0);
  });

  it('does not invoke the provider for /api/health', async () => {
    const fake = vi.fn();
    const provider: ImageGenerationProvider = { generate: fake };
    const app = createApp({ provider });

    await request(app).get('/api/health');

    expect(fake).not.toHaveBeenCalled();
  });
});
