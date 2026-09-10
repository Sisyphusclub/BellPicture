import { ChevronDown, SlidersHorizontal, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { ModelLogo } from '@/components/premium/agent-chat-input/model-logo';
import {
  AnimatedDropdown,
  AnimatedDropdownContent,
  AnimatedDropdownItemIcon,
  AnimatedDropdownItemText,
  AnimatedDropdownLabel,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownTrigger,
} from '@/components/premium/animated-dropdown';
import { Button } from '@/components/ui/button';
import { SelectMenu } from '@/components/ui/select-menu';
import { Switch } from '@/components/ui/switch';
import {
  ASPECT_CHOICES,
  DEFAULT_IMAGE_MODEL,
  IMAGE_MODELS,
  IMAGE_QUALITIES,
  IMAGE_RESOLUTIONS,
  IMAGE_RESOLUTION_LABELS,
  MAX_COUNT,
  MIN_COUNT,
  type AspectChoice,
  type ImageModel,
  type ImageQuality,
  type ImageResolution,
  supportsImageQuality,
} from '@/types/image';
import { DISCOVERY_PUBLISH_LABEL } from '@/utils/imageVisibility';

const MODEL_OPTIONS = IMAGE_MODELS.map((value) => ({ value, label: value }));

function keepCustomPanelOpen(event: Event): void {
  event.preventDefault();
}

interface GenerationComposerControlsProps {
  model: ImageModel;
  aspect: AspectChoice;
  count: number;
  resolution: ImageResolution;
  quality: ImageQuality;
  isPublic: boolean;
  disabled?: boolean;
  customPanelSide?: 'top' | 'bottom';
  trailingContent?: ReactNode;
  onModelChange: (model: ImageModel) => void;
  onAspectChange: (aspect: AspectChoice) => void;
  onCountChange: (count: number) => void;
  onResolutionChange: (resolution: ImageResolution) => void;
  onQualityChange: (quality: ImageQuality) => void;
  onPublicChange: (isPublic: boolean) => void;
}

export function GenerationComposerControls({
  model = DEFAULT_IMAGE_MODEL,
  aspect,
  count,
  resolution,
  quality,
  isPublic,
  disabled = false,
  customPanelSide = 'bottom',
  trailingContent,
  onModelChange,
  onAspectChange,
  onCountChange,
  onResolutionChange,
  onQualityChange,
  onPublicChange,
}: GenerationComposerControlsProps) {
  const visibleAspect = aspect === 'auto' ? '智能' : aspect;
  const qualitySupported = supportsImageQuality(model);
  const parameterSummary = [
    visibleAspect,
    IMAGE_RESOLUTION_LABELS[resolution],
    ...(qualitySupported ? [quality] : []),
    `${count}张`,
  ].join(' · ');

  return (
    <div className="generation-composer-controls" aria-label="生成设置">
      <SelectMenu
        label="选择模型"
        value={model}
        options={MODEL_OPTIONS}
        disabled={disabled}
        leadingIcon={<ModelLogo modelId={model} className="generation-model-select__icon" />}
        className="generation-model-select"
        contentClassName="generation-control-panel generation-model-menu"
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
            <SlidersHorizontal aria-hidden="true" />
            <span>自定义</span>
            <small>{parameterSummary}</small>
            <ChevronDown aria-hidden="true" />
          </Button>
        </AnimatedDropdownTrigger>
        <AnimatedDropdownContent
          align="start"
          side={customPanelSide}
          avoidCollisions={false}
          className="generation-control-panel generation-custom-panel"
          aria-label="自定义生成参数"
        >
          <AnimatedDropdownLabel className="generation-custom-panel__header">
            <span className="generation-custom-panel__title">
              <SlidersHorizontal aria-hidden="true" />
              <strong>生成偏好</strong>
            </span>
            <output>{parameterSummary}</output>
          </AnimatedDropdownLabel>

          <div className="generation-custom-panel__body">
            <ParameterGroup
              label="选择比例"
              value={visibleAspect}
              className="generation-custom-group--aspect"
            >
              <AnimatedDropdownRadioGroup
                value={aspect}
                className="generation-custom-options generation-custom-options--aspect"
                aria-label="画面比例"
                onValueChange={(value) => onAspectChange(value as AspectChoice)}
              >
                {ASPECT_CHOICES.map((value) => (
                  <AnimatedDropdownRadioItem
                    key={value}
                    value={value}
                    aria-label={value === 'auto' ? '智能' : value}
                    className="generation-custom-option generation-custom-option--aspect"
                    onSelect={keepCustomPanelOpen}
                  >
                    <AnimatedDropdownItemIcon
                      className="generation-custom-option__visual group-data-[highlighted]:translate-x-0"
                      data-aspect={value}
                    >
                      {value === 'auto' ? (
                        <Sparkles />
                      ) : (
                        <span className="generation-custom-option__frame" />
                      )}
                    </AnimatedDropdownItemIcon>
                    <AnimatedDropdownItemText className="generation-custom-option__text group-data-[highlighted]:translate-x-0">
                      {value === 'auto' ? '智能' : value}
                    </AnimatedDropdownItemText>
                  </AnimatedDropdownRadioItem>
                ))}
              </AnimatedDropdownRadioGroup>
            </ParameterGroup>

            <div className="generation-custom-panel__compact-groups">
              {qualitySupported ? (
                <ParameterGroup
                  label="质量"
                  value={quality}
                  className="generation-custom-group--quality"
                >
                  <AnimatedDropdownRadioGroup
                    value={quality}
                    className="generation-custom-options generation-custom-options--compact generation-custom-options--quality"
                    aria-label="质量"
                    onValueChange={(value) => onQualityChange(value as ImageQuality)}
                  >
                    {IMAGE_QUALITIES.map((value) => (
                      <AnimatedDropdownRadioItem
                        key={value}
                        value={value}
                        className="generation-custom-option generation-custom-option--compact"
                        onSelect={keepCustomPanelOpen}
                      >
                        <AnimatedDropdownItemText className="generation-custom-option__text group-data-[highlighted]:translate-x-0">
                          {value}
                        </AnimatedDropdownItemText>
                      </AnimatedDropdownRadioItem>
                    ))}
                  </AnimatedDropdownRadioGroup>
                </ParameterGroup>
              ) : null}

              <ParameterGroup label="清晰度" value={IMAGE_RESOLUTION_LABELS[resolution]}>
                <AnimatedDropdownRadioGroup
                  value={resolution}
                  className="generation-custom-options generation-custom-options--compact"
                  aria-label="清晰度"
                  onValueChange={(value) => onResolutionChange(value as ImageResolution)}
                >
                  {IMAGE_RESOLUTIONS.map((value) => (
                    <AnimatedDropdownRadioItem
                      key={value}
                      value={value}
                      aria-label={IMAGE_RESOLUTION_LABELS[value]}
                      className="generation-custom-option generation-custom-option--compact"
                      onSelect={keepCustomPanelOpen}
                    >
                      <AnimatedDropdownItemText className="generation-custom-option__text group-data-[highlighted]:translate-x-0">
                        {IMAGE_RESOLUTION_LABELS[value]}
                      </AnimatedDropdownItemText>
                    </AnimatedDropdownRadioItem>
                  ))}
                </AnimatedDropdownRadioGroup>
              </ParameterGroup>

              <ParameterGroup label="生成张数" value={`${count} 张`}>
                <AnimatedDropdownRadioGroup
                  value={String(count)}
                  className="generation-custom-options generation-custom-options--compact generation-custom-options--count"
                  aria-label="生成张数"
                  onValueChange={(value) => onCountChange(Number(value))}
                >
                  {Array.from(
                    { length: MAX_COUNT - MIN_COUNT + 1 },
                    (_, index) => index + MIN_COUNT,
                  ).map((value) => (
                    <AnimatedDropdownRadioItem
                      key={value}
                      value={String(value)}
                      aria-label={`${value} 张`}
                      className="generation-custom-option generation-custom-option--compact"
                      onSelect={keepCustomPanelOpen}
                    >
                      <AnimatedDropdownItemText className="generation-custom-option__text group-data-[highlighted]:translate-x-0">
                        {value}
                      </AnimatedDropdownItemText>
                    </AnimatedDropdownRadioItem>
                  ))}
                </AnimatedDropdownRadioGroup>
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
