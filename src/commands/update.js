/**
 * Update command for GSD-OpenCode CLI.
 *
 * This module provides the update functionality to check for and install
 * new versions of GSD-OpenCode, showing version comparisons, requiring
 * interactive confirmation, and displaying progress during installation.
 *
 * Implements requirements:
 * - CLI-05: User can run gsd-opencode update to update to latest version
 * - UPDATE-01: Update checks npm registry for latest version
 * - UPDATE-02: Update supports --beta flag for private registry
 * - UPDATE-03: Update supports specifying exact version to install
 * - UPDATE-04: Update shows current and target versions before proceeding
 * - UPDATE-05: Update preserves existing installation scope
 * - UPDATE-06: Update performs full install procedure including path replacement
 * - ERROR-01: All commands handle permission errors (EACCES) with exit code 2
 * - ERROR-02: All commands handle signal interrupts (SIGINT/SIGTERM) gracefully
 * - ERROR-03: All commands support --verbose flag for detailed debugging output
 *
 * @module commands/update
 * @description Update command for managing GSD-OpenCode versions
 * @example
 * // Update to latest stable version
 * await updateCommand({});
 *
 * // Update to latest beta
 * await updateCommand({ beta: true });
 *
 * // Update to specific version
 * await updateCommand({ version: '2.0.0' });
 */

import { ScopeManager } from '../services/scope-manager.js';
import { BackupManager } from '../services/backup-manager.js';
import { FileOperations } from '../services/file-ops.js';
import { UpdateService } from '../services/update-service.js';
import { NpmRegistry } from '../utils/npm-registry.js';
import { promptConfirmation } from '../utils/interactive.js';
import { logger, setVerbose } from '../utils/logger.js';
import { ERROR_CODES } from '../../lib/constants.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';

/**
 * Gets the package version from package.json.
 *
 * @returns {Promise<string>} The package version
 * @private
 */
async function getPackageVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageRoot = path.resolve(__dirname, '../..');
    const packageJsonPath = path.join(packageRoot, 'package.json');

    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '1.0.0';
  } catch (error) {
    logger.warning('Could not read package version, using 1.0.0');
    return '1.0.0';
  }
}

/**
 * Displays formatted update information.
 *
 * Shows current version, target version, and installation scope
 * in a clear, formatted manner.
 *
 * @param {string|null} current - Current installed version
 * @param {string} target - Target version to install
 * @param {string} scopeLabel - Label for scope (Global/Local)
 * @private
 */
function displayUpdateInfo(current, target, scopeLabel) {
  logger.heading(`${scopeLabel} Installation Update`);
  logger.dim('========================');
  logger.dim('');

  logger.info(`Current version: ${current || 'Not installed'}`);
  logger.info(`Target version:  ${target}`);
  logger.info(`Scope:           ${scopeLabel}`);
  logger.dim('');
}

/**
 * Displays update results after completion.
 *
 * Shows success/failure status, backup location, and next steps.
 *
 * @param {Object} result - Update result from performUpdate()
 * @param {string} scopeLabel - Label for scope (Global/Local)
 * @private
 */
function displayUpdateResults(result, scopeLabel) {
  logger.heading(`Update Results for ${scopeLabel} Installation`);
  logger.dim('=====================================');
  logger.dim('');

  if (result.success) {
    logger.success(`Updated to version ${result.version}`);
  } else {
    logger.error('Update failed');
  }

  if (result.errors && result.errors.length > 0) {
    logger.dim('');
    logger.info('Errors:');
    for (const error of result.errors) {
      logger.dim(`  ✗ ${error}`);
    }
  }

  logger.dim('');
  logger.dim('Next steps:');
  logger.dim("  Run 'gsd-opencode list' to verify the installation");
  logger.dim("  Run 'gsd-opencode check' to verify installation health");
}

/**
 * Main update command function.
 *
 * Orchestrates the update process:
 * 1. Parse options and set verbose mode
 * 2. Determine scopes to check (global, local, or both)
 * 3. For each scope:
 *    - Check if installed
 *    - Create service instances
 *    - Check for available updates
 *    - Display version comparison
 *    - Prompt for confirmation (unless --force)
 *    - Perform update with progress indication
 *    - Display results
 * 4. Return appropriate exit code
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Update global installation only
 * @param {boolean} [options.local] - Update local installation only
 * @param {boolean} [options.beta] - Update to beta version from @rokicool/gsd-opencode
 * @param {boolean} [options.verbose] - Enable verbose output for debugging
 * @param {string} [options.version] - Specific version to install
 * @param {boolean} [options.force] - Skip confirmation prompt
 * @returns {Promise<number>} Exit code (0=success, 1=error, 2=permission, 130=interrupted)
 * @async
 *
 * @example
 * // Update to latest stable
 * const exitCode = await updateCommand({});
 *
 * // Update to latest beta
 * const exitCode = await updateCommand({ beta: true });
 *
 * // Update to specific version
 * const exitCode = await updateCommand({ version: '2.0.0' });
 *
 * // Update global only with force
 * const exitCode = await updateCommand({ global: true, force: true });
 */
export async function updateCommand(options = {}) {
  const verbose = options.verbose || false;
  setVerbose(verbose);

  logger.debug('Starting update command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, beta=${options.beta}, version=${options.version}, force=${options.force}, verbose=${verbose}`);

  try {
    logger.heading('GSD-OpenCode Update');
    logger.dim('===================');
    logger.dim('');

    // Determine scopes to check
    const scopesToCheck = [];
    if (options.global) {
      scopesToCheck.push('global');
    } else if (options.local) {
      scopesToCheck.push('local');
    } else {
      scopesToCheck.push('global', 'local');
    }

    let anyInstalled = false;
    let anyUpdated = false;
    let anyFailed = false;

    for (const scope of scopesToCheck) {
      try {
        const scopeManager = new ScopeManager({ scope });
        const scopeLabel = scope.charAt(0).toUpperCase() + scope.slice(1);

        logger.debug(`Checking ${scope} installation...`);

        // Check if installed (unless --force which allows fresh install)
        if (!scopeManager.isInstalled() && !options.force) {
          logger.info(`No installation found at ${scopeLabel.toLowerCase()} scope`);
          logger.dim('');
          continue;
        }

        anyInstalled = true;

        // Create service instances
        const backupManager = new BackupManager(scopeManager, logger);
        const fileOps = new FileOperations(scopeManager, logger);
        const npmRegistry = new NpmRegistry({ logger });

        // Determine package name
        const packageName = options.beta ? '@rokicool/gsd-opencode' : 'gsd-opencode';

        // Create UpdateService
        const updateService = new UpdateService({
          scopeManager,
          backupManager,
          fileOps,
          npmRegistry,
          logger,
          packageName
        });

        // Check for updates
        logger.debug('Checking for available updates...');
        const checkResult = await updateService.checkForUpdate();

        if (checkResult.error) {
          logger.error(`Failed to check for updates: ${checkResult.error}`);
          anyFailed = true;
          continue;
        }

        // Handle already up to date
        if (!checkResult.updateAvailable && !options.version) {
          logger.success(`${scopeLabel} installation is up to date (${checkResult.currentVersion})`);
          logger.dim('');
          continue;
        }

        // Determine target version
        const targetVersion = options.version || checkResult.latestVersion;

        if (!targetVersion) {
          logger.error('Could not determine target version');
          anyFailed = true;
          continue;
        }

        // Display update info
        displayUpdateInfo(checkResult.currentVersion, targetVersion, scopeLabel);

        // If specific version requested, validate it exists
        if (options.version) {
          const versionExists = await npmRegistry.versionExists(packageName, options.version);
          if (!versionExists) {
            logger.error(`Version ${options.version} does not exist for ${packageName}`);
            anyFailed = true;
            continue;
          }
        }

        // Prompt for confirmation (unless --force)
        if (!options.force) {
          logger.debug('Requesting user confirmation...');
          const confirmed = await promptConfirmation(
            `Proceed with update to ${targetVersion}?`,
            true
          );

          // Handle SIGINT (Ctrl+C) - user cancelled with interrupt
          if (confirmed === null) {
            logger.info('Update cancelled');
            return ERROR_CODES.INTERRUPTED;
          }

          // Handle explicit "no" response
          if (!confirmed) {
            logger.info('Update cancelled');
            return ERROR_CODES.SUCCESS;
          }

          logger.debug('User confirmed update');
        } else {
          logger.debug('Skipping confirmation (--force flag)');
        }

        // Perform update with progress indication
        const spinner = ora({
          text: 'Starting update...',
          spinner: 'dots',
          color: 'cyan'
        }).start();

        const updateResult = await updateService.performUpdate(targetVersion, {
          onProgress: ({ phase, current, total, message, overallProgress }) => {
            spinner.text = `${phase}: ${message} (${overallProgress}%)`;
          }
        });

        if (updateResult.success) {
          spinner.succeed(`Updated to ${targetVersion}`);
        } else {
          spinner.fail('Update failed');
        }

        logger.dim('');

        // Display results
        displayUpdateResults(updateResult, scopeLabel);

        // Show backup location if created
        if (updateResult.stats.backupCreated) {
          const backupDir = backupManager.getBackupDir();
          logger.dim(`Backup saved to: ${backupDir}`);
          logger.dim('');
        }

        // Track overall status
        if (updateResult.success) {
          anyUpdated = true;
        } else {
          anyFailed = true;
        }

      } catch (error) {
        logger.error(`Failed to update ${scope} installation: ${error.message}`);
        anyFailed = true;

        if (verbose) {
          logger.debug(error.stack);
        }
      }
    }

    // Overall status message
    logger.dim('');

    if (!anyInstalled && !options.force) {
      logger.info('No GSD-OpenCode installation found to update');
      logger.dim('');
      logger.info("Run 'gsd-opencode install' to install");
      logger.dim('');
      return ERROR_CODES.SUCCESS;
    }

    if (anyFailed) {
      logger.error('Some updates failed. Run gsd-opencode check for details.');
      return ERROR_CODES.GENERAL_ERROR;
    }

    if (anyUpdated) {
      logger.success('All updates completed successfully');
    }

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    // Handle Ctrl+C during async operations (AbortPromptError from @inquirer/prompts)
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('Update cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    // Handle permission errors (EACCES)
    if (error.code === 'EACCES') {
      logger.error('Permission denied: Cannot access installation directory');
      logger.dim('');
      logger.dim('Suggestion: Check directory permissions or run with appropriate privileges');
      return ERROR_CODES.PERMISSION_ERROR;
    }

    // Handle network errors
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      logger.error('Network error: Unable to reach npm registry');
      logger.dim('');
      logger.dim('Suggestion: Check your internet connection and try again');
      return ERROR_CODES.GENERAL_ERROR;
    }

    // Handle version not found
    if (error.message?.includes('not found') || error.message?.includes('E404')) {
      logger.error(`Package or version not found: ${error.message}`);
      return ERROR_CODES.GENERAL_ERROR;
    }

    // Handle all other errors
    logger.error(`Update failed: ${error.message}`);

    if (verbose && error.stack) {
      logger.dim(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Default export for the update command.
 *
 * @example
 * import updateCommand from './commands/update.js';
 * const exitCode = await updateCommand({ beta: true });
 */
export default updateCommand;
