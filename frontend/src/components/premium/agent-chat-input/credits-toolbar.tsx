'use client';

import { ArrowUp, Mic, Paperclip, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { CreditsModelSelector } from './credits-model-selector';
import { CreditsSearchToggle } from './credits-search-toggle';
import type { AgentChatInputOption } from './types';

export function CreditsToolbar({
  busy,
  canSubmit,
  disabled,
  reduce,
  models,
  selectedModel,
  searchEnabled,
  onAttach,
  onSearchChange,
  onModelChange,
  onStop,
  onSubmit,
  onVoice,
  submitLabel,
  variant,
}: {
  busy: boolean;
  canSubmit: boolean;
  disabled: boolean;
  reduce?: boolean | null | undefined;
  models: readonly AgentChatInputOption[];
  selectedModel: string;
  searchEnabled: boolean;
  onAttach: () => void;
  onSearchChange: (enabled: boolean) => void;
  onModelChange: (model: string) => void;
  onStop?: (() => void) | undefined;
  onSubmit: () => void;
  onVoice?: (() => void) | undefined;
  submitLabel: string;
  variant: 'full' | 'prompt';
}) {
  const selectedModelLabel =
    models.find((option) => option.id === selectedModel)?.label ?? 'Nebulens Image';

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      {variant === 'full' ? (
        <div className="flex min-w-0 items-center gap-0.5 text-muted-foreground">
          <ActionButton label="Attach files" onClick={onAttach}>
            <Paperclip className="size-[18px]" />
          </ActionButton>
          <ActionButton label="Voice input" onClick={onVoice}>
            <Mic className="size-[18px]" />
          </ActionButton>
          <CreditsSearchToggle enabled={searchEnabled} reduce={reduce} onChange={onSearchChange} />
          <CreditsModelSelector
            models={models}
            selectedModel={selectedModel}
            disabled={disabled}
            reduce={reduce}
            onModelChange={onModelChange}
          />
        </div>
      ) : (
        <span className="inline-flex min-h-8 items-center rounded-full bg-muted px-3 text-muted-foreground text-xs font-medium">
          {selectedModelLabel}
        </span>
      )}

      <motion.button
        type="button"
        disabled={disabled || (!busy && !canSubmit)}
        aria-label={busy ? 'Stop response' : submitLabel}
        onClick={busy ? onStop : onSubmit}
        whileTap={reduce ? {} : { scale: 0.94 }}
        transition={SPRING_PRESS}
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed',
          variant === 'prompt' ? 'size-9' : 'size-10',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={busy ? 'stop' : 'send'}
            initial={reduce ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? {} : { opacity: 0, scale: 0.7 }}
            transition={reduce ? { duration: 0 } : SPRING_SWAP}
          >
            {busy ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <ArrowUp className="size-5" strokeWidth={2.4} />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_PRESS}
      className="grid size-9 place-items-center rounded-full transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </motion.button>
  );
}
