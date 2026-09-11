import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

function ruleBody(styles: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`));

  expect(match, `missing CSS rule: ${selector}`).not.toBeNull();
  return (match?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

describe('generate workspace centering contract', () => {
  it('balances the collapsed sidebar rail on both sides of the desktop canvas', () => {
    const contractStart = baseStyles.indexOf(
      '/* Keep the generate route aligned with the discovery shell at the final',
    );
    const contractEnd = baseStyles.indexOf('\n:root {', contractStart);
    const contract = baseStyles.slice(contractStart, contractEnd);
    const consoleRule = ruleBody(contract, '.app-shell--generate .generation-console');
    const createBarRule = ruleBody(
      contract,
      '.app-shell--generate .generation-console.has-results .studio-create-bar',
    );

    expect(contractStart).toBeGreaterThanOrEqual(0);
    expect(consoleRule).toContain('padding-right: calc(var(--workspace-sidebar-rail) + 40px);');
    expect(consoleRule).toContain('padding-left: calc(var(--workspace-sidebar-rail) + 40px);');
    expect(createBarRule).toContain('left: 50%;');
    expect(createBarRule).toContain(
      'width: min(1060px, calc(100% - var(--workspace-sidebar-rail) - var(--workspace-sidebar-rail) - 80px));',
    );
  });
});
