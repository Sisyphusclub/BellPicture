import { readonly, ref } from 'vue';

import {
  createGenerateRequest,
  generateImage,
  ImageApiError,
  uploadReferenceImage,
} from '@/services/api/imagesApi';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  type AspectRatio,
  type GeneratedBatchResult,
  type HistoryEntry,
  type ImageRecord,
} from '@/types/image';

import { useImageHistory } from './useImageHistory';

const DEFAULT_MODEL = 'gpt-image-2';

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  referenceFile?: File;
  referenceId?: string;
  count?: number;
  aspectRatio?: AspectRatio;
  isPublic?: boolean;
}

export function useImageGeneration() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const lastBatch = ref<GeneratedBatchResult | null>(null);
  const statusMessage = ref('已准备好开始新的生成。');
  const { add } = useImageHistory();

  async function generate(options: GenerateImageOptions): Promise<GeneratedBatchResult> {
    const prompt = options.prompt.trim();
    if (!prompt) {
      const promptError = new Error('请先描述你想生成的图片。');
      error.value = promptError;
      throw promptError;
    }

    isLoading.value = true;
    error.value = null;
    statusMessage.value = '正在准备请求内容。';

    const count = options.count ?? DEFAULT_COUNT;
    const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO;

    try {
      let referenceId = options.referenceId?.trim() || undefined;
      if (options.referenceFile) {
        statusMessage.value = '正在上传参考图。';
        const upload = await uploadReferenceImage(options.referenceFile);
        referenceId = upload.id;
      }

      statusMessage.value = referenceId ? '正在结合参考图生成图片。' : '正在根据提示词生成图片。';
      const model = options.model?.trim() || DEFAULT_MODEL;
      const requestStart = Date.now();
      const request = createGenerateRequest({
        prompt,
        model,
        count,
        aspectRatio,
        ...(referenceId !== undefined ? { referenceId } : {}),
        isPublic: options.isPublic ?? false,
      });
      const generated = await generateImage(request);

      statusMessage.value = '正在收尾。';
      const entries: HistoryEntry[] = [];
      const createdAt = new Date().toISOString();
      const elapsedMs = Date.now() - requestStart;

      for (const image of generated.images) {
        const record = createImageRecord({
          id: image.id,
          batchId: generated.batchId,
          createdAt,
          prompt,
          model,
          aspectRatio: generated.aspectRatio,
          width: image.width,
          height: image.height,
          elapsedMs,
          isPublic: options.isPublic ?? false,
          ...(referenceId !== undefined ? { referenceId } : {}),
        });
        const entry = add(record);
        entries.push(entry);
      }

      const result: GeneratedBatchResult = {
        batchId: generated.batchId,
        aspectRatio: generated.aspectRatio,
        generationMode: generated.generationMode,
        entries,
      };
      lastBatch.value = result;
      statusMessage.value = '生成结果已写入云端历史。';
      return result;
    } catch (unknownError) {
      const displayError = toUserFacingGenerationError(unknownError);
      error.value = displayError;
      statusMessage.value = '生成失败。';
      throw displayError;
    } finally {
      isLoading.value = false;
    }
  }

  function clearLastBatch(): void {
    lastBatch.value = null;
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastBatch: readonly(lastBatch),
    statusMessage: readonly(statusMessage),
    generate,
    clearLastBatch,
  };
}

function createImageRecord(input: {
  id: string;
  batchId: string;
  createdAt: string;
  prompt: string;
  model: string;
  referenceId?: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  elapsedMs?: number;
  isPublic: boolean;
}): ImageRecord {
  const record: ImageRecord = {
    id: input.id,
    batchId: input.batchId,
    createdAt: input.createdAt,
    prompt: input.prompt,
    model: input.model,
    aspectRatio: input.aspectRatio,
    width: input.width,
    height: input.height,
    isPublic: input.isPublic,
  };
  if (input.referenceId !== undefined) record.referenceId = input.referenceId;
  if (input.elapsedMs !== undefined) record.elapsedMs = input.elapsedMs;
  return record;
}

function toUserFacingGenerationError(unknownError: unknown): Error {
  if (unknownError instanceof ImageApiError) {
    return new Error(messageForImageApiError(unknownError));
  }
  return new Error('生成失败，请检查后端服务是否可用后重试。');
}

function messageForImageApiError(error: ImageApiError): string {
  const requestSuffix = error.requestId ? `（请求编号：${error.requestId}）` : '';

  switch (error.code) {
    case 'PAYLOAD_TOO_LARGE':
      return `参考图超过后端限制，请压缩后重试。${requestSuffix}`;
    case 'UNSUPPORTED_MEDIA_TYPE':
      return `后端无法识别此参考图格式，请改用 PNG、JPEG 或 WebP。${requestSuffix}`;
    case 'PROVIDER_TIMEOUT':
      return `生成服务响应超时，请稍后重试。${requestSuffix}`;
    case 'PROVIDER_RATE_LIMITED':
      return `生成服务当前请求过多，请稍后再试。${requestSuffix}`;
    case 'QUOTA_EXHAUSTED':
      return `GPT 号池剩余额度不足，请稍后补充额度后再试。${requestSuffix}`;
    case 'BAD_REQUEST':
      return `请求内容无效，请检查提示词和参考图。${requestSuffix}`;
    case 'NOT_FOUND':
      return `生成图片不存在或已被后端清理。${requestSuffix}`;
    case 'INVALID_RESPONSE':
      return `后端返回了无法识别的响应。${requestSuffix}`;
    case 'NETWORK_ERROR':
      // authedFetch already provides a Simplified-Chinese message for native
      // fetch failures; surface it directly instead of appending status 0.
      return `${error.message}${requestSuffix}`;
    case 'HTTP_ERROR':
      return `请求失败，状态码 ${error.status}。${requestSuffix}`;
    default:
      return `生成请求失败，状态码 ${error.status}。${requestSuffix}`;
  }
}
