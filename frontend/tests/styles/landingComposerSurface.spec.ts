import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('landing composer surface contract', () => {
  it('keeps the idle hero composer visible without painting a nested card', () => {
    const idleStart = baseStyles.indexOf(
      '/* The hero and dock share the same beUI Agent Chat Input surface.',
    );
    const idleContract = baseStyles.slice(
      idleStart,
      baseStyles.indexOf('/* Composer parity:', idleStart),
    );

    expect(idleContract).toContain(
      '--card-bg: color-mix(in oklch, var(--card) 88%, transparent) !important;',
    );
    expect(idleContract).toContain(
      'border-color: color-mix(in oklch, var(--border-strong) 82%, var(--border));',
    );
    expect(idleContract).toContain('inset 0 1px 0 rgb(236 248 255 / 0.08)');
    expect(idleContract).toContain('background: transparent !important;');
    expect(idleContract).not.toContain('.agent-chat-input__surface {\n  background: color-mix');
  });

  it('does not replace React Bits pointer proximity with a route focus override', () => {
    expect(baseStyles).not.toContain(
      '.agent-chat-input.landing-composer.border-glow-card:focus-within',
    );
    expect(baseStyles).not.toContain('border-glow-liquid-glass');
  });

  it('keeps gallery pagination above the fixed composer', () => {
    const paginationStart = baseStyles.indexOf('.landing-gallery-pagination {');
    const paginationContract = baseStyles.slice(
      paginationStart,
      baseStyles.indexOf('/* The hero and dock share', paginationStart),
    );

    expect(paginationContract).toContain('display: flex;');
    expect(paginationContract).toContain('justify-content: center;');
    expect(paginationContract).toContain(
      'padding: 28px 0 calc(160px + env(safe-area-inset-bottom));',
    );
  });
});
