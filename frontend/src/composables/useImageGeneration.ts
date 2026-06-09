import { readonly, ref } from 'vue';

import {
  createGenerateRequest,
  generateImage,
  ImageApiError,
  uploadReferenceImages,
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
  referenceFiles?: File[];
  referenceId?: string;
  referenceIds?: string[];
  count?: number;
  aspectRatio?: AspectRatio;
  isPublic?: boolean;
  demoPresetId?: string;
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
      let referenceIds = normalizeReferenceIds(options.referenceIds, options.referenceId);
      const referenceFiles = options.referenceFiles ?? (options.referenceFile ? [options.referenceFile] : []);
      if (referenceFiles.length > 0) {
        statusMessage.value = referenceFiles.length > 1 ? `正在上传 ${referenceFiles.length} 张参考图。` : '正在上传参考图。';
        const uploads = await uploadReferenceImages(referenceFiles);
        referenceIds = uploads.map((upload) => upload.id);
      }

      statusMessage.value = referenceIds.length > 0 ? '正在结合参考图生成图片。' : '正在根据提示词生成图片。';
      const model = options.model?.trim() || DEFAULT_MODEL;
      const requestStart = Date.now();
      const request = createGenerateRequest({
        prompt,
        model,
        count,
        aspectRatio,
        ...(referenceIds.length > 0 ? { referenceIds } : {}),
        isPublic: options.isPublic ?? false,
        ...(options.demoPresetId !== undefined ? { demoPresetId: options.demoPresetId } : {}),
      });
      if (request.demoPresetId !== undefined) {
        statusMessage.value = '正在运行演示生成流程。';
      }
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
          ...(referenceIds.length > 0 ? { referenceIds } : {}),
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


function normalizeReferenceIds(referenceIds: string[] | undefined, referenceId: string | undefined): string[] {
  const raw = referenceIds ?? (referenceId !== undefined ? [referenceId] : []);
  return Array.from(new Set(raw.map((id) => id.trim()).filter((id) => id.length > 0)));
}

function createImageRecord(input: {
  id: string;
  batchId: string;
  createdAt: string;
  prompt: string;
  model: string;
  referenceId?: string;
  referenceIds?: string[];
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
  const referenceIds = normalizeReferenceIds(input.referenceIds, input.referenceId);
  if (referenceIds[0] !== undefined) record.referenceId = referenceIds[0];
  if (referenceIds.length > 0) record.referenceIds = referenceIds;
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
      return `上游生成服务响应超时，图片没有在限定时间内完成。请稍后重试，或减少参考图数量、改用更简单的提示词。${requestSuffix}`;
    case 'PROVIDER_PROMPT_REJECTED':
      return `提示词或参考图未通过上游安全策略。请避开敏感外貌、身体或衣物修改，改用更中性的风格和画质描述。${requestSuffix}`;
    case 'PROVIDER_EMPTY_RESULT':
      return `上游生成服务没有返回图片结果。请换一个更明确、限制更少的提示词后重试。${requestSuffix}`;
    case 'PROVIDER_ERROR':
      return `${messageForProviderError(error)}${requestSuffix}`;
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
      if (error.status === 504) return `生成服务响应超时，请稍后重试。${requestSuffix}`;
      return `请求失败，状态码 ${error.status}。${requestSuffix}`;
    default:
      return `生成请求失败，状态码 ${error.status}。${requestSuffix}`;
  }
}

function messageForProviderError(error: ImageApiError): string {
  const upstreamStatus = error.details?.['upstreamStatus'];
  const reason = error.details?.['reason'];
  if (upstreamStatus === 400 || upstreamStatus === 422 || reason === 'prompt_rejected') {
    return '提示词或参考图可能未通过上游安全策略。请避开敏感外貌、身体或衣物修改，改用更中性的风格和画质描述。';
  }
  if (reason === 'empty_result') {
    return '上游生成服务没有返回图片结果。请换一个更明确、限制更少的提示词后重试。';
  }
  return '上游生成服务返回异常，请稍后重试。';
}
