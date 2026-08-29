import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('assets media layout contract', () => {
  it('preserves source media ratios and fixed icon-button geometry', () => {
    const assetsContract = baseStyles.slice(
      baseStyles.indexOf('.assets-page .image-tile__morph,'),
      baseStyles.indexOf('.assets-page .asset-list {'),
    );

    expect(assetsContract).toContain('aspect-ratio: inherit;');
    expect(assetsContract).toContain('object-fit: contain;');
    expect(assetsContract).toContain('.assets-page .image-tile__preview:hover img {');
    expect(assetsContract).toContain('transform: none;');
    expect(assetsContract).toContain('.assets-page .image-tile__favorite-trigger {');
    expect(assetsContract).toContain('min-height: 32px;');
    expect(assetsContract).toContain('.assets-page .image-tile:hover .image-tile__select,');
    expect(assetsContract).toContain('.assets-page .image-tile.is-selected .image-tile__select {');
    expect(assetsContract).toContain('opacity: 0;');
    expect(assetsContract).toContain('pointer-events: none;');
    expect(assetsContract).toContain('opacity: 1;');
    expect(assetsContract).toContain('pointer-events: auto;');
    expect(assetsContract).toContain('width: 32px;');
    expect(assetsContract).toContain('height: 32px;');
    expect(assetsContract).toContain('flex: 0 0 32px;');

    const actionsStart = assetsContract.indexOf('.assets-page .image-tile__actions {');
    const actionsEnd = assetsContract.indexOf('}', actionsStart) + 1;
    const actionsRule = assetsContract.slice(actionsStart, actionsEnd);
    expect(actionsRule).toContain('right: 10px;');
    expect(actionsRule).not.toContain('left: 50%;');
    expect(actionsRule).toContain('width: max-content;');
    expect(actionsRule).toContain('gap: 6px;');
    expect(actionsRule).not.toContain('background:');
    expect(actionsRule).not.toContain('border:');
    expect(actionsRule).not.toContain('backdrop-filter:');

    const actionButtonStart = assetsContract.indexOf('.assets-page .image-tile__actions button {');
    const actionButtonEnd = assetsContract.indexOf('}', actionButtonStart) + 1;
    const actionButtonRule = assetsContract.slice(actionButtonStart, actionButtonEnd);
    expect(actionButtonRule).toContain(
      'background: color-mix(in oklch, var(--card) 78%, transparent);',
    );
    expect(actionButtonRule).not.toContain('opacity:');
    expect(baseStyles).toContain('@media (min-width: 1600px) {');
    expect(baseStyles).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));');
  });
});
