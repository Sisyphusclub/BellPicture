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

type Side = 'top' | 'bottom';
type Align = 'start' | 'end';

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
  className?: string;
};

export function MorphPopoverContent({
  children,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  radius = 16,
  className,
}: MorphPopoverContentProps) {
  const context = useMorphContext('MorphPopoverContent');
  const reduce = useReducedMotion() ?? false;
  const position = cn(
    side === 'bottom' ? 'top-full' : 'bottom-full',
    align === 'end' ? 'right-0' : 'left-0',
  );
  const offset = side === 'bottom' ? { marginTop: sideOffset } : { marginBottom: sideOffset };
  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align === 'end' ? 'right' : 'left'}`;
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
      {context.open ? (
        <motion.div
          variants={wrapperVariants}
          initial={reduce ? { opacity: 0 } : 'hidden'}
          animate={reduce ? { opacity: 1 } : 'show'}
          exit={reduce ? { opacity: 0 } : 'exit'}
          {...(reduce ? { transition: { duration: 0.12 } } : {})}
          style={{ transformOrigin: origin, ...offset }}
          className={cn('absolute z-30', position)}
        >
          <motion.div
            id={context.contentId}
            role="menu"
            variants={clipVariants}
            style={{ borderRadius: radius }}
            className={cn('overflow-hidden border border-border bg-background', className)}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
