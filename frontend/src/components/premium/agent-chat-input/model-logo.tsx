import { cn } from '@/lib/utils';

const OPENAI_LOGO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/120px-OpenAI_logo_2025_%28symbol%29.svg.png';
const CLAUDE_LOGO_URL = 'https://cdn.simpleicons.org/claude/D97757';

export function ModelLogo({ modelId, className }: { modelId: string; className?: string }) {
  const openAi = modelId.startsWith('gpt');

  return (
    <span
      aria-hidden="true"
      style={{
        backgroundImage: `url("${openAi ? OPENAI_LOGO_URL : CLAUDE_LOGO_URL}")`,
        filter: openAi ? 'invert(1)' : undefined,
      }}
      className={cn('block size-4 shrink-0 bg-center bg-contain bg-no-repeat', className)}
    />
  );
}
