import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../src/errors/AppError.js';
import { generateImage } from '../../src/services/imageGeneration.service.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import { saveUpload } from '../../src/storage/localStorage.js';
import type { GenerateInput, GenerateOutput } from '../../src/types/image.js';

const PNG_PREFIX = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeProvider(): ImageGenerationProvider {
  return {
    generate: vi.fn(async (input: GenerateInput): Promise<GenerateOutput> => {
      const count = input.count ?? 1;
      const aspectRatio = input.aspectRatio ?? '1:1';
      const images = [] as GenerateOutput['images'];
      for (let index = 0; index < count; index += 1) {
        images.push({
          outputPath: `/some/path/out-${index}.png`,
          width: 1024,
          height: 1024,
        });
      }
      return { images, aspectRatio };
    }),
  };
}

describe('imageGeneration.service', () => {
  it('text-to-image: calls provider with default count + aspectRatio, mode=text-to-image', async () => {
    const provider = fakeProvider();
    const result = await generateImage({ prompt: 'a cat' }, { provider });

    expect(result.mode).toBe('text-to-image');
    expect(result.aspectRatio).toBe('1:1');
    expect(result.batchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.filename).toBe('out-0.png');
    expect(result.images[0]?.mime).toBe('image/png');
    expect(provider.generate).toHaveBeenCalledWith({
      prompt: 'a cat',
      count: 1,
      aspectRatio: '1:1',
    });
  });

  it('passes through optional model', async () => {
    const provider = fakeProvider();
    await generateImage({ prompt: 'p', model: 'dall-e-3' }, { provider });
    expect(provider.generate).toHaveBeenCalledWith({
      prompt: 'p',
      model: 'dall-e-3',
      count: 1,
      aspectRatio: '1:1',
    });
  });

  it('honours explicit count and aspectRatio', async () => {
    const provider = fakeProvider();
    const result = await generateImage(
      { prompt: 'p', count: 2, aspectRatio: '16:9' },
      { provider },
    );
    expect(result.images).toHaveLength(2);
    expect(result.aspectRatio).toBe('16:9');
    expect(provider.generate).toHaveBeenCalledWith({
      prompt: 'p',
      count: 2,
      aspectRatio: '16:9',
    });
  });

  it('rejects count below MIN', async () => {
    const provider = fakeProvider();
    await expect(generateImage({ prompt: 'p', count: 0 }, { provider })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it('rejects count above MAX', async () => {
    const provider = fakeProvider();
    await expect(generateImage({ prompt: 'p', count: 5 }, { provider })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
    });
    expect(provider.generate).not.toHaveBeenCalled();
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
