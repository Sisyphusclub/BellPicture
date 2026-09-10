import { Buffer } from 'node:buffer';
import { stat } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../src/errors/AppError.js';
import { generateImage } from '../../src/services/imageGeneration.service.js';
import type { ImageGenerationProvider } from '../../src/services/providers/ImageGenerationProvider.js';
import type { QuotaPool } from '../../src/services/quota.service.js';
import { saveOutput, saveUpload } from '../../src/storage/localStorage.js';
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

  it('passes quality through for supported 2.5 models', async () => {
    const provider = fakeProvider();
    await generateImage(
      { prompt: 'p', model: 'gpt-image-2.5-flare', quality: 'xhigh' },
      { provider },
    );
    expect(provider.generate).toHaveBeenCalledWith({
      prompt: 'p',
      model: 'gpt-image-2.5-flare',
      quality: 'xhigh',
      count: 1,
      aspectRatio: '1:1',
    });
  });

  it('rejects quality for gpt-image-2 before provider work', async () => {
    const provider = fakeProvider();
    await expect(
      generateImage({ prompt: 'p', model: 'gpt-image-2', quality: 'high' }, { provider }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
      details: { model: 'gpt-image-2', quality: 'high' },
    });
    expect(provider.generate).not.toHaveBeenCalled();
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

  it('maps a zero-image provider result to PROVIDER_EMPTY_RESULT', async () => {
    const provider: ImageGenerationProvider = {
      generate: vi.fn(
        async (): Promise<GenerateOutput> => ({
          images: [],
          aspectRatio: '1:1',
        }),
      ),
    };

    await expect(generateImage({ prompt: 'p' }, { provider })).rejects.toMatchObject({
      code: 'PROVIDER_EMPTY_RESULT',
      status: 502,
      details: { reason: 'empty_result' },
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

  it('accepts every aspect ratio at 4K resolution', async () => {
    const provider = fakeProvider();
    const aspectRatios = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2'] as const;

    for (const aspectRatio of aspectRatios) {
      await generateImage({ prompt: 'p', aspectRatio, resolution: '4k' }, { provider });
    }

    expect(provider.generate).toHaveBeenCalledTimes(aspectRatios.length);
    aspectRatios.forEach((aspectRatio, index) => {
      expect(provider.generate).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({ aspectRatio, resolution: '4k' }),
      );
    });
  });

  it.each(['2k', '4k'] as const)(
    'reserves and commits three credits per generated %s image',
    async (resolution) => {
      const provider = fakeProvider();
      const commit = vi.fn();
      const release = vi.fn();
      const quotaPool: QuotaPool = {
        snapshot: vi.fn(() => ({
          total: 20,
          remaining: 20,
          checkedInToday: false,
          dailyCheckInReward: 5,
        })),
        reserve: vi.fn(() => ({ commit, release })),
        checkIn: vi.fn(() => ({
          total: 20,
          remaining: 20,
          checkedInToday: true,
          dailyCheckInReward: 5,
          claimed: true,
        })),
      };

      await generateImage(
        { prompt: 'high resolution', count: 2, resolution },
        { provider, quotaPool },
      );

      expect(quotaPool.reserve).toHaveBeenCalledWith(6);
      expect(commit).toHaveBeenCalledWith(6);
      expect(release).not.toHaveBeenCalled();
    },
  );

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
      referencePaths?: string[];
    };
    expect(call.prompt).toBe('rework');
    expect(call.referencePaths).toEqual([saved.absolutePath]);
  });

  it('rejects a stale referenceId with BAD_REQUEST 400', async () => {
    const provider = fakeProvider();
    await expect(
      generateImage(
        { prompt: 'p', referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp' },
        { provider },
      ),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      generateImage(
        { prompt: 'p', referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp' },
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

  it('passes cancellation to the provider and releases the quota reservation', async () => {
    const controller = new AbortController();
    const release = vi.fn();
    const commit = vi.fn();
    const quotaPool: QuotaPool = {
      snapshot: vi.fn(() => ({
        total: 1,
        remaining: 1,
        checkedInToday: false,
        dailyCheckInReward: 5,
      })),
      reserve: vi.fn(() => ({ commit, release })),
      checkIn: vi.fn(() => ({
        total: 1,
        remaining: 1,
        checkedInToday: true,
        dailyCheckInReward: 5,
        claimed: true,
      })),
    };
    const provider: ImageGenerationProvider = {
      generate: vi.fn(
        (input: GenerateInput) =>
          new Promise<GenerateOutput>((_resolve, reject) => {
            input.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('cancelled', 'AbortError')),
              { once: true },
            );
          }),
      ),
    };

    const pending = generateImage(
      { prompt: 'cancel me', signal: controller.signal },
      { provider, quotaPool },
    );
    await vi.waitFor(() => expect(provider.generate).toHaveBeenCalledOnce());
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(release).toHaveBeenCalledOnce();
    expect(commit).not.toHaveBeenCalled();
  });

  it('removes provider outputs and releases quota when reservation commit fails', async () => {
    const saved = await saveOutput(PNG_PREFIX, 'png');
    const commitError = new AppError('INTERNAL', 'quota settlement failed', 500);
    const release = vi.fn();
    const quotaPool: QuotaPool = {
      snapshot: vi.fn(() => ({
        total: 1,
        remaining: 1,
        checkedInToday: false,
        dailyCheckInReward: 5,
      })),
      reserve: vi.fn(() => ({
        commit: vi.fn(() => {
          throw commitError;
        }),
        release,
      })),
      checkIn: vi.fn(() => ({
        total: 1,
        remaining: 1,
        checkedInToday: true,
        dailyCheckInReward: 5,
        claimed: true,
      })),
    };
    const provider: ImageGenerationProvider = {
      generate: vi.fn(async () => ({
        images: [{ outputPath: saved.absolutePath, width: 1024, height: 1024 }],
        aspectRatio: '1:1' as const,
      })),
    };

    await expect(generateImage({ prompt: 'settle me' }, { provider, quotaPool })).rejects.toBe(
      commitError,
    );
    await expect(stat(saved.absolutePath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(release).toHaveBeenCalledOnce();
  });
});
