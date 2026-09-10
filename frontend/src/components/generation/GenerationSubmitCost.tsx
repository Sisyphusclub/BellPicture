import { Sparkles } from 'lucide-react';

import { imageGenerationCreditCost, type ImageResolution } from '@/types/image';

interface GenerationSubmitCostProps {
  count: number;
  model: string;
  resolution: ImageResolution;
}

export function GenerationSubmitCost({ count, model, resolution }: GenerationSubmitCostProps) {
  return (
    <span className="generation-submit-cost" aria-hidden="true">
      <Sparkles />
      <span>{count * imageGenerationCreditCost(resolution, model)}</span>
    </span>
  );
}
