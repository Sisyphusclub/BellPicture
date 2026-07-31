import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { MorphicCardModal } from '@/components/premium/morphic-card-modal';

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open preview
      </button>
      <MorphicCardModal id="focus-test" open={open} onClose={() => setOpen(false)}>
        <section role="dialog" aria-label="Preview">
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </section>
      </MorphicCardModal>
    </>
  );
}

describe('MorphicCardModal', () => {
  it('moves focus inside, traps Tab, and restores the trigger after Escape', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByRole('button', { name: 'Open preview' });
    await user.click(trigger);

    const first = screen.getByRole('button', { name: 'First action' });
    const last = screen.getByRole('button', { name: 'Last action' });
    await waitFor(() => expect(first).toHaveFocus());

    last.focus();
    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
