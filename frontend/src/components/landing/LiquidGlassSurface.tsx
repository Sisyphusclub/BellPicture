import { LiquidGlass } from '@ybouane/liquidglass';
import { useEffect, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';

import './LiquidGlassSurface.css';

interface LiquidGlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  reducedMotion?: boolean;
  backdropVideoSrc?: string;
  anchorRef?: Ref<HTMLDivElement>;
}

const GLASS_DEFAULTS = {
  blurAmount: 0.2,
  refraction: 0.78,
  chromAberration: 0.065,
  edgeHighlight: 0.18,
  specular: 0.42,
  fresnel: 0.82,
  distortion: 0.035,
  cornerRadius: 30,
  zRadius: 18,
  opacity: 0.96,
  saturation: 0.08,
  tintStrength: 0.12,
  brightness: 0.02,
  shadowOpacity: 0.28,
  shadowSpread: 12,
  shadowOffsetY: 2,
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

export function LiquidGlassSurface({
  children,
  reducedMotion = false,
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
    if (!canUseLiquidGlass()) return undefined;

    let disposed = false;
    let instance: LiquidGlass | null = null;

    const initialize = async (): Promise<void> => {
      try {
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
        root.dataset.liquidglassReady = 'true';
      } catch {
        // Keep the CSS surface visible when WebGL or foreignObject capture is unavailable.
        root.dataset.liquidglassReady = 'false';
      }
    };

    void initialize();

    return () => {
      disposed = true;
      instance?.destroy();
      delete root.dataset.liquidglassReady;
    };
  }, [reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    if (!root || !backdrop || !backdropVideoSrc) return undefined;

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
  }, [backdropVideoSrc]);

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
          preload="metadata"
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
