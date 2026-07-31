'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

// Near-critically damped: the box settles fast with a whisper of life and no
// overshoot wobble, which is what reads as "buttery" on a shared-layout morph.
const MORPH_SPRING = {
  type: 'spring',
  stiffness: 360,
  damping: 33,
  mass: 0.9,
} as const;

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export interface MorphicCardProps {
  /** Must match the `id` passed to MorphicCardModal. */
  id: string;
  children: ReactNode;
  className?: string;
  style?: MotionStyle;
  onClick?: () => void;
}

export interface MorphicCardModalProps {
  /** Must match the `id` passed to MorphicCard. */
  id: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Wrap the collapsed card content. Shares a layoutId with MorphicCardModal
 * so framer animates the expansion automatically.
 */
export function MorphicCard({ id, children, className, style, onClick }: MorphicCardProps) {
  'use no memo';
  return (
    <motion.div
      layout
      layoutId={`morphic-card-${id}`}
      style={{ borderRadius: 8, ...style }}
      onClick={onClick}
      className={cn('cursor-pointer', className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * Expanded modal that morphs from the MorphicCard with the matching id.
 * Renders a backdrop + the expanded card. Close on backdrop click or
 * call onClose from within children.
 */
export function MorphicCardModal({
  id,
  open,
  onClose,
  children,
  className,
}: MorphicCardModalProps) {
  'use no memo';
  const reduce = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable?.[0] ?? modalRef.current)?.focus();
    });
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || !modalRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !modalRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKey);
      window.requestAnimationFrame(() => {
        if (returnFocus?.isConnected) returnFocus.focus();
      });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key={`backdrop-${id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              // Drop hit-testing the moment closing starts: AnimatePresence keeps
              // this layer mounted until the slow layoutId morph-back finishes,
              // and an invisible backdrop must not block the page in the meantime.
              pointerEvents: 'none',
              transition: { duration: 0.18, ease: EASE_OUT },
            }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="fixed inset-0 z-[100] bg-black/70"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            key={`modal-${id}`}
            layoutId={`morphic-card-${id}`}
            tabIndex={-1}
            style={{ borderRadius: 8 }}
            className={cn(
              // The morph box is the scroller itself. Avoid an h-fit flex column
              // with flex-1 children: Safari resolves that to 0 height and the
              // modal collapses to a sliver. overflow-x-hidden keeps the rounded
              // corners clipped while y scrolls.
              'pointer-events-auto fixed inset-x-4 inset-y-0 z-[101] m-auto h-fit max-h-[calc(100svh-2rem)] w-full max-w-sm overflow-x-hidden overflow-y-auto overscroll-contain',
              className,
            )}
            transition={reduce ? { duration: 0 } : MORPH_SPRING}
          >
            {/* Content layer: fades/blurs to hide the card→modal content swap.
                No overflow here — Safari misrenders overflow + filter together. */}
            <motion.div
              layout
              initial={reduce ? false : { opacity: 0, filter: 'blur(8px)' }}
              animate={{
                opacity: 1,
                filter: 'blur(0px)',
                transition: reduce
                  ? { duration: 0 }
                  : { delay: 0.12, duration: 0.3, ease: EASE_OUT },
              }}
              exit={
                reduce
                  ? {}
                  : {
                      opacity: 0,
                      filter: 'blur(6px)',
                      transition: { duration: 0.12, ease: EASE_OUT },
                    }
              }
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
