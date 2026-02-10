#!/usr/bin/env node

/**
 * Main CLI entry point for GSD-OpenCode package manager.
 *
 * This is the primary executable that routes commands to their respective
 * handlers using Commander.js. Supports both new subcommand-based interface
 * and legacy argument patterns for backward compatibility.
 *
 * Commands:
 * - install: Install GSD-OpenCode distribution
 * - list: Show installation status
 *
 * Legacy compatibility:
 * - Direct flags like --global, --local are routed to install command
 * - No arguments defaults to interactive install
 *
 * @module gsd
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from '../src/commands/install.js';
import { listCommand } from '../src/commands/list.js';
import { uninstallCommand } from '../src/commands/uninstall.js';
import { configGetCommand, configSetCommand, configResetCommand, configListCommand } from '../src/commands/config.js';
import { checkCommand } from '../src/commands/check.js';
import { logger, setVerbose } from '../src/utils/logger.js';
import { ERROR_CODES } from '../lib/constants.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Gets the package version from package.json.
 *
 * @returns {string} The package version
 * @private
 */
function getPackageVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageRoot = path.resolve(__dirname, '..');
    const packageJsonPath = path.join(packageRoot, 'package.json');

    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

/**
 * Checks if arguments are legacy-style (direct flags without subcommand).
 *
 * Legacy patterns:
 * - --global, -g
 * - --local, -l
 * - --config-dir, -c
 * - (no args)
 *
 * @param {string[]} args - Process arguments
 * @returns {boolean} True if legacy pattern detected
 * @private
 */
function isLegacyArgs(args) {
  // If no args beyond node and script, it's legacy (default to install)
  if (args.length <= 2) {
    return true;
  }

  const userArgs = args.slice(2);

  // Check for any known command
  const knownCommands = ['install', 'list', 'uninstall', 'config', '--help', '-h', '--version', '-V'];
  const hasKnownCommand = knownCommands.some(cmd => userArgs.includes(cmd));

  if (hasKnownCommand) {
    return false;
  }

  // Check for legacy flags
  const legacyFlags = ['--global', '-g', '--local', '-l', '--config-dir', '-c'];
  const hasLegacyFlags = legacyFlags.some(flag =>
    userArgs.some(arg => arg.startsWith(flag))
  );

  return hasLegacyFlags || userArgs.length === 0;
}

/**
 * Transform legacy arguments to new subcommand format.
 *
 * @param {string[]} args - Process arguments
 * @returns {string[]} Transformed arguments
 * @private
 */
function transformLegacyArgs(args) {
  const userArgs = args.slice(2);

  // If no args, transform to 'install'
  if (userArgs.length === 0) {
    return [...args.slice(0, 2), 'install'];
  }

  // Check if already has 'install' subcommand
  if (userArgs[0] === 'install') {
    return args;
  }

  // Transform: [flags...] -> ['install', flags...]
  // But don't add 'install' if the first arg starts with a flag
  const firstArg = userArgs[0];
  if (firstArg.startsWith('-')) {
    return [...args.slice(0, 2), 'install', ...userArgs];
  }

  return args;
}

/**
 * Main CLI function.
 *
 * Sets up Commander program, registers commands, handles legacy
 * compatibility, and executes the appropriate command.
 *
 * @returns {Promise<void>}
 * @private
 */
async function main() {
  const program = new Command();

  // Basic program setup
  program
    .name('gsd-opencode')
    .description('GSD-OpenCode distribution manager')
    .version(getPackageVersion(), '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help for command')
    .configureOutput({
      writeErr: (str) => logger.error(str.trim()),
      outputError: (str, write) => write(chalk.red(str))
    });

  // Global options (available to all subcommands)
  program.option('--verbose', 'Enable verbose output for debugging', false);

  // Install command
  program
    .command('install')
    .description('Install GSD-OpenCode distribution to your system')
    .option('-g, --global', 'Install globally to ~/.config/opencode/')
    .option('-l, --local', 'Install locally to ./.opencode/')
    .option('-c, --config-dir <path>', 'Specify custom configuration directory')
    .action(async (options, command) => {
      // Get global verbose option from parent
      const globalOptions = command.parent.opts();
      const fullOptions = {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await installCommand(fullOptions);
      process.exit(exitCode);
    });

  // List command
  program
    .command('list')
    .alias('ls')
    .description('Show GSD-OpenCode installation status and version')
    .option('-g, --global', 'Show global installation only')
    .option('-l, --local', 'Show local installation only')
    .action(async (options, command) => {
      // Get global verbose option from parent
      const globalOptions = command.parent.opts();
      const fullOptions = {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await listCommand(fullOptions);
      process.exit(exitCode);
    });

  // Check command
  program
    .command('check')
    .alias('verify')
    .description('Verify GSD-OpenCode installation health')
    .option('-g, --global', 'Check global installation only')
    .option('-l, --local', 'Check local installation only')
    .action(async (options, command) => {
      const globalOptions = command.parent.opts();
      const fullOptions = {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await checkCommand(fullOptions);
      process.exit(exitCode);
    });

  // Uninstall command
  program
    .command('uninstall')
    .alias('rm')
    .description('Remove GSD-OpenCode installation')
    .option('-g, --global', 'Remove global installation')
    .option('-l, --local', 'Remove local installation')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (options, command) => {
      const globalOptions = command.parent.opts();
      const fullOptions = {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await uninstallCommand(fullOptions);
      process.exit(exitCode);
    });

  // Config command with subcommands
  const configCmd = program
    .command('config')
    .description('Manage GSD-OpenCode configuration');

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key, options, command) => {
      const globalOptions = command.parent.parent.opts();
      const fullOptions = {
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await configGetCommand(key, fullOptions);
      process.exit(exitCode);
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key, value, options, command) => {
      const globalOptions = command.parent.parent.opts();
      const fullOptions = {
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await configSetCommand(key, value, fullOptions);
      process.exit(exitCode);
    });

  configCmd
    .command('reset [key]')
    .description('Reset configuration to defaults')
    .option('--all', 'Reset all settings')
    .action(async (key, options, command) => {
      const globalOptions = command.parent.parent.opts();
      const fullOptions = {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await configResetCommand(key, fullOptions);
      process.exit(exitCode);
    });

  configCmd
    .command('list')
    .alias('ls')
    .description('List all configuration settings')
    .option('--json', 'Output as JSON')
    .action(async (options, command) => {
      const globalOptions = command.parent.parent.opts();
      const fullOptions = {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      };

      const exitCode = await configListCommand(fullOptions);
      process.exit(exitCode);
    });

  // Handle legacy argument patterns
  const args = process.argv;

  if (isLegacyArgs(args)) {
    // Transform legacy args to new format
    process.argv = transformLegacyArgs(args);

    // Show deprecation notice in verbose mode
    const userArgs = args.slice(2);
    if (userArgs.some(arg => arg === '--verbose' || arg === '-v')) {
      setVerbose(true);
      logger.debug('Legacy argument pattern detected, routing to install command');
    }
  }

  // Parse and execute
  await program.parseAsync(process.argv);
}

// Run CLI
main().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(ERROR_CODES.GENERAL_ERROR);
});
