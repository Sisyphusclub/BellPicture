import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgentChatInput } from '@/components/premium/agent-chat-input/agent-chat-input';
import type { AgentChatAttachment } from '@/components/premium/agent-chat-input/types';

function renderInput(onAttachmentsChange: (attachments: AgentChatAttachment[]) => void) {
  return render(
    <AgentChatInput
      ariaLabel="图像提示词"
      models={[]}
      reasoningLevels={[]}
      speedModes={[]}
      agents={[]}
      skills={[]}
      acceptedFileTypes="image/png,image/jpeg,image/webp"
      onAttachmentsChange={onAttachmentsChange}
    />,
  );
}

describe('AgentChatInput reference image drop', () => {
  it('marks the composer while dragging and forwards dropped images', () => {
    const onAttachmentsChange = vi.fn();
    const { container } = renderInput(onAttachmentsChange);
    const root = container.querySelector('[data-slot="agent-chat-input"]');
    const surface = container.querySelector('.agent-chat-input__surface');
    const file = new File(['image'], 'reference.png', { type: 'image/png' });
    const dataTransfer = { files: [file], types: ['Files'], dropEffect: 'none' };

    expect(root).not.toHaveClass('agent-chat-input--dragging');
    fireEvent.dragEnter(surface!, { dataTransfer });
    expect(root).toHaveClass('agent-chat-input--dragging');
    expect(surface).toHaveAttribute('data-dragging', 'true');

    fireEvent.dragOver(surface!, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe('copy');

    fireEvent.drop(surface!, { dataTransfer });

    expect(root).not.toHaveClass('agent-chat-input--dragging');
    expect(onAttachmentsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'reference.png',
        type: 'image/png',
        file,
      }),
    ]);
  });

  it('ignores dropped files outside the accepted image types', () => {
    const onAttachmentsChange = vi.fn();
    const { container } = renderInput(onAttachmentsChange);
    const surface = container.querySelector('.agent-chat-input__surface');
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });
    const dataTransfer = { files: [file], types: ['Files'], dropEffect: 'none' };

    fireEvent.drop(surface!, { dataTransfer });

    expect(onAttachmentsChange).not.toHaveBeenCalled();
  });
});
