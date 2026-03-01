#!/usr/bin/env node

/**
 * gsd-oc-tools.cjs — Main CLI entry point for OpenCode tools
 *
 * Provides command routing for validation utilities.
 * Follows gsd-tools.cjs architecture pattern.
 *
 * Usage: node gsd-oc-tools.cjs <command> [args] [--raw] [--verbose]
 *
 * Available Commands:
 *   check-opencode-json    Validate model IDs in opencode.json
 *   check-config-json      Validate profile configuration in .planning/config.json
 *   help                   Show this help message
 */

const path = require('path');
const { output, error } = require('./lib/oc-core.cjs');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);

const verbose = flags.includes('--verbose');
const raw = flags.includes('--raw');

// Current working directory
const cwd = process.cwd();

/**
 * Show help message
 */
function showHelp() {
  const helpText = `
gsd-oc-tools — OpenCode validation utilities

Usage: node gsd-oc-tools.cjs <command> [options]

Available Commands:
  check-opencode-json    Validate model IDs in opencode.json against opencode models catalog
  check-config-json      Validate profile configuration in .planning/config.json
  help                   Show this help message

Options:
  --verbose              Enable verbose output (stderr)
  --raw                  Output raw values (future use)

Examples:
  node gsd-oc-tools.cjs check-opencode-json
  node gsd-oc-tools.cjs check-config-json
  node gsd-oc-tools.cjs check-opencode-json --verbose
`.trim();

  console.log(helpText);
  process.exit(0);
}

// Command routing
if (!command || command === 'help') {
  showHelp();
}

switch (command) {
  case 'check-opencode-json': {
    const checkOpencodeJson = require('./commands/check-opencode-json.cjs');
    checkOpencodeJson(cwd, flags);
    break;
  }

  case 'check-config-json': {
    const checkConfigJson = require('./commands/check-config-json.cjs');
    checkConfigJson(cwd, flags);
    break;
  }

  default:
    error(`Unknown command: ${command}\nRun 'node gsd-oc-tools.cjs help' for available commands.`, 'UNKNOWN_COMMAND');
}
