import {
  ArrowDownToLine,
  Copy,
  Download,
  Eye,
  Globe2,
  ImagePlus,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { useToast } from '@/components/common/ToastProvider';
import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import {
  AnimatedDropdown,
  AnimatedDropdownCheckboxItem,
  AnimatedDropdownContent,
  AnimatedDropdownLabel,
  AnimatedDropdownTrigger,
} from '@/components/premium/animated-dropdown';
import { AgentChatInput } from '@/components/premium/agent-chat-input/agent-chat-input';
import type { AgentChatAttachment } from '@/components/premium/agent-chat-input/types';
import { MorphicCard } from '@/components/premium/morphic-card-modal';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { SelectMenu } from '@/components/ui/select-menu';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useImageHistory } from '@/hooks/useImageHistory';
import { useImageQuota } from '@/hooks/useImageQuota';
import { addPublicRecord } from '@/hooks/usePublicGallery';
import { fetchOutputBlob } from '@/services/api/imagesApi';
import {
  ASPECT_RATIOS,
  ASPECT_RATIO_LABELS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  FOUR_K_ASPECT_RATIOS,
  IMAGE_RESOLUTION_LABELS,
  IMAGE_RESOLUTIONS,
  MAX_COUNT,
  MIN_COUNT,
  type AspectRatio,
  type GenerationSettingsSnapshot,
  type HistoryEntry,
  type ImageResolution,
} from '@/types/image';
import { downloadUrl } from '@/utils/download';
import { formatClockTime } from '@/utils/format';

interface FeedItem {
  id: string;
  createdAt: string;
  entries: HistoryEntry[];
  settings: GenerationSettingsSnapshot;
  error?: string;
}

type DeleteTarget = { kind: 'entry'; entry: HistoryEntry } | { kind: 'batch'; item: FeedItem };

const ASPECT_MENU_OPTIONS = ASPECT_RATIOS.map((value) => ({
  value,
  label: ASPECT_RATIO_LABELS[value],
}));

function isAspectRatio(value: string | null): value is AspectRatio {
  return value !== null && (ASPECT_RATIOS as readonly string[]).includes(value);
}

function isImageResolution(value: string | null): value is ImageResolution {
  return value !== null && (IMAGE_RESOLUTIONS as readonly string[]).includes(value);
}

interface AdvancedSettingsProps {
  isPublic: boolean;
  disabled: boolean;
  onPublicChange: (value: boolean) => void;
}

function AdvancedSettings({ isPublic, disabled, onPublicChange }: AdvancedSettingsProps) {
  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <button
          type="button"
          className="studio-control studio-control--advanced"
          aria-label="高级生成设置"
          disabled={disabled}
        >
          <SlidersHorizontal aria-hidden="true" />
          <span>{isPublic ? '公开' : '私有'}</span>
        </button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent align="end" className="studio-settings-menu">
        <AnimatedDropdownLabel>可见性</AnimatedDropdownLabel>
        <AnimatedDropdownCheckboxItem
          checked={isPublic}
          onCheckedChange={(checked) => onPublicChange(checked === true)}
        >
          {isPublic ? <Globe2 aria-hidden="true" /> : <Lock aria-hidden="true" />}
          <span>{isPublic ? '公开作品' : '私有作品'}</span>
        </AnimatedDropdownCheckboxItem>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}

export function GenerateView() {
  const [searchParams] = useSearchParams();
  const { notify } = useToast();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const history = useImageHistory();
  const { quota, isLoading: quotaLoading, refresh: refreshQuota } = useImageQuota();
  const upload = useFileUpload();
  const clearUpload = upload.clear;
  const generation = useImageGeneration();
  const [prompt, setPrompt] = useState(searchParams.get('prompt') ?? '');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [aspect, setAspect] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  const [resolution, setResolution] = useState<ImageResolution>(DEFAULT_IMAGE_RESOLUTION);
  const [isPublic, setIsPublic] = useState(false);
  const [reusedReferenceIds, setReusedReferenceIds] = useState<string[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    if (queryPrompt !== null) setPrompt(queryPrompt);
    const queryAspect = searchParams.get('aspect');
    if (isAspectRatio(queryAspect)) setAspect(queryAspect);
    const queryCount = Number(searchParams.get('count'));
    if (Number.isInteger(queryCount) && queryCount >= MIN_COUNT && queryCount <= MAX_COUNT) {
      setCount(queryCount);
    }
    const queryResolution = searchParams.get('resolution');
    if (isAdmin && isImageResolution(queryResolution)) setResolution(queryResolution);
    const queryPublic = searchParams.get('isPublic');
    if (queryPublic === 'true' || queryPublic === 'false') setIsPublic(queryPublic === 'true');
    const queryReferenceIds = searchParams
      .getAll('referenceId')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (queryReferenceIds.length) {
      setReusedReferenceIds([...new Set(queryReferenceIds)]);
      clearUpload();
    }
  }, [clearUpload, isAdmin, searchParams]);

  useEffect(() => {
    if (!isAdmin && resolution !== DEFAULT_IMAGE_RESOLUTION) {
      setResolution(DEFAULT_IMAGE_RESOLUTION);
    }
  }, [isAdmin, resolution]);

  const attachments = useMemo<AgentChatAttachment[]>(
    () =>
      upload.selectedFiles.map((item) => ({
        id: item.id,
        name: item.file.name,
        type: item.file.type,
        size: item.file.size,
        file: item.file,
        ...(item.previewUrl ? { url: item.previewUrl } : {}),
      })),
    [upload.selectedFiles],
  );

  const currentSettings = (promptValue = prompt): GenerationSettingsSnapshot => ({
    prompt: promptValue.trim(),
    model: 'gpt-image-2',
    count,
    aspectRatio: aspect,
    resolution: isAdmin ? resolution : DEFAULT_IMAGE_RESOLUTION,
    isPublic,
    referenceIds: reusedReferenceIds,
  });

  const performGeneration = async (
    settings: GenerationSettingsSnapshot,
    referenceFiles: readonly File[] = [],
    clearComposer = false,
  ): Promise<void> => {
    if (generation.isLoading) return;
    if (!settings.prompt) {
      notify('请先描述你想生成的图片。', 'error');
      return;
    }
    const pendingId = `pending-${crypto.randomUUID()}`;
    setFeed((current) => [
      {
        id: pendingId,
        createdAt: new Date().toISOString(),
        entries: [],
        settings,
      },
      ...current,
    ]);
    try {
      const { resolution: settingsResolution, ...requestSettings } = settings;
      const result = await generation.generate({
        ...requestSettings,
        ...(isAdmin ? { resolution: settingsResolution } : {}),
        referenceIds: [...settings.referenceIds],
        ...(referenceFiles.length ? { referenceFiles: [...referenceFiles] } : {}),
      });
      result.entries.forEach((entry) => {
        if (entry.record.isPublic) addPublicRecord(entry.record);
      });
      const persistedReferenceIds = [
        ...new Set(
          result.entries.flatMap(
            (entry) =>
              entry.record.referenceIds ??
              (entry.record.referenceId ? [entry.record.referenceId] : []),
          ),
        ),
      ];
      const completedSettings: GenerationSettingsSnapshot = {
        ...settings,
        aspectRatio: result.aspectRatio,
        referenceIds: persistedReferenceIds.length ? persistedReferenceIds : settings.referenceIds,
      };
      setFeed((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { ...item, id: result.batchId, entries: result.entries, settings: completedSettings }
            : item,
        ),
      );
      if (clearComposer) {
        setPrompt('');
        upload.clear();
        setReusedReferenceIds([]);
      }
      await refreshQuota();
      notify('图片生成完成。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请稍后重试。';
      if (message === '生成已停止。') {
        setFeed((current) => current.filter((item) => item.id !== pendingId));
        notify(message);
        return;
      }
      setFeed((current) =>
        current.map((item) => (item.id === pendingId ? { ...item, error: message } : item)),
      );
      notify(message, 'error');
    }
  };

  const submitCurrent = (promptValue = prompt): void => {
    const settings = currentSettings(promptValue);
    const files = upload.selectedFiles.map((item) => item.file);
    if (authLoading) return;
    if (!isAuthenticated) {
      openAuthModal({ onSuccess: () => performGeneration(settings, files, true) });
      return;
    }
    void performGeneration(settings, files, true);
  };

  const handleAttachments = (next: AgentChatAttachment[]): void => {
    const nextIds = new Set(next.map((item) => item.id));
    upload.selectedFiles.forEach((item) => {
      if (!nextIds.has(item.id)) upload.removeFile(item.id);
    });
    const currentIds = new Set(upload.selectedFiles.map((item) => item.id));
    const added = next.flatMap((item) =>
      item.file && !currentIds.has(item.id) ? [item.file] : [],
    );
    if (added.length) {
      const result = upload.selectFiles(added);
      if (result.skipped) notify('最多添加 4 张参考图。', 'error');
      setReusedReferenceIds([]);
    }
  };

  const paste = (event: ClipboardEvent<HTMLElement>): void => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (!files.length) return;
    event.preventDefault();
    const result = upload.selectFiles(files);
    if (result.skipped) notify('最多添加 4 张参考图。', 'error');
    setReusedReferenceIds([]);
  };

  const reuseSettings = (settings: GenerationSettingsSnapshot): void => {
    setPrompt(settings.prompt);
    setCount(settings.count);
    setAspect(settings.aspectRatio);
    setResolution(isAdmin ? settings.resolution : DEFAULT_IMAGE_RESOLUTION);
    setIsPublic(settings.isPublic);
    setReusedReferenceIds([...settings.referenceIds]);
    upload.clear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('完整设置已恢复。');
  };

  const addAsReference = async (entry: HistoryEntry): Promise<void> => {
    try {
      const blob = await fetchOutputBlob(entry.imageUrl);
      const extension =
        blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
      const file = new File([blob], `reference-${entry.record.id}.${extension}`, {
        type: blob.type || 'image/png',
      });
      const result = upload.selectFile(file);
      if (result.skipped) throw new Error('参考图已达到 4 张上限。');
      setReusedReferenceIds([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      notify('图片已加入参考图。');
    } catch (error) {
      notify(error instanceof Error ? error.message : '无法添加参考图。', 'error');
    }
  };

  const deleteBatch = async (item: FeedItem): Promise<void> => {
    setMutatingId(item.id);
    try {
      await history.removeBatch(item.id);
      setFeed((current) => current.filter((candidate) => candidate.id !== item.id));
      notify('整组图片已删除。');
      setDeleteTarget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '删除失败，请稍后重试。', 'error');
    } finally {
      setMutatingId(null);
    }
  };

  const deleteEntry = async (entry: HistoryEntry): Promise<void> => {
    setMutatingId(entry.record.id);
    try {
      await history.remove(entry.record.id);
      setFeed((current) =>
        current
          .map((item) => ({
            ...item,
            entries: item.entries.filter((candidate) => candidate.record.id !== entry.record.id),
          }))
          .filter((item) => item.entries.length > 0 || item.error),
      );
      if (selected?.record.id === entry.record.id) setSelected(null);
      notify('图片已删除。');
      setDeleteTarget(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : '删除失败，请稍后重试。', 'error');
    } finally {
      setMutatingId(null);
    }
  };

  const toggleVisibility = async (entry: HistoryEntry): Promise<void> => {
    setMutatingId(entry.record.id);
    try {
      const record = await history.update(entry.record.id, { isPublic: !entry.record.isPublic });
      setFeed((current) =>
        current.map((item) => ({
          ...item,
          entries: item.entries.map((candidate) =>
            candidate.record.id === record.id ? { ...candidate, record } : candidate,
          ),
        })),
      );
      if (record.isPublic) addPublicRecord(record);
      notify(record.isPublic ? '图片已设为公开。' : '图片已设为私有。');
    } catch (error) {
      notify(error instanceof Error ? error.message : '可见性更新失败。', 'error');
    } finally {
      setMutatingId(null);
    }
  };

  const downloadBatch = async (item: FeedItem): Promise<void> => {
    try {
      for (const [index, entry] of item.entries.entries()) {
        await downloadUrl(entry.imageUrl, `${item.id}-${index + 1}.png`);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : '下载失败，请稍后重试。', 'error');
    }
  };

  const confirmDeletion = async (): Promise<void> => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'batch') await deleteBatch(deleteTarget.item);
    else await deleteEntry(deleteTarget.entry);
  };

  return (
    <section className="generation-console" aria-label="图像生成工作区">
      <div className="studio-create-bar" onPaste={paste}>
        <div className="studio-create-bar__status">
          <span role="status" aria-live="polite">
            {generation.isLoading ? generation.statusMessage : '准备生成'}
          </span>
          <span aria-label="今日生成额度">
            {quotaLoading
              ? '额度同步中'
              : isAuthenticated
                ? `${quota?.remaining ?? '—'} / ${quota?.total ?? '—'}`
                : '登录后查看额度'}
          </span>
        </div>
        {reusedReferenceIds.length ? (
          <div className="reused-references">
            <span>沿用 {reusedReferenceIds.length} 张历史参考图</span>
            <button type="button" onClick={() => setReusedReferenceIds([])}>
              清除
            </button>
          </div>
        ) : null}
        <AgentChatInput
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={(payload) => submitCurrent(payload.text)}
          onStop={generation.cancel}
          status={generation.isLoading ? 'streaming' : generation.error ? 'error' : 'ready'}
          placeholder="描述主体、场景、光线、构图与风格"
          ariaLabel="图像提示词"
          submitLabel="生成图片"
          disabled={authLoading}
          minRows={2}
          maxRows={7}
          models={[{ id: 'gpt-image-2', label: 'gpt-image-2' }]}
          model="gpt-image-2"
          reasoningLevels={[]}
          speedModes={[]}
          agents={[]}
          skills={[]}
          attachments={attachments}
          onAttachmentsChange={handleAttachments}
          acceptedFileTypes="image/png,image/jpeg,image/webp"
          toolbarContent={
            <div className="studio-controls">
              <span className="studio-model" aria-label="当前模型 gpt-image-2">
                gpt-image-2
              </span>
              <SelectMenu
                label="选择画面比例"
                value={aspect}
                options={ASPECT_MENU_OPTIONS}
                disabled={generation.isLoading}
                className="studio-aspect-select"
                onValueChange={(next) => {
                  setAspect(next);
                  if (
                    resolution === '4k' &&
                    !(FOUR_K_ASPECT_RATIOS as readonly string[]).includes(next)
                  ) {
                    setResolution('2k');
                  }
                }}
              />
              <div className="studio-count-stepper" role="group" aria-label="生成张数">
                <button
                  type="button"
                  aria-label="减少生成张数"
                  disabled={generation.isLoading || count <= MIN_COUNT}
                  onClick={() => setCount((value) => Math.max(MIN_COUNT, value - 1))}
                >
                  −
                </button>
                <output aria-label={`${count} 张`}>{count}</output>
                <button
                  type="button"
                  aria-label="增加生成张数"
                  disabled={generation.isLoading || count >= MAX_COUNT}
                  onClick={() => setCount((value) => Math.min(MAX_COUNT, value + 1))}
                >
                  +
                </button>
              </div>
              {isAdmin ? (
                <div className="studio-resolution-control" role="radiogroup" aria-label="清晰度">
                  {IMAGE_RESOLUTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={resolution === option}
                      disabled={generation.isLoading}
                      onClick={() => {
                        setResolution(option);
                        if (
                          option === '4k' &&
                          !(FOUR_K_ASPECT_RATIOS as readonly string[]).includes(aspect)
                        ) {
                          setAspect('16:9');
                        }
                      }}
                    >
                      {IMAGE_RESOLUTION_LABELS[option]}
                    </button>
                  ))}
                </div>
              ) : null}
              <AdvancedSettings
                isPublic={isPublic}
                disabled={generation.isLoading}
                onPublicChange={setIsPublic}
              />
            </div>
          }
          className="studio-agent-input"
        />
        {generation.error ? (
          <p className="form-error" role="alert">
            {generation.error.message}
          </p>
        ) : null}
      </div>

      <section className="session-feed" aria-label="本次创作结果" aria-busy={generation.isLoading}>
        {!feed.length ? (
          <div className="empty-stage" role="status">
            <ImagePlus aria-hidden="true" />
            <p>暂无本次会话结果。</p>
          </div>
        ) : (
          feed.map((item) => (
            <article className="session-batch" key={item.id}>
              <header className="session-batch__header">
                <div>
                  <p>{item.settings.prompt}</p>
                  <span>
                    {formatClockTime(item.createdAt)} ·{' '}
                    {ASPECT_RATIO_LABELS[item.settings.aspectRatio]} · {item.settings.count} 张
                  </span>
                </div>
                <div className="session-batch__actions">
                  {item.entries.length ? (
                    <>
                      <IconTooltip label="复用完整设置">
                        <button
                          type="button"
                          aria-label="复用完整设置"
                          onClick={() => reuseSettings(item.settings)}
                        >
                          <Copy aria-hidden="true" />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="再次生成">
                        <button
                          type="button"
                          aria-label="再次生成"
                          disabled={generation.isLoading}
                          onClick={() => void performGeneration(item.settings)}
                        >
                          <RefreshCw aria-hidden="true" />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="下载整组图片">
                        <button
                          type="button"
                          aria-label="下载整组图片"
                          onClick={() => void downloadBatch(item)}
                        >
                          <ArrowDownToLine aria-hidden="true" />
                        </button>
                      </IconTooltip>
                    </>
                  ) : null}
                  {item.entries.length ? (
                    <button
                      type="button"
                      className="session-delete"
                      disabled={mutatingId === item.id}
                      onClick={() => setDeleteTarget({ kind: 'batch', item })}
                    >
                      <Trash2 aria-hidden="true" />
                      删除整组
                    </button>
                  ) : null}
                </div>
              </header>
              {item.error ? (
                <div className="inline-error" role="alert">
                  <span>{item.error}</span>
                  <button
                    type="button"
                    disabled={generation.isLoading}
                    onClick={() => void performGeneration(item.settings)}
                  >
                    重试
                  </button>
                </div>
              ) : item.entries.length ? (
                <div className="session-result-grid">
                  {item.entries.map((entry) => (
                    <article className="session-result" key={entry.record.id}>
                      <MorphicCard id={entry.record.id} className="session-result__morph">
                        <button
                          type="button"
                          className="session-result__preview"
                          aria-label={`查看图片：${entry.record.prompt}`}
                          onClick={() => setSelected(entry)}
                        >
                          <img src={entry.imageUrl} alt={entry.record.prompt} />
                        </button>
                      </MorphicCard>
                      <div className="session-result__actions">
                        <IconTooltip label="查看图片">
                          <button
                            type="button"
                            aria-label="查看图片"
                            onClick={() => setSelected(entry)}
                          >
                            <Eye aria-hidden="true" />
                          </button>
                        </IconTooltip>
                        <IconTooltip label="用作参考图">
                          <button
                            type="button"
                            aria-label="用作参考图"
                            onClick={() => void addAsReference(entry)}
                          >
                            <ImagePlus aria-hidden="true" />
                          </button>
                        </IconTooltip>
                        <IconTooltip label="下载图片">
                          <button
                            type="button"
                            aria-label="下载图片"
                            onClick={() => void downloadUrl(entry.imageUrl, entry.record.id)}
                          >
                            <Download aria-hidden="true" />
                          </button>
                        </IconTooltip>
                        <IconTooltip label={entry.record.isPublic ? '设为私有' : '设为公开'}>
                          <button
                            type="button"
                            aria-label={entry.record.isPublic ? '设为私有' : '设为公开'}
                            disabled={mutatingId === entry.record.id}
                            onClick={() => void toggleVisibility(entry)}
                          >
                            {entry.record.isPublic ? (
                              <Globe2 aria-hidden="true" />
                            ) : (
                              <Lock aria-hidden="true" />
                            )}
                          </button>
                        </IconTooltip>
                        <IconTooltip label="删除图片">
                          <button
                            type="button"
                            aria-label="删除图片"
                            disabled={mutatingId === entry.record.id}
                            onClick={() => setDeleteTarget({ kind: 'entry', entry })}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </IconTooltip>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div
                  className="generation-skeleton"
                  role="status"
                  aria-label={generation.statusMessage}
                >
                  {Array.from({ length: item.settings.count }, (_, index) => (
                    <span key={`${item.id}-${index}`} />
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <ImageDetailModal
        entry={selected}
        canDelete
        isDeleting={mutatingId === selected?.record.id}
        onClose={() => setSelected(null)}
        onReuse={(entry) => {
          const item = feed.find((candidate) =>
            candidate.entries.some(
              (candidateEntry) => candidateEntry.record.id === entry.record.id,
            ),
          );
          if (item) reuseSettings(item.settings);
          setSelected(null);
        }}
        onUseAsReference={(entry) => void addAsReference(entry)}
        onToggleVisibility={(entry) => void toggleVisibility(entry)}
        onDelete={(entry) => {
          setSelected(null);
          setDeleteTarget({ kind: 'entry', entry });
        }}
      />
      <ConfirmActionModal
        id="generation-delete"
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'batch' ? '删除整组图片' : '删除图片'}
        description={
          deleteTarget?.kind === 'batch'
            ? `将永久删除这组中的 ${deleteTarget.item.entries.length} 张图片。`
            : '将永久删除这张图片。'
        }
        confirmLabel={deleteTarget?.kind === 'batch' ? '删除整组' : '删除图片'}
        isPending={mutatingId !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeletion}
      />
    </section>
  );
}
