import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'role' | 'type'
> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, onCheckedChange, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      data-slot="switch"
      type="checkbox"
      role="switch"
      className={cn('switch-control', className)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  );
});
