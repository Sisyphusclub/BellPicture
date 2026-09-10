import { Check, ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { ModelLogo } from '@/components/premium/agent-chat-input/model-logo';
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownTrigger,
} from '@/components/premium/animated-dropdown';
import { Button } from '@/components/ui/button';
import { SelectMenu } from '@/components/ui/select-menu';
import { Switch } from '@/components/ui/switch';
import {
  ASPECT_CHOICES,
  DEFAULT_IMAGE_MODEL,
  FOUR_K_ASPECT_RATIOS,
  IMAGE_MODELS,
  IMAGE_RESOLUTIONS,
  IMAGE_RESOLUTION_LABELS,
  MAX_COUNT,
  MIN_COUNT,
  type AspectChoice,
  type ImageModel,
  type ImageResolution,
} from '@/types/image';
import { DISCOVERY_PUBLISH_LABEL } from '@/utils/imageVisibility';

const MODEL_OPTIONS = IMAGE_MODELS.map((value) => ({ value, label: value }));

interface GenerationComposerControlsProps {
  model: ImageModel;
  aspect: AspectChoice;
  count: number;
  resolution: ImageResolution;
  isPublic: boolean;
  disabled?: boolean;
  trailingContent?: ReactNode;
  onModelChange: (model: ImageModel) => void;
  onAspectChange: (aspect: AspectChoice) => void;
  onCountChange: (count: number) => void;
  onResolutionChange: (resolution: ImageResolution) => void;
  onPublicChange: (isPublic: boolean) => void;
}

export function GenerationComposerControls({
  model = DEFAULT_IMAGE_MODEL,
  aspect,
  count,
  resolution,
  isPublic,
  disabled = false,
  trailingContent,
  onModelChange,
  onAspectChange,
  onCountChange,
  onResolutionChange,
  onPublicChange,
}: GenerationComposerControlsProps) {
  const visibleAspect = aspect === 'auto' ? '智能' : aspect;
  const parameterSummary = `${visibleAspect} · ${IMAGE_RESOLUTION_LABELS[resolution]} · ${count}张`;

  return (
    <div className="generation-composer-controls" aria-label="生成设置">
      <SelectMenu
        label="选择模型"
        value={model}
        options={MODEL_OPTIONS}
        disabled={disabled}
        leadingIcon={<ModelLogo modelId={model} className="generation-model-select__icon" />}
        className="generation-model-select"
        onValueChange={onModelChange}
      />

      <AnimatedDropdown modal={false}>
        <AnimatedDropdownTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="generation-custom-trigger"
            aria-label="自定义生成参数"
            disabled={disabled}
          >
            <span className="generation-custom-trigger__icon" aria-hidden="true">
              <SlidersHorizontal />
            </span>
            <span className="generation-custom-trigger__copy">
              <span>自定义设置</span>
              <small>{parameterSummary}</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </AnimatedDropdownTrigger>
        <AnimatedDropdownContent
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          className="generation-custom-panel"
          aria-label="自定义生成参数"
        >
          <header className="generation-custom-panel__header">
            <span className="generation-custom-panel__icon" aria-hidden="true">
              <SlidersHorizontal />
            </span>
            <div>
              <strong>自定义设置</strong>
              <span>{parameterSummary}</span>
            </div>
          </header>

          <div className="generation-custom-panel__body">
            <ParameterGroup
              label="画面比例"
              value={visibleAspect}
              className="generation-custom-group--aspect"
            >
              <div
                className="generation-segmented generation-segmented--aspect"
                role="radiogroup"
                aria-label="画面比例"
              >
                {ASPECT_CHOICES.map((value) => {
                  const optionDisabled =
                    resolution === '4k' &&
                    !(FOUR_K_ASPECT_RATIOS as readonly string[]).includes(value);
                  const selected = value === aspect;
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      size="compact"
                      role="radio"
                      aria-checked={selected}
                      disabled={optionDisabled}
                      className="generation-aspect-option"
                      onClick={() => onAspectChange(value)}
                    >
                      <span
                        className="generation-aspect-option__visual"
                        data-aspect={value}
                        aria-hidden="true"
                      >
                        {value === 'auto' ? (
                          <Sparkles />
                        ) : (
                          <span className="generation-aspect-option__frame" />
                        )}
                      </span>
                      <span>{value === 'auto' ? '智能' : value}</span>
                      {selected ? (
                        <span className="generation-aspect-option__check" aria-hidden="true">
                          <Check />
                        </span>
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            </ParameterGroup>

            <div className="generation-custom-panel__compact-groups">
              <ParameterGroup label="清晰度" value={IMAGE_RESOLUTION_LABELS[resolution]}>
                <div className="generation-segmented" role="radiogroup" aria-label="清晰度">
                  {IMAGE_RESOLUTIONS.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      size="compact"
                      role="radio"
                      aria-checked={value === resolution}
                      onClick={() => onResolutionChange(value)}
                    >
                      {IMAGE_RESOLUTION_LABELS[value]}
                    </Button>
                  ))}
                </div>
              </ParameterGroup>

              <ParameterGroup label="生成张数" value={`${count} 张`}>
                <div className="generation-segmented" role="radiogroup" aria-label="生成张数">
                  {Array.from(
                    { length: MAX_COUNT - MIN_COUNT + 1 },
                    (_, index) => index + MIN_COUNT,
                  ).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      size="compact"
                      role="radio"
                      aria-checked={value === count}
                      onClick={() => onCountChange(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </ParameterGroup>
            </div>
          </div>
        </AnimatedDropdownContent>
      </AnimatedDropdown>

      <output className="sr-only" aria-label={`${count} 张`}>
        {count}
      </output>

      <label className="generation-public-toggle" data-mode={isPublic ? 'public' : 'private'}>
        <Switch
          aria-label={DISCOVERY_PUBLISH_LABEL}
          checked={isPublic}
          disabled={disabled}
          onCheckedChange={onPublicChange}
        />
        <span className="generation-public-toggle__track" aria-hidden="true" />
        <span>{DISCOVERY_PUBLISH_LABEL}</span>
      </label>

      {trailingContent ? <div className="generation-controls-tail">{trailingContent}</div> : null}
    </div>
  );
}

function ParameterGroup({
  label,
  value,
  className,
  children,
}: {
  label: string;
  value: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`generation-custom-group${className ? ` ${className}` : ''}`}>
      <header className="generation-custom-group__header">
        <span className="generation-custom-group__label">{label}</span>
        <output>{value}</output>
      </header>
      {children}
    </section>
  );
}
