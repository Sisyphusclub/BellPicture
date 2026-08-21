import { LiquidGlass } from '@ybouane/liquidglass';
import { useEffect, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';

import './LiquidGlassSurface.css';

interface LiquidGlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  reducedMotion?: boolean;
  liquidGlassEnabled?: boolean;
  backdropVideoSrc?: string;
  anchorRef?: Ref<HTMLDivElement>;
}

const GLASS_DEFAULTS = {
  blurAmount: 0.3,
  refraction: 0.58,
  chromAberration: 0.025,
  edgeHighlight: 0,
  specular: 0,
  fresnel: 0,
  distortion: 0.012,
  cornerRadius: 20,
  zRadius: 10,
  opacity: 0.76,
  saturation: 0.03,
  tintStrength: 0.08,
  brightness: 0.1,
  shadowOpacity: 0.12,
  shadowSpread: 8,
  shadowOffsetY: 1,
  floating: false,
  button: false,
  bevelMode: 0,
} as const;

const GLASS_CONFIG = JSON.stringify(GLASS_DEFAULTS);

function canUseLiquidGlass(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (navigator.userAgent.toLowerCase().includes('jsdom')) return false;

  try {
    const probe = document.createElement('canvas');
    const context =
      probe.getContext('webgl', { alpha: true }) ?? probe.getContext('experimental-webgl');
    return Boolean(context);
  } catch {
    return false;
  }
}

function waitForVideoFrame(video: HTMLVideoElement, signal: AbortSignal): Promise<boolean> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve(true);

  return new Promise((resolve) => {
    const finish = (ready: boolean) => {
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('canplay', handleReady);
      video.removeEventListener('error', handleFailure);
      signal.removeEventListener('abort', handleAbort);
      resolve(ready);
    };
    const handleReady = () => finish(true);
    const handleFailure = () => finish(false);
    const handleAbort = () => finish(false);

    video.addEventListener('loadeddata', handleReady, { once: true });
    video.addEventListener('canplay', handleReady, { once: true });
    video.addEventListener('error', handleFailure, { once: true });
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

function waitForRenderedFrame(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve(!signal.aborted));
    });
  });
}

export function LiquidGlassSurface({
  children,
  reducedMotion = false,
  liquidGlassEnabled = true,
  backdropVideoSrc,
  anchorRef,
  className = '',
  ...rootProps
}: LiquidGlassSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const target = targetRef.current;
    if (!root || !target) return undefined;
    root.dataset.liquidglassReady = 'false';
    if (!liquidGlassEnabled || !canUseLiquidGlass()) return undefined;

    let disposed = false;
    let instance: LiquidGlass | null = null;
    const controller = new AbortController();

    const initialize = async (): Promise<void> => {
      try {
        const backdrop = backdropRef.current;
        if (backdropVideoSrc && backdrop) {
          const hasVideoFrame = await waitForVideoFrame(backdrop, controller.signal);
          if (!hasVideoFrame || disposed) return;
        }

        const nextInstance = await LiquidGlass.init({
          root,
          glassElements: [target],
          defaults: GLASS_DEFAULTS,
        });
        if (disposed) {
          nextInstance.destroy();
          return;
        }
        instance = nextInstance;
        // The library disables selection on its root for draggable panels. This
        // surface is decorative, so restore normal text selection for the input.
        root.style.userSelect = 'auto';
        root.style.webkitUserSelect = 'auto';
        const hasRenderedFrame = await waitForRenderedFrame(controller.signal);
        if (!hasRenderedFrame || disposed) return;
        root.dataset.liquidglassReady = 'true';
      } catch {
        // Keep the CSS surface visible when WebGL or foreignObject capture is unavailable.
        root.dataset.liquidglassReady = 'false';
      }
    };

    void initialize();

    return () => {
      disposed = true;
      controller.abort();
      instance?.destroy();
      delete root.dataset.liquidglassReady;
    };
  }, [backdropVideoSrc, liquidGlassEnabled, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    if (!root || !backdrop || !backdropVideoSrc || !liquidGlassEnabled) return undefined;

    // The hero already owns the visible video. Keep the sampling copy aligned
    // to that same hero rectangle so LiquidGlass does not create a second,
    // differently cropped version of the background inside the composer.
    const syncBackdropBounds = () => {
      const hero = root.closest<HTMLElement>('.landing-hero');
      if (!hero) return;

      const rootRect = root.getBoundingClientRect();
      const heroRect = hero.getBoundingClientRect();
      backdrop.style.left = `${heroRect.left - rootRect.left}px`;
      backdrop.style.top = `${heroRect.top - rootRect.top}px`;
      backdrop.style.width = `${heroRect.width}px`;
      backdrop.style.height = `${heroRect.height}px`;
    };

    syncBackdropBounds();
    const hero = root.closest<HTMLElement>('.landing-hero');
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncBackdropBounds) : null;
    observer?.observe(root);
    if (hero) observer?.observe(hero);
    window.addEventListener('resize', syncBackdropBounds);
    backdrop.addEventListener('loadedmetadata', syncBackdropBounds);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncBackdropBounds);
      backdrop.removeEventListener('loadedmetadata', syncBackdropBounds);
    };
  }, [backdropVideoSrc, liquidGlassEnabled]);

  return (
    <div
      {...rootProps}
      ref={(node) => {
        rootRef.current = node;
        if (typeof anchorRef === 'function') anchorRef(node);
        else if (anchorRef) anchorRef.current = node;
      }}
      className={`landing-liquidglass-root ${className}`.trim()}
      data-liquidglass-root="true"
      data-liquidglass-ready="false"
      data-liquidglass-video={backdropVideoSrc ? 'true' : undefined}
    >
      {backdropVideoSrc ? (
        <video
          ref={backdropRef}
          className="landing-liquidglass-backdrop landing-liquidglass-backdrop--video"
          src={backdropVideoSrc}
          autoPlay={!reducedMotion}
          muted
          loop={!reducedMotion}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : (
        <div className="landing-liquidglass-backdrop" aria-hidden="true" />
      )}
      <div
        ref={targetRef}
        className="landing-liquidglass-target"
        data-config={GLASS_CONFIG}
        data-liquidglass-target="true"
      >
        {children}
      </div>
    </div>
  );
}
