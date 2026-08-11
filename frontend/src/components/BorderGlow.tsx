import {
  useRef,
  useId,
  useCallback,
  useEffect,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import './BorderGlow.css';

interface BorderGlowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
  active?: boolean;
  liquidGlass?: boolean;
  reducedMotion?: boolean;
}

const LIQUID_GLASS_DISPLACEMENT_MAP = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <linearGradient id="x" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff0080" />
        <stop offset="0.12" stop-color="#800080" />
        <stop offset="0.88" stop-color="#800080" />
        <stop offset="1" stop-color="#000080" />
      </linearGradient>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#00ff00" />
        <stop offset="0.16" stop-color="#008000" />
        <stop offset="0.84" stop-color="#008000" />
        <stop offset="1" stop-color="#000000" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#x)" />
    <rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen" />
  </svg>
`)}`;

function parseHSL(hslStr: string): { h: number; s: number; l: number } {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return {
    h: Number.parseFloat(match[1] ?? '40'),
    s: Number.parseFloat(match[2] ?? '80'),
    l: Number.parseFloat(match[3] ?? '80'),
  };
}

function buildGlowVars(glowColor: string, intensity: number): Record<string, string> {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars: Record<string, string> = {};
  for (let i = 0; i < opacities.length; i++) {
    const opacity = opacities[i] ?? 0;
    const key = keys[i] ?? '';
    vars[`--glow-color${key}`] = `hsl(${base} / ${Math.min(opacity * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = [
  '80% 55%',
  '69% 34%',
  '8% 6%',
  '41% 38%',
  '86% 85%',
  '82% 18%',
  '51% 4%',
];
const GRADIENT_KEYS = [
  '--gradient-one',
  '--gradient-two',
  '--gradient-three',
  '--gradient-four',
  '--gradient-five',
  '--gradient-six',
  '--gradient-seven',
];
// Keep the warm logo color visible while preserving cyan and royal-blue transitions.
const COLOR_MAP = [0, 1, 2, 0, 0, 2, 1];

function buildGradientVars(colors: string[]): Record<string, string> {
  const palette = colors.length > 0 ? colors : ['#c084fc', '#f472b6', '#38bdf8'];
  const vars: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    const colorIndex = COLOR_MAP[i] ?? 0;
    const color = palette[Math.min(colorIndex, palette.length - 1)] ?? '#c084fc';
    const key = GRADIENT_KEYS[i];
    const position = GRADIENT_POSITIONS[i];
    if (!key || !position) continue;
    vars[key] = `radial-gradient(at ${position}, ${color} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${palette[0] ?? '#c084fc'} 0 100%)`;
  return vars;
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInCubic(x: number) {
  return x * x * x;
}

interface AnimateOpts {
  start?: number;
  end?: number;
  duration?: number;
  delay?: number;
  ease?: (t: number) => number;
  onUpdate: (v: number) => void;
  onEnd?: () => void;
}

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: AnimateOpts) {
  const t0 = performance.now() + delay;
  function tick() {
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  setTimeout(() => requestAnimationFrame(tick), delay);
}

const BorderGlow = ({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
  active = false,
  liquidGlass = false,
  reducedMotion = false,
  style,
  onPointerMove,
  onPointerLeave,
  ...rootProps
}: BorderGlowProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const liquidGlassFilterId = `liquid-glass-${useId().replaceAll(':', '')}`;

  const getCenterOfElement = useCallback((el: HTMLElement): [number, number] => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    },
    [getCenterOfElement],
  );

  const getCursorAngle = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const radians = Math.atan2(dy, dx);
      let degrees = radians * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      return degrees;
    },
    [getCenterOfElement],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const card = cardRef.current;
      if (!card || reducedMotion) return;

      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const edge = getEdgeProximity(card, x, y) * 100;
      const angle = getCursorAngle(card, x, y);
      const proximity = active ? Math.max(edge, 68) : edge;

      card.style.setProperty('--edge-proximity', proximity.toFixed(3));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    },
    [active, getCursorAngle, getEdgeProximity, onPointerMove, reducedMotion],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      cardRef.current?.style.setProperty('--edge-proximity', active ? '68' : '0');
    },
    [active, onPointerLeave],
  );

  useEffect(() => {
    cardRef.current?.style.setProperty('--edge-proximity', active ? '68' : '0');
  }, [active]);

  useEffect(() => {
    if (!animated || reducedMotion || !cardRef.current) return;
    const card = cardRef.current;
    const angleStart = 110;
    const angleEnd = 465;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animateValue({
      duration: 500,
      onUpdate: (value) => card.style.setProperty('--edge-proximity', `${value}`),
    });
    animateValue({
      ease: easeInCubic,
      duration: 1500,
      end: 50,
      onUpdate: (value) => {
        card.style.setProperty(
          '--cursor-angle',
          `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`,
        );
      },
    });
    animateValue({
      ease: easeOutCubic,
      delay: 1500,
      duration: 2250,
      start: 50,
      end: 100,
      onUpdate: (value) => {
        card.style.setProperty(
          '--cursor-angle',
          `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`,
        );
      },
    });
    animateValue({
      ease: easeInCubic,
      delay: 2500,
      duration: 1500,
      start: 100,
      end: 0,
      onUpdate: (value) => card.style.setProperty('--edge-proximity', `${value}`),
      onEnd: () => card.classList.remove('sweep-active'),
    });
  }, [animated, reducedMotion]);

  const glowVars = buildGlowVars(glowColor, glowIntensity);

  return (
    <div
      {...rootProps}
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-glow-active={active ? 'true' : undefined}
      data-liquid-glass={liquidGlass ? 'true' : undefined}
      data-reduced-motion={reducedMotion ? 'true' : undefined}
      className={`border-glow-card ${className}`}
      style={
        {
          '--card-bg': backgroundColor,
          '--edge-sensitivity': edgeSensitivity,
          '--border-radius': `${borderRadius}px`,
          '--glow-padding': `${glowRadius}px`,
          '--cone-spread': coneSpread,
          '--fill-opacity': fillOpacity,
          '--liquid-glass-filter': `url("#${liquidGlassFilterId}")`,
          ...glowVars,
          ...buildGradientVars(colors),
          ...style,
        } as CSSProperties
      }
    >
      <span className="edge-light" />
      {liquidGlass ? (
        <>
          <svg
            className="border-glow-liquid-glass__defs"
            width="0"
            height="0"
            aria-hidden="true"
            focusable="false"
          >
            <filter
              id={liquidGlassFilterId}
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={LIQUID_GLASS_DISPLACEMENT_MAP}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="-92"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
          <span className="border-glow-liquid-glass__effect" aria-hidden="true">
            <span className="border-glow-liquid-glass__tint" />
          </span>
          <span className="border-glow-liquid-glass__chrome" aria-hidden="true" />
        </>
      ) : null}
      <div className="border-glow-inner">{children}</div>
    </div>
  );
};

export default BorderGlow;
