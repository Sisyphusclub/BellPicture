import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const frontendRoot = process.cwd();
const baseStyles = readFileSync(resolve(frontendRoot, 'src/styles/base.css'), 'utf8');
const nginxConfig = readFileSync(resolve(frontendRoot, 'nginx.conf'), 'utf8');

describe('production frontend hardening', () => {
  it('keeps the shared logo sized for its rendered slots', () => {
    const logoPath = resolve(frontendRoot, 'public/brand/logo.png');
    const logo = readFileSync(logoPath);

    expect(logo.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(logo.readUInt32BE(16)).toBeLessThanOrEqual(512);
    expect(logo.readUInt32BE(20)).toBeLessThanOrEqual(512);
    expect(statSync(logoPath).size).toBeLessThanOrEqual(100 * 1024);
  });

  it('applies one complete CSP in every nginx add_header scope', () => {
    const contentSecurityPolicies = nginxConfig.match(
      /^\s*add_header Content-Security-Policy .+ always;$/gm,
    );

    expect(contentSecurityPolicies).toHaveLength(5);
    for (const policy of contentSecurityPolicies ?? []) {
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("script-src 'self'");
      expect(policy).toContain(
        "img-src 'self' data: blob: https://upload.wikimedia.org https://cdn.simpleicons.org",
      );
      expect(policy).toContain("connect-src 'self'");
      expect(policy).toContain("frame-ancestors 'self'");
      expect(policy).toContain("object-src 'none'");
    }
  });

  it('expands compact controls for coarse pointers without changing desktop density', () => {
    const coarsePointerStart = baseStyles.indexOf('@media (hover: none) and (pointer: coarse) {');
    const coarsePointerContract = baseStyles.slice(coarsePointerStart);

    expect(coarsePointerStart).toBeGreaterThanOrEqual(0);
    expect(coarsePointerContract).toContain('.button--icon,');
    expect(coarsePointerContract).toContain('.agent-chat-input__submit {');
    expect(coarsePointerContract).toContain('min-width: 44px;');
    expect(coarsePointerContract).toContain('min-height: 44px;');
    expect(coarsePointerContract).toContain('.landing-count-stepper button {');
    expect(coarsePointerContract).toContain('width: 44px;');
    expect(coarsePointerContract).toContain('height: 44px;');
  });
});
