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

    expect(dockContract).toContain('translate: -50% 0;');
    expect(dockContract).toContain('transform: none;');
    expect(dockContract).not.toContain('transform: translateX(-50%);');
  });
});
