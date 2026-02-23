#!/usr/bin/env node

/**
 * gsd-copy-from-original.js - CLI entry point for syncing from TÂCHES repository
 *
 * Syncs files from the original TÂCHES repository (git submodule) to gsd-opencode.
 * This is a maintenance tool for keeping the OpenCode adaptation in sync with upstream.
 *
 * IMPORTANT: This script does NOT apply CC→OC transformations.
 * Transformations are handled separately by translate.js (Phase 10).
 *
 * Usage: node gsd-copy-from-original.js [options]
 *
 * Options:
 *   --apply            Apply changes (copy files)
 *   -f, --force        Overwrite diverged files without warning
 *   --filter <pattern> Filter files by name pattern (e.g., "VALID*")
 *   -v, --verbose      Show detailed output
 *   -h, --help         Show help message
 *
 * By default, the script runs in preview mode (dry-run) and shows what would be copied.
 * Use --apply to actually copy files.
 *
 * Exit codes:
 *   0  Success
 *   1  Error (submodule not initialized, sync errors, etc.)
 *   2  Permission error
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

// Import services
import { SubmoduleService } from '../copy-services/SubmoduleService.js';
import { SyncManifest } from '../copy-services/SyncManifest.js';
import { SyncService } from '../copy-services/SyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_PERMISSION_ERROR = 2;

/**
 * Default paths
 */
const DEFAULT_SUBMODULE_PATH = './original/get-shit-done';
const DEFAULT_TARGET_PATH = './gsd-opencode';
const DEFAULT_MANIFEST_PATH = '.planning/sync-manifest.json';

/**
 * Format file list for display
 * @param {string[]} files - List of file paths
 * @param {number} maxShow - Maximum files to show
 * @returns {string}
 */
function formatFileList(files, maxShow = 10) {
  if (files.length === 0) return '  (none)';

  const shown = files.slice(0, maxShow);
  const remaining = files.length - maxShow;

  let output = shown.map(f => `  ${chalk.gray('-')} ${f}`).join('\n');
  if (remaining > 0) {
    output += `\n  ${chalk.gray(`... and ${remaining} more`)}`;
  }
  return output;
}

/**
 * Format count with singular/plural
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 * @returns {string}
 */
function pluralize(count, singular, plural = null) {
  return count === 1 ? singular : (plural || singular + 's');
}

/**
 * Filter files by pattern
 * @param {string[]} files - List of file paths
 * @param {string} pattern - Pattern to match (e.g., "VALID*")
 * @returns {string[]} Filtered files
 */
function filterFilesByPattern(files, pattern) {
  if (!pattern) return files;
  
  // Convert simple glob pattern to regex
  // "VALID*" -> /^VALID.*$/
  // "*test*" -> /^.*test.*$/
  const regex = new RegExp(
    '^' + 
    pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + 
    '$',
    'i'
  );
  
  return files.filter(file => {
    const filename = basename(file);
    return regex.test(filename);
  });
}

/**
 * Main CLI action
 * @param {Object} options - CLI options
 */
async function main(options) {
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const submodulePath = resolve(projectRoot, DEFAULT_SUBMODULE_PATH);
  const targetPath = resolve(projectRoot, DEFAULT_TARGET_PATH);
  const manifestPath = resolve(projectRoot, DEFAULT_MANIFEST_PATH);

  // Initialize services
  const submoduleService = new SubmoduleService({ submodulePath });
  const syncManifest = new SyncManifest({ manifestPath });
  const syncService = new SyncService({
    submoduleService,
    syncManifest,
    projectRoot,
    originalPath: submodulePath,
    targetPath
  });

  const verbose = options.verbose;
  const apply = options.apply;
  const force = options.force;
  const filter = options.filter;

  // By default, run in preview mode (dry-run)
  const dryRun = !apply;

  // Header
  if (dryRun) {
    console.log(chalk.bold('\n🔄 Copy from Original (PREVIEW)\n'));
  } else {
    console.log(chalk.bold('\n🔄 Copy from Original\n'));
  }

  // Step 1: Verify submodule
  const verifySpinner = ora('Checking submodule...').start();

  try {
    await submoduleService.verifySubmodule();
    verifySpinner.succeed('Submodule initialized');
  } catch (error) {
    verifySpinner.fail('Submodule not initialized');
    console.error(chalk.red(`\n  Error: ${error.message}`));
    if (error.suggestion) {
      console.error(chalk.yellow(`  Suggestion: ${error.suggestion}`));
    }
    process.exit(EXIT_ERROR);
  }

  // Step 2: Get current submodule info
  let commitInfo;
  const infoSpinner = ora('Getting submodule info...').start();

  try {
    commitInfo = await submoduleService.getCommitInfo();
    infoSpinner.succeed(`Submodule at ${chalk.cyan(commitInfo.shortHash)}${commitInfo.version ? chalk.gray(` (${commitInfo.version})`) : ''}`);
  } catch (error) {
    infoSpinner.fail('Failed to get submodule info');
    console.error(chalk.red(`\n  Error: ${error.message}`));
    process.exit(EXIT_ERROR);
  }

  // Step 3: Find all diverged files (always resync mode)
  const detectSpinner = ora('Scanning for differences...').start();
  let diverged;

  try {
    diverged = await syncService.findDivergedFiles();
    detectSpinner.succeed(`Found ${diverged.files.length} ${pluralize(diverged.files.length, 'file')} with differences`);
  } catch (error) {
    detectSpinner.fail('Failed to scan for differences');
    console.error(chalk.red(`\n  Error: ${error.message}`));
    process.exit(EXIT_ERROR);
  }

  // Apply filter if specified
  let filesToSync = diverged.files;
  if (filter) {
    const beforeFilter = filesToSync.length;
    filesToSync = filterFilesByPattern(filesToSync, filter);
    console.log(chalk.gray(`\nFilter "${filter}": ${beforeFilter} → ${filesToSync.length} files`));
  }

  // If no differences, exit early
  if (filesToSync.length === 0) {
    console.log(chalk.green('\n✓ All files are up to date\n'));
    process.exit(EXIT_SUCCESS);
  }

  // Show files that will be copied
  console.log(chalk.gray('\nFiles to sync:'));
  console.log(formatFileList(filesToSync, verbose ? 50 : 20));

  // Step 4: Perform sync
  const syncSpinner = ora(dryRun ? 'Previewing sync...' : 'Syncing files...').start();

  let result;
  try {
    result = await syncService.sync({ dryRun, force, files: filesToSync });
    syncSpinner.succeed(dryRun ? 'Preview complete' : 'Sync complete');
  } catch (error) {
    syncSpinner.fail('Sync failed');
    console.error(chalk.red(`\n  Error: ${error.message}`));
    if (error.details) {
      console.error(chalk.gray(`  Details: ${JSON.stringify(error.details)}`));
    }
    process.exit(EXIT_ERROR);
  }

  // Display results
  console.log('');

  // Show copied files
  if (result.copied.length > 0) {
    const label = dryRun ? 'Would copy' : 'Copied';
    console.log(chalk.green(`✓ ${label} ${result.copied.length} ${pluralize(result.copied.length, 'file')}:`));
    console.log(formatFileList(result.copied, 10));
    console.log('');
  }

  // Show skipped files
  if (result.skipped.length > 0) {
    const skippedByReason = {};
    for (const item of result.skipped) {
      const reason = item.reason || 'unknown';
      if (!skippedByReason[reason]) {
        skippedByReason[reason] = [];
      }
      skippedByReason[reason].push(item.path || item);
    }

    for (const [reason, files] of Object.entries(skippedByReason)) {
      console.log(chalk.yellow(`⚠ Skipped ${files.length} ${pluralize(files.length, 'file')} (${reason}):`));
      if (verbose) {
        console.log(formatFileList(files, 5));
      }
    }
    console.log('');
  }

  // Show warnings
  if (result.warnings.length > 0) {
    const nonDryRunWarnings = result.warnings.filter(w => !w.startsWith('DRY RUN'));
    if (nonDryRunWarnings.length > 0) {
      console.log(chalk.yellow('⚠ Warnings:'));
      for (const warning of nonDryRunWarnings.slice(0, 10)) {
        console.log(chalk.yellow(`  - ${warning}`));
      }
      if (nonDryRunWarnings.length > 10) {
        console.log(chalk.yellow(`  ... and ${nonDryRunWarnings.length - 10} more`));
      }
      console.log('');
    }
  }

  // Show orphans
  if (result.orphans.length > 0) {
    console.log(chalk.magenta(`📦 ${result.orphans.length} orphaned ${pluralize(result.orphans.length, 'file')} (in gsd-opencode but not in original):`));
    console.log(formatFileList(result.orphans, 5));
    console.log('');
  }

  // Summary
  if (dryRun) {
    console.log(chalk.gray('This is a preview. No files were modified.'));
    console.log(chalk.gray('Run with --apply to copy files.\n'));
  } else {
    // Update manifest with sync info
    try {
      await syncManifest.setLastSync({
        commit: commitInfo.hash,
        version: commitInfo.version
      });
    } catch (error) {
      console.error(chalk.yellow('Warning: Could not update manifest:'), error.message);
    }

    console.log(chalk.green('✓ Sync complete\n'));
  }

  process.exit(EXIT_SUCCESS);
}

// Configure CLI
program
  .name('gsd-copy-from-original')
  .description('Sync files from original TÂCHES repository to gsd-opencode')
  .option('--apply', 'Apply changes (copy files)', false)
  .option('-f, --force', 'Overwrite diverged files without warning', false)
  .option('--filter <pattern>', 'Filter files by name pattern (e.g., "VALID*")')
  .option('-v, --verbose', 'Show detailed output', false)
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .action(main);

// Parse arguments
program.parse();
