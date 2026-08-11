import { cn } from '@/lib/utils';
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_IMAGE_RESOLUTION,
  IMAGE_RESOLUTION_LABELS,
  type AspectRatio,
  type ImageResolution,
} from '@/types/image';

import './ImageGenerationPlaceholder.css';

type ImageGenerationOrientation = 'landscape' | 'portrait' | 'square';

interface ImageGenerationPlaceholderProps {
  aspectRatio?: AspectRatio;
  className?: string;
  fill?: boolean;
  resolution?: ImageResolution;
}

function getOrientation(aspectRatio: AspectRatio): ImageGenerationOrientation {
  if (aspectRatio === '1:1') return 'square';
  return aspectRatio === '3:2' || aspectRatio === '16:9' ? 'landscape' : 'portrait';
}

function toCssAspectRatio(aspectRatio: AspectRatio): string {
  return aspectRatio.replace(':', ' / ');
}

export function ImageGenerationPlaceholder({
  aspectRatio = DEFAULT_ASPECT_RATIO,
  className,
  fill = false,
  resolution = DEFAULT_IMAGE_RESOLUTION,
}: ImageGenerationPlaceholderProps) {
  return (
    <div
      className={cn('generation-skeleton__card', 'image-generation', className)}
      data-orientation={getOrientation(aspectRatio)}
      style={fill ? undefined : { aspectRatio: toCssAspectRatio(aspectRatio) }}
      aria-hidden="true"
    >
      <span className="image-generation__dots" aria-hidden="true" />
      <span className="image-generation__glow" aria-hidden="true" />
      <span className="image-generation__resolution">
        {aspectRatio} · {IMAGE_RESOLUTION_LABELS[resolution]}
      </span>
      <span className="image-generation__status">
        <span className="image-generation__label">正在生成图片</span>
      </span>
    </div>
  );
}
