import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ImagesApi from '@/services/api/imagesApi';
import type { GenerateRequest, GenerateResponse } from '@/types/image';

const add = vi.fn();
const uploadReferenceImage = vi.fn();
const generateImage = vi.fn();

vi.mock('@/composables/useImageHistory', () => ({
  useImageHistory: () => ({ add }),
}));

vi.mock('@/services/api/imagesApi', async () => {
  const actual = await vi.importActual<typeof ImagesApi>('@/services/api/imagesApi');
  return {
    ...actual,
    uploadReferenceImage,
    generateImage,
  };
});

function createGenerateResponse(): GenerateResponse {
  return {
    batchId: 'batch-1',
    aspectRatio: '1:1',
    generationMode: 'image-to-image',
    images: [
      {
        id: 'generated.png',
        outputUrl: '/api/outputs/generated.png',
        filename: 'generated.png',
        mime: 'image/png',
        width: 1024,
        height: 1024,
      },
    ],
  };
}

describe('useImageGeneration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reuses an existing reference id without uploading a file', async () => {
    const { useImageGeneration } = await import('@/composables/useImageGeneration');
    add.mockImplementation((record) => ({
      record,
      imageUrl: `http://localhost:3000/api/outputs/${record.id}`,
    }));
    generateImage.mockResolvedValue(createGenerateResponse());

    const { generate } = useImageGeneration();
    const result = await generate({
      prompt: '沿用历史参考图',
      referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',
    });

    expect(uploadReferenceImage).not.toHaveBeenCalled();
    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '沿用历史参考图',
        referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',
      }) satisfies Partial<GenerateRequest>,
    );
    expect(result.generationMode).toBe('image-to-image');
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',
      }),
    );
  });
});
