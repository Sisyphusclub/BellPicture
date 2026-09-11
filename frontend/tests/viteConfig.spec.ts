import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

describe('Vite development proxy', () => {
  it('forwards same-origin API and hero-video requests to the local backend', () => {
    expect(viteConfig).toContain("'/api': {");
    expect(viteConfig).toContain("target: 'http://localhost:3000'");
    expect(viteConfig).toContain('changeOrigin: true');
  });
});
