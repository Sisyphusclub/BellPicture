'use client';

import { Check, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from '@/components/motion/popover-morph';
import { SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { ModelLogo } from './model-logo';
import type { AgentChatInputOption } from './types';

export function CreditsModelSelector({
  models,
  selectedModel,
  disabled,
  reduce,
  onModelChange,
}: {
  models: readonly AgentChatInputOption[];
  selectedModel: string;
  disabled: boolean;
  reduce?: boolean | null | undefined;
  onModelChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((model) => model.id === selectedModel) ?? models[0];

  if (!selected) return null;

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <motion.button
          type="button"
          disabled={disabled}
          aria-label={`Select model. Current model: ${selected.label}`}
          whileTap={reduce ? {} : { scale: 0.96 }}
          transition={SPRING_PRESS}
          className="flex h-8 min-w-0 max-w-32 items-center gap-1 rounded-full px-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ModelLogo modelId={selected.id} />
          <span className="truncate">{selected.label}</span>
          <ChevronDown
            className={cn(
              'size-3 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </motion.button>
      </MorphPopoverTrigger>

      <MorphPopoverContent side="top" align="start" sideOffset={4} radius={12} className="w-44 p-1">
        {models.map((model) => {
          const active = model.id === selected.id;
          return (
            <button
              key={model.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                onModelChange(model.id);
                setOpen(false);
              }}
              className={cn(
                'flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                active ? 'bg-muted' : 'hover:bg-muted/70',
              )}
            >
              <ModelLogo modelId={model.id} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {model.label}
              </span>
              <Check
                className={cn(
                  'size-3.5 shrink-0 text-primary transition-opacity',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </button>
          );
        })}
      </MorphPopoverContent>
    </MorphPopover>
  );
}
