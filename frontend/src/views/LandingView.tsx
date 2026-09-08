import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import { GenerationSubmitCost } from '@/components/generation/GenerationSubmitCost';
import { LandingSidebar } from '@/components/landing/LandingSidebar';
import { LandingGenerationControls } from '@/components/landing/LandingGenerationControls';
import { LandingAccountActions } from '@/components/landing/LandingAccountActions';
import { ImageApiKeySettingsDialog } from '@/components/settings/ImageApiKeySettingsDialog';
import { useToast } from '@/components/common/ToastProvider';
import { AgentChatInput } from '@/components/premium/agent-chat-input/agent-chat-input';
import type { AgentChatAttachment } from '@/components/premium/agent-chat-input/types';
import {
  ImageGalleryVertical,
  type GalleryImage,
} from '@/components/premium/image-galleries/image-gallery-vertical';
import { IMAGE_PROMPT_EXAMPLES } from '@/data/imagePromptExamples';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useImageQuota } from '@/hooks/useImageQuota';
import { useImageApiKey } from '@/hooks/useImageApiKey';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePublicGallery } from '@/hooks/usePublicGallery';
import { getAppNavigation } from '@/config/navigation';
import {
  CREATION_TEMPLATES,
  orderTemplatesWithAnimeLast,
  templateToHistoryEntry,
} from '@/data/creationTemplates';
import { buildApiUrl } from '@/services/api/imagesApi';
import type { AspectChoice, HistoryEntry } from '@/types/image';
import { DEFAULT_ASPECT_CHOICE, DEFAULT_COUNT, MAX_REFERENCE_IMAGES } from '@/types/image';

const HERO_VIDEO = buildApiUrl('/api/media/liquid-glass.mp4');
const HERO_SHINY_GRADIENT_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(110deg, #3D81E3, 20%, #AE9AE6, 40%, #F8D8D5, 60%, #FEEFDB, 80%, #3D81E3)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
};
const LANDING_SCROLL_KEY = 'nebulens:landing-scroll';
const LANDING_SCROLL_RESTORE_KEY = 'nebulens:landing-scroll-restore';
const LANDING_COMPOSER_TRANSITION_EASE = [0.16, 1, 0.3, 1] as const;
const LANDING_COMPOSER_CLOSED_CLIP = 'inset(0 50% 0 50% round 20px)';
const LANDING_COMPOSER_OPEN_CLIP = 'inset(0 0% 0 0% round 20px)';
const HERO_ENTRIES: HistoryEntry[] = [
  {
    record: {
      id: 'nebulens-hero-left',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '夜间现代主义泳池，冷色建筑线条、镜面水面与克制的环境灯光',
      model: 'gpt-image-2',
      width: 1024,
      height: 1024,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-left.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-center',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '雨后当代音乐排练空间，钢琴、深色木地板与蓝色聚光灯的电影感画面',
      model: 'gpt-image-2',
      width: 1536,
      height: 1024,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-center.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-right',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '雨夜玻璃温室咖啡馆，潮湿玻璃、深绿色植物与温暖室内灯光',
      model: 'gpt-image-2',
      width: 1024,
      height: 1024,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-right.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-runner-detail',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '雾中的混凝土运动场与奔跑者，冷灰建筑、湿润空气与柔和晨光',
      model: 'gpt-image-2',
      width: 1024,
      height: 1536,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-runner-detail.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-piano-detail',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '粗野主义音乐厅与黑色三角钢琴，几何混凝土墙面和一束冷色侧光',
      model: 'gpt-image-2',
      width: 1024,
      height: 1536,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-piano-detail.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-plants-detail',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '蓝调玻璃温室中的植物装置，透明叶片、湿润反光与深邃蓝色光线',
      model: 'gpt-image-2',
      width: 1024,
      height: 1536,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-plants-detail.jpg',
  },
];
// Keep the general-purpose references visible first on Discover; anime references
// remain available in the same gallery but move to the final section.
const DISCOVERY_TEMPLATE_ENTRIES =
  orderTemplatesWithAnimeLast(CREATION_TEMPLATES).map(templateToHistoryEntry);
// Keep the hero works first, then expose the full GPT Image 2 library in the same gallery.
const TODAY_CREATIONS = [
  HERO_ENTRIES[3]!,
  HERO_ENTRIES[1]!,
  HERO_ENTRIES[4]!,
  HERO_ENTRIES[0]!,
  HERO_ENTRIES[5]!,
  HERO_ENTRIES[2]!,
  ...DISCOVERY_TEMPLATE_ENTRIES,
] as const;
const TEMPLATE_LABELS = new Map(
  CREATION_TEMPLATES.map((template) => [`nebulens-${template.id}`, template.title]),
);
export function LandingView() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin, logout } = useAuth();
  const { quota, isLoading: quotaLoading, checkIn } = useImageQuota();
  const imageApiKey = useImageApiKey();
  const { notify } = useToast();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const {
    entries: publicGalleryEntries,
    isHydrating: publicGalleryIsHydrating,
    hydrateError: publicGalleryError,
    hasMore: publicGalleryHasMore,
    loadMore: loadMorePublicGallery,
  } = usePublicGallery();
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const composerDockedRef = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<AgentChatAttachment[]>([]);
  const [aspect, setAspect] = useState<AspectChoice>(DEFAULT_ASPECT_CHOICE);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [isPublic, setIsPublic] = useState(false);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [imageApiKeySettingsOpen, setImageApiKeySettingsOpen] = useState(false);
  const [composerDocked, setComposerDocked] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const composerHasContent = prompt.trim().length > 0 || attachments.length > 0;
  const composerIsExpanded = composerDocked && (composerExpanded || composerHasContent);
  const composerPresentation = composerDocked ? 'dock' : 'hero';
  const galleryEntries = useMemo(
    () => [...publicGalleryEntries, ...TODAY_CREATIONS],
    [publicGalleryEntries],
  );
  const galleryImages = useMemo<GalleryImage[]>(
    () =>
      galleryEntries.map((entry) => ({
        id: entry.record.id,
        src: entry.imageUrl,
        alt: galleryLabel(entry),
        aspectRatio: entry.record.width / entry.record.height,
      })),
    [galleryEntries],
  );
  useEffect(() => {
    const savedScroll = Number(sessionStorage.getItem(LANDING_SCROLL_KEY));
    const shouldRestoreScroll = sessionStorage.getItem(LANDING_SCROLL_RESTORE_KEY) === 'true';
    sessionStorage.removeItem(LANDING_SCROLL_KEY);
    sessionStorage.removeItem(LANDING_SCROLL_RESTORE_KEY);
    if (shouldRestoreScroll && Number.isFinite(savedScroll) && savedScroll > 0) {
      window.setTimeout(() => window.scrollTo({ top: savedScroll, behavior: 'auto' }), 0);
    } else if (window.scrollY > 0) {
      // Browsers can restore the previous scroll offset during a hard reload.
      // A direct visit to Discover should always start at the hero, while the
      // explicit return marker above still preserves the workspace handoff.
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
    }

    const saveScroll = () => {
      if (sessionStorage.getItem(LANDING_SCROLL_RESTORE_KEY) === 'true') {
        sessionStorage.setItem(LANDING_SCROLL_KEY, String(window.scrollY));
      }
    };
    window.addEventListener('pagehide', saveScroll);
    return () => {
      saveScroll();
      window.removeEventListener('pagehide', saveScroll);
    };
  }, []);

  useEffect(() => {
    const updateComposerDock = () => {
      const anchor = composerAnchorRef.current;
      if (!anchor) return;

      const shouldDock =
        window.scrollY > 120 &&
        (composerDockedRef.current || anchor.getBoundingClientRect().bottom <= 240);
      composerDockedRef.current = shouldDock;
      setComposerDocked(shouldDock);
      if (!shouldDock) setComposerExpanded(false);
    };

    updateComposerDock();
    window.addEventListener('scroll', updateComposerDock, { passive: true });
    window.addEventListener('resize', updateComposerDock);
    return () => {
      window.removeEventListener('scroll', updateComposerDock);
      window.removeEventListener('resize', updateComposerDock);
    };
  }, []);

  useEffect(() => {
    if (!publicGalleryHasMore || publicGalleryIsHydrating || publicGalleryError !== null) {
      return;
    }
    void loadMorePublicGallery();
  }, [loadMorePublicGallery, publicGalleryError, publicGalleryHasMore, publicGalleryIsHydrating]);

  const copyPrompt = async (entry: HistoryEntry): Promise<void> => {
    try {
      await navigator.clipboard.writeText(entry.record.prompt);
      notify('提示词已复制。');
    } catch {
      notify('复制失败，请手动复制提示词。', 'error');
    }
  };
  const accountName = user?.username ?? user?.name ?? '账户';
  const providerPending = authLoading || (isAuthenticated && imageApiKey.isLoading);
  const quotaPending = isAuthenticated && quotaLoading;
  const quotaLabel = providerPending
    ? '调用方式同步中'
    : imageApiKey.status?.configured === true
      ? '个人 Key'
      : quotaPending
        ? '额度同步中'
        : isAuthenticated
          ? `额度 ${quota?.remaining ?? '—'}/${quota?.total ?? '—'}`
          : '登录查额度';
  const quotaAriaLabel = providerPending
    ? '生图调用方式同步中'
    : imageApiKey.status?.configured === true
      ? '当前使用个人 API Key'
      : quotaPending
        ? '生成额度同步中'
        : isAuthenticated
          ? `剩余额度 ${quota?.remaining ?? '未知'}，总额度 ${quota?.total ?? '未知'}`
          : '登录后查看生成额度';
  const updateAttachments = (next: AgentChatAttachment[]): void => {
    if (next.length > MAX_REFERENCE_IMAGES) {
      notify(
        `参考图最多支持 ${MAX_REFERENCE_IMAGES} 张，已保留前 ${MAX_REFERENCE_IMAGES} 张。`,
        'error',
      );
    }
    const limited = next.slice(0, MAX_REFERENCE_IMAGES);
    setAttachments(limited);
    if (composerDocked && limited.length === 0 && !prompt.trim()) setComposerExpanded(false);
  };
  const updatePrompt = (value: string): void => {
    setPrompt(value);
    if (composerDocked && !value.trim() && attachments.length === 0) setComposerExpanded(false);
  };
  const submitPrompt = (
    value: string,
    selectedAttachments: readonly AgentChatAttachment[],
  ): void => {
    const trimmed = value.trim();
    if (!trimmed) return;
    sessionStorage.setItem(LANDING_SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(LANDING_SCROLL_RESTORE_KEY, 'true');
    void navigate(
      `/generate?${new URLSearchParams({
        prompt: trimmed,
        aspect,
        count: String(count),
        isPublic: String(isPublic),
      }).toString()}`,
      {
        state: {
          autoGenerate: true,
          attachments: selectedAttachments.slice(0, MAX_REFERENCE_IMAGES),
        },
      },
    );
  };

  return (
    <div className="landing-page">
      <section className="landing-hero" data-layout="media-stage" aria-labelledby="landing-title">
        {!videoFailed ? (
          <video
            className="landing-hero__video"
            src={HERO_VIDEO}
            autoPlay={!reducedMotion}
            muted
            loop={!reducedMotion}
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onError={() => setVideoFailed(true)}
          />
        ) : null}
        <div className="landing-hero__overlay" aria-hidden="true" />
        <LandingSidebar
          accountImage={user?.image}
          accountName={accountName}
          brandLabel="Nebulens"
          creditsRemaining={quota?.remaining ?? '—'}
          ctaLabel={isAuthenticated ? '进入工作台' : '开始创作'}
          ctaTo="/generate"
          checkedInToday={quota?.checkedInToday ?? false}
          dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
          isAuthenticated={isAuthenticated}
          imageApiKeyConfigured={imageApiKey.status?.configured === true}
          items={getAppNavigation(isAdmin)}
          logoSrc="/brand/logo.png"
          onCheckIn={checkIn}
          onLogin={openAuthModal}
          onOpenImageApiKeySettings={() => setImageApiKeySettingsOpen(true)}
          onNotify={notify}
        />
        <LandingAccountActions
          accountImage={user?.image}
          accountName={accountName}
          checkedInToday={quota?.checkedInToday ?? false}
          creditsRemaining={quota?.remaining ?? '—'}
          dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
          isAuthenticated={isAuthenticated}
          imageApiKeyConfigured={imageApiKey.status?.configured === true}
          imageApiKeySuffix={imageApiKey.status?.keySuffix}
          onCheckIn={checkIn}
          onLogin={openAuthModal}
          onLogout={logout}
          onOpenImageApiKeySettings={() => setImageApiKeySettingsOpen(true)}
          onNotify={notify}
        />
        <ImageApiKeySettingsDialog
          open={imageApiKeySettingsOpen}
          onClose={() => setImageApiKeySettingsOpen(false)}
        />
        <div className="landing-hero__content">
          <h1 id="landing-title" aria-label="Turn your idea into images">
            <span className="landing-hero__headline-main">Turn your idea</span>
            <em className="animate-shiny" style={HERO_SHINY_GRADIENT_STYLE}>
              into images
            </em>
          </h1>
          <p>用 GPT-IMAGE-2 将你的创意变为精美图片，只需描述你脑海中的画面。</p>
          <div
            ref={composerAnchorRef}
            className={`landing-composer-anchor${composerDocked ? ' is-docked' : ''}${composerIsExpanded ? ' is-expanded' : ''}`}
            data-docked={composerDocked}
            data-expanded={composerIsExpanded}
            onPointerDownCapture={(event) => {
              const target = event.target as HTMLElement;
              if (composerDocked && target.closest('.agent-chat-input__textarea')) {
                setComposerExpanded(true);
              }
            }}
            onFocusCapture={(event) => {
              const target = event.target as HTMLElement;
              if (composerDocked && target.closest('.agent-chat-input__textarea')) {
                setComposerExpanded(true);
              }
            }}
            onBlurCapture={(event) => {
              if (
                composerDocked &&
                !event.currentTarget.contains(event.relatedTarget) &&
                !composerHasContent
              ) {
                setComposerExpanded(false);
              }
            }}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={composerPresentation}
                className={`landing-composer-presentation landing-composer-${composerPresentation}${composerIsExpanded ? ' is-expanded' : ''}`}
                data-composer-presentation={composerPresentation}
                initial={
                  reducedMotion
                    ? false
                    : composerDocked
                      ? { opacity: 0, clipPath: LANDING_COMPOSER_CLOSED_CLIP }
                      : { opacity: 0 }
                }
                animate={
                  reducedMotion
                    ? { opacity: 1 }
                    : composerDocked
                      ? {
                          opacity: 1,
                          clipPath: LANDING_COMPOSER_OPEN_CLIP,
                          transition: { duration: 0.28, ease: LANDING_COMPOSER_TRANSITION_EASE },
                        }
                      : {
                          opacity: 1,
                          transition: { duration: 0.18, ease: LANDING_COMPOSER_TRANSITION_EASE },
                        }
                }
                exit={
                  reducedMotion
                    ? { opacity: 0, transition: { duration: 0 } }
                    : composerDocked
                      ? {
                          opacity: 0,
                          clipPath: LANDING_COMPOSER_CLOSED_CLIP,
                          transition: { duration: 0.18, ease: LANDING_COMPOSER_TRANSITION_EASE },
                        }
                      : {
                          opacity: 0,
                          transition: { duration: 0.14, ease: LANDING_COMPOSER_TRANSITION_EASE },
                        }
                }
              >
                <div className="landing-composer-content">
                  <AgentChatInput
                    value={prompt}
                    onValueChange={updatePrompt}
                    onSubmit={({ text, attachments: selectedAttachments }) =>
                      submitPrompt(text, selectedAttachments)
                    }
                    skills={[]}
                    models={[]}
                    defaultModel="gpt-image-2"
                    agents={[]}
                    reasoningLevels={[]}
                    speedModes={[]}
                    streamingPlaceholders={IMAGE_PROMPT_EXAMPLES}
                    placeholder="描述你想生成的画面..."
                    ariaLabel="首页创作提示词"
                    submitLabel="带着提示词开始创作"
                    submitContent={<GenerationSubmitCost count={count} />}
                    minRows={1}
                    maxRows={4}
                    allowFileUpload
                    attachments={attachments}
                    onAttachmentsChange={updateAttachments}
                    acceptedFileTypes="image/png,image/jpeg,image/webp"
                    toolbarContent={
                      <LandingGenerationControls
                        aspect={aspect}
                        count={count}
                        isPublic={isPublic}
                        quotaLabel={quotaLabel}
                        quotaAriaLabel={quotaAriaLabel}
                        quotaIsAction={!authLoading && !isAuthenticated}
                        onAspectChange={setAspect}
                        onCountChange={setCount}
                        onPublicChange={setIsPublic}
                        onQuotaClick={openAuthModal}
                      />
                    }
                    className="landing-composer"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
      <ImageGalleryVertical
        className="landing-creations"
        eyebrow=""
        title=""
        description=""
        images={galleryImages}
        columnCount={6}
        onImageClick={(image) => {
          const entry = galleryEntries.find((candidate) => candidate.record.id === image.id);
          if (entry) setSelected(entry);
        }}
      />
      <ImageDetailModal
        entry={selected}
        onClose={() => setSelected(null)}
        onCopyPrompt={(entry) => void copyPrompt(entry)}
      />
    </div>
  );
}

function galleryLabel(entry: HistoryEntry): string {
  const templateLabel = TEMPLATE_LABELS.get(entry.record.id);
  if (templateLabel) return templateLabel;
  const prompt = entry.record.prompt.replace(/\s+/g, ' ').trim();
  return prompt.length > 32 ? `${prompt.slice(0, 32)}...` : prompt || '生成图片';
}
