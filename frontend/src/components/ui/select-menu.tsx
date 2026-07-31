import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownLabel,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from '@/components/premium/animated-dropdown';
import { cn } from '@/lib/utils';

export interface SelectMenuOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SelectMenuProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectMenuOption<T>[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  className?: string;
}

export function SelectMenu<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled = false,
  leadingIcon,
  className,
}: SelectMenuProps<T>) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger asChild>
        <button
          type="button"
          className={cn('beui-select-trigger', className)}
          aria-label={label}
          disabled={disabled}
        >
          <span className="beui-select-trigger__value">
            {leadingIcon ? (
              <span className="beui-select-trigger__icon" aria-hidden="true">
                {leadingIcon}
              </span>
            ) : null}
            <span>{selected?.label ?? value}</span>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      </AnimatedDropdownTrigger>
      <AnimatedDropdownContent
        align="start"
        className="!min-w-[var(--radix-dropdown-menu-trigger-width)] !rounded-[4px] !border-border !bg-background !p-1 !shadow-none"
      >
        <AnimatedDropdownLabel>{label}</AnimatedDropdownLabel>
        <AnimatedDropdownRadioGroup
          value={value}
          onValueChange={(next) => {
            if (options.some((option) => option.value === next)) onValueChange(next as T);
          }}
        >
          {options.map((option) => (
            <AnimatedDropdownRadioItem
              key={option.value}
              value={option.value}
              className="!min-h-9 !rounded-[3px] !py-1.5"
            >
              <span className="beui-select-option">
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              {option.value === value ? <Check className="beui-select-check" /> : null}
            </AnimatedDropdownRadioItem>
          ))}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}
