import type { ReactNode } from 'react';

export type AgentChatInputStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export type AgentChatInputOption = {
  id: string;
  label: string;
  description?: string;
};

export type AgentChatSkill = AgentChatInputOption & {
  icon?: ReactNode;
};

export type AgentChatAgent = AgentChatInputOption & {
  icon?: ReactNode;
};

export type AgentChatAttachment = {
  id: string;
  name: string;
  type?: string;
  size?: number;
  file?: File;
  url?: string;
};

export type AgentChatQueuedMessage = {
  id: string;
  text: string;
  actionLabel?: string;
  disabled?: boolean;
};

export type AgentChatSubmitPayload = {
  text: string;
  model: string;
  reasoning: string;
  speed: string;
  agent: string;
  skillIds: string[];
  attachments: AgentChatAttachment[];
};

export type AgentChatInputClassNames = {
  root?: string;
  textarea?: string;
  toolbar?: string;
  menu?: string;
};

export interface AgentChatInputProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (payload: AgentChatSubmitPayload) => void;
  onStop?: () => void;
  status?: AgentChatInputStatus;
  placeholder?: string;
  streamingPlaceholders?: readonly string[];
  ariaLabel?: string;
  submitLabel?: string;
  submitContent?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  submitOnEnter?: boolean;
  clearOnSubmit?: boolean;
  models?: readonly AgentChatInputOption[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (model: string) => void;
  reasoningLevels?: readonly AgentChatInputOption[];
  reasoning?: string;
  defaultReasoning?: string;
  onReasoningChange?: (reasoning: string) => void;
  speedModes?: readonly AgentChatInputOption[];
  speed?: string;
  defaultSpeed?: string;
  onSpeedChange?: (speed: string) => void;
  agents?: readonly AgentChatAgent[];
  agent?: string;
  defaultAgent?: string;
  onAgentChange?: (agent: string) => void;
  skills?: readonly AgentChatSkill[];
  skillIds?: readonly string[];
  defaultSkillIds?: readonly string[];
  onSkillIdsChange?: (skillIds: string[]) => void;
  attachments?: readonly AgentChatAttachment[];
  defaultAttachments?: readonly AgentChatAttachment[];
  onAttachmentsChange?: (attachments: AgentChatAttachment[]) => void;
  queuedMessages?: readonly AgentChatQueuedMessage[];
  defaultQueuedMessages?: readonly AgentChatQueuedMessage[];
  onQueuedMessagesChange?: (messages: AgentChatQueuedMessage[]) => void;
  onQueuedMessageSteer?: (message: AgentChatQueuedMessage) => void;
  onQueuedMessageRemove?: (message: AgentChatQueuedMessage) => void;
  onQueuedMessageEdit?: (message: AgentChatQueuedMessage) => void;
  onVoiceClick?: () => void;
  allowFileUpload?: boolean;
  acceptedFileTypes?: string;
  toolbarContent?: ReactNode;
  liquidGlass?: boolean;
  className?: string;
  classNames?: AgentChatInputClassNames;
}
