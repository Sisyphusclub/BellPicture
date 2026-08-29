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

  it('aligns the landing gallery to the operational content column', () => {
    const landingContract = baseStyles.slice(
      baseStyles.indexOf('.landing-creations {'),
      baseStyles.indexOf('.landing-creations > div > header'),
    );

    expect(landingContract).toContain('left: calc(var(--workspace-sidebar-rail) / 2);');
    expect(landingContract).toContain(
      'width: min(calc(100% - var(--workspace-sidebar-rail)), var(--workspace-content-max));',
    );
    expect(landingContract).toContain('padding: 0 var(--workspace-page-gutter) 96px;');
    expect(baseStyles).toContain(
      '.workspace-page,\n  .landing-creations {\n    --workspace-page-gutter: 20px;',
    );
    expect(baseStyles).toContain(
      '.workspace-page,\n  .landing-creations {\n    --workspace-page-gutter: 14px;',
    );
  });

  it('shares one title, toolbar, control, and media-density contract', () => {
    const operationalContract = baseStyles.slice(
      baseStyles.lastIndexOf(
        '/* Templates, Assets, and Users share one operational page skeleton.',
      ),
    );

    expect(operationalContract).toContain('--operational-header-safe-top: 92px;');
    expect(operationalContract).toContain('.operational-page-header {');
    expect(operationalContract).toContain('min-height: 58px;');
    expect(operationalContract).toContain('font-size: 22px;');
    expect(operationalContract).toContain('.operational-page-header__meta {');
    expect(operationalContract).toContain('font-size: 12px;');
    expect(operationalContract).toContain('.operational-toolbar {');
    expect(operationalContract).toContain('height: 40px;');
    expect(operationalContract).toContain('margin: 0 0 16px;');
    expect(operationalContract).toContain('.assets-page .asset-workbench__chrome {');
    expect(operationalContract).toContain('padding-top: 0;');
    expect(operationalContract).toContain('.admin-page .admin-panel {');
    expect(operationalContract).toContain('margin-inline: 0;');

    const adminToolbarContract = operationalContract.slice(
      operationalContract.indexOf('.admin-page .admin-table-toolbar {'),
      operationalContract.indexOf('.admin-page .admin-search {'),
    );
    expect(adminToolbarContract).toContain('min-height: 56px;');
    expect(adminToolbarContract).toContain('gap: 8px;');
    expect(operationalContract).toContain('@media (min-width: 1600px) {');
    expect(operationalContract).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));');
    expect(operationalContract).toContain('@media (max-width: 1180px) {');
    expect(operationalContract).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(operationalContract).toContain('@media (max-width: 560px) {');
    expect(operationalContract).toContain('grid-template-columns: 1fr;');

    const mobileContract = operationalContract.slice(
      operationalContract.indexOf('@media (max-width: 560px) {'),
    );
    expect(mobileContract).toContain('justify-content: flex-start;');
    expect(mobileContract).toContain('padding-block: 8px;');
  });
});
