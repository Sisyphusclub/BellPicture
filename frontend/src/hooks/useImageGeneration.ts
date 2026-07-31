import { useCallback, useRef, useState } from 'react';

import {
  createGenerateRequest,
  generateImage,
  ImageApiError,
  uploadReferenceImages,
} from '@/services/api/imagesApi';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  type AspectRatio,
  type GeneratedBatchResult,
  type HistoryEntry,
  type ImageRecord,
  type ImageResolution,
} from '@/types/image';

import { addImageRecord } from './useImageHistory';

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  referenceFile?: File;
  referenceFiles?: File[];
  referenceId?: string;
  referenceIds?: string[];
  count?: number;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  isPublic?: boolean;
  demoPresetId?: string;
}

function normalizeIds(ids?: string[], id?: string): string[] {
  return [...new Set((ids ?? (id ? [id] : [])).map((item) => item.trim()).filter(Boolean))];
}

function providerMessage(error: ImageApiError): string {
  const status = error.details?.['upstreamStatus'];
  const reason = error.details?.['reason'];
  if (status === 400 || status === 422 || reason === 'prompt_rejected') {
    return '提示词或参考图可能未通过上游安全策略。请改用更中性的风格和画质描述。';
  }
  if (reason === 'empty_result') return '上游没有返回图片，请换一个更明确的提示词。';
  return '上游生成服务返回异常，请稍后重试。';
}

function generationError(error: unknown): Error {
  if (!(error instanceof ImageApiError)) {
    return new Error('生成失败，请检查后端服务是否可用后重试。');
  }
  const suffix = error.requestId ? `（请求编号：${error.requestId}）` : '';
  const messages: Record<string, string> = {
    PAYLOAD_TOO_LARGE: '参考图超过后端限制，请压缩后重试。',
    UNSUPPORTED_MEDIA_TYPE: '后端无法识别此参考图格式，请改用 PNG、JPEG 或 WebP。',
    PROVIDER_TIMEOUT: '上游生成服务响应超时，请减少参考图数量或简化提示词后重试。',
    PROVIDER_PROMPT_REJECTED: '提示词或参考图未通过上游安全策略，请改用更中性的描述。',
    PROVIDER_EMPTY_RESULT: '上游没有返回图片，请换一个更明确、限制更少的提示词。',
    PROVIDER_RATE_LIMITED: '生成服务当前请求过多，请稍后再试。',
    QUOTA_EXHAUSTED: 'GPT 号池剩余额度不足，请稍后补充额度后再试。',
    BAD_REQUEST: '请求内容无效，请检查提示词和参考图。',
    NOT_FOUND: '生成图片不存在或已被后端清理。',
    INVALID_RESPONSE: '后端返回了无法识别的响应。',
    NETWORK_ERROR: error.message,
  };
  const message =
    error.code === 'PROVIDER_ERROR'
      ? providerMessage(error)
      : (messages[error.code] ?? `生成请求失败，状态码 ${error.status}。`);
  return new Error(`${message}${suffix}`);
}

export function useImageGeneration() {
  const activeRequest = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastBatch, setLastBatch] = useState<GeneratedBatchResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('已准备好开始新的生成。');

  const generate = useCallback(
    async (options: GenerateImageOptions): Promise<GeneratedBatchResult> => {
      const prompt = options.prompt.trim();
      if (!prompt) {
        const nextError = new Error('请先描述你想生成的图片。');
        setError(nextError);
        throw nextError;
      }
      setIsLoading(true);
      setError(null);
      setStatusMessage('正在准备请求内容。');
      const controller = new AbortController();
      activeRequest.current = controller;
      try {
        let referenceIds = normalizeIds(options.referenceIds, options.referenceId);
        const files =
          options.referenceFiles ?? (options.referenceFile ? [options.referenceFile] : []);
        if (files.length) {
          setStatusMessage(
            files.length > 1 ? `正在上传 ${files.length} 张参考图。` : '正在上传参考图。',
          );
          referenceIds = (await uploadReferenceImages(files, controller.signal)).map(
            (upload) => upload.id,
          );
        }
        setStatusMessage(
          referenceIds.length ? '正在结合参考图生成图片。' : '正在根据提示词生成图片。',
        );
        const model = options.model?.trim() || 'gpt-image-2';
        const startedAt = Date.now();
        const generated = await generateImage(
          createGenerateRequest({
            prompt,
            model,
            count: options.count ?? DEFAULT_COUNT,
            aspectRatio: options.aspectRatio ?? DEFAULT_ASPECT_RATIO,
            ...(options.resolution === undefined ? {} : { resolution: options.resolution }),
            ...(referenceIds.length ? { referenceIds } : {}),
            isPublic: options.isPublic ?? false,
            ...(options.demoPresetId === undefined ? {} : { demoPresetId: options.demoPresetId }),
          }),
          controller.signal,
        );
        const createdAt = new Date().toISOString();
        const entries: HistoryEntry[] = generated.images.map((image) => {
          const record: ImageRecord = {
            id: image.id,
            batchId: generated.batchId,
            createdAt,
            prompt,
            model,
            aspectRatio: generated.aspectRatio,
            width: image.width,
            height: image.height,
            count: options.count ?? DEFAULT_COUNT,
            resolution: options.resolution ?? DEFAULT_IMAGE_RESOLUTION,
            elapsedMs: Date.now() - startedAt,
            isPublic: options.isPublic ?? false,
            isFavorite: false,
            ...(referenceIds[0] === undefined ? {} : { referenceId: referenceIds[0] }),
            ...(referenceIds.length ? { referenceIds } : {}),
          };
          return addImageRecord(record);
        });
        const result: GeneratedBatchResult = {
          batchId: generated.batchId,
          aspectRatio: generated.aspectRatio,
          generationMode: generated.generationMode,
          entries,
        };
        setLastBatch(result);
        setStatusMessage('生成结果已写入云端历史。');
        return result;
      } catch (caught) {
        if (controller.signal.aborted) {
          const stopped = new Error('生成已停止。');
          setError(null);
          setStatusMessage(stopped.message);
          throw stopped;
        }
        const nextError = generationError(caught);
        setError(nextError);
        setStatusMessage('生成失败。');
        throw nextError;
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
          setIsLoading(false);
        }
      }
    },
    [],
  );

  return {
    isLoading,
    error,
    lastBatch,
    statusMessage,
    generate,
    cancel: () => activeRequest.current?.abort(),
    clearLastBatch: () => setLastBatch(null),
  };
}
