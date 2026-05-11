import { createRequire } from 'node:module';
import process from 'node:process';

import { Router } from 'express';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as unknown;
const VERSION = readPackageVersion(pkg);

function readPackageVersion(packageJson: unknown): string {
  if (typeof packageJson !== 'object' || packageJson === null || !('version' in packageJson)) {
    return '0.0.0';
  }

  const { version } = packageJson as { version?: unknown };
  return typeof version === 'string' && version.length > 0 ? version : '0.0.0';
}

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptimeSec: Math.round(process.uptime()),
    version: VERSION,
  });
});
