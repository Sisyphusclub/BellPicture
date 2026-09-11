import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'destructive';
}

export function Alert({ children, className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-variant={variant}
      className={cn('alert', variant === 'destructive' && 'alert--destructive', className)}
      {...props}
    >
      {children}
    </div>
  );
}
