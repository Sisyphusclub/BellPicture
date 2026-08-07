'use client';

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

export type MorphicTooltipPlacement = {
  side?: 'top' | 'right' | 'bottom' | 'left' | undefined;
  align?: 'start' | 'center' | 'end' | undefined;
  offset?: number | undefined;
};

type TooltipSide = NonNullable<MorphicTooltipPlacement['side']>;
type TooltipAlign = NonNullable<MorphicTooltipPlacement['align']>;

type ResolvedTooltipPlacement = {
  side: TooltipSide;
  align: TooltipAlign;
  offset: number;
};

export type MorphicTooltipProviderProps = {
  children: ReactNode;
  delay?: number | undefined;
  closeDelay?: number | undefined;
  className?: string | undefined;
};

export type MorphicTooltipProps = MorphicTooltipPlacement & {
  content: ReactNode;
  children: ReactNode;
  disabled?: boolean | undefined;
  showArrow?: boolean | undefined;
  className?: string | undefined;
  contentClassName?: string | undefined;
};

type ActiveTooltip = ResolvedTooltipPlacement & {
  id: string;
  content: ReactNode;
  trigger: HTMLElement;
  showArrow: boolean;
  morphing: boolean;
  interaction: 'focus' | 'pointer';
  contentClassName?: string | undefined;
};

type TooltipPosition = {
  x: number;
  y: number;
  side: TooltipSide;
  arrowX: number;
  arrowY: number;
};

type TooltipSize = {
  width: number;
  height: number;
};

type MorphicTooltipContextValue = {
  open: (
    tooltip: Omit<ActiveTooltip, 'trigger' | 'morphing' | 'interaction'>,
    trigger: HTMLElement,
    interaction: ActiveTooltip['interaction'],
  ) => void;
  close: (id: string, immediate?: boolean) => void;
};

const MorphicTooltipContext = createContext<MorphicTooltipContextValue | null>(null);

const TOOLTIP_SHELL_SPRING = {
  type: 'spring',
  duration: 0.76,
  bounce: 0.28,
} as const;

const TOOLTIP_POSITION_SPRING = {
  type: 'spring',
  duration: 0.68,
  bounce: 0.22,
} as const;

const TOOLTIP_REVEAL_SPRING = {
  type: 'spring',
  duration: 0.42,
  bounce: 0.18,
} as const;

const TOOLTIP_WARM_WINDOW = 240;

const SURFACE_CLASS =
  'relative overflow-hidden rounded-[4px] border border-background/15 bg-foreground text-background shadow-none';

const CONTENT_CLASS =
  'absolute top-1/2 left-1/2 w-max max-w-[min(18rem,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 px-2 py-2 text-center text-xs';

const MAX_TOOLTIP_WIDTH = 288;

export function MorphicTooltipProvider({
  children,
  delay = 90,
  closeDelay = 80,
  className,
}: MorphicTooltipProviderProps) {
  const providerId = useId();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [surfaceSize, setSurfaceSize] = useState<TooltipSize | null>(null);
  const activeRef = useRef<ActiveTooltip | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<TooltipSize | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastCloseAtRef = useRef(0);
  const providerMountedRef = useRef(false);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current === null) {
      return;
    }

    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) {
      return;
    }

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const clearFrame = useCallback(() => {
    if (frameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const updatePosition = useCallback((tooltip: ActiveTooltip) => {
    setPosition(
      getTooltipPosition(
        tooltip.trigger.getBoundingClientRect(),
        tooltip,
        sizeRef.current ?? getTooltipSize(surfaceRef.current),
      ),
    );
  }, []);

  const measureContent = useCallback(() => {
    const nextSize = getTooltipSize(contentRef.current);
    const previousSize = sizeRef.current;

    if (
      previousSize &&
      previousSize.width === nextSize.width &&
      previousSize.height === nextSize.height
    ) {
      return;
    }

    sizeRef.current = nextSize;
    setSurfaceSize(nextSize);

    if (activeRef.current) {
      setPosition(
        getTooltipPosition(
          activeRef.current.trigger.getBoundingClientRect(),
          activeRef.current,
          nextSize,
        ),
      );
    }
  }, []);

  const open = useCallback<MorphicTooltipContextValue['open']>(
    (tooltip, trigger, interaction) => {
      clearOpenTimer();
      clearCloseTimer();

      const show = () => {
        const nextTooltip: ActiveTooltip = {
          ...tooltip,
          trigger,
          morphing: Boolean(activeRef.current),
          interaction,
        };
        const nextSize = sizeRef.current ?? getTooltipSize(null);

        sizeRef.current = nextSize;
        setSurfaceSize(nextSize);
        activeRef.current = nextTooltip;
        updatePosition(nextTooltip);
        setActive(nextTooltip);
      };

      if (activeRef.current) {
        show();
        return;
      }

      const isWarmOpen =
        interaction === 'pointer' &&
        performance.now() - lastCloseAtRef.current < TOOLTIP_WARM_WINDOW;

      if (interaction === 'focus' || isWarmOpen) {
        show();
        return;
      }

      openTimerRef.current = window.setTimeout(show, delay);
    },
    [clearCloseTimer, clearOpenTimer, delay, updatePosition],
  );

  const close = useCallback<MorphicTooltipContextValue['close']>(
    (id, immediate = false) => {
      clearOpenTimer();
      clearCloseTimer();

      const hide = () => {
        if (activeRef.current?.id !== id) {
          return;
        }

        activeRef.current = null;
        lastCloseAtRef.current = performance.now();
        if (!providerMountedRef.current) return;
        setActive(null);
        setPosition(null);
        setSurfaceSize(null);
        sizeRef.current = null;
      };

      if (immediate) {
        hide();
        return;
      }

      closeTimerRef.current = window.setTimeout(hide, closeDelay);
    },
    [clearCloseTimer, clearOpenTimer, closeDelay],
  );

  const contextValue = useMemo(
    () => ({
      open,
      close,
    }),
    [open, close],
  );

  useEffect(() => {
    providerMountedRef.current = true;
    setMounted(true);

    return () => {
      providerMountedRef.current = false;
      clearOpenTimer();
      clearCloseTimer();
      clearFrame();
      sizeRef.current = null;
    };
  }, [clearCloseTimer, clearFrame, clearOpenTimer]);

  useLayoutEffect(() => {
    if (!active) {
      return;
    }

    measureContent();
  }, [active, measureContent]);

  useEffect(() => {
    if (!active) {
      return;
    }

    function update() {
      clearFrame();
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;

        if (activeRef.current) {
          updatePosition(activeRef.current);
        }
      });
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    const content = contentRef.current;
    const resizeObserver =
      typeof ResizeObserver === 'undefined' || !content ? null : new ResizeObserver(measureContent);

    if (content) {
      resizeObserver?.observe(content);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      resizeObserver?.disconnect();
      clearFrame();
    };
  }, [active, clearFrame, measureContent, updatePosition]);

  return (
    <MorphicTooltipContext.Provider value={contextValue}>
      {children}
      {mounted
        ? createPortal(
            <LayoutGroup id={`morphic-tooltip-${providerId}`}>
              <AnimatePresence>
                {active && position ? (
                  <motion.div
                    key="morphic-tooltip-layer"
                    aria-hidden="true"
                    initial={
                      reduce || active.interaction === 'focus'
                        ? false
                        : {
                            opacity: 0,
                            x: position.x,
                            y: position.y,
                          }
                    }
                    animate={{
                      opacity: 1,
                      x: position.x,
                      y: position.y,
                    }}
                    exit={reduce ? {} : { opacity: 0 }}
                    transition={
                      reduce || active.interaction === 'focus'
                        ? { duration: 0 }
                        : {
                            opacity: { duration: 0.15, ease: EASE_OUT },
                            x: active.morphing ? TOOLTIP_POSITION_SPRING : { duration: 0 },
                            y: active.morphing ? TOOLTIP_POSITION_SPRING : { duration: 0 },
                          }
                    }
                    className="pointer-events-none fixed top-0 left-0 z-[2147483647]"
                  >
                    <div
                      style={{
                        transform: layerOffset(position.side),
                        willChange: 'transform',
                      }}
                    >
                      <motion.div
                        ref={surfaceRef}
                        layout
                        layoutId={`morphic-tooltip-surface-${providerId}`}
                        animate={{
                          width: surfaceSize?.width ?? 'auto',
                          height: surfaceSize?.height ?? 'auto',
                          scaleX: 1,
                          scaleY: 1,
                        }}
                        initial={
                          reduce || active.morphing || active.interaction === 'focus'
                            ? false
                            : tooltipShellInitial(position.side)
                        }
                        transition={
                          reduce || active.interaction === 'focus' || !active.morphing
                            ? { duration: 0 }
                            : TOOLTIP_SHELL_SPRING
                        }
                        style={{
                          transformOrigin: transformOrigin(position.side),
                          willChange: 'width, height, transform',
                        }}
                        className={cn(SURFACE_CLASS, active.contentClassName, className)}
                      >
                        <div ref={contentRef} className={cn(CONTENT_CLASS)}>
                          <motion.div
                            key={active.id}
                            initial={
                              reduce || active.morphing || active.interaction === 'focus'
                                ? false
                                : {
                                    opacity: 0,
                                    ...tooltipRevealOffset(position.side, 5),
                                  }
                            }
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            exit={
                              reduce
                                ? {}
                                : active.morphing
                                  ? { opacity: 0 }
                                  : {
                                      opacity: 0,
                                      ...tooltipRevealOffset(position.side, 3),
                                    }
                            }
                            transition={
                              reduce || active.interaction === 'focus'
                                ? { duration: 0 }
                                : {
                                    opacity: { duration: 0.14, ease: EASE_OUT },
                                    x: TOOLTIP_REVEAL_SPRING,
                                    y: TOOLTIP_REVEAL_SPRING,
                                  }
                            }
                          >
                            {active.content}
                          </motion.div>
                        </div>
                        {active.showArrow ? (
                          <span
                            className={cn(
                              'absolute size-2 rotate-45 border-background/15 bg-foreground',
                              arrowClass(position.side),
                            )}
                            style={getArrowStyle(position)}
                          />
                        ) : null}
                      </motion.div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </LayoutGroup>,
            document.body,
          )
        : null}
    </MorphicTooltipContext.Provider>
  );
}

export function MorphicTooltip({
  content,
  children,
  disabled,
  side = 'top',
  align = 'center',
  offset = 10,
  showArrow = false,
  className,
  contentClassName,
}: MorphicTooltipProps) {
  const generatedId = useId();
  const context = useContext(MorphicTooltipContext);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!context) return undefined;
    return () => context.close(generatedId, true);
  }, [context, generatedId]);

  if (!context) {
    return (
      <MorphicTooltipProvider>
        <MorphicTooltip
          content={content}
          disabled={disabled}
          side={side}
          align={align}
          offset={offset}
          showArrow={showArrow}
          className={className}
          contentClassName={contentClassName}
        >
          {children}
        </MorphicTooltip>
      </MorphicTooltipProvider>
    );
  }

  const tooltipContext = context;
  const tooltip = {
    id: generatedId,
    content,
    side,
    align,
    offset,
    showArrow,
    contentClassName,
  };

  function openTooltip(interaction: ActiveTooltip['interaction']) {
    const trigger = triggerRef.current;

    if (!trigger || disabled) {
      return;
    }

    tooltipContext.open(tooltip, trigger, interaction);
  }

  function closeTooltip() {
    tooltipContext.close(generatedId);
  }

  function onBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      closeTooltip();
    }
  }

  return (
    <span
      ref={triggerRef}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') {
          openTooltip('pointer');
        }
      }}
      onPointerDown={closeTooltip}
      onPointerLeave={closeTooltip}
      onFocusCapture={() => openTooltip('focus')}
      onBlurCapture={onBlur}
      className={cn('inline-flex', className)}
    >
      {children}
    </span>
  );
}

function getTooltipPosition(
  rect: DOMRect,
  placement: ResolvedTooltipPlacement,
  size: TooltipSize,
): TooltipPosition {
  const padding = 12;
  const side = resolveTooltipSide(rect, placement, size, padding);
  const x =
    side === 'left'
      ? rect.left - placement.offset - size.width
      : side === 'right'
        ? rect.right + placement.offset
        : inlineAnchor(rect, placement.align) - alignOffset(size.width, placement.align);

  const y =
    side === 'top'
      ? rect.top - placement.offset - size.height
      : side === 'bottom'
        ? rect.bottom + placement.offset
        : blockAnchor(rect, placement.align) - alignOffset(size.height, placement.align);
  const clampedX = clamp(x, padding, window.innerWidth - padding - size.width);
  const clampedY = clamp(y, padding, window.innerHeight - padding - size.height);
  const isVertical = isVerticalSide(side);

  return {
    x: isVertical ? clampedX + size.width / 2 : clampedX,
    y: isVertical ? clampedY : clampedY + size.height / 2,
    side,
    arrowX: clamp(rect.left + rect.width / 2 - clampedX, 12, size.width - 12),
    arrowY: clamp(rect.top + rect.height / 2 - clampedY, 12, size.height - 12),
  };
}

function resolveTooltipSide(
  rect: DOMRect,
  placement: ResolvedTooltipPlacement,
  size: TooltipSize,
  padding: number,
): TooltipSide {
  const requiredWidth = size.width + placement.offset;
  const requiredHeight = size.height + placement.offset;
  const space = {
    top: rect.top - padding,
    right: window.innerWidth - rect.right - padding,
    bottom: window.innerHeight - rect.bottom - padding,
    left: rect.left - padding,
  };
  const preferred = placement.side;
  const opposite = oppositeSide(preferred);

  if (fitsSide(preferred, space, requiredWidth, requiredHeight)) {
    return preferred;
  }

  if (fitsSide(opposite, space, requiredWidth, requiredHeight)) {
    return opposite;
  }

  if (isVerticalSide(preferred)) {
    return space.bottom >= space.top ? 'bottom' : 'top';
  }

  return space.right >= space.left ? 'right' : 'left';
}

function fitsSide(
  side: TooltipSide,
  space: Record<TooltipSide, number>,
  requiredWidth: number,
  requiredHeight: number,
) {
  return isVerticalSide(side) ? space[side] >= requiredHeight : space[side] >= requiredWidth;
}

function oppositeSide(side: TooltipSide): TooltipSide {
  switch (side) {
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
    default:
      return 'bottom';
  }
}

function isVerticalSide(side: TooltipSide) {
  return side === 'top' || side === 'bottom';
}

function getTooltipSize(element: HTMLDivElement | null): TooltipSize {
  if (!element) {
    return {
      width: Math.min(MAX_TOOLTIP_WIDTH, window.innerWidth - 24),
      height: 44,
    };
  }

  const rect = element.getBoundingClientRect();

  return {
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  };
}

function inlineAnchor(rect: DOMRect, align: TooltipAlign) {
  if (align === 'start') {
    return rect.left;
  }

  if (align === 'end') {
    return rect.right;
  }

  return rect.left + rect.width / 2;
}

function blockAnchor(rect: DOMRect, align: TooltipAlign) {
  if (align === 'start') {
    return rect.top;
  }

  if (align === 'end') {
    return rect.bottom;
  }

  return rect.top + rect.height / 2;
}

function alignOffset(size: number, align: TooltipAlign) {
  if (align === 'start') {
    return 0;
  }

  if (align === 'end') {
    return size;
  }

  return size / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, max), Math.max(min, value));
}

function arrowClass(side: TooltipSide) {
  switch (side) {
    case 'bottom':
      return '-top-1 -translate-x-1/2 border-t border-l';
    case 'left':
      return '-right-1 -translate-y-1/2 border-t border-r';
    case 'right':
      return '-left-1 -translate-y-1/2 border-b border-l';
    default:
      return '-bottom-1 -translate-x-1/2 border-r border-b';
  }
}

function getArrowStyle(position: TooltipPosition) {
  if (isVerticalSide(position.side)) {
    return {
      left: position.arrowX,
    };
  }

  return {
    top: position.arrowY,
  };
}

function layerOffset(side: TooltipSide) {
  if (isVerticalSide(side)) {
    return 'translateX(-50%)';
  }

  return 'translateY(-50%)';
}

function transformOrigin(side: TooltipSide) {
  switch (side) {
    case 'bottom':
      return 'center top';
    case 'left':
      return 'right center';
    case 'right':
      return 'left center';
    default:
      return 'center bottom';
  }
}

function tooltipShellInitial(side: TooltipSide) {
  if (isVerticalSide(side)) {
    return {
      scaleX: 0.96,
      scaleY: 0.92,
    };
  }

  return {
    scaleX: 0.92,
    scaleY: 0.96,
  };
}

function tooltipRevealOffset(side: TooltipSide, distance: number) {
  switch (side) {
    case 'bottom':
      return { x: 0, y: -distance };
    case 'left':
      return { x: distance, y: 0 };
    case 'right':
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: distance };
  }
}
