'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Minus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ForwardedRef,
  forwardRef,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { EASE_OUT_CSS, SPRING_LAYOUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

const MOTION_CLASS = 'beui-animated-dropdown';
const SUB_MOTION_CLASS = 'beui-animated-dropdown-sub';
const DROPDOWN_PANEL_EASE_CSS = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const DROPDOWN_MOTION_STYLES = `
  @keyframes beui-dropdown-panel-enter {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes beui-dropdown-panel-exit {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.96);
    }
  }

  @keyframes beui-dropdown-clip-enter {
    from {
      clip-path: var(--beui-dropdown-hidden-clip);
    }
    to {
      clip-path: inset(0% 0% 0% 0% round 12px);
    }
  }

  @keyframes beui-dropdown-clip-exit {
    from {
      clip-path: inset(0% 0% 0% 0% round 12px);
    }
    to {
      clip-path: var(--beui-dropdown-hidden-clip);
    }
  }

  .${MOTION_CLASS},
  .${SUB_MOTION_CLASS} {
    --beui-dropdown-hidden-clip: inset(0% 92% 92% 0% round 12px);
    -ms-overflow-style: none;
    scrollbar-width: none;
    transform-origin: var(--radix-dropdown-menu-content-transform-origin);
    will-change: clip-path, opacity, transform;
  }

  .${SUB_MOTION_CLASS} {
    translate: var(--beui-dropdown-sub-shift-x, 0px) 0;
  }

  .${MOTION_CLASS}[data-align="end"],
  .${SUB_MOTION_CLASS}[data-align="end"] {
    --beui-dropdown-hidden-clip: inset(0% 0% 92% 92% round 12px);
  }

  .${MOTION_CLASS}[data-align="center"],
  .${SUB_MOTION_CLASS}[data-align="center"] {
    --beui-dropdown-hidden-clip: inset(0% 46% 92% 46% round 12px);
  }

  .${MOTION_CLASS}[data-side="top"],
  .${SUB_MOTION_CLASS}[data-side="top"] {
    --beui-dropdown-hidden-clip: inset(92% 92% 0% 0% round 12px);
  }

  .${MOTION_CLASS}[data-side="top"][data-align="end"],
  .${SUB_MOTION_CLASS}[data-side="top"][data-align="end"] {
    --beui-dropdown-hidden-clip: inset(92% 0% 0% 92% round 12px);
  }

  .${MOTION_CLASS}[data-side="top"][data-align="center"],
  .${SUB_MOTION_CLASS}[data-side="top"][data-align="center"] {
    --beui-dropdown-hidden-clip: inset(92% 46% 0% 46% round 12px);
  }

  .${MOTION_CLASS}[data-side="right"],
  .${SUB_MOTION_CLASS}[data-side="right"] {
    --beui-dropdown-hidden-clip: inset(0% 92% 92% 0% round 12px);
  }

  .${MOTION_CLASS}[data-side="right"][data-align="end"],
  .${SUB_MOTION_CLASS}[data-side="right"][data-align="end"] {
    --beui-dropdown-hidden-clip: inset(92% 92% 0% 0% round 12px);
  }

  .${MOTION_CLASS}[data-side="right"][data-align="center"],
  .${SUB_MOTION_CLASS}[data-side="right"][data-align="center"] {
    --beui-dropdown-hidden-clip: inset(46% 92% 46% 0% round 12px);
  }

  .${MOTION_CLASS}[data-side="left"],
  .${SUB_MOTION_CLASS}[data-side="left"] {
    --beui-dropdown-hidden-clip: inset(0% 0% 92% 92% round 12px);
  }

  .${MOTION_CLASS}[data-side="left"][data-align="end"],
  .${SUB_MOTION_CLASS}[data-side="left"][data-align="end"] {
    --beui-dropdown-hidden-clip: inset(92% 0% 0% 92% round 12px);
  }

  .${MOTION_CLASS}[data-side="left"][data-align="center"],
  .${SUB_MOTION_CLASS}[data-side="left"][data-align="center"] {
    --beui-dropdown-hidden-clip: inset(46% 0% 46% 92% round 12px);
  }

  .${MOTION_CLASS}[data-state="open"],
  .${SUB_MOTION_CLASS}[data-state="open"] {
    animation:
      beui-dropdown-panel-enter 360ms ${DROPDOWN_PANEL_EASE_CSS} both,
      beui-dropdown-clip-enter 320ms ${EASE_OUT_CSS} both;
  }

  .${MOTION_CLASS}[data-state="closed"],
  .${SUB_MOTION_CLASS}[data-state="closed"] {
    pointer-events: none;
    animation:
      beui-dropdown-panel-exit 260ms ${DROPDOWN_PANEL_EASE_CSS} both,
      beui-dropdown-clip-exit 260ms ${EASE_OUT_CSS} both;
  }

  .${MOTION_CLASS}::-webkit-scrollbar,
  .${SUB_MOTION_CLASS}::-webkit-scrollbar {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .${MOTION_CLASS}[data-state],
    .${SUB_MOTION_CLASS}[data-state] {
      animation-duration: 1ms;
      clip-path: none;
      transform: none;
    }
  }
`;

const itemClassName =
  'group relative z-10 flex min-h-10 cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none data-[highlighted]:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-45';

interface DropdownHighlight {
  destructive: boolean;
  height: number;
  instant: boolean;
  key: string;
  width: number;
  x: number;
  y: number;
}

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function useDropdownHighlight<T extends HTMLElement>(forwardedRef: ForwardedRef<T>) {
  const reduceMotion = useReducedMotion();
  const surfaceRef = useRef<T | null>(null);
  const activeKeyRef = useRef<string | null>(null);
  const [highlight, setHighlight] = useState<DropdownHighlight | null>(null);

  const setSurfaceRef = useCallback(
    (node: T | null) => {
      surfaceRef.current = node;
      setForwardedRef(forwardedRef, node);

      if (!node) {
        return;
      }

      const items = Array.from(node.querySelectorAll<HTMLElement>('[data-beui-dropdown-item]'));

      items.forEach((item, index) => {
        item.dataset.beuiDropdownIndex = String(index);
      });
    },
    [forwardedRef],
  );

  const updateHighlight = useCallback((target: EventTarget | null) => {
    const surface = surfaceRef.current;
    const item =
      target instanceof Element ? target.closest<HTMLElement>('[data-beui-dropdown-item]') : null;

    if (!surface || !item || !surface.contains(item)) {
      return;
    }

    const key = item.dataset.beuiDropdownIndex ?? '';

    if (activeKeyRef.current === key) {
      return;
    }

    activeKeyRef.current = key;

    const surfaceRect = surface.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    setHighlight((current) => {
      return {
        destructive: item.dataset.destructive === 'true',
        height: itemRect.height,
        instant: current === null,
        key,
        width: itemRect.width,
        x: itemRect.left - surfaceRect.left + surface.scrollLeft,
        y: itemRect.top - surfaceRect.top + surface.scrollTop,
      };
    });
  }, []);

  return {
    highlight,
    onFocusCapture: (event: ReactFocusEvent<T>) => updateHighlight(event.target),
    onPointerMove: (event: ReactPointerEvent<T>) => updateHighlight(event.target),
    reduceMotion,
    setSurfaceRef,
  };
}

function AnimatedDropdownHighlight({
  highlight,
  reduceMotion,
}: {
  highlight: DropdownHighlight | null;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.span
      aria-hidden
      data-beui-dropdown-highlight=""
      data-destructive={highlight?.destructive || undefined}
      initial={false}
      animate={{
        height: highlight?.height ?? 0,
        opacity: highlight ? 1 : 0,
        width: highlight?.width ?? 0,
        x: highlight?.x ?? 0,
        y: highlight?.y ?? 0,
      }}
      transition={reduceMotion || highlight?.instant ? { duration: 0 } : SPRING_LAYOUT}
      className="pointer-events-none absolute top-0 left-0 z-0 rounded-lg bg-muted data-[destructive=true]:bg-destructive/10"
    />
  );
}

export const AnimatedDropdown = DropdownMenuPrimitive.Root;
export const AnimatedDropdownTrigger = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(function AnimatedDropdownTrigger({ className, onBlur, onKeyDown, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      className={cn(
        'outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-[beui-pointer-focus]:focus-visible:shadow-none data-[beui-pointer-focus]:focus-visible:ring-0 data-[beui-pointer-focus]:focus-visible:ring-offset-0',
        className,
      )}
      onBlur={(event) => {
        event.currentTarget.removeAttribute('data-beui-pointer-focus');
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        event.currentTarget.removeAttribute('data-beui-pointer-focus');
        onKeyDown?.(event);
      }}
      {...props}
    />
  );
});
export const AnimatedDropdownPortal = DropdownMenuPrimitive.Portal;
export const AnimatedDropdownGroup = DropdownMenuPrimitive.Group;
export const AnimatedDropdownRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const AnimatedDropdownSub = DropdownMenuPrimitive.Sub;

export interface AnimatedDropdownContentProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
> {
  portalContainer?: HTMLElement | null;
  showArrow?: boolean;
}

export const AnimatedDropdownContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  AnimatedDropdownContentProps
>(function AnimatedDropdownContent(
  {
    align = 'start',
    sideOffset = 8,
    collisionPadding = 12,
    loop = true,
    portalContainer,
    showArrow = false,
    className,
    children,
    onFocusCapture,
    onPointerDownCapture,
    onPointerMove,
    ...props
  },
  forwardedRef,
) {
  const {
    highlight,
    onFocusCapture: updateHighlightFromFocus,
    onPointerMove: updateHighlightFromPointer,
    reduceMotion,
    setSurfaceRef,
  } = useDropdownHighlight(forwardedRef);

  return (
    <DropdownMenuPrimitive.Portal container={portalContainer}>
      <DropdownMenuPrimitive.Content
        ref={setSurfaceRef}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        loop={loop}
        onFocusCapture={(event) => {
          updateHighlightFromFocus(event);
          onFocusCapture?.(event);
        }}
        onPointerDownCapture={(event) => {
          const content = event.currentTarget;
          const trigger = Array.from(
            document.querySelectorAll<HTMLElement>('[aria-controls]'),
          ).find((element) => element.getAttribute('aria-controls') === content.id);

          trigger?.setAttribute('data-beui-pointer-focus', '');
          onPointerDownCapture?.(event);
        }}
        onPointerMove={(event) => {
          updateHighlightFromPointer(event);
          onPointerMove?.(event);
        }}
        className={cn(
          MOTION_CLASS,
          'relative isolate z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-56 overflow-y-auto rounded-xl border border-border bg-background p-1.5 text-foreground outline-none',
          className,
        )}
        {...props}
      >
        <style>{DROPDOWN_MOTION_STYLES}</style>
        <AnimatedDropdownHighlight highlight={highlight} reduceMotion={reduceMotion} />
        {children}
        {showArrow ? (
          <DropdownMenuPrimitive.Arrow className="fill-background stroke-border" />
        ) : null}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});

export interface AnimatedDropdownItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  inset?: boolean;
  destructive?: boolean;
}

export const AnimatedDropdownItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  AnimatedDropdownItemProps
>(function AnimatedDropdownItem({ inset, destructive, className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-beui-dropdown-item=""
      data-destructive={destructive || undefined}
      className={cn(
        itemClassName,
        inset && 'pl-9',
        destructive && 'text-destructive data-[highlighted]:text-destructive',
        className,
      )}
      {...props}
    />
  );
});

export const AnimatedDropdownCheckboxItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(function AnimatedDropdownCheckboxItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      data-beui-dropdown-item=""
      className={cn(itemClassName, 'pl-9', className)}
      {...props}
    >
      <span aria-hidden className="absolute left-2.5 grid size-5 place-items-center">
        <Check className="absolute size-3.5 scale-50 opacity-0 transition-[opacity,transform] duration-150 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100" />
        <Minus className="absolute size-3.5 scale-50 opacity-0 transition-[opacity,transform] duration-150 group-data-[state=indeterminate]:scale-100 group-data-[state=indeterminate]:opacity-100" />
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

export const AnimatedDropdownRadioItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(function AnimatedDropdownRadioItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      data-beui-dropdown-item=""
      className={cn(itemClassName, 'pl-9', className)}
      {...props}
    >
      <span aria-hidden className="absolute left-2.5 grid size-5 place-items-center">
        <span className="size-2 scale-50 rounded-full bg-current opacity-0 transition-[opacity,transform] duration-150 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100" />
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});

export interface AnimatedDropdownLabelProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> {
  inset?: boolean;
}

export const AnimatedDropdownLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  AnimatedDropdownLabelProps
>(function AnimatedDropdownLabel({ inset, className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn(
        'px-2.5 py-2 font-medium text-muted-foreground text-xs',
        inset && 'pl-9',
        className,
      )}
      {...props}
    />
  );
});

export const AnimatedDropdownSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function AnimatedDropdownSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1.5 my-1 h-px bg-border', className)}
      {...props}
    />
  );
});

export interface AnimatedDropdownSubTriggerProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export const AnimatedDropdownSubTrigger = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.SubTrigger>,
  AnimatedDropdownSubTriggerProps
>(function AnimatedDropdownSubTrigger({ inset, className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      data-beui-dropdown-item=""
      className={cn(itemClassName, inset && 'pl-9', className)}
      {...props}
    >
      {children}
      <ChevronRight
        aria-hidden
        className="ml-auto size-4 text-muted-foreground transition-transform duration-150 group-data-[state=open]:translate-x-0.5"
      />
    </DropdownMenuPrimitive.SubTrigger>
  );
});

export interface AnimatedDropdownSubContentProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
> {
  portalContainer?: HTMLElement | null;
}

function useSubmenuCollisionShift(
  surface: HTMLDivElement | null,
  collisionPadding: AnimatedDropdownSubContentProps['collisionPadding'],
) {
  useLayoutEffect(() => {
    if (!surface) {
      return;
    }

    const wrapper = surface.closest<HTMLElement>('[data-radix-popper-content-wrapper]');

    if (!wrapper) {
      return;
    }

    const horizontalPadding =
      typeof collisionPadding === 'number'
        ? {
            left: collisionPadding,
            right: collisionPadding,
          }
        : {
            left: collisionPadding?.left ?? 0,
            right: collisionPadding?.right ?? 0,
          };

    const updateShift = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const rect = wrapper.getBoundingClientRect();
      const leftBoundary = horizontalPadding.left;
      const rightBoundary = viewportWidth - horizontalPadding.right;
      let shift = 0;

      if (rect.right > rightBoundary) {
        shift = rightBoundary - rect.right;
      } else if (rect.left < leftBoundary) {
        shift = leftBoundary - rect.left;
      }

      surface.style.setProperty('--beui-dropdown-sub-shift-x', `${shift}px`);
    };

    const firstFrame = requestAnimationFrame(() => {
      updateShift();
      requestAnimationFrame(updateShift);
    });
    const resizeObserver = new ResizeObserver(updateShift);
    const mutationObserver = new MutationObserver(updateShift);

    resizeObserver.observe(wrapper);
    mutationObserver.observe(wrapper, {
      attributeFilter: ['style'],
      attributes: true,
    });
    window.addEventListener('resize', updateShift);

    return () => {
      cancelAnimationFrame(firstFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateShift);
      surface.style.removeProperty('--beui-dropdown-sub-shift-x');
    };
  }, [collisionPadding, surface]);
}

export const AnimatedDropdownSubContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  AnimatedDropdownSubContentProps
>(function AnimatedDropdownSubContent(
  {
    sideOffset = 4,
    collisionPadding = 12,
    portalContainer,
    className,
    children,
    onFocusCapture,
    onPointerMove,
    ...props
  },
  forwardedRef,
) {
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const {
    highlight,
    onFocusCapture: updateHighlightFromFocus,
    onPointerMove: updateHighlightFromPointer,
    reduceMotion,
    setSurfaceRef,
  } = useDropdownHighlight(forwardedRef);
  const setSubmenuSurfaceRef = useCallback(
    (node: HTMLDivElement | null) => {
      setSurfaceRef(node);
      setSurface(node);
    },
    [setSurfaceRef],
  );

  useSubmenuCollisionShift(surface, collisionPadding);

  return (
    <DropdownMenuPrimitive.Portal container={portalContainer}>
      <DropdownMenuPrimitive.SubContent
        ref={setSubmenuSurfaceRef}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        onFocusCapture={(event) => {
          updateHighlightFromFocus(event);
          onFocusCapture?.(event);
        }}
        onPointerMove={(event) => {
          updateHighlightFromPointer(event);
          onPointerMove?.(event);
        }}
        className={cn(
          SUB_MOTION_CLASS,
          'relative isolate z-50 max-h-[var(--radix-popper-available-height)] min-w-48 overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-background p-1.5 text-foreground outline-none',
          className,
        )}
        {...props}
      >
        <style>{DROPDOWN_MOTION_STYLES}</style>
        <AnimatedDropdownHighlight highlight={highlight} reduceMotion={reduceMotion} />
        {children}
      </DropdownMenuPrimitive.SubContent>
    </DropdownMenuPrimitive.Portal>
  );
});

export const AnimatedDropdownItemIcon = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<'span'>
>(function AnimatedDropdownItemIcon({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'grid size-5 shrink-0 place-items-center text-muted-foreground transition-transform duration-200 group-data-[highlighted]:translate-x-0.5 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
});

export const AnimatedDropdownItemText = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<'span'>
>(function AnimatedDropdownItemText({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      className={cn(
        'min-w-0 flex-1 truncate transition-transform duration-200 group-data-[highlighted]:translate-x-0.5',
        className,
      )}
      {...props}
    />
  );
});

export const AnimatedDropdownItemDescription = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<'span'>
>(function AnimatedDropdownItemDescription({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      className={cn('block truncate text-muted-foreground text-xs', className)}
      {...props}
    />
  );
});

export const AnimatedDropdownShortcut = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<'span'>
>(function AnimatedDropdownShortcut({ className, ...props }, ref) {
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'ml-auto shrink-0 font-mono text-[10px] text-muted-foreground tracking-wide transition-[color,transform] duration-200 group-data-[highlighted]:translate-x-0.5 group-data-[highlighted]:text-foreground',
        className,
      )}
      {...props}
    />
  );
});
