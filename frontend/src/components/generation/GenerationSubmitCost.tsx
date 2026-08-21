import { Sparkles } from 'lucide-react';

import { IMAGE_GENERATION_CREDIT_COST } from '@/types/image';

interface GenerationSubmitCostProps {
  count: number;
}

export function GenerationSubmitCost({ count }: GenerationSubmitCostProps) {
  return (
    <span className="generation-submit-cost" aria-hidden="true">
      <Sparkles />
      <span>{count * IMAGE_GENERATION_CREDIT_COST}</span>
    </span>
  );
}
