import {
  ArrowDown,
  ArrowDownToLine,
  CircleAlert,
  Copy,
  Download,
  Globe2,
  ImagePlus,
  Lock,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { useToast } from '@/components/common/ToastProvider';
import { GenerationSubmitCost } from '@/components/generation/GenerationSubmitCost';
import { GenerationHistoryFlyout } from '@/components/generation/GenerationHistoryFlyout';
import { ImageGenerationPlaceholder } from '@/components/generation/ImageGenerationPlaceholder';
import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import { LandingAccountActions } from '@/components/landing/LandingAccountActions';
import { LandingSidebar } from '@/components/landing/LandingSidebar';
import { AgentChatInput } from '@/components/premium/agent-chat-input/agent-chat-input';
import type { AgentChatAttachment } from '@/components/premium/agent-chat-input/types';
import { MorphicCard } from '@/components/premium/morphic-card-modal';
import { ModelLogo } from '@/components/premium/agent-chat-input/model-logo';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/ui/icon-tooltip';
import { SelectMenu } from '@/components/ui/select-menu';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { getAppNavigation } from '@/config/navigation';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  attachGenerationBatch,
  replaceGenerationBatch,
  useGenerationSessions,
} from '@/hooks/useGenerationSessions';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { useImageHistory } from '@/hooks/useImageHistory';
import type { GroupedBatch } from '@/hooks/useImageHistory';
import { useImageQuota } from '@/hooks/useImageQuota';
import { addPublicRecord } from '@/hooks/usePublicGallery';
import { fetchOutputBlob } from '@/services/api/imagesApi';
import {
  ASPECT_RATIOS,
  ASPECT_RATIO_LABELS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_COUNT,
  DEFAULT_IMAGE_RESOLUTION,
  MAX_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_COUNT,
  type AspectRatio,
  type GenerationSettingsSnapshot,
  type HistoryEntry,
} from '@/types/image';
import { downloadUrl } from '@/utils/download';

interface FeedItem {
  id: string;
  createdAt: string;
  entries: HistoryEntry[];
  settings: GenerationSettingsSnapshot;
  error?: string;
}

function feedItemFromBatch(batch: GroupedBatch): FeedItem {
  return {
    id: batch.batchId,
    createdAt: batch.createdAt,
    entries: [...batch.entries],
    settings: batch.settings,
  };
}

function sameFeed(left: readonly FeedItem[], right: readonly FeedItem[]): boolean {
  return (
    left.length === right.length &&
    left.every((item, index) => {
      const candidate = right[index];
      return (
        candidate?.id === item.id &&
        candidate.error === item.error &&
        candidate.entries.length === item.entries.length &&
        candidate.entries.every(
          (entry, entryIndex) => entry.record === item.entries[entryIndex]?.record,
        )
      );
    })
  );
}

type DeleteTarget = { kind: 'entry'; entry: HistoryEntry } | { kind: 'batch'; item: FeedItem };

const ASPECT_MENU_OPTIONS = ASPECT_RATIOS.map((value) => ({
  value,
  label: ASPECT_RATIO_LABELS[value],
}));

function isAspectRatio(value: string | null): value is AspectRatio {
  return value !== null && (ASPECT_RATIOS as readonly string[]).includes(value);
}

interface GenerationErrorCopy {
  message: string;
  requestId: string | null;
}

const LATEST_BATCH_COMPOSER_GAP = 24;

function splitGenerationError(message: string): GenerationErrorCopy {
  const requestSuffix = message.match(/[（(]\s*请求编号[:：]\s*([^）)]+)\s*[）)]\s*$/);
  if (!requestSuffix) return { message, requestId: null };
  return {
    message: message.slice(0, requestSuffix.index).trim(),
    requestId: requestSuffix[1]?.trim() || null,
  };
}

function scrollToGenerationBatch(batchId: string): boolean {
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-generation-batch]')).find(
    (element) => element.dataset.generationBatch === batchId,
  );
  if (!target || typeof target.scrollIntoView !== 'function') return false;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
  return true;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function readCount(searchParams: URLSearchParams): number {
  const value = Number(searchParams.get('count'));
  return Number.isInteger(value) && value >= MIN_COUNT && value <= MAX_COUNT
    ? value
    : DEFAULT_COUNT;
}

function readReferenceIds(searchParams: URLSearchParams): string[] {
  return [
    ...new Set(
      searchParams
        .getAll('referenceId')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 4),
    ),
  ];
}

function requestsAutoGeneration(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'autoGenerate' in state &&
    state.autoGenerate === true
  );
}

function readInitialReferenceFiles(state: unknown): File[] {
  if (typeof File === 'undefined' || typeof state !== 'object' || state === null) return [];
  const candidateAttachments: unknown = (state as Record<string, unknown>)['attachments'];
  if (!Array.isArray(candidateAttachments)) return [];

  const files: File[] = [];
  for (const attachment of candidateAttachments as unknown[]) {
    if (typeof attachment !== 'object' || attachment === null) continue;
    const file: unknown = (attachment as Record<string, unknown>)['file'];
    if (file instanceof File) files.push(file);
  }
  return files.slice(0, MAX_REFERENCE_IMAGES);
}

function cssAspectRatio(aspectRatio: AspectRatio): string {
  return aspectRatio.replace(':', ' / ');
}

interface SessionResultPreviewProps {
  entry: HistoryEntry;
  onOpen: () => void;
}

function SessionResultPreview({ entry, onOpen }: SessionResultPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <MorphicCard id={entry.record.id} className="session-result__morph">
      <Button
        type="button"
        variant="ghost"
        className={`session-result__preview${imageLoaded ? ' is-loaded' : ''}`}
        style={{
          aspectRatio: `${entry.record.width} / ${entry.record.height}`,
        }}
        aria-label={`查看图片：${entry.record.prompt}`}
        onClick={onOpen}
      >
        <ImageGenerationPlaceholder
          aspectRatio={entry.record.aspectRatio ?? DEFAULT_ASPECT_RATIO}
          resolution={entry.record.resolution ?? DEFAULT_IMAGE_RESOLUTION}
          className="session-result__loading"
          fill
        />
        <img src={entry.imageUrl} alt={entry.record.prompt} onLoad={() => setImageLoaded(true)} />
      </Button>
    </MorphicCard>
  );
}

interface PrivateModeToggleProps {
  isPublic: boolean;
  disabled: boolean;
  onPublicChange: (value: boolean) => void;
}

function PrivateModeToggle({ isPublic, disabled, onPublicChange }: PrivateModeToggleProps) {
  const isPrivate = !isPublic;

  return (
    <label className="studio-private-toggle" data-mode={isPrivate ? 'private' : 'public'}>
      <Switch
        aria-label="私有模式"
        checked={!isPublic}
        disabled={disabled}
        onCheckedChange={(checked) => onPublicChange(!checked)}
      />
      <span className="studio-private-toggle__track" aria-hidden="true" />
      <span>{isPrivate ? '私有' : '公开'}</span>
    </label>
  );
}

interface EditablePromptBubbleProps {
  item: FeedItem;
  disabled: boolean;
  onRegenerate: (prompt: string) => void;
}

const PROMPT_EDITOR_MIN_HEIGHT = 56;
const PROMPT_EDITOR_MAX_HEIGHT = 120;

function resizePromptEditor(textarea: HTMLTextAreaElement): void {
  textarea.style.height = '0px';
  const contentHeight = textarea.scrollHeight;
  textarea.style.height = `${Math.max(
    PROMPT_EDITOR_MIN_HEIGHT,
    Math.min(contentHeight, PROMPT_EDITOR_MAX_HEIGHT),
  )}px`;
  textarea.style.overflowY = contentHeight > PROMPT_EDITOR_MAX_HEIGHT ? 'auto' : 'hidden';
}

function EditablePromptBubble({ item, disabled, onRegenerate }: EditablePromptBubbleProps) {
  const { notify } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.settings.prompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmedDraft = draft.trim();

  useEffect(() => {
    if (!isEditing) setDraft(item.settings.prompt);
  }, [isEditing, item.settings.prompt]);

  useEffect(() => {
    if (!isEditing) return;
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    resizePromptEditor(textareaRef.current);
  }, [draft, isEditing]);

  const cancelEditing = (): void => {
    setDraft(item.settings.prompt);
    setIsEditing(false);
  };

  const copyPrompt = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(item.settings.prompt);
      notify('提示词已复制。');
    } catch {
      notify('复制失败，请手动复制。', 'error');
    }
  };

  if (isEditing) {
    return (
      <form
        className="session-batch__prompt session-batch__prompt--editing"
        onSubmit={(event) => {
          event.preventDefault();
          if (!trimmedDraft || disabled) return;
          setIsEditing(false);
          onRegenerate(trimmedDraft);
        }}
      >
        <Textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          aria-label="编辑生成提示词"
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelEditing();
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="session-batch__prompt-edit-footer">
          <div
            className="session-batch__prompt-edit-actions"
            role="group"
            aria-label="提示词编辑操作"
          >
            <Button
              type="button"
              variant="secondary"
              size="compact"
              className="session-batch__prompt-cancel"
              onClick={cancelEditing}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="compact"
              className="session-batch__prompt-regenerate"
              disabled={!trimmedDraft || disabled}
            >
              修改
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="session-batch__prompt-shell">
      <div className="session-batch__prompt session-batch__prompt--editable">
        <p>{item.settings.prompt}</p>
      </div>
      <div className="session-batch__prompt-actions" role="toolbar" aria-label="提示词操作">
        <IconTooltip label="复制提示词">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="session-batch__prompt-action"
            aria-label="复制提示词"
            onClick={() => void copyPrompt()}
          >
            <Copy aria-hidden="true" />
          </Button>
        </IconTooltip>
        <IconTooltip label="编辑提示词">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="session-batch__prompt-action"
            aria-label="编辑提示词"
            disabled={disabled}
            onClick={() => setIsEditing(true)}
          >
            <Pencil aria-hidden="true" />
          </Button>
        </IconTooltip>
      </div>
    </div>
  );
}

export function GenerateView() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, logout } = useAuth();
  const history = useImageHistory();
  const { sessions, create: createSession } = useGenerationSessions();
  const { quota, isLoading: quotaLoading, refresh: refreshQuota, checkIn } = useImageQuota();
  const upload = useFileUpload();
  const { clear: clearUpload, selectFiles: selectUploadFiles } = upload;
  const generation = useImageGeneration();
  const autoGenerationHandled = useRef(false);
  const [prompt, setPrompt] = useState(searchParams.get('prompt') ?? '');
  const [count, setCount] = useState(() => readCount(searchParams));
  const [aspect, setAspect] = useState<AspectRatio>(() => {
    const value = searchParams.get('aspect');
    return isAspectRatio(value) ? value : DEFAULT_ASPECT_RATIO;
  });
  const [isPublic, setIsPublic] = useState(() => searchParams.get('isPublic') === 'true');
  const [reusedReferenceIds, setReusedReferenceIds] = useState<string[]>(() =>
    readReferenceIds(searchParams),
  );
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const feedBySession = useRef(new Map<string, FeedItem[]>());
  const feedSessionId = useRef<string | null>(null);
  const latestFeed = useRef(feed);
  const pendingScrollId = useRef<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const sessionFeedRef = useRef<HTMLElement>(null);
  const latestBatchRef = useRef<HTMLElement>(null);
  latestFeed.current = feed;
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [activeHistoryBatchId, setActiveHistoryBatchId] = useState<string | null>(null);
  const [hoveredBatchId, setHoveredBatchId] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const activeSessionId = searchParams.get('session');
  const previousSessionId = useRef<string | null>(activeSessionId);
  const accountName = user?.username ?? user?.name ?? '账户';
  const currentUserId = isAuthenticated ? (user?.id ?? null) : null;
  const currentUserIdRef = useRef(currentUserId);
  useLayoutEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!activeSessionId || previousSessionId.current === activeSessionId) return;
    previousSessionId.current = activeSessionId;
    setPrompt(searchParams.get('prompt') ?? '');
    setSelected(null);
    setActiveHistoryBatchId(null);
    clearUpload();
    setReusedReferenceIds([]);
  }, [activeSessionId, clearUpload, searchParams]);

  useEffect(() => {
    if (!activeSessionId) {
      if (feedSessionId.current) {
        feedBySession.current.set(feedSessionId.current, latestFeed.current);
        feedSessionId.current = null;
        setFeed([]);
      }
      return;
    }
    const session = sessions.find((candidate) => candidate.id === activeSessionId);
    if (!session) {
      feedSessionId.current = null;
      setFeed([]);
      return;
    }
    const previousFeedSessionId = feedSessionId.current;
    if (previousFeedSessionId && previousFeedSessionId !== activeSessionId) {
      feedBySession.current.set(previousFeedSessionId, latestFeed.current);
    }
    const persisted = new Map(
      history.batches.map((batch) => [batch.batchId, feedItemFromBatch(batch)]),
    );
    const transient = new Map(
      [...(feedBySession.current.get(activeSessionId) ?? []), ...latestFeed.current]
        .filter((item) => session.batchIds.includes(item.id) && !persisted.has(item.id))
        .map((item) => [item.id, item]),
    );
    const next = [...session.batchIds]
      .map((batchId) => transient.get(batchId) ?? persisted.get(batchId))
      .filter((item): item is FeedItem => item !== undefined);
    feedSessionId.current = activeSessionId;
    feedBySession.current.set(activeSessionId, next);
    setFeed((current) => (sameFeed(current, next) ? current : next));
  }, [activeSessionId, history.batches, sessions]);

  useEffect(() => {
    if (!feedSessionId.current) return;
    feedBySession.current.set(feedSessionId.current, feed);
  }, [feed]);

  useLayoutEffect(() => {
    const pendingId = pendingScrollId.current;
    if (!pendingId) return;
    pendingScrollId.current = null;
    scrollToGenerationBatch(pendingId);
  }, [feed]);

  useEffect(() => {
    const queryPrompt = searchParams.get('prompt');
    if (queryPrompt !== null) setPrompt(queryPrompt);
    const queryAspect = searchParams.get('aspect');
    if (isAspectRatio(queryAspect)) setAspect(queryAspect);
    setCount(readCount(searchParams));
    const queryPublic = searchParams.get('isPublic');
    if (queryPublic === 'true' || queryPublic === 'false') setIsPublic(queryPublic === 'true');
    const queryReferenceIds = readReferenceIds(searchParams);
    if (queryReferenceIds.length) {
      setReusedReferenceIds(queryReferenceIds);
      clearUpload();
    }
  }, [clearUpload, searchParams]);

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

  const sessionHistoryBatches = useMemo(() => {
    const session = sessions.find((candidate) => candidate.id === activeSessionId);
    if (!activeSessionId || !session) return history.batches;
    const batchIds = new Set(session.batchIds);
    return history.batches.filter((batch) => batchIds.has(batch.batchId));
  }, [activeSessionId, history.batches, sessions]);
  const visibleHistoryBatchIds = useMemo(() => feed.map((item) => item.id), [feed]);
  const latestBatch = feed[feed.length - 1];
  const latestBatchVisibilityKey = latestBatch
    ? `${latestBatch.id}:${latestBatch.entries.length}:${latestBatch.error ? 'error' : 'ready'}`
    : null;

  useEffect(() => {
    if (!latestBatchVisibilityKey) {
      setShowJumpToLatest(false);
      return undefined;
    }

    const updateVisibility = () => {
      const batchElement = latestBatchRef.current;
      const composerElement = composerRef.current;
      if (!batchElement || !composerElement) {
        setShowJumpToLatest(false);
        return;
      }

      const batchRect = batchElement.getBoundingClientRect();
      const composerRect = composerElement.getBoundingClientRect();
      if (batchRect.width === 0 && batchRect.height === 0) {
        setShowJumpToLatest(false);
        return;
      }

      const composerBoundary =
        composerRect.height > 0 && composerRect.top > 0
          ? Math.min(
              window.innerHeight - LATEST_BATCH_COMPOSER_GAP,
              composerRect.top - LATEST_BATCH_COMPOSER_GAP,
            )
          : window.innerHeight - LATEST_BATCH_COMPOSER_GAP;
      const visibleHeight = Math.max(
        0,
        Math.min(batchRect.bottom, composerBoundary) - Math.max(batchRect.top, 0),
      );
      const requiredVisibleHeight = Math.min(
        batchRect.height,
        Math.max(0, composerBoundary),
        Math.max(160, Math.min(280, composerBoundary * 0.4)),
      );
      const isFullyAboveComposer = batchRect.bottom <= composerBoundary;
      setShowJumpToLatest(!isFullyAboveComposer || visibleHeight < requiredVisibleHeight);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    const resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(updateVisibility) : null;
    if (latestBatchRef.current) resizeObserver?.observe(latestBatchRef.current);
    if (composerRef.current) resizeObserver?.observe(composerRef.current);
    if (sessionFeedRef.current) resizeObserver?.observe(sessionFeedRef.current);

    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
      resizeObserver?.disconnect();
    };
  }, [latestBatchVisibilityKey]);

  const currentSettings = (promptValue = prompt): GenerationSettingsSnapshot => ({
    prompt: promptValue.trim(),
    model: 'gpt-image-2',
    count,
    aspectRatio: aspect,
    resolution: DEFAULT_IMAGE_RESOLUTION,
    isPublic,
    referenceIds: reusedReferenceIds,
  });

  const performGeneration = async (
    settings: GenerationSettingsSnapshot,
    referenceFiles: readonly File[] = [],
    clearComposer = false,
    replaceItem?: FeedItem,
  ): Promise<void> => {
    const generationUserId = currentUserIdRef.current;
    if (generation.isLoading) return;
    const generationSettings: GenerationSettingsSnapshot = {
      ...settings,
      resolution: DEFAULT_IMAGE_RESOLUTION,
    };
    if (!generationSettings.prompt) {
      notify('请先描述你想生成的图片。', 'error');
      return;
    }
    let generationSession = sessions.find((session) => session.id === activeSessionId);
    let generationSessionId = generationSession?.id;
    if (!generationSessionId) {
      const session = createSession();
      generationSession = session;
      generationSessionId = session.id;
      const nextSearch = new URLSearchParams({
        session: session.id,
        aspect: generationSettings.aspectRatio,
        count: String(generationSettings.count),
        isPublic: String(generationSettings.isPublic),
      });
      void navigate(`/generate?${nextSearch.toString()}`, { replace: true });
    }
    const generationSessionBatchIds = generationSession?.batchIds ?? [];
    const pendingId = `pending-${crypto.randomUUID()}`;
    const pendingItem: FeedItem = {
      id: pendingId,
      createdAt: new Date().toISOString(),
      entries: [],
      settings: generationSettings,
    };
    if (replaceItem) {
      if (generationSessionBatchIds.includes(replaceItem.id)) {
        replaceGenerationBatch(generationSessionId, replaceItem.id, pendingId);
      } else {
        attachGenerationBatch(generationSessionId, pendingId, generationSettings.prompt);
      }
      setFeed((current) =>
        current.map((item) => (item.id === replaceItem.id ? pendingItem : item)),
      );
      setSelected((current) =>
        current && replaceItem.entries.some((entry) => entry.record.id === current.record.id)
          ? null
          : current,
      );
      if (activeHistoryBatchId === replaceItem.id) setActiveHistoryBatchId(null);
    } else {
      attachGenerationBatch(generationSessionId, pendingId, generationSettings.prompt);
      pendingScrollId.current = pendingId;
      setFeed((current) => [...current, pendingItem]);
    }

    const restoreReplacedItem = (): void => {
      if (!replaceItem) return;
      replaceGenerationBatch(generationSessionId, pendingId, replaceItem.id);
      setFeed((current) => current.map((item) => (item.id === pendingId ? replaceItem : item)));
      setActiveHistoryBatchId(replaceItem.id);
    };

    try {
      const result = await generation.generate({
        prompt: generationSettings.prompt,
        model: generationSettings.model,
        count: generationSettings.count,
        aspectRatio: generationSettings.aspectRatio,
        isPublic: generationSettings.isPublic,
        referenceIds: [...generationSettings.referenceIds],
        ...(referenceFiles.length ? { referenceFiles: [...referenceFiles] } : {}),
      });
      if (generationUserId === null || currentUserIdRef.current !== generationUserId) {
        throw new Error('生成已停止。');
      }
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
        ...generationSettings,
        aspectRatio: result.aspectRatio,
        referenceIds: persistedReferenceIds.length
          ? persistedReferenceIds
          : generationSettings.referenceIds,
      };
      setFeed((current) =>
        current.map((item) =>
          item.id === pendingId
            ? { ...item, id: result.batchId, entries: result.entries, settings: completedSettings }
            : item,
        ),
      );
      replaceGenerationBatch(generationSessionId, pendingId, result.batchId);
      setActiveHistoryBatchId(result.batchId);
      let replacementCleanupFailed = false;
      if (replaceItem) {
        try {
          await history.removeBatch(replaceItem.id);
        } catch {
          replacementCleanupFailed = true;
        }
      }
      if (clearComposer) {
        setPrompt('');
        upload.clear();
        setReusedReferenceIds([]);
      }
      await refreshQuota();
      if (replacementCleanupFailed) {
        notify('新结果已生成，但旧记录暂未清理，请稍后删除。', 'error');
      } else {
        notify(replaceItem ? '已重新生成并替换原结果。' : '图片生成完成。');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败，请稍后重试。';
      const userMessage = splitGenerationError(message).message;
      if (message === '生成已停止。') {
        if (replaceItem) restoreReplacedItem();
        else setFeed((current) => current.filter((item) => item.id !== pendingId));
        notify(message);
        return;
      }
      if (replaceItem) restoreReplacedItem();
      else {
        setFeed((current) =>
          current.map((item) => (item.id === pendingId ? { ...item, error: message } : item)),
        );
      }
      notify(userMessage, 'error');
    }
  };

  const regenerateReplacingBatch = (item: FeedItem, promptValue: string): void => {
    const settings: GenerationSettingsSnapshot = {
      ...item.settings,
      prompt: promptValue.trim(),
      resolution: DEFAULT_IMAGE_RESOLUTION,
    };
    if (authLoading) return;
    if (!isAuthenticated) {
      openAuthModal({ onSuccess: () => performGeneration(settings, [], false, item) });
      return;
    }
    void performGeneration(settings, [], false, item);
  };

  const submitCurrent = (promptValue = prompt, initialReferenceFiles?: readonly File[]): void => {
    const settings = currentSettings(promptValue);
    const files = initialReferenceFiles ?? upload.selectedFiles.map((item) => item.file);
    if (authLoading) return;
    if (!isAuthenticated) {
      openAuthModal({ onSuccess: () => performGeneration(settings, files, true) });
      return;
    }
    void performGeneration(settings, files, true);
  };
  const submitCurrentRef = useRef(submitCurrent);
  submitCurrentRef.current = submitCurrent;

  useEffect(() => {
    if (authLoading || autoGenerationHandled.current || !requestsAutoGeneration(location.state)) {
      return;
    }

    const initialReferenceFiles = readInitialReferenceFiles(location.state);
    if (initialReferenceFiles.length) selectUploadFiles(initialReferenceFiles);
    autoGenerationHandled.current = true;
    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    submitCurrentRef.current(undefined, initialReferenceFiles);
  }, [
    authLoading,
    location.pathname,
    location.search,
    location.state,
    navigate,
    selectUploadFiles,
  ]);

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
      if (activeHistoryBatchId === item.id) setActiveHistoryBatchId(null);
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

  const navigateToHistoryBatch = (batch: GroupedBatch): void => {
    setSelected(null);
    setActiveHistoryBatchId(batch.batchId);
    scrollToGenerationBatch(batch.batchId);
  };

  const loadHistoryBatch = (batch: GroupedBatch): void => {
    if (scrollToGenerationBatch(batch.batchId)) {
      setSelected(null);
      setActiveHistoryBatchId(batch.batchId);
      return;
    }
    const item = feedItemFromBatch(batch);
    pendingScrollId.current = batch.batchId;
    setFeed((current) =>
      current.some((candidate) => candidate.id === batch.batchId) ? current : [...current, item],
    );
    setSelected(null);
    setActiveHistoryBatchId(batch.batchId);
  };

  const scrollToLatestBatch = (): void => {
    const target = latestBatchRef.current;
    const composer = composerRef.current;
    if (!target || !composer) return;
    const targetRect = target.getBoundingClientRect();
    const composerRect = composer.getBoundingClientRect();
    const top = Math.max(
      0,
      window.scrollY + targetRect.bottom - (composerRect.top - LATEST_BATCH_COMPOSER_GAP),
    );
    setActiveHistoryBatchId(null);
    window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <section
      className={`generation-console ${feed.length ? 'has-results' : 'is-empty'}`}
      data-view="generate"
      aria-label="图像生成工作区"
    >
      <LandingSidebar
        accountName={accountName}
        brandLabel="Nebulens"
        creditsRemaining={quota?.remaining ?? '—'}
        ctaLabel="返回发现"
        ctaTo="/"
        checkedInToday={quota?.checkedInToday ?? false}
        dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
        isAuthenticated={isAuthenticated}
        items={getAppNavigation(isAdmin)}
        logoSrc="/brand/logo.png"
        onCheckIn={checkIn}
        onLogin={openAuthModal}
        onNotify={notify}
      />
      <LandingAccountActions
        accountName={accountName}
        checkedInToday={quota?.checkedInToday ?? false}
        creditsRemaining={quota?.remaining ?? '—'}
        dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
        isAuthenticated={isAuthenticated}
        onCheckIn={checkIn}
        onLogin={openAuthModal}
        onLogout={logout}
        onNotify={notify}
      />
      <GenerationHistoryFlyout
        batches={sessionHistoryBatches}
        trackBatchIds={visibleHistoryBatchIds}
        activeBatchId={activeHistoryBatchId}
        hoveredBatchId={hoveredBatchId}
        isHydrating={history.isHydrating}
        hydrateError={history.hydrateError}
        isGenerating={generation.isLoading}
        pendingPrompt={prompt}
        onSelectBatch={loadHistoryBatch}
        onNavigateBatch={navigateToHistoryBatch}
        onInteractionLeave={() => setActiveHistoryBatchId(null)}
      />
      {!feed.length ? (
        <div className="generation-empty-state" aria-label="开始你的创作">
          <div className="generation-empty-state__art" aria-hidden="true">
            <ImagePlus className="generation-empty-state__image-icon" />
            <Sparkles className="generation-empty-state__sparkle generation-empty-state__sparkle--top" />
            <Sparkles className="generation-empty-state__sparkle generation-empty-state__sparkle--side" />
          </div>
          <h2>开始你的创作</h2>
          <p>在下方输入描述，或提供参考图，让 AI 帮你生成想象中的画面</p>
        </div>
      ) : null}
      <div ref={composerRef} className="studio-create-bar" onPaste={paste}>
        {showJumpToLatest ? (
          <div className="generation-jump-latest">
            <IconTooltip label="回到最新图片">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="generation-jump-latest__button"
                aria-label="回到最新图片"
                onClick={scrollToLatestBatch}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </IconTooltip>
          </div>
        ) : null}
        {reusedReferenceIds.length ? (
          <div className="reused-references">
            <span>沿用 {reusedReferenceIds.length} 张历史参考图</span>
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={() => setReusedReferenceIds([])}
            >
              清除
            </Button>
          </div>
        ) : null}
        <AgentChatInput
          value={prompt}
          onValueChange={setPrompt}
          onSubmit={(payload) => submitCurrent(payload.text)}
          onStop={generation.cancel}
          status={generation.isLoading ? 'streaming' : 'ready'}
          placeholder="描述你想生成的画面…"
          ariaLabel="图像提示词"
          submitLabel="生成图片"
          submitContent={<GenerationSubmitCost count={count} />}
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
                <ModelLogo modelId="gpt-image-2" className="studio-model__icon" />
                <span>gpt-image-2</span>
              </span>
              <SelectMenu
                label="选择画面比例"
                value={aspect}
                options={ASPECT_MENU_OPTIONS}
                disabled={generation.isLoading}
                className="studio-aspect-select"
                onValueChange={setAspect}
              />
              <div className="studio-count-stepper" role="group" aria-label="生成张数">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="减少生成张数"
                  disabled={generation.isLoading || count <= MIN_COUNT}
                  onClick={() => setCount((value) => Math.max(MIN_COUNT, value - 1))}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <output aria-label={`${count} 张`}>{count}</output>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="增加生成张数"
                  disabled={generation.isLoading || count >= MAX_COUNT}
                  onClick={() => setCount((value) => Math.min(MAX_COUNT, value + 1))}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              <PrivateModeToggle
                isPublic={isPublic}
                disabled={generation.isLoading}
                onPublicChange={setIsPublic}
              />
              <span className="studio-toolbar-spacer" aria-hidden="true" />
              <span className="studio-toolbar-meta">
                <span
                  className="studio-toolbar-status"
                  data-active={generation.isLoading ? 'true' : undefined}
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="studio-toolbar-status__dot"
                    data-active={generation.isLoading ? 'true' : undefined}
                    aria-hidden="true"
                  />
                  {generation.isLoading ? generation.statusMessage : '准备生成'}
                </span>
                <span className="studio-toolbar-quota" aria-label="今日生成额度">
                  {quotaLoading
                    ? '额度：同步中'
                    : isAuthenticated
                      ? `额度：${quota?.remaining ?? '—'} / ${quota?.total ?? '—'}`
                      : '额度：登录后查看'}
                </span>
              </span>
            </div>
          }
          className="studio-agent-input"
        />
      </div>

      {feed.length ? (
        <section
          ref={sessionFeedRef}
          className="session-feed"
          aria-label="本次创作结果"
          aria-busy={generation.isLoading}
        >
          {feed.map((item, index) => (
            <article
              ref={index === feed.length - 1 ? latestBatchRef : undefined}
              className={`session-batch${!item.entries.length && !item.error ? ' is-generating' : ''}`}
              key={item.id}
              data-generation-batch={item.id}
              data-state={!item.entries.length && !item.error ? 'generating' : undefined}
              data-count={item.entries.length || item.settings.count}
              onMouseEnter={() => setHoveredBatchId(item.id)}
              onMouseLeave={() =>
                setHoveredBatchId((current) => (current === item.id ? null : current))
              }
              onFocusCapture={() => setHoveredBatchId(item.id)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setHoveredBatchId((current) => (current === item.id ? null : current));
                }
              }}
            >
              <header className="session-batch__header">
                <EditablePromptBubble
                  item={item}
                  disabled={generation.isLoading || mutatingId === item.id}
                  onRegenerate={(promptValue) => regenerateReplacingBatch(item, promptValue)}
                />
              </header>
              {item.error ? (
                <div className="generation-error-grid">
                  <div
                    className="generation-error-card"
                    style={{ aspectRatio: cssAspectRatio(item.settings.aspectRatio) }}
                    role="alert"
                  >
                    <span className="generation-error-card__content">
                      {(() => {
                        const errorCopy = splitGenerationError(item.error);
                        return (
                          <>
                            <CircleAlert aria-hidden="true" />
                            <strong>生成失败</strong>
                            <span>{errorCopy.message}</span>
                            {errorCopy.requestId ? (
                              <small
                                className="generation-error-card__request"
                                title={`请求编号：${errorCopy.requestId}`}
                              >
                                请求编号 {errorCopy.requestId}
                              </small>
                            ) : null}
                          </>
                        );
                      })()}
                      <Button
                        type="button"
                        variant="secondary"
                        size="compact"
                        disabled={generation.isLoading}
                        onClick={() => void performGeneration(item.settings)}
                      >
                        <RefreshCw aria-hidden="true" />
                        重试
                      </Button>
                    </span>
                  </div>
                </div>
              ) : item.entries.length ? (
                <div className="session-result-grid">
                  {item.entries.map((entry) => (
                    <article
                      className={`session-result${selected?.record.id === entry.record.id ? ' is-detail-open' : ''}`}
                      key={entry.record.id}
                    >
                      <SessionResultPreview entry={entry} onOpen={() => setSelected(entry)} />
                      <div className="session-result__actions">
                        <IconTooltip label="用作参考图">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="用作参考图"
                            onClick={() => void addAsReference(entry)}
                          >
                            <ImagePlus aria-hidden="true" />
                          </Button>
                        </IconTooltip>
                        <IconTooltip label="下载图片">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="下载图片"
                            onClick={() => void downloadUrl(entry.imageUrl, entry.record.id)}
                          >
                            <Download aria-hidden="true" />
                          </Button>
                        </IconTooltip>
                        <IconTooltip label={entry.record.isPublic ? '设为私有' : '设为公开'}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={entry.record.isPublic ? '设为私有' : '设为公开'}
                            disabled={mutatingId === entry.record.id}
                            onClick={() => void toggleVisibility(entry)}
                          >
                            {entry.record.isPublic ? (
                              <Globe2 aria-hidden="true" />
                            ) : (
                              <Lock aria-hidden="true" />
                            )}
                          </Button>
                        </IconTooltip>
                        <IconTooltip label="删除图片">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="删除图片"
                            disabled={mutatingId === entry.record.id}
                            onClick={() => setDeleteTarget({ kind: 'entry', entry })}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </IconTooltip>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="generation-pending">
                  <div
                    className="generation-skeleton"
                    role="status"
                    aria-label={generation.statusMessage}
                  >
                    {Array.from({ length: item.settings.count }, (_, index) => (
                      <ImageGenerationPlaceholder
                        key={`${item.id}-${index}`}
                        aspectRatio={item.settings.aspectRatio}
                        resolution={item.settings.resolution}
                      />
                    ))}
                  </div>
                </div>
              )}
              {item.entries.length ? (
                <div className="session-batch__actions" role="toolbar" aria-label="整组操作">
                  <IconTooltip label="复用完整设置">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="复用完整设置"
                      onClick={() => reuseSettings(item.settings)}
                    >
                      <Copy aria-hidden="true" />
                    </Button>
                  </IconTooltip>
                  <IconTooltip label="再次生成">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="再次生成"
                      disabled={generation.isLoading}
                      onClick={() => void performGeneration(item.settings)}
                    >
                      <RefreshCw aria-hidden="true" />
                    </Button>
                  </IconTooltip>
                  {item.entries.length > 1 ? (
                    <>
                      <IconTooltip label="下载整组图片">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="下载整组图片"
                          onClick={() => void downloadBatch(item)}
                        >
                          <ArrowDownToLine aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="删除整组">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="session-delete"
                          aria-label="删除整组"
                          disabled={mutatingId === item.id}
                          onClick={() => setDeleteTarget({ kind: 'batch', item })}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

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
