import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const landingView = readFileSync(resolve(process.cwd(), 'src/views/LandingView.tsx'), 'utf8');
const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('landing composer motion contract', () => {
  it('switches independent hero and dock presentations without layout projection', () => {
    const composerStart = landingView.indexOf('ref={composerAnchorRef}');
    const composerEnd = landingView.indexOf('<AgentChatInput', composerStart);
    const composerContract = landingView.slice(composerStart - 200, composerEnd);

    expect(composerStart).toBeGreaterThanOrEqual(0);
    expect(composerContract).toContain('<AnimatePresence initial={false} mode="wait">');
    expect(composerContract).toContain('key={composerPresentation}');
    expect(composerContract).toContain('data-composer-presentation={composerPresentation}');
    expect(composerContract).toContain('landing-composer-${composerPresentation}');
    expect(composerContract.match(/<motion\.div/g)).toHaveLength(1);
    expect(composerContract).toContain('<div className="landing-composer-content">');
    expect(composerContract).not.toContain('layout=');
    expect(composerContract).not.toContain('layoutDependency=');
    expect(landingView).toContain(
      "const LANDING_COMPOSER_CLOSED_CLIP = 'inset(0 50% 0 50% round 20px)';",
    );
    expect(landingView).toContain(
      "const LANDING_COMPOSER_OPEN_CLIP = 'inset(0 0% 0 0% round 20px)';",
    );
    expect(landingView).toContain('<AnimatePresence initial={false} mode="wait">');

    const dockSection = baseStyles.indexOf(
      '/* Discover composer: the compact dock is a single, quiet pill.',
    );
    const dockStart = baseStyles.indexOf('.landing-composer-dock {', dockSection);
    const dockContract = baseStyles.slice(
      dockStart,
      baseStyles.indexOf('.landing-composer-dock .landing-composer {', dockStart),
    );

    expect(dockContract).toContain('width: min(940px, calc(100% - 144px));');
    expect(dockContract).toContain(
      'margin-left: calc(-1 * min(470px, (100% - 144px) / 2)) !important;',
    );
    expect(dockContract).not.toContain('(100vw - 144px)');
    expect(dockContract).toContain('translate: none;');
    expect(dockContract).toContain('transform: none;');
    expect(dockContract).not.toContain('transform: translateX(-50%);');
    expect(dockContract).not.toContain('translate: -50% 0;');

    const compactDockStart = baseStyles.indexOf(
      '.landing-composer-dock:not(.is-expanded) {',
      dockStart,
    );
    const compactDockContract = baseStyles.slice(
      compactDockStart,
      baseStyles.indexOf(
        '.landing-composer-dock:not(.is-expanded) .landing-composer',
        compactDockStart,
      ),
    );
    expect(compactDockContract).toContain(
      'margin-left: calc(-1 * min(280px, (100vw - var(--sidebar-width) - 64px) / 2)) !important;',
    );

    const mobileDockStart = baseStyles.indexOf('@media (max-width: 860px) {', compactDockStart);
    const mobileDockContract = baseStyles.slice(
      mobileDockStart,
      baseStyles.indexOf('/* Keep the fixed discover composer', mobileDockStart),
    );
    expect(mobileDockContract).toContain('right: 16px !important;');
    expect(mobileDockContract).toContain('left: 16px;');
    expect(mobileDockContract).toContain('margin-left: 0 !important;');
    expect(mobileDockContract).toContain('right: 20px !important;');
    expect(mobileDockContract).toContain('left: 20px;');
    expect(mobileDockContract).toContain('@media (max-width: 560px)');
    expect(mobileDockContract).toContain('right: 14px !important;');
    expect(mobileDockContract).toContain('left: 14px;');
    const presentationSection = baseStyles.slice(
      baseStyles.indexOf('.landing-composer-presentation {'),
      baseStyles.indexOf('.landing-composer-content {'),
    );
    expect(presentationSection).not.toMatch(/\.landing-composer-presentation\s*{[^}]*width:/s);
    expect(presentationSection).toMatch(/\.landing-composer-hero\s*{[^}]*width:\s*100%;/s);
    expect(baseStyles).toContain('.landing-composer-hero .landing-composer {');
    expect(baseStyles).not.toContain('.landing-composer-anchor.is-docked');
    expect(baseStyles).toContain('padding: 21px 14px 10px !important;');
    expect(baseStyles).toContain('padding: 25px 12px 6px !important;');

    const expandedPlaceholderSelector =
      '.landing-composer-dock.is-expanded .landing-composer .agent-chat-input__streaming-placeholder';
    const expandedPlaceholderStart = baseStyles.indexOf(`${expandedPlaceholderSelector} {`);
    const expandedPlaceholderEnd = baseStyles.indexOf('}', expandedPlaceholderStart);
    const expandedPlaceholderContract = baseStyles.slice(
      expandedPlaceholderStart,
      expandedPlaceholderEnd + 1,
    );
    expect(expandedPlaceholderContract).toContain('top: 25px;');
    expect(expandedPlaceholderContract).toContain('right: 22px;');
    expect(expandedPlaceholderContract).toContain('left: 22px;');
    expect(expandedPlaceholderContract).toContain('font-size: 15px;');
    expect(expandedPlaceholderContract).toContain('line-height: 1.5;');

    const mobileExpandedPlaceholderStart = baseStyles.indexOf(
      `${expandedPlaceholderSelector} {`,
      expandedPlaceholderEnd + 1,
    );
    const mobileExpandedPlaceholderEnd = baseStyles.indexOf('}', mobileExpandedPlaceholderStart);
    const mobileExpandedPlaceholderContract = baseStyles.slice(
      mobileExpandedPlaceholderStart,
      mobileExpandedPlaceholderEnd + 1,
    );
    expect(mobileExpandedPlaceholderContract).toContain('top: 29px;');
    expect(mobileExpandedPlaceholderContract).toContain('right: 20px;');
    expect(mobileExpandedPlaceholderContract).toContain('left: 20px;');
    expect(mobileExpandedPlaceholderContract).toContain('font-size: 16px;');
    expect(mobileExpandedPlaceholderContract).toContain('line-height: 1.5;');
    expect(expandedPlaceholderContract).toContain('line-height: 1.5;');
    expect(baseStyles).toMatch(
      /\.landing-composer-dock\.is-expanded\s+\.landing-composer\s+\.agent-chat-input__textarea\[data-empty='true'\]\s*{\s*caret-color: transparent;/,
    );
    expect(baseStyles).toMatch(
      /\.landing-composer-hero\s+\.landing-composer\s+\.agent-chat-input__textarea\[data-empty='true'\]\s*{\s*caret-color: transparent;/,
    );
  });
});
