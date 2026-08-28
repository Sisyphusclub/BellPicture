import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

describe('operational workspace layout contract', () => {
  it('shares one capped width and responsive gutter scale across workspace pages', () => {
    expect(tokens).toContain('--workspace-content-max: 1580px;');
    expect(tokens).toContain('--workspace-page-gutter: 32px;');

    const sharedContract = baseStyles.slice(
      baseStyles.indexOf('/* Operational routes share one content column'),
      baseStyles.indexOf('/* Keep the template library'),
    );

    expect(sharedContract).toContain('width: min(100%, var(--workspace-content-max));');
    expect(sharedContract).toContain('padding-right: var(--workspace-page-gutter);');
    expect(sharedContract).toContain('padding-left: var(--workspace-page-gutter);');
    expect(baseStyles).toContain('--workspace-page-gutter: 20px;');
    expect(baseStyles).toContain('--workspace-page-gutter: 14px;');
  });
});
