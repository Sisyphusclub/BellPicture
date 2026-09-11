import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModelLogo } from '@/components/premium/agent-chat-input/model-logo';

describe('ModelLogo', () => {
  it('uses the local Gemini artwork for Gemini image models', () => {
    const { container } = render(<ModelLogo modelId="gemini-3.1-flash-image" />);

    expect(container.firstElementChild).toHaveStyle({
      backgroundImage: 'url("/brand/gemini.svg")',
    });
  });
});
