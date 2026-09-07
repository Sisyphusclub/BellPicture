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

describe('image detail sizing contract', () => {
  it('keeps the media frame aligned to the record ratio on desktop and mobile', () => {
    const desktopStart = baseStyles.indexOf(
      '@media (min-width: 861px) {',
      baseStyles.indexOf('.image-detail'),
    );
    const desktopEnd = baseStyles.indexOf('.toast-region {', desktopStart);
    const desktopContract = normalizeCss(baseStyles.slice(desktopStart, desktopEnd));
    const mobileStart = baseStyles.indexOf('@media (max-width: 860px) {', desktopEnd);
    const mobileEnd = baseStyles.indexOf('@media (max-width: 560px) {', mobileStart);
    const mobileContract = normalizeCss(baseStyles.slice(mobileStart, mobileEnd));
    const narrowStart = baseStyles.indexOf('@media (max-width: 560px) {', mobileEnd);
    const narrowContract = normalizeCss(baseStyles.slice(narrowStart));

    expect(desktopStart).toBeGreaterThanOrEqual(0);
    expect(desktopContract).toContain('--image-detail-media-width: min(');
    expect(desktopContract).toContain('calc(100vw - 48px - var(--image-detail-body-width))');
    expect(desktopContract).toContain(
      'calc(min(900px, 100svh - 144px) * var(--image-detail-image-ratio))',
    );
    expect(desktopContract).toContain(
      'height: calc(var(--image-detail-media-width) / var(--image-detail-image-ratio));',
    );
    const mediaRule = ruleBody(baseStyles, '.image-detail__media');
    const imageRule = ruleBody(baseStyles, '.image-detail__media img');

    expect(mediaRule).toContain('aspect-ratio: var(--image-detail-image-ratio);');
    expect(mediaRule).toContain('background: transparent;');
    expect(mediaRule).toContain('overflow: hidden;');
    expect(imageRule).toContain('width: 100%;');
    expect(imageRule).toContain('height: 100%;');
    expect(imageRule).toContain('border-radius: 0;');
    expect(imageRule).toContain('box-shadow: none;');
    expect(imageRule).toContain('object-fit: contain;');
    expect(mobileContract).toContain('grid-template-rows: auto auto;');
    expect(mobileContract).toContain('aspect-ratio: var(--image-detail-image-ratio);');
    expect(mobileContract).not.toContain('min-height: 42vh;');
    expect(mobileContract).not.toContain('grid-template-rows: 42svh 1fr;');
    expect(narrowContract).toContain('.image-detail {');
    expect(narrowContract).toContain('grid-template-rows: auto auto;');
    expect(narrowContract).toContain('padding: 0;');
    expect(narrowContract).not.toContain('grid-template-rows: 42svh 1fr;');
  });
});
