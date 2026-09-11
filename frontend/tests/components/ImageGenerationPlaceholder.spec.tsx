import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

import { ImageGenerationPlaceholder } from '@/components/generation/ImageGenerationPlaceholder';

it.each([
  { aspectRatio: '1:1' as const, orientation: 'square', resolution: 'standard' as const },
  { aspectRatio: '16:9' as const, orientation: 'landscape', resolution: '2k' as const },
  { aspectRatio: '9:16' as const, orientation: 'portrait', resolution: '4k' as const },
])(
  'adapts the AICSS placeholder to $orientation output geometry',
  ({ aspectRatio, orientation, resolution }) => {
    const { container } = render(
      <ImageGenerationPlaceholder aspectRatio={aspectRatio} resolution={resolution} />,
    );
    const placeholder = container.querySelector<HTMLElement>('.image-generation');

    expect(placeholder).toHaveAttribute('data-orientation', orientation);
    expect(placeholder).toHaveStyle({ aspectRatio: aspectRatio.replace(':', ' / ') });
    expect(placeholder).toHaveTextContent(aspectRatio);
    expect(placeholder).toHaveTextContent(
      resolution === 'standard' ? '1K' : resolution.toUpperCase(),
    );
    expect(placeholder?.querySelector('.image-generation__dots')).toBeInTheDocument();
    expect(placeholder?.querySelector('.image-generation__glow')).toBeInTheDocument();
    expect(placeholder).toHaveTextContent('正在生成图片');
  },
);

it('fills an existing result frame without overriding its geometry', () => {
  const { container } = render(<ImageGenerationPlaceholder fill />);
  const placeholder = container.querySelector<HTMLElement>('.image-generation');

  expect(placeholder).not.toHaveAttribute('style');
});
