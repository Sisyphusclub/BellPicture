import { Gauge, Minus, Plus, Ratio } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SelectMenu } from '@/components/ui/select-menu';
import { Switch } from '@/components/ui/switch';
import type { AspectChoice } from '@/types/image';
import { ASPECT_CHOICES, ASPECT_CHOICE_LABELS, MAX_COUNT, MIN_COUNT } from '@/types/image';

const ASPECT_OPTIONS = ASPECT_CHOICES.map((value) => ({
  value,
  label: value === 'auto' ? '智能' : value,
  description: ASPECT_CHOICE_LABELS[value],
}));

interface LandingGenerationControlsProps {
  aspect: AspectChoice;
  count: number;
  isPublic: boolean;
  quotaLabel: string;
  quotaAriaLabel: string;
  quotaIsAction: boolean;
  onAspectChange: (aspect: AspectChoice) => void;
  onCountChange: (count: number) => void;
  onPublicChange: (isPublic: boolean) => void;
  onQuotaClick: () => void;
}

export function LandingGenerationControls({
  aspect,
  count,
  isPublic,
  quotaLabel,
  quotaAriaLabel,
  quotaIsAction,
  onAspectChange,
  onCountChange,
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
    <div className="landing-generation-controls" aria-label="生成设置">
      <SelectMenu
        label="选择首页画面尺寸"
        value={aspect}
        options={ASPECT_OPTIONS}
        leadingIcon={<Ratio />}
        className="landing-aspect-select"
        onValueChange={onAspectChange}
      />

      <div className="landing-count-stepper" role="group" aria-label="生成张数">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="减少生成张数"
          disabled={count <= MIN_COUNT}
          onClick={() => onCountChange(Math.max(MIN_COUNT, count - 1))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <output aria-label={`生成 ${count} 张`}>{count} 张</output>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="增加生成张数"
          disabled={count >= MAX_COUNT}
          onClick={() => onCountChange(Math.min(MAX_COUNT, count + 1))}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>

      <label className="landing-public-toggle">
        <Switch aria-label="公开作品" checked={isPublic} onCheckedChange={onPublicChange} />
        <span className="landing-public-toggle__track" aria-hidden="true" />
        <span>{isPublic ? '公开' : '私有'}</span>
      </label>

      {quotaIsAction ? (
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
      )}
    </div>
  );
}
