'use client';

// beui.dev/components/motion/tabs

import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import { createContext, useContext, useId, useMemo, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  onValueChange?: ((value: string) => void) | undefined;
  layoutId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used inside Tabs.');
  return context;
}

interface TabsProps {
  value: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const reduceMotion = useReducedMotion();
  const layoutId = useId();
  const contextValue = useMemo(
    () => ({ value, onValueChange, layoutId }),
    [layoutId, onValueChange, value],
  );

  return (
    <MotionConfig
      transition={
        reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, mass: 0.55 }
      }
    >
      <TabsContext.Provider value={contextValue}>
        <div className={className}>{children}</div>
      </TabsContext.Provider>
    </MotionConfig>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function TabsList({ children, className, 'aria-label': ariaLabel }: TabsListProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('beui-tabs-list', className)}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabsTrigger({ value, children, disabled = false, className }: TabsTriggerProps) {
  const { value: current, onValueChange, layoutId } = useTabsContext();
  const active = current === value;

  return (
    <div className="beui-tabs-trigger-wrap">
      {active ? <motion.span layoutId={layoutId} className="beui-tabs-indicator" /> : null}
      <button
        type="button"
        role="tab"
        aria-selected={active}
        disabled={disabled}
        onClick={() => onValueChange?.(value)}
        className={cn('beui-tabs-trigger', active && 'is-active', className)}
      >
        {children}
      </button>
    </div>
  );
}
