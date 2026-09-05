import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('landing hero video position contract', () => {
  it('keeps the video focal point lower in the hero on all viewports', () => {
    const videoStart = baseStyles.indexOf('.landing-hero__video {');
    const videoEnd = baseStyles.indexOf('}', videoStart);
    const videoRule = baseStyles.slice(videoStart, videoEnd);
    const desktopStart = baseStyles.indexOf('@media (min-width: 861px)', videoEnd);
    const desktopRuleStart = baseStyles.indexOf('.landing-hero__video {', desktopStart);
    const desktopRuleEnd = baseStyles.indexOf('}', desktopRuleStart);
    const desktopRule = baseStyles.slice(desktopRuleStart, desktopRuleEnd);

    expect(videoRule).toContain('object-position: 50% 50%;');
    expect(desktopRule).toContain('object-position: 50% 52%;');
  });
});
