import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

function normalizeCss(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
}

function ruleBodies(styles: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...styles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, 'g'))].map(
    (match) => match[1] ?? '',
  );
}

function declaration(rule: string, property: string) {
  const match = rule.match(new RegExp(`${property}:\\s*([^;]+);`));

  expect(match, `missing CSS declaration: ${property}`).not.toBeNull();
  return normalizeCss(match?.[1] ?? '');
}

function declarationsForSelector(styles: string, selector: string, property: string) {
  return ruleBodies(styles, selector)
    .filter((rule) => new RegExp(`${property}:`).test(rule))
    .map((rule) => declaration(rule, property));
}

describe('generate canvas dot contract', () => {
  it('matches the operational canvas dot color, radius, position, and responsive size', () => {
    const operationalSelector = '.app-main:not(.app-main--landing):not(.app-main--generate)';
    const generateSelector = '.app-shell--generate .generation-console';
    const expectedDots =
      'radial-gradient(circle, color-mix(in oklch, var(--border-strong) 46%, transparent) 0.9px, transparent 1px)';
    const operationalDots = declarationsForSelector(
      baseStyles,
      operationalSelector,
      'background-image',
    ).at(-1);
    const generateDots = declarationsForSelector(
      baseStyles,
      generateSelector,
      'background-image',
    ).at(-1);
    const operationalPosition = declarationsForSelector(
      baseStyles,
      operationalSelector,
      'background-position',
    ).at(-1);
    const generatePosition = declarationsForSelector(
      baseStyles,
      generateSelector,
      'background-position',
    ).at(-1);
    const operationalSizes = declarationsForSelector(
      baseStyles,
      operationalSelector,
      'background-size',
    );
    const generateSizes = declarationsForSelector(baseStyles, generateSelector, 'background-size');

    expect(operationalDots).toBe(expectedDots);
    expect(generateDots).toBe(expectedDots);
    expect(generateDots).toBe(operationalDots);
    expect(generatePosition).toBe(operationalPosition);
    expect(generatePosition).toBe('4px 4px');
    expect(operationalSizes.slice(-2)).toEqual(['20px 20px', '16px 16px']);
    expect(generateSizes.slice(-2)).toEqual(['20px 20px', '16px 16px']);
    expect(generateSizes.slice(-2)).toEqual(operationalSizes.slice(-2));
  });
});
