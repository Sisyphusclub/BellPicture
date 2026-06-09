import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ImagesApi from '@/services/api/imagesApi';
import { ImageApiError } from '@/services/api/imagesApi';
import type { GenerateRequest, GenerateResponse } from '@/types/image';

const { add, uploadReferenceImages, generateImage } = vi.hoisted(() => ({
  add: vi.fn(),
  uploadReferenceImages: vi.fn(),
  generateImage: vi.fn(),
}));

vi.mock('@/composables/useImageHistory', () => ({
  useImageHistory: () => ({ add }),
}));

vi.mock('@/services/api/imagesApi', async () => {
  const actual = await vi.importActual<typeof ImagesApi>('@/services/api/imagesApi');
  return {
    ...actual,
    uploadReferenceImages,
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

    expect(uploadReferenceImages).not.toHaveBeenCalled();
    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '沿用历史参考图',
        referenceIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png'],
      }) satisfies Partial<GenerateRequest>,
    );
    expect(result.generationMode).toBe('image-to-image');
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',
      }),
    );
  });

  it('passes demo preset id through to the generation API', async () => {
    const { useImageGeneration } = await import('@/composables/useImageGeneration');
    add.mockImplementation((record) => ({
      record,
      imageUrl: `http://localhost:3000/api/outputs/${record.id}`,
    }));
    generateImage.mockResolvedValue({
      ...createGenerateResponse(),
      generationMode: 'text-to-image',
    });

    const { generate } = useImageGeneration();
    await generate({
      prompt: '管理员演示提示词',
      demoPresetId: 'studio-showcase',
    });

    expect(uploadReferenceImages).not.toHaveBeenCalled();
    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '管理员演示提示词',
        demoPresetId: 'studio-showcase',
      }) satisfies Partial<GenerateRequest>,
    );
  });

  it('explains provider timeouts with an actionable message', async () => {
    const { useImageGeneration } = await import('@/composables/useImageGeneration');
    generateImage.mockRejectedValue(
      new ImageApiError(504, 'PROVIDER_TIMEOUT', 'timed out', 'req-timeout'),
    );

    const { error, generate } = useImageGeneration();

    await expect(generate({ prompt: '复古人像' })).rejects.toThrow('上游生成服务响应超时');
    expect(error.value?.message).toContain('减少参考图数量');
    expect(error.value?.message).toContain('请求编号：req-timeout');
  });

  it('explains prompt rejection errors from the backend', async () => {
    const { useImageGeneration } = await import('@/composables/useImageGeneration');
    generateImage.mockRejectedValue(
      new ImageApiError(
        422,
        'PROVIDER_PROMPT_REJECTED',
        'prompt rejected',
        'req-rejected',
      ),
    );

    const { error, generate } = useImageGeneration();

    await expect(generate({ prompt: '调整人物外貌' })).rejects.toThrow('未通过上游安全策略');
    expect(error.value?.message).toContain('避开敏感外貌、身体或衣物修改');
    expect(error.value?.message).toContain('请求编号：req-rejected');
  });

  it('keeps old provider error details actionable for prompt issues', async () => {
    const { useImageGeneration } = await import('@/composables/useImageGeneration');
    generateImage.mockRejectedValue(
      new ImageApiError(502, 'PROVIDER_ERROR', 'provider error', 'req-legacy', {
        upstreamStatus: 400,
      }),
    );

    const { error, generate } = useImageGeneration();

    await expect(generate({ prompt: '调整人物外貌' })).rejects.toThrow(
      '提示词或参考图可能未通过上游安全策略',
    );
    expect(error.value?.message).toContain('请求编号：req-legacy');
  });

  it('explains empty upstream image results', async () => {
    const { useImageGeneration } = await import('@/composables/useImageGeneration');
    generateImage.mockRejectedValue(
      new ImageApiError(502, 'PROVIDER_EMPTY_RESULT', 'empty result', 'req-empty'),
    );

    const { error, generate } = useImageGeneration();

    await expect(generate({ prompt: '复古人像' })).rejects.toThrow('没有返回图片结果');
    expect(error.value?.message).toContain('更明确、限制更少的提示词');
    expect(error.value?.message).toContain('请求编号：req-empty');
  });
});
