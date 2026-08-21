import type { ReactElement } from 'react';

import { MorphicTooltip } from '@/components/premium/morphic-tooltip';

interface IconTooltipProps {
  label: string;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  showOnFocus?: boolean;
}

export function IconTooltip({ label, children, side = 'top', showOnFocus = true }: IconTooltipProps) {
  return (
    <MorphicTooltip
      content={label}
      side={side}
      offset={8}
      showOnFocus={showOnFocus}
      contentClassName="!px-2 !py-1.5"
    >
      {children}
    </MorphicTooltip>
  );
}
