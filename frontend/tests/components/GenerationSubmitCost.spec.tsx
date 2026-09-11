import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GenerationSubmitCost } from '@/components/generation/GenerationSubmitCost';

describe('GenerationSubmitCost', () => {
  it.each([
    ['gpt-image-2.5-flare', 'standard', 1],
    ['gpt-image-2.5-flare', '2k', 3],
    ['gpt-image-2.5-flare', '4k', 3],
    ['gpt-image-2.5-sunburst', 'standard', 1],
    ['gpt-image-2.5-sunburst', '2k', 4],
    ['gpt-image-2.5-sunburst', '4k', 4],
    ['gemini-3.1-flash-image', 'standard', 1],
    ['gemini-3.1-flash-image', '2k', 3],
    ['gemini-3.1-flash-image', '4k', 3],
  ] as const)('shows the configured cost for %s at %s', (model, resolution, expectedCost) => {
    render(<GenerationSubmitCost count={1} model={model} resolution={resolution} />);

    expect(screen.getByText(String(expectedCost))).toBeInTheDocument();
  });

  it('multiplies the per-image cost by the requested count', () => {
    render(<GenerationSubmitCost count={4} model="gpt-image-2.5-sunburst" resolution="4k" />);

    expect(screen.getByText('16')).toBeInTheDocument();
  });
});
