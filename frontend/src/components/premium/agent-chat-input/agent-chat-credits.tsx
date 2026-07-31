'use client';

import { useReducedMotion } from 'motion/react';
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AgentChatComposer, type AgentChatComposerHandle, type ComposerValue } from './composer';
import { DEFAULT_MODELS, DEFAULT_SKILLS } from './constants';
import { CreditsAttachmentTray } from './credits-attachment-tray';
import { CreditsImagePreview } from './credits-image-preview';
import { CreditsToolbar } from './credits-toolbar';
import { CreditsTopLayer } from './credits-top-layer';
import { useControllableArray, useControllableString } from './hooks';
import type {
  AgentChatAttachment,
  AgentChatInputOption,
  AgentChatInputStatus,
  AgentChatSkill,
} from './types';
import { useAttachmentPreviewUrls } from './use-attachment-preview-urls';
import { useSkillCommand } from './use-skill-command';

export type AgentChatCreditsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (
    value: string,
    attachments: readonly AgentChatAttachment[],
    skillIds: readonly string[],
    model: string,
  ) => void;
  onStop?: () => void;
  onFilesSelected?: (files: File[]) => void;
  attachments?: readonly AgentChatAttachment[];
  defaultAttachments?: readonly AgentChatAttachment[];
  onAttachmentsChange?: (attachments: AgentChatAttachment[]) => void;
  acceptedFileTypes?: string;
  skills?: readonly AgentChatSkill[];
  models?: readonly AgentChatInputOption[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (model: string) => void;
  skillIds?: readonly string[];
  defaultSkillIds?: readonly string[];
  onSkillIdsChange?: (skillIds: string[]) => void;
  onVoiceClick?: () => void;
  searchEnabled?: boolean;
  defaultSearchEnabled?: boolean;
  onSearchEnabledChange?: (enabled: boolean) => void;
  onUpgradeClick?: () => void;
  onDismissClick?: () => void;
  creditsRemaining?: number;
  status?: AgentChatInputStatus;
  placeholder?: string;
  ariaLabel?: string;
  submitLabel?: string;
  variant?: 'full' | 'prompt';
  disabled?: boolean;
  className?: string;
};

export function AgentChatCredits({
  value,
  defaultValue = '',
  onValueChange,
  onSubmit,
  onStop,
  onFilesSelected,
  attachments,
  defaultAttachments = [],
  onAttachmentsChange,
  acceptedFileTypes,
  skills = DEFAULT_SKILLS,
  models = DEFAULT_MODELS,
  model,
  defaultModel = models[0]?.id ?? 'gpt-5.6',
  onModelChange,
  skillIds,
  defaultSkillIds = [],
  onSkillIdsChange,
  onVoiceClick,
  searchEnabled,
  defaultSearchEnabled = false,
  onSearchEnabledChange,
  onUpgradeClick,
  onDismissClick,
  creditsRemaining = 490,
  status = 'ready',
  placeholder = 'What do you want to do today?',
  ariaLabel = 'Agent prompt',
  submitLabel = 'Send message',
  variant = 'full',
  disabled = false,
  className,
}: AgentChatCreditsProps) {
  const reduce = useReducedMotion();
  const composerRef = useRef<AgentChatComposerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value ?? defaultValue);
  const [internalSearchEnabled, setInternalSearchEnabled] = useState(defaultSearchEnabled);
  const [internalAttachments, setInternalAttachments] = useState<AgentChatAttachment[]>([
    ...defaultAttachments,
  ]);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useControllableArray<string>({
    value: skillIds,
    defaultValue: defaultSkillIds,
    onChange: onSkillIdsChange,
  });
  const [selectedModel, setSelectedModel] = useControllableString({
    value: model,
    defaultValue: defaultModel,
    onChange: onModelChange,
  });

  const currentAttachments = attachments ?? internalAttachments;
  const previewUrls = useAttachmentPreviewUrls(currentAttachments);
  const skillCommand = useSkillCommand({ skills, composerRef });
  const isSearchEnabled = searchEnabled ?? internalSearchEnabled;
  const previewAttachment = previewAttachmentId
    ? currentAttachments.find((item) => item.id === previewAttachmentId)
    : undefined;
  const previewUrl = previewAttachmentId ? previewUrls[previewAttachmentId] : undefined;
  const busy = status === 'submitted' || status === 'streaming';
  const canSubmit = !disabled && !busy && (text.trim().length > 0 || currentAttachments.length > 0);

  useEffect(() => {
    if (
      previewAttachmentId &&
      !currentAttachments.some((item) => item.id === previewAttachmentId)
    ) {
      setPreviewAttachmentId(null);
    }
  }, [currentAttachments, previewAttachmentId]);

  const closePreview = useCallback(() => setPreviewAttachmentId(null), []);

  function handleComposerChange(next: ComposerValue) {
    setText(next.text);
    onValueChange?.(next.text);
    setSelectedSkillIds(next.skillIds);
  }

  function submit() {
    if (!canSubmit) return;
    const composed = composerRef.current?.serialize() ?? {
      text,
      skillIds: [...selectedSkillIds],
    };
    onSubmit?.(composed.text.trim(), currentAttachments, composed.skillIds, selectedModel);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      const next = [
        ...currentAttachments,
        ...files.map((file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          file,
        })),
      ];
      if (attachments === undefined) setInternalAttachments(next);
      onAttachmentsChange?.(next);
      onFilesSelected?.(files);
    }
    event.target.value = '';
  }

  function removeAttachment(id: string) {
    const next = currentAttachments.filter((item) => item.id !== id);
    if (attachments === undefined) setInternalAttachments(next);
    onAttachmentsChange?.(next);
  }

  function setSearch(next: boolean) {
    if (searchEnabled === undefined) setInternalSearchEnabled(next);
    onSearchEnabledChange?.(next);
  }

  return (
    <div
      className={cn(
        'relative w-full max-w-3xl transition-[border-radius] duration-200',
        variant === 'prompt' ? 'border border-border-strong bg-card p-0' : 'bg-muted p-[3px]',
        variant === 'full' && skillCommand.visible
          ? 'rounded-b-[1.25rem] rounded-t-none'
          : 'rounded-[1.25rem]',
        className,
      )}
    >
      {variant === 'full' ? (
        <CreditsTopLayer
          creditsRemaining={creditsRemaining}
          skillsVisible={skillCommand.visible}
          skills={skillCommand.options}
          selectedSkillIds={selectedSkillIds}
          activeIndex={skillCommand.activeIndex}
          reduce={reduce}
          onActiveIndexChange={skillCommand.setActiveIndex}
          onDismiss={onDismissClick}
          onSelect={skillCommand.select}
          onUpgrade={onUpgradeClick}
        />
      ) : null}

      <div
        className={cn(
          'rounded-[1.1rem]',
          variant === 'prompt' ? 'bg-card px-2 py-2' : 'bg-background px-2 pt-1.5 pb-2',
        )}
      >
        <AgentChatComposer
          ref={composerRef}
          skills={skills}
          defaultValue={value ?? defaultValue}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          disabled={disabled}
          minRows={variant === 'prompt' ? 1 : 3}
          maxRows={variant === 'prompt' ? 4 : 6}
          onChange={handleComposerChange}
          onSlashQueryChange={skillCommand.onQueryChange}
          onNavKeyDown={skillCommand.onNavKeyDown}
          onSubmit={submit}
          className={cn(
            variant === 'prompt'
              ? '!min-h-11 !max-h-28 px-3 pt-2 pb-1 text-left !text-base leading-6'
              : 'min-h-20 px-2.5 pt-2.5 pb-2 !text-base leading-6 sm:px-3 sm:pt-3',
          )}
        />
        <CreditsToolbar
          busy={busy}
          canSubmit={canSubmit}
          disabled={disabled}
          reduce={reduce}
          models={models}
          selectedModel={selectedModel}
          searchEnabled={isSearchEnabled}
          onAttach={() => fileInputRef.current?.click()}
          onSearchChange={setSearch}
          onModelChange={setSelectedModel}
          onStop={onStop}
          onSubmit={submit}
          onVoice={onVoiceClick}
          submitLabel={submitLabel}
          variant={variant}
        />
      </div>

      <CreditsAttachmentTray
        attachments={currentAttachments}
        previewUrls={previewUrls}
        reduce={reduce}
        onPreview={setPreviewAttachmentId}
        onRemove={removeAttachment}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept={acceptedFileTypes}
        onChange={handleFiles}
      />

      <CreditsImagePreview
        attachment={previewAttachment}
        src={previewUrl}
        reduce={reduce}
        onClose={closePreview}
      />
    </div>
  );
}
