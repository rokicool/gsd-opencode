#!/usr/bin/env node

/**
 * Skills CLI entry point.
 *
 * Provides `skills add <owner/repo>` to install skill packs from GitHub.
 *
 * Usage:
 *   skills add remotion-dev/skills
 *   skills add remotion-dev/skills --global
 *   skills add remotion-dev/skills --local
 *
 * @module skills
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { skillsAddCommand } from './dm/src/commands/skills-add.js';
import { logger, setVerbose } from './dm/src/utils/logger.js';
import { ERROR_CODES } from './dm/lib/constants.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

function getPackageVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageRoot = path.resolve(__dirname, '..');
    const content = readFileSync(path.join(packageRoot, 'package.json'), 'utf-8');
    return JSON.parse(content).version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function main() {
  const program = new Command();

  program
    .name('skills')
    .description('Manage OpenCode skill packs')
    .version(getPackageVersion(), '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help')
    .configureOutput({
      writeErr: (str) => logger.error(str.trim()),
      outputError: (str, write) => write(chalk.red(str))
    });

  program.option('--verbose', 'Enable verbose output', false);

  program
    .command('add <package>')
    .description('Install a skill pack from GitHub (e.g. remotion-dev/skills)')
    .option('-g, --global', 'Install to ~/.config/opencode/skills/')
    .option('-l, --local', 'Install to ./.opencode/skills/')
    .option('--dry-run', 'Show what would be installed without making changes')
    .action(async (pkg, options, command) => {
      const globalOptions = command.parent.opts();
      if (globalOptions.verbose) setVerbose(true);

      const exitCode = await skillsAddCommand(pkg, {
        ...options,
        verbose: globalOptions.verbose || options.verbose
      });
      process.exit(exitCode);
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(ERROR_CODES.GENERAL_ERROR);
});
