import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('landing composer surface contract', () => {
  it('keeps pasted unbroken prompts inside the composer width', () => {
    const editorRule = baseStyles.match(/\.agent-chat-input__textarea\s*\{([^}]+)\}/)?.[1] ?? '';

    expect(editorRule).toContain('min-width: 0;');
    expect(editorRule).toContain('max-width: 100%;');
    expect(editorRule).toContain('overflow-x: hidden;');
    expect(editorRule).toContain('overflow-wrap: anywhere;');
    expect(editorRule).toContain('white-space: pre-wrap;');
    expect(editorRule).toContain('word-break: break-word;');
    expect(baseStyles).not.toMatch(
      /\.landing-composer-dock:not\(\.is-expanded\)\s+\.agent-chat-input__textarea\s*\{[^}]*white-space:\s*nowrap;/s,
    );
  });

  it('keeps the generation action after the controls in the desktop toolbar', () => {
    const sharedComposerStart = baseStyles.indexOf(
      '/* Shared image-generation composer contract for Discover and Generate. */',
    );
    const sharedComposerContract = baseStyles.slice(sharedComposerStart);

    expect(sharedComposerContract).toMatch(
      /\.generation-composer \.agent-chat-input__toolbar\s*\{[^}]*flex-wrap:\s*nowrap;/s,
    );
    expect(sharedComposerContract).toMatch(
      /\.generation-composer \.agent-chat-input__toolbar-group:first-child\s*\{[^}]*order:\s*0;/s,
    );
    expect(sharedComposerContract).toMatch(
      /\.generation-composer \.agent-chat-input__toolbar-content\s*\{[^}]*order:\s*1;[^}]*width:\s*auto;/s,
    );
    expect(sharedComposerContract).toMatch(
      /\.generation-composer \.agent-chat-input__toolbar-group--end\s*\{[^}]*order:\s*2;/s,
    );
  });

  it('uses fill-only custom selections without a persistent focus outline', () => {
    const triggerRule = baseStyles.match(/\.generation-custom-trigger\s*\{([^}]+)\}/)?.[1] ?? '';
    const optionRule = baseStyles.match(/\.generation-custom-option\s*\{([^}]+)\}/)?.[1] ?? '';
    const checkedRule =
      baseStyles.match(/\.generation-custom-option\[data-state='checked'\]\s*\{([^}]+)\}/)?.[1] ??
      '';
    const focusRule =
      baseStyles.match(
        /\.generation-custom-option:focus,\s*\.generation-custom-option:focus-visible\s*\{([^}]+)\}/,
      )?.[1] ?? '';
    const triggerFocusRule =
      baseStyles.match(
        /\.generation-custom-trigger:focus,\s*\.generation-custom-trigger:focus-visible\s*\{([^}]+)\}/,
      )?.[1] ?? '';

    expect(triggerRule).toContain('border: 0;');
    expect(optionRule).toContain('border: 0;');
    expect(checkedRule).not.toContain('border-color');
    expect(checkedRule).toContain('box-shadow: none;');
    expect(focusRule).toContain('outline: none !important;');
    expect(focusRule).toContain('box-shadow: none !important;');
    expect(triggerFocusRule).toContain('outline: none !important;');
    expect(triggerFocusRule).toContain('box-shadow: none !important;');
  });

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

  it('keeps the complete gallery clear of the fixed composer without pagination', () => {
    expect(baseStyles).not.toContain('.landing-gallery-pagination {');
    expect(baseStyles).toContain('padding-bottom: calc(160px + env(safe-area-inset-bottom));');
  });
});
