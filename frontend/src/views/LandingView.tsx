import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ImageDetailModal } from '@/components/gallery/ImageDetailModal';
import { LandingGenerationControls } from '@/components/landing/LandingGenerationControls';
import { useToast } from '@/components/common/ToastProvider';
import { AgentChatInput } from '@/components/premium/agent-chat-input/agent-chat-input';
import {
  ImageGalleryVertical,
  type GalleryImage,
} from '@/components/premium/image-galleries/image-gallery-vertical';
import { NavbarExpand } from '@/components/premium/navbar-expand/navbar-expand';
import { useAuth } from '@/hooks/useAuth';
import { openAuthModal } from '@/hooks/useAuthModal';
import { useImageQuota } from '@/hooks/useImageQuota';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { AspectChoice, HistoryEntry } from '@/types/image';
import { DEFAULT_ASPECT_CHOICE, DEFAULT_COUNT } from '@/types/image';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4';
const LANDING_MODELS = [{ id: 'gpt-image-2', label: 'gpt-image-2' }] as const;
const LANDING_REASONING = [
  { id: 'standard', label: '标准', description: '快速完成日常创作' },
  { id: 'precise', label: '精细', description: '投入更多推理完善画面细节' },
] as const;
const LANDING_SPEED = [{ id: 'balanced', label: '均衡' }] as const;
const LANDING_NAV_ITEMS = [
  { label: '发现', to: '/' },
  { label: '生图', to: '/generate' },
  { label: '创作模板', to: '/templates' },
  { label: '资产', to: '/history' },
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { quota, isLoading: quotaLoading } = useImageQuota();
  const { notify } = useToast();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [videoFailed, setVideoFailed] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<AspectChoice>(DEFAULT_ASPECT_CHOICE);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [isPublic, setIsPublic] = useState(false);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

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
  const submitPrompt = (value: string): void => {
    const trimmed = value.trim();
    if (!trimmed) return;
    void navigate(
      `/generate?${new URLSearchParams({
        prompt: trimmed,
        aspect,
        count: String(count),
        isPublic: String(isPublic),
      }).toString()}`,
    );
  };

  return (
    <div className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
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
        <NavbarExpand
          accountName={accountName}
          brandLabel="Nebulens"
          creditsRemaining={quota?.remaining ?? '—'}
          ctaLabel={isAuthenticated ? '进入工作台' : '开始创作'}
          ctaTo="/generate"
          isAuthenticated={isAuthenticated}
          items={LANDING_NAV_ITEMS}
          logoSrc="/brand/logo.png"
          onLogin={openAuthModal}
        />
        <div className="landing-hero__content">
          <h1 id="landing-title" aria-label="Turn your idea into images">
            <span className="landing-hero__headline-main">Turn your idea</span>
            <em>into images</em>
          </h1>
          <p>用 GPT-IMAGE-2 将你的创意变为精美图片，只需描述你脑海中的画面。</p>
          <AgentChatInput
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={({ text }) => submitPrompt(text)}
            skills={[]}
            models={LANDING_MODELS}
            defaultModel="gpt-image-2"
            agents={[]}
            reasoningLevels={LANDING_REASONING}
            defaultReasoning="standard"
            speedModes={LANDING_SPEED}
            defaultSpeed="balanced"
            placeholder="描述你想生成的画面..."
            ariaLabel="首页创作提示词"
            submitLabel="带着提示词开始创作"
            minRows={1}
            maxRows={4}
            allowFileUpload={false}
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
      </section>
      <ImageGalleryVertical
        className="landing-creations"
        eyebrow=""
        title=""
        description=""
        images={TODAY_GALLERY_IMAGES}
        columnCount={4}
        speed={38}
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
