import { Compass, FolderOpen, ImagePlus, LayoutTemplate, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import { LandingSidebar } from '@/components/landing/LandingSidebar';
import { LandingGenerationControls } from '@/components/landing/LandingGenerationControls';
import { LandingAccountActions } from '@/components/landing/LandingAccountActions';
import { LiquidGlassSurface } from '@/components/landing/LiquidGlassSurface';
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
import { useMediaQuery } from '@/hooks/useMediaQuery';
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
const LANDING_IMAGE_CREDIT_COST = 15;
const LANDING_NAV_ITEMS = [
  { label: '发现', to: '/', icon: Compass },
  { label: '生图', to: '/generate', icon: ImagePlus },
  { label: '创作模板', to: '/templates', icon: LayoutTemplate },
  { label: '资产', to: '/history', icon: FolderOpen },
] as const;
const HERO_ENTRIES: HistoryEntry[] = [
  {
    record: {
      id: 'nebulens-hero-left',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '晨雾中的未来感运动场，冷静的建筑线条与自然光',
      model: 'gpt-image-2',
      width: 730,
      height: 718,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-left.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-center',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '舞台侧光中的音乐人肖像，克制的电影色彩与颗粒质感',
      model: 'gpt-image-2',
      width: 1488,
      height: 803,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-center.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-right',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '被热带植物包围的深夜咖啡馆，潮湿空气与柔和灯光',
      model: 'gpt-image-2',
      width: 741,
      height: 718,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-right.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-runner-detail',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '跑道与排版交叠的运动视觉，粗粝颗粒与克制暖色',
      model: 'gpt-image-2',
      width: 720,
      height: 960,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-runner-detail.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-piano-detail',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '空旷音乐厅中的钢琴演奏者，电影感侧光与深色木质空间',
      model: 'gpt-image-2',
      width: 720,
      height: 960,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-piano-detail.jpg',
  },
  {
    record: {
      id: 'nebulens-hero-plants-detail',
      createdAt: '2026-07-28T00:00:00.000Z',
      prompt: '花卉摄影与实验排版组成的编辑视觉，柔和灰调与珊瑚红点缀',
      model: 'gpt-image-2',
      width: 720,
      height: 960,
      isPublic: true,
    },
    imageUrl: '/media/hero-card-plants-detail.jpg',
  },
];
// Interleave portrait, landscape, and square assets so CSS columns balance naturally.
const TODAY_CREATIONS = [
  HERO_ENTRIES[3]!,
  HERO_ENTRIES[1]!,
  HERO_ENTRIES[4]!,
  HERO_ENTRIES[0]!,
  HERO_ENTRIES[5]!,
  HERO_ENTRIES[2]!,
] as const;
const TODAY_GALLERY_IMAGES: GalleryImage[] = TODAY_CREATIONS.map((entry) => ({
  id: entry.record.id,
  src: entry.imageUrl,
  alt: entry.record.prompt,
  aspectRatio: entry.record.width / entry.record.height,
}));
export function LandingView() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { quota, isLoading: quotaLoading, checkIn } = useImageQuota();
  const { notify } = useToast();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<AgentChatAttachment[]>([]);
  const [aspect, setAspect] = useState<AspectChoice>(DEFAULT_ASPECT_CHOICE);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [isPublic, setIsPublic] = useState(false);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [composerDocked, setComposerDocked] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);

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

      const shouldDock = window.scrollY > 120 && anchor.getBoundingClientRect().bottom <= 96;
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

  const copyPrompt = async (entry: HistoryEntry): Promise<void> => {
    try {
      await navigator.clipboard.writeText(entry.record.prompt);
      notify('提示词已复制。');
    } catch {
      notify('复制失败，请手动复制提示词。', 'error');
    }
  };
  const accountName = user?.username ?? user?.name ?? '账户';
  const quotaPending = authLoading || (isAuthenticated && quotaLoading);
  const quotaLabel = quotaPending
    ? '额度同步中'
    : isAuthenticated
      ? `额度 ${quota?.remaining ?? '—'}/${quota?.total ?? '—'}`
      : '登录查额度';
  const quotaAriaLabel = quotaPending
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
    setAttachments(next.slice(0, MAX_REFERENCE_IMAGES));
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
          accountName={accountName}
          brandLabel="Nebulens"
          creditsRemaining={quota?.remaining ?? '—'}
          ctaLabel={isAuthenticated ? '进入工作台' : '开始创作'}
          ctaTo="/generate"
          checkedInToday={quota?.checkedInToday ?? false}
          dailyCheckInReward={quota?.dailyCheckInReward ?? 5}
          isAuthenticated={isAuthenticated}
          items={LANDING_NAV_ITEMS}
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
        <div className="landing-hero__content">
          <h1 id="landing-title" aria-label="Turn your idea into images">
            <span className="landing-hero__headline-main">Turn your idea</span>
            <em className="animate-shiny" style={HERO_SHINY_GRADIENT_STYLE}>
              into images
            </em>
          </h1>
          <p>用 GPT-IMAGE-2 将你的创意变为精美图片，只需描述你脑海中的画面。</p>
          <LiquidGlassSurface
            backdropVideoSrc={HERO_VIDEO}
            anchorRef={composerAnchorRef}
            className={`landing-composer-anchor${composerDocked ? ' is-docked' : ''}${composerExpanded ? ' is-expanded' : ''}`}
            data-docked={composerDocked}
            data-expanded={composerExpanded}
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
          >
            <AgentChatInput
              value={prompt}
              onValueChange={setPrompt}
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
              submitContent={
                <span className="landing-submit-cost" aria-hidden="true">
                  <Sparkles />
                  <span>{count * LANDING_IMAGE_CREDIT_COST}</span>
                </span>
              }
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
          </LiquidGlassSurface>
        </div>
      </section>
      <ImageGalleryVertical
        className="landing-creations"
        eyebrow=""
        title=""
        description=""
        images={TODAY_GALLERY_IMAGES}
        columnCount={4}
        onImageClick={(image) => {
          const entry = TODAY_CREATIONS.find((candidate) => candidate.record.id === image.id);
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
