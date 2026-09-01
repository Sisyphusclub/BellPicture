import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const borderGlowStyles = readFileSync(
  resolve(process.cwd(), 'src/components/BorderGlow.css'),
  'utf8',
);

function ruleFor(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = borderGlowStyles.match(new RegExp(`${escapedSelector} \\{([\\s\\S]*?)\\n\\}`));

  expect(match, `missing CSS rule: ${selector}`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('BorderGlow structural ring contract', () => {
  it('uses one 2px geometry token for both structural glow layers', () => {
    expect(ruleFor('.border-glow-card')).toContain('--border-width: 2px;');

    for (const selector of ['.border-glow-card::before', '.border-glow-card::after']) {
      const rule = ruleFor(selector);

      expect(rule).toContain('inset: calc(var(--border-width) * -1);');
      expect(rule).toContain('border: var(--border-width) solid transparent;');
      expect(rule).toContain('border-radius: calc(var(--border-radius) + var(--border-width));');
    }
  });
});
