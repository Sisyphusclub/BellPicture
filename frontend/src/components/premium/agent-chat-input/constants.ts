import type { AgentChatAgent, AgentChatInputOption, AgentChatSkill } from './types';

export const DEFAULT_MODELS: AgentChatInputOption[] = [
  {
    id: 'gpt-5.6',
    label: 'GPT 5.6',
  },
  {
    id: 'fable-5',
    label: 'Fable 5',
  },
  {
    id: 'opus-4.8',
    label: 'Opus 4.8',
  },
  {
    id: 'sonnet-5',
    label: 'Sonnet 5',
  },
  {
    id: 'gpt-5.5',
    label: 'GPT 5.5',
  },
];

export const DEFAULT_REASONING: AgentChatInputOption[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'extra-high', label: 'Extra High' },
];

export const DEFAULT_SPEED: AgentChatInputOption[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'fast', label: 'Fast' },
  { id: 'balanced', label: 'Balanced' },
];

export const DEFAULT_AGENTS: AgentChatAgent[] = [
  {
    id: 'research-agent',
    label: 'Research agent',
  },
  {
    id: 'marketing-agent',
    label: 'Marketing agent',
  },
  {
    id: 'coding-agent',
    label: 'Coding agent',
  },
];

export const DEFAULT_SKILLS: AgentChatSkill[] = [
  {
    id: 'ads-explorer',
    label: 'Ads Explorer',
    description: 'Explore 25 image-ad directions',
  },
  {
    id: 'build-data-pipeline',
    label: 'Build Data Pipeline',
    description: 'Create production data ingestion flows',
  },
  {
    id: 'agents-sdk',
    label: 'Agents SDK',
    description: 'Build stateful agents on Cloudflare Workers',
  },
  {
    id: 'ai-sdk',
    label: 'AI SDK',
    description: 'Build AI-powered features with streaming UI',
  },
  {
    id: 'app-store-screenshots',
    label: 'App Store Screenshots',
    description: 'Generate app store screenshot pages',
  },
  {
    id: 'apply-grant',
    label: 'Apply Grant',
    description: 'Prepare an engineering grant application',
  },
  {
    id: 'browser',
    label: 'Browser',
    description: 'Open and control browser workflows',
  },
];
