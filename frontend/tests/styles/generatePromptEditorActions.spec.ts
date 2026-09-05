import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('generate prompt editor action contract', () => {
  it('keeps cancel and modify actions compact and equal in size', () => {
    const actionsStart = baseStyles.indexOf('.session-batch__prompt-edit-actions {');
    const actionsEnd = baseStyles.indexOf('}', actionsStart);
    const actionsRule = baseStyles.slice(actionsStart, actionsEnd);
    const buttonStart = baseStyles.indexOf('.session-batch__prompt-edit-actions .button {');
    const buttonEnd = baseStyles.indexOf('}', buttonStart);
    const buttonRule = baseStyles.slice(buttonStart, buttonEnd);

    expect(actionsRule).toContain('column-gap: 8px;');
    expect(buttonRule).toContain('width: 72px;');
    expect(buttonRule).toContain('min-width: 72px;');
    expect(buttonRule).toContain('flex: 0 0 72px;');
    expect(buttonRule).toContain('justify-content: center;');
  });

  it('preserves the larger touch target on narrow screens', () => {
    const mobileStart = baseStyles.indexOf('@media (max-width: 560px)');
    const actionsStart = baseStyles.indexOf(
      '.session-batch__prompt-edit-actions button',
      mobileStart,
    );
    const actionsEnd = baseStyles.indexOf('}', actionsStart);
    const mobileRule = baseStyles.slice(actionsStart, actionsEnd);

    expect(mobileRule).toContain('min-height: 40px;');
  });
});
