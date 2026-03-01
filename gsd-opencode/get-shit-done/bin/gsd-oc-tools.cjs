#!/usr/bin/env node

/**
 * gsd-oc-tools.cjs — Main CLI entry point for OpenCode tools
 *
 * Provides command routing for validation utilities and profile management.
 * Follows gsd-tools.cjs architecture pattern.
 *
 * Usage: node gsd-oc-tools.cjs <command> [args] [--raw] [--verbose]
 *
 * Available Commands:
 *   check-opencode-json     Validate model IDs in opencode.json
 *   check-config-json       Validate profile configuration in .planning/config.json
 *   update-opencode-json    Update opencode.json agent models from profile config
 *   validate-models         Validate model IDs against opencode catalog
 *   analyze-reuse           Analyze model reuse opportunities for profile switching
 *   migrate-config          Migrate legacy config to current profile format
 *   set-profile             Switch profile with interactive model selection
 *   help                    Show this help message
 */

const path = require('path');
const { output, error } = require('./gsd-oc-lib/oc-core.cjs');

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
  check-opencode-json     Validate model IDs in opencode.json against opencode models catalog
  check-config-json       Validate profile configuration in .planning/config.json
  update-opencode-json    Update opencode.json agent models from profile config (creates backup)
  validate-models         Validate one or more model IDs against opencode catalog
  analyze-reuse           Analyze model reuse opportunities when switching profiles
  migrate-config          Migrate legacy config (model_profile) to current profile format
  set-profile             Switch profile with interactive model selection wizard
  help                    Show this help message

Options:
  --verbose              Enable verbose output (stderr)
  --raw                  Output raw values instead of JSON envelope
  --dry-run              Preview changes without applying (update-opencode-json, migrate-config)

Examples:
  node gsd-oc-tools.cjs check-opencode-json
  node gsd-oc-tools.cjs check-config-json
  node gsd-oc-tools.cjs update-opencode-json --dry-run
  node gsd-oc-tools.cjs validate-models opencode/glm-4.7
  node gsd-oc-tools.cjs analyze-reuse smart
  node gsd-oc-tools.cjs migrate-config --verbose
  node gsd-oc-tools.cjs set-profile genius --reuse
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
    const checkOpencodeJson = require('./gsd-oc-commands/check-opencode-json.cjs');
    checkOpencodeJson(cwd, flags);
    break;
  }

  case 'check-config-json': {
    const checkConfigJson = require('./gsd-oc-commands/check-config-json.cjs');
    checkConfigJson(cwd, flags);
    break;
  }

  case 'update-opencode-json': {
    const updateOpencodeJson = require('./gsd-oc-commands/update-opencode-json.cjs');
    updateOpencodeJson(cwd, flags);
    break;
  }

  case 'validate-models': {
    const validateModels = require('./gsd-oc-commands/validate-models.cjs');
    validateModels(cwd, flags);
    break;
  }

  case 'analyze-reuse': {
    const analyzeReuse = require('./gsd-oc-commands/analyze-reuse.cjs');
    analyzeReuse(cwd, flags);
    break;
  }

  case 'migrate-config': {
    const migrateConfig = require('./gsd-oc-commands/migrate-config.cjs');
    migrateConfig(cwd, flags);
    break;
  }

  case 'set-profile': {
    const setProfile = require('./gsd-oc-commands/set-profile.cjs');
    setProfile(cwd, flags);
    break;
  }

  default:
    error(`Unknown command: ${command}\nRun 'node gsd-oc-tools.cjs help' for available commands.`);
}
