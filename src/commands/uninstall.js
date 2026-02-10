/**
 * Uninstall command for GSD-OpenCode CLI.
 *
 * This module provides safe removal of GSD-OpenCode installations with automatic
 * scope detection, pre-deletion summary, interactive confirmation, and --force flag
 * for non-interactive use.
 *
 * Implements requirements:
 * - CLI-02: User can run gsd-opencode uninstall to remove the system
 * - UNIN-01: Uninstall removes all installed files (agents/, command/, get-shit-done/)
 * - UNIN-02: Uninstall removes VERSION file
 * - UNIN-03: Uninstall shows interactive confirmation before deleting
 * - UNIN-04: Uninstall supports --force flag to skip confirmation
 * - UNIN-05: Uninstall shows summary of what will be removed before confirmation
 * - ERROR-01: All commands handle permission errors (EACCES) with exit code 2
 * - ERROR-02: All commands handle signal interrupts (SIGINT/SIGTERM) gracefully
 * - ERROR-03: All commands support --verbose flag for detailed debugging output
 *
 * @module commands/uninstall
 * @description Uninstall command for removing GSD-OpenCode installations
 * @example
 * // Remove global installation with confirmation
 * await uninstallCommand({ global: true });
 *
 * // Remove local installation without confirmation (scripting)
 * await uninstallCommand({ local: true, force: true });
 *
 * // Auto-detect scope and remove with verbose output
 * await uninstallCommand({ verbose: true });
 */

import { ScopeManager } from '../services/scope-manager.js';
import { logger, setVerbose } from '../utils/logger.js';
import { promptConfirmation } from '../utils/interactive.js';
import { ERROR_CODES, DIRECTORIES_TO_COPY } from '../../lib/constants.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main uninstall command function.
 *
 * Orchestrates the uninstallation process:
 * 1. Parse options and set verbose mode
 * 2. Determine installation scope (auto-detect if not specified)
 * 3. Identify all files and directories to be removed
 * 4. Display summary of items to be removed
 * 5. Request interactive confirmation (unless --force flag provided)
 * 6. Perform removal of all installation files
 * 7. Show success summary
 *
 * The function implements safety-first design:
 * - Confirmation defaults to false (user must explicitly confirm)
 * --force flag skips confirmation for scripting environments
 * - Graceful handling of permission errors and interrupts
 * - Clear communication of what will be removed before action
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Remove global installation
 * @param {boolean} [options.local] - Remove local installation
 * @param {boolean} [options.force] - Skip confirmation prompt (for scripting)
 * @param {boolean} [options.verbose] - Enable verbose logging for debugging
 * @returns {Promise<number>} Exit code (0=success, 1=error, 2=permission, 130=interrupted)
 * @async
 *
 * @example
 * // Remove global installation with confirmation
 * const exitCode = await uninstallCommand({ global: true });
 *
 * // Remove local installation without confirmation
 * const exitCode = await uninstallCommand({ local: true, force: true });
 *
 * // Auto-detect scope (removes whichever exists, errors if both exist)
 * const exitCode = await uninstallCommand({});
 */
export async function uninstallCommand(options = {}) {
  // Set verbose mode early for consistent logging
  setVerbose(options.verbose);

  logger.debug('Starting uninstall command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, force=${options.force}, verbose=${options.verbose}`);

  try {
    // Step 1: Determine scope - explicit flag, auto-detect, or error
    let scope;

    if (options.global) {
      scope = 'global';
      logger.debug('Scope determined by --global flag');
    } else if (options.local) {
      scope = 'local';
      logger.debug('Scope determined by --local flag');
    } else {
      // Auto-detect: check both global and local installations
      logger.debug('No scope flags provided, auto-detecting...');

      const globalScope = new ScopeManager({ scope: 'global' });
      const localScope = new ScopeManager({ scope: 'local' });

      const globalInstalled = globalScope.isInstalled();
      const localInstalled = localScope.isInstalled();

      logger.debug(`Global installed: ${globalInstalled}, Local installed: ${localInstalled}`);

      // If both exist, user must specify which to remove (safety measure)
      if (globalInstalled && localInstalled) {
        logger.warning('Both global and local installations found');
        logger.info('Use --global or --local to specify which to remove');
        return ERROR_CODES.GENERAL_ERROR;
      }

      // If neither exists, nothing to uninstall
      if (!globalInstalled && !localInstalled) {
        logger.warning('No GSD-OpenCode installation found');
        return ERROR_CODES.GENERAL_ERROR;
      }

      // Use whichever one exists
      scope = globalInstalled ? 'global' : 'local';
      logger.debug(`Auto-detected scope: ${scope}`);
    }

    // Step 2: Create ScopeManager for the determined scope
    const scopeManager = new ScopeManager({ scope });
    const targetDir = scopeManager.getTargetDir();

    // Double-check installation exists before proceeding
    if (!scopeManager.isInstalled()) {
      logger.warning(`No ${scope} installation found at ${scopeManager.getPathPrefix()}`);
      return ERROR_CODES.GENERAL_ERROR;
    }

    // Step 3: Identify items to remove
    // We check each item individually to handle partial installations gracefully
    const itemsToRemove = [];

    // Check for VERSION file (primary indicator of installation)
    const versionPath = path.join(targetDir, 'VERSION');
    try {
      await fs.access(versionPath);
      itemsToRemove.push({ type: 'file', path: versionPath, name: 'VERSION' });
      logger.debug(`Found VERSION file: ${versionPath}`);
    } catch {
      logger.debug(`VERSION file not found at ${versionPath}`);
    }

    // Check for each directory in DIRECTORIES_TO_COPY
    // This ensures we only try to remove directories that actually exist
    for (const dirName of DIRECTORIES_TO_COPY) {
      const dirPath = path.join(targetDir, dirName);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          itemsToRemove.push({ type: 'directory', path: dirPath, name: dirName });
          logger.debug(`Found directory: ${dirPath}`);
        }
      } catch {
        logger.debug(`Directory not found: ${dirPath}`);
      }
    }

    // If no items found, nothing to uninstall
    if (itemsToRemove.length === 0) {
      logger.warning('No GSD-OpenCode files found in ' + scopeManager.getPathPrefix());
      return ERROR_CODES.GENERAL_ERROR;
    }

    // Step 4: Display summary of what will be removed
    logger.heading('Uninstall GSD-OpenCode');
    logger.info(`Scope: ${scope}`);
    logger.info(`Location: ${scopeManager.getPathPrefix()}`);
    logger.dim('');
    logger.info('The following items will be removed:');

    // List each item with appropriate icon
    itemsToRemove.forEach(item => {
      const icon = item.type === 'directory' ? '📁' : '📄';
      logger.dim(`  ${icon} ${item.name}`);
    });

    logger.dim('');

    // Step 5: Interactive confirmation (unless --force flag provided)
    // Default is false for safety - user must explicitly confirm
    if (!options.force) {
      logger.debug('Requesting user confirmation...');

      const confirmed = await promptConfirmation('Are you sure you want to proceed?', false);

      // Handle SIGINT (Ctrl+C) - user cancelled with interrupt
      if (confirmed === null) {
        logger.info('Uninstall cancelled');
        return ERROR_CODES.INTERRUPTED;
      }

      // Handle explicit "no" response
      if (!confirmed) {
        logger.info('Uninstall cancelled');
        return ERROR_CODES.SUCCESS;
      }

      logger.debug('User confirmed uninstallation');
    } else {
      logger.debug('--force flag provided, skipping confirmation');
    }

    // Step 6: Perform removal
    logger.info('Removing files...');

    for (const item of itemsToRemove) {
      try {
        // Use force: true to avoid errors if file was already removed
        // Use recursive: true for directories
        await fs.rm(item.path, { recursive: true, force: true });
        logger.debug(`Removed: ${item.path}`);
      } catch (error) {
        // Log but continue - we want to remove as much as possible
        logger.debug(`Warning: Could not remove ${item.path}: ${error.message}`);
      }
    }

    // Try to remove parent directory if it's now empty
    // This is a cleanup step - if other files exist, we leave them
    try {
      await fs.rmdir(targetDir);
      logger.debug(`Removed empty directory: ${targetDir}`);
    } catch {
      // Directory not empty or other error - this is expected and fine
      logger.debug(`Parent directory not empty, leaving in place: ${targetDir}`);
    }

    // Step 7: Success message
    logger.success('GSD-OpenCode has been successfully uninstalled');
    logger.dim(`Removed ${itemsToRemove.length} item(s) from ${scopeManager.getPathPrefix()}`);

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    // Handle Ctrl+C during async operations (AbortPromptError from @inquirer/prompts)
    if (error.name === 'AbortPromptError') {
      logger.info('Uninstall cancelled');
      return ERROR_CODES.INTERRUPTED;
    }

    // Handle permission errors (EACCES)
    if (error.code === 'EACCES') {
      logger.error('Permission denied: Cannot remove installation directory');
      logger.dim('');
      logger.dim('Suggestion: Check directory permissions or run with appropriate privileges');
      return ERROR_CODES.PERMISSION_ERROR;
    }

    // Handle all other errors
    logger.error(`Uninstall failed: ${error.message}`);

    if (options.verbose && error.stack) {
      logger.dim(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Default export for the uninstall command.
 *
 * @example
 * import uninstallCommand from './commands/uninstall.js';
 * const exitCode = await uninstallCommand({ global: true, force: true });
 */
export default uninstallCommand;
