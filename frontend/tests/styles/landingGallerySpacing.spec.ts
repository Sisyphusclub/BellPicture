import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
const landingView = readFileSync(resolve(process.cwd(), 'src/views/LandingView.tsx'), 'utf8');

function lastRuleBody(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...baseStyles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, 'g'))];
  const match = matches.at(-1);

  expect(match, `missing CSS rule: ${selector}`).toBeDefined();
  return match?.[1] ?? '';
}

describe('landing gallery spacing contract', () => {
  it('keeps the gallery unlabeled while preserving its separation from the composer', () => {
    expect(landingView).toContain('title=""');
    expect(landingView).not.toContain('title="画廊"');
    expect(baseStyles).toContain('margin: calc(-100svh + clamp(590px, 36svh, 620px)) auto 0;');
  });

  it('uses the same compact gutter between columns and stacked figures', () => {
    const columnsRule = lastRuleBody('.landing-creations .image-gallery-vertical__columns');
    const figuresRule = lastRuleBody(
      '.landing-creations .image-gallery-vertical__columns > figure',
    );

    expect(columnsRule).toContain('gap: 6px;');
    expect(figuresRule).toContain('margin-bottom: 6px;');
    expect(baseStyles).not.toContain(
      '.landing-creations .image-gallery-vertical__columns > div > div',
    );
  });
});
