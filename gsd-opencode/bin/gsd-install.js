#!/usr/bin/env node

/**
 * Legacy compatibility shim for GSD-OpenCode CLI.
 *
 * This module maintains backward compatibility with the original CLI invocation
 * patterns. It transforms legacy-style arguments to the new subcommand format
 * and delegates to the main CLI entry point (gsd.js).
 *
 * Legacy patterns supported:
 * - gsd-opencode --global       -> gsd-opencode install --global
 * - gsd-opencode --local        -> gsd-opencode install --local
 * - gsd-opencode -c /custom/path -> gsd-opencode install --config-dir /custom/path
 * - gsd-opencode (no args)      -> gsd-opencode install (interactive)
 *
 * This shim allows existing users and scripts to continue working without
 * modification while the new subcommand interface is the preferred approach.
 *
 * @module gsd-install
 * @deprecated Use 'gsd-opencode install' directly instead
 */

import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Checks if arguments should trigger legacy transformation.
 *
 * Legacy patterns are:
 * - Any flag starting with --global, -g, --local, -l, --config-dir, -c
 * - No arguments at all (defaults to install)
 *
 * @param {string[]} args - Process arguments
 * @returns {boolean} True if legacy pattern detected
 * @private
 */
function isLegacyPattern(args) {
  const userArgs = args.slice(2);

  // If no args, treat as legacy (will route to install)
  if (userArgs.length === 0) {
    return true;
  }

  // Check for legacy flags
  const legacyFlags = ['--global', '-g', '--local', '-l', '--config-dir', '-c'];
  return userArgs.some(arg =>
    legacyFlags.some(flag => arg === flag || arg.startsWith(`${flag}=`))
  );
}

/**
 * Transform legacy arguments to new subcommand format.
 *
 * Adds 'install' as the first argument after the script path.
 *
 * @param {string[]} args - Process arguments
 * @returns {string[]} Transformed arguments
 * @private
 */
function transformArgs(args) {
  const userArgs = args.slice(2);

  // If already has 'install', don't transform
  if (userArgs[0] === 'install') {
    return args;
  }

  // Transform: [flags...] -> ['install', flags...]
  return [...args.slice(0, 2), 'install', ...userArgs];
}

/**
 * Main shim function.
 *
 * Detects legacy patterns, transforms arguments if needed,
 * and requires the main CLI entry point.
 *
 * @returns {void}
 * @private
 */
function main() {
  const args = process.argv;

  if (isLegacyPattern(args)) {
    // Transform legacy args to new format
    process.argv = transformArgs(args);

    // In verbose mode, log the transformation
    if (args.includes('--verbose') || args.includes('-v')) {
      const __filename = fileURLToPath(import.meta.url);
      console.error(`[legacy-shim] Transforming to: ${process.argv.slice(2).join(' ')}`);
    }
  }

  // Delegate to main CLI
  // Use dynamic import to handle ESM properly
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  import(path.join(__dirname, 'gsd.js'));
}

// Execute shim
main();
