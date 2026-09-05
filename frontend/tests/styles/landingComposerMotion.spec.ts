import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const landingView = readFileSync(resolve(process.cwd(), 'src/views/LandingView.tsx'), 'utf8');
const baseStyles = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');

describe('landing composer motion contract', () => {
  it('projects docking and expansion only from the state-owning anchor', () => {
    const composerStart = landingView.indexOf('ref={composerAnchorRef}');
    const composerEnd = landingView.indexOf('<AgentChatInput', composerStart);
    const composerContract = landingView.slice(composerStart - 200, composerEnd);

    expect(composerStart).toBeGreaterThanOrEqual(0);
    expect(composerContract).toContain('<motion.div');
    expect(composerContract).toContain('layout={!reducedMotion}');
    expect(composerContract).toContain(
      'layoutDependency={`${composerDocked}:${composerIsExpanded}`}',
    );
    expect(composerContract).toContain('duration: composerMorphDuration');
    expect(composerContract.match(/<motion\.div/g)).toHaveLength(1);
    expect(composerContract.match(/\blayout=/g)).toHaveLength(1);
    expect(composerContract.match(/\blayoutDependency=/g)).toHaveLength(1);
    expect(composerContract).toContain('<div className="landing-composer-content">');
    expect(composerContract).not.toContain(
      '<motion.div\n              className="landing-composer-content"',
    );

    const dockSection = baseStyles.indexOf(
      '/* Discover composer: the compact dock is a single, quiet pill.',
    );
    const dockStart = baseStyles.indexOf('.landing-composer-anchor.is-docked {', dockSection);
    const dockContract = baseStyles.slice(
      dockStart,
      baseStyles.indexOf('.landing-composer-anchor.is-docked .landing-composer {', dockStart),
    );

    expect(dockContract).toContain(
      'margin-left: calc(-1 * min(470px, (100vw - 210px) / 2)) !important;',
    );
    expect(dockContract).toContain('translate: none;');
    expect(dockContract).toContain('transform: none;');
    expect(dockContract).not.toContain('transform: translateX(-50%);');
    expect(dockContract).not.toContain('translate: -50% 0;');

    const compactDockStart = baseStyles.indexOf(
      '.landing-composer-anchor.is-docked:not(.is-expanded) {',
      dockStart,
    );
    const compactDockContract = baseStyles.slice(
      compactDockStart,
      baseStyles.indexOf(
        '.landing-composer-anchor.is-docked:not(.is-expanded) .landing-composer',
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
  });
});
