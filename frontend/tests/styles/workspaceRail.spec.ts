import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

describe('operational workspace rail contract', () => {
  it('centers library pages after the collapsed floating sidebar rail', () => {
    expect(tokens).toContain('--workspace-sidebar-rail: 126px;');

    const railContract = baseStyles.slice(
      baseStyles.lastIndexOf('/* The operational sidebar is the collapsed floating rail'),
    );

    expect(railContract).toContain('.app-main:not(.app-main--landing):not(.app-main--generate)');
    expect(railContract).toContain('padding-left: var(--workspace-sidebar-rail);');
    expect(railContract).toContain('padding-left: 0;');
  });
});
