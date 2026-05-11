import { readonly, ref } from 'vue';

import {
  createGenerateRequest,
  fetchOutputBlob,
  generateImage,
  ImageApiError,
  uploadReferenceImage,
} from '@/services/api/imagesApi';
import type { GeneratedImageResult, ImageRecord } from '@/types/image';

import { useImageHistory } from './useImageHistory';

const DEFAULT_MODEL = 'gpt-image-2';

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  referenceFile?: File;
}

export function useImageGeneration() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  const lastResult = ref<GeneratedImageResult | null>(null);
  const statusMessage = ref('已准备好开始新的生成。');
  const { add } = useImageHistory();

  async function generate(options: GenerateImageOptions): Promise<GeneratedImageResult> {
    const prompt = options.prompt.trim();
    if (!prompt) {
      const promptError = new Error('请先描述你想生成的图片。');
      error.value = promptError;
      throw promptError;
    }

    isLoading.value = true;
    error.value = null;
    statusMessage.value = '正在准备请求内容。';

    try {
      let referenceId: string | undefined;
      if (options.referenceFile) {
        statusMessage.value = '正在上传参考图。';
        const upload = await uploadReferenceImage(options.referenceFile);
        referenceId = upload.id;
      }

      statusMessage.value = referenceId ? '正在结合参考图生成图片。' : '正在根据提示词生成图片。';
      const model = options.model?.trim() || DEFAULT_MODEL;
      const requestInput: { prompt: string; referenceId?: string; model?: string } = {
        prompt,
        model,
      };
      if (referenceId !== undefined) requestInput.referenceId = referenceId;
      const request = createGenerateRequest(requestInput);
      const generated = await generateImage(request);

      statusMessage.value = '正在获取生成图片。';
      const blob = await fetchOutputBlob(generated.outputUrl);
      const recordInput: {
        id: string;
        prompt: string;
        model: string;
        referenceId?: string;
        width: number;
        height: number;
      } = {
        id: generated.id,
        prompt,
        model,
        width: generated.width,
        height: generated.height,
      };
      if (referenceId !== undefined) recordInput.referenceId = referenceId;
      const record = createImageRecord(recordInput);
      const entry = await add(record, blob);
      const result: GeneratedImageResult = {
        record,
        imageUrl: entry.imageUrl,
        generationMode: generated.generationMode,
        mime: generated.mime,
        size: blob.size,
      };
      lastResult.value = result;
      statusMessage.value = '生成结果已保存到本地历史记录。';
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

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    lastResult: readonly(lastResult),
    statusMessage: readonly(statusMessage),
    generate,
  };
}

function createImageRecord(input: {
  id: string;
  prompt: string;
  model: string;
  referenceId?: string;
  width: number;
  height: number;
}): ImageRecord {
  const record: ImageRecord = {
    id: input.id,
    createdAt: new Date().toISOString(),
    prompt: input.prompt,
    model: input.model,
    width: input.width,
    height: input.height,
  };
  if (input.referenceId !== undefined) record.referenceId = input.referenceId;
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
    case 'BAD_REQUEST':
      return `请求内容无效，请检查提示词和参考图。${requestSuffix}`;
    case 'NOT_FOUND':
      return `生成图片不存在或已被后端清理。${requestSuffix}`;
    case 'INVALID_RESPONSE':
      return `后端返回了无法识别的响应。${requestSuffix}`;
    case 'HTTP_ERROR':
      return `请求失败，状态码 ${error.status}。${requestSuffix}`;
    default:
      return `生成请求失败，状态码 ${error.status}。${requestSuffix}`;
  }
}
