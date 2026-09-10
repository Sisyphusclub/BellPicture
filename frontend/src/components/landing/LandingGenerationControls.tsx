import { Gauge } from 'lucide-react';

import { GenerationComposerControls } from '@/components/generation/GenerationComposerControls';
import { Button } from '@/components/ui/button';
import type { AspectChoice, ImageModel, ImageQuality, ImageResolution } from '@/types/image';

interface LandingGenerationControlsProps {
  model: ImageModel;
  aspect: AspectChoice;
  count: number;
  resolution: ImageResolution;
  quality: ImageQuality;
  isPublic: boolean;
  disabled?: boolean;
  quotaLabel: string;
  quotaAriaLabel: string;
  quotaIsAction: boolean;
  onModelChange: (model: ImageModel) => void;
  onAspectChange: (aspect: AspectChoice) => void;
  onCountChange: (count: number) => void;
  onResolutionChange: (resolution: ImageResolution) => void;
  onQualityChange: (quality: ImageQuality) => void;
  onPublicChange: (isPublic: boolean) => void;
  onQuotaClick: () => void;
}

export function LandingGenerationControls({
  model,
  aspect,
  count,
  resolution,
  quality,
  isPublic,
  disabled,
  quotaLabel,
  quotaAriaLabel,
  quotaIsAction,
  onModelChange,
  onAspectChange,
  onCountChange,
  onResolutionChange,
  onQualityChange,
  onPublicChange,
  onQuotaClick,
}: LandingGenerationControlsProps) {
  const quotaContent = (
    <>
      <Gauge aria-hidden="true" />
      <span>{quotaLabel}</span>
    </>
  );

  return (
    <GenerationComposerControls
      model={model}
      aspect={aspect}
      count={count}
      resolution={resolution}
      quality={quality}
      isPublic={isPublic}
      disabled={disabled ?? false}
      onModelChange={onModelChange}
      onAspectChange={onAspectChange}
      onCountChange={onCountChange}
      onResolutionChange={onResolutionChange}
      onQualityChange={onQualityChange}
      onPublicChange={onPublicChange}
      trailingContent={
        quotaIsAction ? (
          <Button
            type="button"
            variant="ghost"
            className="landing-quota"
            aria-label={quotaAriaLabel}
            onClick={onQuotaClick}
          >
            {quotaContent}
          </Button>
        ) : (
          <span className="landing-quota" role="status" aria-label={quotaAriaLabel}>
            {quotaContent}
          </span>
        )
      }
    />
  );
}
