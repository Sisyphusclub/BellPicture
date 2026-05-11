import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../src/errors/AppError.js';
import { generateImage } from '../../src/services/imageGeneration.service.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveUpload } from '../../src/storage/localStorage.js';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeProvider(): ImageGenerationProvider {
  return {
    generate: vi.fn(async () => ({
      outputPath: '/some/path/out.png',
      width: 1024,
      height: 1024,
    })),
  };
}

describe('imageGeneration.service', () => {
  it('text-to-image: calls provider without referencePath, mode=text-to-image', async () => {
    const provider = fakeProvider();
    const result = await generateImage({ prompt: 'a cat' }, { provider });

    expect(result.mode).toBe('text-to-image');
    expect(result.filename).toBe('out.png');
    expect(result.mime).toBe('image/png');
    expect(provider.generate).toHaveBeenCalledWith({ prompt: 'a cat' });
  });

  it('passes through optional model', async () => {
    const provider = fakeProvider();
    await generateImage({ prompt: 'p', model: 'dall-e-3' }, { provider });
    expect(provider.generate).toHaveBeenCalledWith({ prompt: 'p', model: 'dall-e-3' });
  });

  it('image-to-image: resolves referenceId to an absolute path under UPLOAD_DIR', async () => {
    const buf = Buffer.concat([PNG_PREFIX, Buffer.alloc(64, 0)]);
    const saved = await saveUpload(buf);

    const provider = fakeProvider();
    const result = await generateImage(
      { prompt: 'rework', referenceId: saved.filename },
      { provider },
    );

    expect(result.mode).toBe('image-to-image');
    const call = (provider.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      prompt: string;
      referencePath?: string;
    };
    expect(call.prompt).toBe('rework');
    expect(call.referencePath).toBe(saved.absolutePath);
  });

  it('rejects a stale referenceId with BAD_REQUEST 400', async () => {
    const provider = fakeProvider();
    await expect(
      generateImage(
        { prompt: 'p', referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png' },
        { provider },
      ),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      generateImage(
        { prompt: 'p', referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png' },
        { provider },
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', status: 400 });
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('rejects a malformed referenceId before touching the filesystem', async () => {
    const provider = fakeProvider();
    await expect(
      generateImage({ prompt: 'p', referenceId: 'totally-bogus' }, { provider }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', status: 400 });
  });
});
