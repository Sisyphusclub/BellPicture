import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it } from 'vitest';

import { MorphicTooltip, MorphicTooltipProvider } from '@/components/premium/morphic-tooltip';

function UnmountingTooltip() {
  const [showTrigger, setShowTrigger] = useState(true);

  return (
    <MorphicTooltipProvider delay={0} closeDelay={5000}>
      {showTrigger ? (
        <MorphicTooltip content="编辑提示词提示">
          <button type="button" onClick={() => setShowTrigger(false)}>
            打开编辑器
          </button>
        </MorphicTooltip>
      ) : (
        <span>编辑器已打开</span>
      )}
    </MorphicTooltipProvider>
  );
}

it('closes an active tooltip immediately when its trigger unmounts', async () => {
  const user = userEvent.setup();
  render(<UnmountingTooltip />);

  const trigger = screen.getByRole('button', { name: '打开编辑器' });
  await user.hover(trigger);
  expect(await screen.findByText('编辑提示词提示')).toBeInTheDocument();

  await user.click(trigger);
  expect(screen.getByText('编辑器已打开')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('编辑提示词提示')).not.toBeInTheDocument());
});
