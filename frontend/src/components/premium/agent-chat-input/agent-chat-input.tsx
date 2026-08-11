'use client';

import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  CornerUpLeft,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Square,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from '@/components/motion/popover-morph';
import BorderGlow from '@/components/BorderGlow';
import { SPRING_PRESS, SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

import { AgentChatComposer, type AgentChatComposerHandle, type ComposerValue } from './composer';
import {
  DEFAULT_AGENTS,
  DEFAULT_MODELS,
  DEFAULT_REASONING,
  DEFAULT_SKILLS,
  DEFAULT_SPEED,
} from './constants';
import { CreditsAttachmentTray } from './credits-attachment-tray';
import { CreditsImagePreview } from './credits-image-preview';
import { useControllableArray, useControllableString } from './hooks';
import { ModelLogo } from './model-logo';
import { SkillSelector } from './skills';
import type {
  AgentChatAgent,
  AgentChatAttachment,
  AgentChatInputOption,
  AgentChatInputProps,
  AgentChatQueuedMessage,
} from './types';
import { useAttachmentPreviewUrls } from './use-attachment-preview-urls';
import { useSkillCommand } from './use-skill-command';

interface OptionMenuProps {
  label: string;
  options: readonly AgentChatInputOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}
function OptionMenu({ label, options, selectedId, onSelect }: OptionMenuProps) {
  if (options.length === 0) return null;

  return (
    <section className="agent-chat-input__option-group" aria-label={label}>
      <p>{label}</p>
      <div>
        {options.map((option) => {
          const selected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              aria-label={`${label}：${option.label}`}
              onClick={() => onSelect(option.id)}
              className={cn('agent-chat-input__option', selected && 'is-selected')}
            >
              <span>
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              <Check aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface AgentSelectorProps {
  agents: readonly AgentChatAgent[];
  selectedAgent: string;
  disabled: boolean;
  reduce: boolean;
  menuClassName?: string | undefined;
  onAgentChange: (agent: string) => void;
}

function AgentSelector({
  agents,
  selectedAgent,
  disabled,
  reduce,
  menuClassName,
  onAgentChange,
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = agents.find((agent) => agent.id === selectedAgent) ?? agents[0];

  if (!selected) return null;

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <motion.button
          type="button"
          disabled={disabled}
          aria-label={`选择智能体，当前：${selected.label}`}
          whileTap={reduce ? {} : { scale: 0.96 }}
          transition={SPRING_PRESS}
          className="agent-chat-input__agent-trigger"
        >
          <span className="agent-chat-input__agent-icon" aria-hidden="true">
            {selected.icon ?? <Bot />}
          </span>
          <span>{selected.label}</span>
          <ChevronDown aria-hidden="true" className={cn(open && 'is-open')} />
        </motion.button>
      </MorphPopoverTrigger>
      <MorphPopoverContent
        side="top"
        align="start"
        sideOffset={6}
        radius={12}
        className={cn('agent-chat-input__agent-menu', menuClassName)}
      >
        {agents.map((agent) => {
          const selectedOption = agent.id === selected.id;
          return (
            <button
              key={agent.id}
              type="button"
              role="menuitemradio"
              aria-checked={selectedOption}
              onClick={() => {
                onAgentChange(agent.id);
                setOpen(false);
              }}
              className={cn('agent-chat-input__agent-option', selectedOption && 'is-selected')}
            >
              <span className="agent-chat-input__agent-icon" aria-hidden="true">
                {agent.icon ?? <Bot />}
              </span>
              <span>
                <strong>{agent.label}</strong>
                {agent.description ? <small>{agent.description}</small> : null}
              </span>
              <Check aria-hidden="true" />
            </button>
          );
        })}
      </MorphPopoverContent>
    </MorphPopover>
  );
}

interface ModelSettingsProps {
  models: readonly AgentChatInputOption[];
  reasoningLevels: readonly AgentChatInputOption[];
  speedModes: readonly AgentChatInputOption[];
  model: string;
  reasoning: string;
  speed: string;
  disabled: boolean;
  reduce: boolean;
  menuClassName?: string | undefined;
  onModelChange: (model: string) => void;
  onReasoningChange: (reasoning: string) => void;
  onSpeedChange: (speed: string) => void;
}

function ModelSettings({
  models,
  reasoningLevels,
  speedModes,
  model,
  reasoning,
  speed,
  disabled,
  reduce,
  menuClassName,
  onModelChange,
  onReasoningChange,
  onSpeedChange,
}: ModelSettingsProps) {
  const [open, setOpen] = useState(false);
  const selectedModel = models.find((option) => option.id === model) ?? models[0];
  const selectedReasoning =
    reasoningLevels.find((option) => option.id === reasoning) ?? reasoningLevels[0];

  if (!selectedModel || !selectedReasoning) return null;

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <motion.button
          type="button"
          disabled={disabled}
          aria-label={`选择模型和推理强度，当前：${selectedModel.label}，${selectedReasoning.label}`}
          whileTap={reduce ? {} : { scale: 0.96 }}
          transition={SPRING_PRESS}
          className="agent-chat-input__model-trigger"
        >
          <ModelLogo modelId={selectedModel.id} />
          <span className="agent-chat-input__model-label">{selectedModel.label}</span>
          <span className="agent-chat-input__reasoning-label">{selectedReasoning.label}</span>
          <ChevronDown aria-hidden="true" className={cn(open && 'is-open')} />
        </motion.button>
      </MorphPopoverTrigger>
      <MorphPopoverContent
        side="top"
        align="end"
        sideOffset={6}
        radius={12}
        className={cn('agent-chat-input__settings-menu', menuClassName)}
      >
        <OptionMenu label="模型" options={models} selectedId={model} onSelect={onModelChange} />
        <OptionMenu
          label="推理强度"
          options={reasoningLevels}
          selectedId={reasoning}
          onSelect={onReasoningChange}
        />
        <OptionMenu
          label="生成速度"
          options={speedModes}
          selectedId={speed}
          onSelect={onSpeedChange}
        />
      </MorphPopoverContent>
    </MorphPopover>
  );
}

interface ActionMenuProps {
  allowFileUpload: boolean;
  skills: AgentChatInputProps['skills'];
  selectedSkillIds: readonly string[];
  disabled: boolean;
  reduce: boolean;
  menuClassName?: string | undefined;
  onAttach: () => void;
  onSkillSelect: (id: string) => void;
}

function ActionMenu({
  allowFileUpload,
  skills = [],
  selectedSkillIds,
  disabled,
  reduce,
  menuClassName,
  onAttach,
  onSkillSelect,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);

  if (!allowFileUpload && skills.length === 0) return null;

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <motion.button
          type="button"
          disabled={disabled}
          aria-label="添加参考图或技能"
          whileTap={reduce ? {} : { scale: 0.92 }}
          transition={SPRING_PRESS}
          className="agent-chat-input__icon-button"
        >
          <Plus aria-hidden="true" />
        </motion.button>
      </MorphPopoverTrigger>
      <MorphPopoverContent
        side="top"
        align="start"
        sideOffset={6}
        radius={12}
        className={cn('agent-chat-input__actions-menu', menuClassName)}
      >
        {allowFileUpload ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onAttach();
              setOpen(false);
            }}
          >
            <Paperclip aria-hidden="true" />
            <span>添加参考图</span>
          </button>
        ) : null}
        {skills.map((skill) => (
          <button
            key={skill.id}
            type="button"
            role="menuitemcheckbox"
            aria-checked={selectedSkillIds.includes(skill.id)}
            onClick={() => {
              onSkillSelect(skill.id);
              setOpen(false);
            }}
          >
            <span aria-hidden="true">{skill.icon ?? <WandSparkles />}</span>
            <span>{skill.label}</span>
          </button>
        ))}
      </MorphPopoverContent>
    </MorphPopover>
  );
}

interface QueueProps {
  messages: readonly AgentChatQueuedMessage[];
  onSteer: (message: AgentChatQueuedMessage) => void;
  onEdit: (message: AgentChatQueuedMessage) => void;
  onRemove: (message: AgentChatQueuedMessage) => void;
}

function QueuedMessages({ messages, onSteer, onEdit, onRemove }: QueueProps) {
  return (
    <AnimatePresence initial={false}>
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="agent-chat-input__queued-message"
        >
          <span>
            <CornerUpLeft aria-hidden="true" />
            <strong>{message.text}</strong>
          </span>
          <span>
            <button
              type="button"
              disabled={message.disabled}
              aria-label={message.actionLabel ?? `调整队列消息：${message.text}`}
              onClick={() => onSteer(message)}
            >
              <CornerUpLeft aria-hidden="true" />
              {message.actionLabel ?? '调整'}
            </button>
            <button
              type="button"
              aria-label={`编辑队列消息：${message.text}`}
              onClick={() => onEdit(message)}
            >
              <Pencil aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`移除队列消息：${message.text}`}
              onClick={() => onRemove(message)}
            >
              <Trash2 aria-hidden="true" />
            </button>
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

interface IconButtonProps {
  label: string;
  disabled?: boolean;
  reduce: boolean;
  onClick?: () => void;
  children: ReactNode;
}

function IconButton({ label, disabled = false, reduce, onClick, children }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={reduce ? {} : { scale: 0.92 }}
      transition={SPRING_PRESS}
      className="agent-chat-input__icon-button"
    >
      {children}
    </motion.button>
  );
}

interface StreamingPlaceholderProps {
  active: boolean;
  examples: readonly string[];
  reduce: boolean;
}

function StreamingPlaceholder({ active, examples, reduce }: StreamingPlaceholderProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const signature = examples.join('\u0000');

  useEffect(() => {
    const prompts = signature.split('\u0000').filter(Boolean);
    const target = textRef.current;
    if (!target || !active || prompts.length === 0) {
      if (target) target.textContent = '';
      return;
    }
    if (reduce) {
      target.textContent = prompts[0] ?? '';
      return;
    }

    let promptIndex = 0;
    let characterCount = 0;
    let deleting = false;
    let timeoutId: number | undefined;

    const renderNextFrame = () => {
      const prompt = prompts[promptIndex] ?? '';
      if (deleting) {
        characterCount = Math.max(0, characterCount - 1);
      } else {
        characterCount = Math.min(prompt.length, characterCount + 1);
      }
      target.textContent = prompt.slice(0, characterCount);

      let delay = deleting ? 22 : 46;
      if (!deleting && characterCount === prompt.length) {
        deleting = true;
        delay = 1800;
      } else if (deleting && characterCount === 0) {
        deleting = false;
        promptIndex = (promptIndex + 1) % prompts.length;
        delay = 260;
      }
      timeoutId = window.setTimeout(renderNextFrame, delay);
    };

    timeoutId = window.setTimeout(renderNextFrame, 180);
    return () => window.clearTimeout(timeoutId);
  }, [active, reduce, signature]);

  return (
    <span
      className="agent-chat-input__streaming-placeholder"
      data-active={active ? 'true' : undefined}
      aria-hidden="true"
    >
      <span ref={textRef} className="agent-chat-input__streaming-placeholder-text" />
      <span className="agent-chat-input__streaming-placeholder-caret" />
    </span>
  );
}

export function AgentChatInput({
  value,
  defaultValue = '',
  onValueChange,
  onSubmit,
  onStop,
  status = 'ready',
  placeholder = 'Ask for follow-up changes',
  streamingPlaceholders = [],
  ariaLabel = 'Agent prompt',
  submitLabel = 'Send message',
  disabled = false,
  autoFocus = false,
  minRows = 2,
  maxRows = 7,
  submitOnEnter = true,
  clearOnSubmit = false,
  models = DEFAULT_MODELS,
  model,
  defaultModel = models[0]?.id ?? '',
  onModelChange,
  reasoningLevels = DEFAULT_REASONING,
  reasoning,
  defaultReasoning = reasoningLevels[0]?.id ?? '',
  onReasoningChange,
  speedModes = DEFAULT_SPEED,
  speed,
  defaultSpeed = speedModes[0]?.id ?? '',
  onSpeedChange,
  agents = DEFAULT_AGENTS,
  agent,
  defaultAgent = agents[0]?.id ?? '',
  onAgentChange,
  skills = DEFAULT_SKILLS,
  skillIds,
  defaultSkillIds = [],
  onSkillIdsChange,
  attachments,
  defaultAttachments = [],
  onAttachmentsChange,
  queuedMessages,
  defaultQueuedMessages = [],
  onQueuedMessagesChange,
  onQueuedMessageSteer,
  onQueuedMessageRemove,
  onQueuedMessageEdit,
  onVoiceClick,
  allowFileUpload = true,
  acceptedFileTypes = 'image/*',
  toolbarContent,
  liquidGlass = false,
  className,
  classNames,
}: AgentChatInputProps) {
  const reduce = useReducedMotion() ?? false;
  const composerRef = useRef<AgentChatComposerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [glowActive, setGlowActive] = useState(false);
  const [text, setText] = useControllableString({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [selectedModel, setSelectedModel] = useControllableString({
    value: model,
    defaultValue: defaultModel,
    onChange: onModelChange,
  });
  const [selectedReasoning, setSelectedReasoning] = useControllableString({
    value: reasoning,
    defaultValue: defaultReasoning,
    onChange: onReasoningChange,
  });
  const [selectedSpeed, setSelectedSpeed] = useControllableString({
    value: speed,
    defaultValue: defaultSpeed,
    onChange: onSpeedChange,
  });
  const [selectedAgent, setSelectedAgent] = useControllableString({
    value: agent,
    defaultValue: defaultAgent,
    onChange: onAgentChange,
  });
  const [selectedSkillIds, setSelectedSkillIds] = useControllableArray<string>({
    value: skillIds,
    defaultValue: defaultSkillIds,
    onChange: onSkillIdsChange,
  });
  const [currentAttachments, setCurrentAttachments] = useControllableArray<AgentChatAttachment>({
    value: attachments,
    defaultValue: defaultAttachments,
    onChange: onAttachmentsChange,
  });
  const [currentQueue, setCurrentQueue] = useControllableArray<AgentChatQueuedMessage>({
    value: queuedMessages,
    defaultValue: defaultQueuedMessages,
    onChange: onQueuedMessagesChange,
  });
  const previewUrls = useAttachmentPreviewUrls(currentAttachments);
  const skillCommand = useSkillCommand({ skills, composerRef });
  const busy = status === 'submitted' || status === 'streaming';
  const canSubmit = !disabled && !busy && (text.trim().length > 0 || currentAttachments.length > 0);
  const previewAttachment = previewAttachmentId
    ? currentAttachments.find((attachment) => attachment.id === previewAttachmentId)
    : undefined;
  const previewUrl = previewAttachmentId ? previewUrls[previewAttachmentId] : undefined;

  useEffect(() => {
    if (autoFocus) composerRef.current?.focus();
  }, [autoFocus]);

  function handleComposerChange(next: ComposerValue) {
    setText(next.text);
    setSelectedSkillIds(next.skillIds);
  }

  function handleFocusCapture(event: FocusEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('.agent-chat-input__textarea')) setGlowActive(true);
  }

  function handleBlurCapture(event: FocusEvent<HTMLDivElement>) {
    const editor = event.currentTarget.querySelector('.agent-chat-input__textarea');
    if (!event.relatedTarget || !editor?.contains(event.relatedTarget)) {
      setGlowActive(false);
    }
  }

  function submit() {
    if (!canSubmit) return;
    const composed = composerRef.current?.serialize() ?? {
      text,
      skillIds: [...selectedSkillIds],
    };
    onSubmit?.({
      text: composed.text.trim(),
      model: selectedModel,
      reasoning: selectedReasoning,
      speed: selectedSpeed,
      agent: selectedAgent,
      skillIds: composed.skillIds,
      attachments: [...currentAttachments],
    });
    if (clearOnSubmit) composerRef.current?.clear();
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      setCurrentAttachments([
        ...currentAttachments,
        ...files.map((file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          file,
        })),
      ]);
    }
    event.target.value = '';
  }

  function removeAttachment(id: string) {
    setCurrentAttachments(currentAttachments.filter((attachment) => attachment.id !== id));
    if (previewAttachmentId === id) setPreviewAttachmentId(null);
  }

  function removeQueuedMessage(message: AgentChatQueuedMessage) {
    setCurrentQueue(currentQueue.filter((item) => item.id !== message.id));
    onQueuedMessageRemove?.(message);
  }

  return (
    <BorderGlow
      data-slot="agent-chat-input"
      data-status={status}
      active={glowActive}
      animated={false}
      backgroundColor="var(--muted)"
      borderRadius={20}
      colors={['#ffb51b', '#12c8f4', '#1464ff']}
      coneSpread={22}
      edgeSensitivity={24}
      fillOpacity={0.24}
      glowColor="198 96 70"
      glowIntensity={0.9}
      glowRadius={34}
      liquidGlass={liquidGlass}
      reducedMotion={reduce}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      className={cn(
        'agent-chat-input',
        status === 'error' && 'agent-chat-input--error',
        className,
        classNames?.root,
      )}
    >
      <QueuedMessages
        messages={currentQueue}
        onSteer={(message) => onQueuedMessageSteer?.(message)}
        onEdit={(message) => onQueuedMessageEdit?.(message)}
        onRemove={removeQueuedMessage}
      />

      <div className="agent-chat-input__surface">
        {streamingPlaceholders.length ? (
          <StreamingPlaceholder
            active={text.length === 0}
            examples={streamingPlaceholders}
            reduce={reduce}
          />
        ) : null}
        <AgentChatComposer
          ref={composerRef}
          value={text}
          skills={skills}
          placeholder={streamingPlaceholders.length ? '' : placeholder}
          ariaLabel={ariaLabel}
          disabled={disabled}
          minRows={minRows}
          maxRows={maxRows}
          submitOnEnter={submitOnEnter}
          onChange={handleComposerChange}
          onSlashQueryChange={skillCommand.onQueryChange}
          onNavKeyDown={skillCommand.onNavKeyDown}
          onSubmit={submit}
          className={cn('agent-chat-input__textarea', classNames?.textarea)}
        />

        <CreditsAttachmentTray
          attachments={currentAttachments}
          previewUrls={previewUrls}
          reduce={reduce}
          onPreview={setPreviewAttachmentId}
          onRemove={removeAttachment}
        />

        <div className={cn('agent-chat-input__toolbar', classNames?.toolbar)}>
          <div className="agent-chat-input__toolbar-group">
            <ActionMenu
              allowFileUpload={allowFileUpload}
              skills={skills}
              selectedSkillIds={selectedSkillIds}
              disabled={disabled}
              reduce={reduce}
              menuClassName={classNames?.menu}
              onAttach={() => fileInputRef.current?.click()}
              onSkillSelect={skillCommand.select}
            />
            <AgentSelector
              agents={agents}
              selectedAgent={selectedAgent}
              disabled={disabled}
              reduce={reduce}
              menuClassName={classNames?.menu}
              onAgentChange={setSelectedAgent}
            />
          </div>

          {toolbarContent ? (
            <div className="agent-chat-input__toolbar-content">{toolbarContent}</div>
          ) : null}

          <div className="agent-chat-input__toolbar-group agent-chat-input__toolbar-group--end">
            <ModelSettings
              models={models}
              reasoningLevels={reasoningLevels}
              speedModes={speedModes}
              model={selectedModel}
              reasoning={selectedReasoning}
              speed={selectedSpeed}
              disabled={disabled}
              reduce={reduce}
              menuClassName={classNames?.menu}
              onModelChange={setSelectedModel}
              onReasoningChange={setSelectedReasoning}
              onSpeedChange={setSelectedSpeed}
            />
            {onVoiceClick ? (
              <IconButton
                label="语音输入"
                disabled={disabled}
                reduce={reduce}
                onClick={onVoiceClick}
              >
                <Mic aria-hidden="true" />
              </IconButton>
            ) : null}
            <motion.button
              type="button"
              disabled={disabled || (!busy && !canSubmit)}
              aria-label={busy ? '停止生成' : submitLabel}
              onClick={busy ? onStop : submit}
              whileTap={reduce ? {} : { scale: 0.94 }}
              transition={SPRING_PRESS}
              className="agent-chat-input__submit"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={busy ? 'stop' : 'send'}
                  initial={reduce ? false : { opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? {} : { opacity: 0, scale: 0.72 }}
                  transition={reduce ? { duration: 0 } : SPRING_SWAP}
                >
                  {busy ? <Square aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {skillCommand.visible ? (
        <SkillSelector
          skills={skillCommand.options}
          selectedSkillIds={selectedSkillIds}
          activeIndex={skillCommand.activeIndex}
          reduce={reduce}
          onActiveIndexChange={skillCommand.setActiveIndex}
          onSelect={skillCommand.select}
        />
      ) : null}

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
        onClose={() => setPreviewAttachmentId(null)}
      />
    </BorderGlow>
  );
}
