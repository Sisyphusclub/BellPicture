import { cn } from '@/lib/utils';

const OPENAI_LOGO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/OpenAI_logo_2025_%28symbol%29.svg/120px-OpenAI_logo_2025_%28symbol%29.svg.png';
const CLAUDE_LOGO_URL = 'https://cdn.simpleicons.org/claude/D97757';
const GEMINI_LOGO_URL = 'https://cdn.simpleicons.org/googlegemini/8E75B2';

export function ModelLogo({ modelId, className }: { modelId: string; className?: string }) {
  const openAi = modelId.startsWith('gpt');
  const logoUrl = modelId.startsWith('gemini')
    ? GEMINI_LOGO_URL
    : openAi
      ? OPENAI_LOGO_URL
      : CLAUDE_LOGO_URL;

  return (
    <span
      aria-hidden="true"
      style={{
        backgroundImage: `url("${logoUrl}")`,
        filter: openAi ? 'invert(1)' : undefined,
      }}
      className={cn('block size-4 shrink-0 bg-center bg-contain bg-no-repeat', className)}
    />
  );
}
