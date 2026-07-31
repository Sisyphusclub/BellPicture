'use client';

import { Globe2 } from 'lucide-react';
import { motion } from 'motion/react';
import { SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';

export function CreditsSearchToggle({
  enabled,
  reduce,
  onChange,
}: {
  enabled: boolean;
  reduce?: boolean | null | undefined;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={enabled ? 'Disable web search' : 'Enable web search'}
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      whileTap={reduce ? {} : { scale: 0.96 }}
      transition={SPRING_PRESS}
      className={cn(
        'relative h-9 shrink-0 overflow-hidden rounded-full text-sm transition-[width,color,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [--search-bg:#dceeff] [--search-fg:#1677d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:[--search-bg:#15324a] dark:[--search-fg:#70baff]',
        enabled
          ? 'w-[92px] bg-(--search-bg) text-(--search-fg)'
          : 'w-9 text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Globe2 className="absolute top-1/2 left-[9px] size-[18px] -translate-y-1/2" />
      <span
        aria-hidden={!enabled}
        className={cn(
          'absolute top-1/2 left-8 -translate-y-1/2 font-medium whitespace-nowrap transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          enabled ? 'translate-x-0 opacity-100 delay-75' : '-translate-x-1 opacity-0 delay-0',
        )}
      >
        Search
      </span>
    </motion.button>
  );
}
