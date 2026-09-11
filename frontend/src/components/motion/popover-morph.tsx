'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SPRING_PANEL } from '@/lib/ease';
import { cn } from '@/lib/utils';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'center' | 'end';

type MorphContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  triggerId: string;
  contentId: string;
};

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const context = useContext(MorphContext);
  if (!context) {
    throw new Error(`${component} must be used within <MorphPopover>`);
  }
  return context;
}

export type MorphPopoverProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function MorphPopover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: MorphPopoverProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, setOpen]);

  const context = useMemo<MorphContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      triggerId: `${baseId}-trigger`,
      contentId: `${baseId}-content`,
    }),
    [baseId, open, setOpen, toggle],
  );

  return (
    <MorphContext.Provider value={context}>
      <div ref={rootRef} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export type MorphPopoverTriggerProps = {
  children: ReactElement;
};

export function MorphPopoverTrigger({ children }: MorphPopoverTriggerProps) {
  const context = useMorphContext('MorphPopoverTrigger');
  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const childOnClick = child.props.onClick as ((event: unknown) => void) | undefined;

  return cloneElement(child, {
    id: context.triggerId,
    onClick: (event: unknown) => {
      childOnClick?.(event);
      context.toggle();
    },
    'aria-haspopup': 'menu',
    'aria-expanded': context.open,
    'aria-controls': context.open ? context.contentId : undefined,
  });
}

function clipHidden(side: Side, align: Align, radius: number) {
  if (side === 'left') return `inset(0% 0% 0% 92% round ${radius}px)`;
  if (side === 'right') return `inset(0% 92% 0% 0% round ${radius}px)`;
  const top = side === 'bottom' ? '0%' : '92%';
  const bottom = side === 'bottom' ? '92%' : '0%';
  const right = align === 'end' ? '0%' : '92%';
  const left = align === 'end' ? '92%' : '0%';
  return `inset(${top} ${right} ${bottom} ${left} round ${radius}px)`;
}

const clipShown = (radius: number) => `inset(0% 0% 0% 0% round ${radius}px)`;

export type MorphPopoverContentProps = {
  children: ReactNode;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  radius?: number;
  forceMount?: boolean;
  className?: string;
};

export function MorphPopoverContent({
  children,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  radius = 16,
  forceMount = false,
  className,
}: MorphPopoverContentProps) {
  const context = useMorphContext('MorphPopoverContent');
  const reduce = useReducedMotion() ?? false;
  const position = cn(
    side === 'bottom'
      ? 'top-full'
      : side === 'top'
        ? 'bottom-full'
        : side === 'left'
          ? 'right-full'
          : 'left-full',
    side === 'top' || side === 'bottom'
      ? align === 'end'
        ? 'right-0'
        : align === 'center'
          ? 'left-1/2 -translate-x-1/2'
          : 'left-0'
      : align === 'end'
        ? 'bottom-0'
        : align === 'center'
          ? 'top-1/2 -translate-y-1/2'
          : 'top-0',
  );
  const offset =
    side === 'bottom'
      ? { marginTop: sideOffset }
      : side === 'top'
        ? { marginBottom: sideOffset }
        : side === 'left'
          ? { marginRight: sideOffset }
          : { marginLeft: sideOffset };
  const origin =
    side === 'bottom'
      ? `${align === 'end' ? 'top right' : align === 'center' ? 'top center' : 'top left'}`
      : side === 'top'
        ? `${align === 'end' ? 'bottom right' : align === 'center' ? 'bottom center' : 'bottom left'}`
        : side === 'left'
          ? `${align === 'end' ? 'bottom right' : align === 'center' ? 'center right' : 'top right'}`
          : `${align === 'end' ? 'bottom left' : align === 'center' ? 'center left' : 'top left'}`;
  const wrapperVariants = reduce
    ? {}
    : {
        hidden: { opacity: 0, scale: 0.96 },
        show: { opacity: 1, scale: 1, transition: SPRING_PANEL },
        exit: { opacity: 0, scale: 0.96, transition: SPRING_PANEL },
      };
  const clipVariants = reduce
    ? {}
    : {
        hidden: { clipPath: clipHidden(side, align, radius) },
        show: { clipPath: clipShown(radius), transition: SPRING_PANEL },
        exit: {
          clipPath: clipHidden(side, align, radius),
          transition: SPRING_PANEL,
        },
      };

  return (
    <AnimatePresence>
      {context.open || forceMount ? (
        <motion.div
          variants={wrapperVariants}
          initial={forceMount ? false : reduce ? { opacity: 0 } : 'hidden'}
          animate={
            forceMount
              ? false
              : context.open
                ? reduce
                  ? { opacity: 1 }
                  : 'show'
                : { opacity: 0, pointerEvents: 'none' }
          }
          exit={reduce ? { opacity: 0 } : 'exit'}
          {...(reduce ? { transition: { duration: 0.12 } } : {})}
          style={{
            transformOrigin: origin,
            ...(forceMount ? { opacity: context.open ? 1 : 0 } : {}),
            ...offset,
          }}
          className={cn('absolute z-30', position)}
        >
          <motion.div
            id={context.contentId}
            role="menu"
            aria-hidden={!context.open}
            variants={clipVariants}
            style={{ borderRadius: radius, pointerEvents: context.open ? 'auto' : 'none' }}
            className={cn('overflow-hidden border border-border bg-background', className)}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
