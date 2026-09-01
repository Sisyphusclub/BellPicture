import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const borderGlowStyles = readFileSync(
  resolve(process.cwd(), 'src/components/BorderGlow.css'),
  'utf8',
);

function ruleFor(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [
    ...borderGlowStyles.matchAll(new RegExp(`${escapedSelector} \\{([\\s\\S]*?)\\n\\}`, 'g')),
  ];
  const match = matches.at(-1);

  expect(match, `missing CSS rule: ${selector}`).toBeDefined();
  return match?.[1] ?? '';
}

describe('React Bits BorderGlow CSS contract', () => {
  it('uses the official directional border and edge-fill layers', () => {
    const borderLayer = ruleFor('.border-glow-card::before');
    const fillLayer = ruleFor('.border-glow-card::after');

    expect(borderLayer).toContain('border: 1px solid transparent;');
    expect(borderLayer).toContain('linear-gradient(var(--card-bg, #120f17) 0 100%) padding-box');
    expect(borderLayer).toContain('mask-image: conic-gradient(');
    expect(fillLayer).toContain('border: 1px solid transparent;');
    expect(fillLayer).toContain('mask-composite: subtract, add, add, add, add, add;');
    expect(borderGlowStyles).not.toContain('--border-width');
    expect(borderGlowStyles).not.toContain('mask-composite: exclude');
  });

  it('reveals every glow layer only from hover or the optional sweep', () => {
    expect(borderGlowStyles).toContain('.border-glow-card:not(:hover):not(.sweep-active)::before,');
    expect(borderGlowStyles).not.toContain('data-glow-active');
    expect(borderGlowStyles).not.toContain('data-liquid-glass');
  });

  it('keeps the official inner and outer glow shadows and disables transitions for reduced motion', () => {
    const glowSource = ruleFor('.border-glow-card > .edge-light::before');

    expect(borderGlowStyles).toContain(
      '.border-glow-card > .edge-light {\n  inset: calc(var(--glow-padding) * -1);',
    );
    expect(borderGlowStyles).toContain('mix-blend-mode: plus-lighter;');
    expect(glowSource).toContain('inset 0 0 0 1px var(--glow-color, hsl(40deg 80% 80% / 100%))');
    expect(borderGlowStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
