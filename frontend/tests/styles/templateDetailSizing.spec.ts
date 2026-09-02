import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

function normalizeCss(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
}

function ruleBody(styles: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`));

  expect(match, `missing CSS rule: ${selector}`).not.toBeNull();
  return normalizeCss(match?.[1] ?? '');
}

describe('template detail sizing contract', () => {
  it('uses a wide, viewport-bounded desktop preview with a readable detail rail', () => {
    const contractStart = baseStyles.indexOf('.template-detail-modal {');
    const contractEnd = baseStyles.indexOf('/* Assets */', contractStart);
    const contract = baseStyles
      .slice(contractStart, contractEnd)
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')');

    expect(contractStart).toBeGreaterThanOrEqual(0);
    const desktopModalRule = ruleBody(contract, '.template-detail-modal');
    const responsiveStart = baseStyles.indexOf('@media (max-width: 1180px)', contractEnd);
    const mobileStart = baseStyles.indexOf('@media (max-width: 860px)', responsiveStart);
    const mobileEnd = baseStyles.indexOf('@media (max-width: 560px)', mobileStart);
    const mobileContract = baseStyles.slice(mobileStart, mobileEnd);
    const mobileModalRule = ruleBody(mobileContract, '.template-detail-modal');
    const documentRule = ruleBody(baseStyles, 'html');

    expect(documentRule).toContain('scrollbar-gutter: stable;');
    expect(documentRule).toContain('scrollbar-width: thin;');
    const normalizedStyles = normalizeCss(baseStyles);
    expect(normalizedStyles).toContain('html::-webkit-scrollbar { width: 10px; height: 10px; }');
    expect(normalizedStyles).toContain('html::-webkit-scrollbar-button { display: none;');
    expect(desktopModalRule).toContain('width: calc(100% - 64px) !important;');
    expect(desktopModalRule).toContain('max-width: 1660px !important;');
    expect(desktopModalRule).toContain('scrollbar-width: none;');
    expect(mobileStart).toBeGreaterThanOrEqual(0);
    expect(mobileModalRule).toContain('width: 100% !important;');
    expect(contract).toContain('@media (min-width: 861px)');
    expect(contract).toContain('height: min(900px, calc(100svh - 144px)) !important;');
    expect(contract).toContain('.template-detail-modal > div { height: 100%; }');
    expect(contract).toContain('.template-detail { height: 100%;');
    expect(contract).toContain('grid-template-columns: minmax(0, 1fr) minmax(420px, 0.48fr);');
    expect(contract).toContain('object-fit: contain;');
    expect(contract).not.toContain('overflow-y: auto;');
    expect(contract).not.toContain('line-clamp:');
    expect(contract).not.toContain('-webkit-line-clamp:');
    expect(contract).not.toContain('text-overflow: ellipsis;');
    expect(contract).toContain('.template-detail-modal::-webkit-scrollbar { display: none; }');
  });
});
