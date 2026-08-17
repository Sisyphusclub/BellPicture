import { LiquidGlass } from '@ybouane/liquidglass';
import { useEffect, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';

import './LiquidGlassSurface.css';

interface LiquidGlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  reducedMotion?: boolean;
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
  anchorRef,
  className = '',
  ...rootProps
}: LiquidGlassSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

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
    >
      <div className="landing-liquidglass-backdrop" aria-hidden="true" />
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
