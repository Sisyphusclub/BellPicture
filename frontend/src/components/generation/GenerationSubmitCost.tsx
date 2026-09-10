import { Sparkles } from 'lucide-react';

import { imageGenerationCreditCost, type ImageResolution } from '@/types/image';

interface GenerationSubmitCostProps {
  count: number;
  resolution: ImageResolution;
}

export function GenerationSubmitCost({ count, resolution }: GenerationSubmitCostProps) {
  return (
    <span className="generation-submit-cost" aria-hidden="true">
      <Sparkles />
      <span>{count * imageGenerationCreditCost(resolution)}</span>
    </span>
  );
}
