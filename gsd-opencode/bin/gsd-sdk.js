#!/usr/bin/env node
/**
 * bin/gsd-sdk.js — shim for `gsd-sdk` command.
 *
 * When gsd-opencode is installed via npm (`npm i -g gsd-opencode`),
 * npm creates a `gsd-sdk` symlink in the global bin directory pointing
 * at this file. This shim resolves `@gsd-build/sdk/dist/cli.js` from
 * the nearest node_modules (where npm installed it as a dependency)
 * and delegates to it via `node`, so `gsd-sdk <args>` behaves identically
 * to `node <sdk>/dist/cli.js <args>`.
 *
 * Resolution order:
 *   1. import.meta.resolve('@gsd-build/sdk/dist/cli.js')
 *      — finds the SDK from npm's install tree
 *   2. Fallback: this package's own node_modules directory
 *   3. Abort with helpful error if SDK is not installed
 */

import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cliPath;

// Primary: resolve via Node's module resolution (works with npm flat deps)
try {
  cliPath = import.meta.resolve('@gsd-build/sdk/dist/cli.js');
  // import.meta.resolve returns a file:// URL, strip the prefix
  if (cliPath.startsWith('file://')) {
    cliPath = fileURLToPath(cliPath);
  }
} catch {
  // Fallback: look in this package's own node_modules
  const pkgDir = path.resolve(__dirname, '..');
  const candidate = path.join(pkgDir, 'node_modules', '@gsd-build', 'sdk', 'dist', 'cli.js');
  if (fs.existsSync(candidate)) {
    cliPath = candidate;
  }
}

if (!cliPath) {
  console.error('gsd-sdk: @gsd-build/sdk not found.');
  console.error('');
  console.error('If you installed gsd-opencode via npm:');
  console.error('  npm install @gsd-build/sdk');
  console.error('');
  console.error('If you used gsd-opencode install:');
  console.error('  Run the install again with --sdk flag (coming soon)');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
