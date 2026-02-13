/**
 * Repair command for GSD-OpenCode CLI.
 *
 * This module provides the repair functionality to detect and fix broken
 * installations, showing a summary of issues before fixing, requiring
 * interactive confirmation, and displaying detailed post-repair reports.
 *
 * Implements requirements:
 * - CLI-04: User can run gsd-opencode repair to fix broken installations
 * - REPAIR-01: Repair detects and reinstalls missing files
 * - REPAIR-02: Repair detects and replaces corrupted files
 * - REPAIR-03: Repair fixes broken path references in .md files
 * - REPAIR-04: Repair shows summary of issues found before fixing
 * - REPAIR-05: Repair requires interactive confirmation before making changes
 * - ERROR-01: All commands handle permission errors (EACCES) with exit code 2
 * - ERROR-02: All commands handle signal interrupts (SIGINT/SIGTERM) gracefully
 * - ERROR-03: All commands support --verbose flag for detailed debugging output
 *
 * @module commands/repair
 * @description Repair command for fixing broken GSD-OpenCode installations
 * @example
 * // Repair with auto-detection
 * await repairCommand({});
 *
 * // Repair global installation
 * await repairCommand({ global: true });
 *
 * // Repair with verbose output
 * await repairCommand({ verbose: true });
 */

import { ScopeManager } from '../services/scope-manager.js';
import { BackupManager } from '../services/backup-manager.js';
import { FileOperations } from '../services/file-ops.js';
import { RepairService } from '../services/repair-service.js';
import { STRUCTURE_TYPES } from '../services/structure-detector.js';
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
 * Displays a formatted summary of detected issues.
 *
 * Groups issues by category: Missing Files, Corrupted Files, Path Issues.
 * Shows count and lists files for each category.
 *
 * @param {Object} issues - Issues object from detectIssues()
 * @param {string} scopeLabel - Label for this scope (Global/Local)
 * @private
 */
function displayIssuesSummary(issues, scopeLabel) {
  logger.heading(`${scopeLabel} Installation Repair`);
  logger.dim('================================');
  logger.dim('');

  // Missing Files
  if (issues.missingFiles && issues.missingFiles.length > 0) {
    logger.info(`Missing Files (${issues.missingFiles.length}):`);
    for (const file of issues.missingFiles) {
      logger.dim(`  ✗ ${file.name}`);
    }
    logger.dim('');
  }

  // Corrupted Files
  if (issues.corruptedFiles && issues.corruptedFiles.length > 0) {
    logger.info(`Corrupted Files (${issues.corruptedFiles.length}):`);
    for (const file of issues.corruptedFiles) {
      logger.dim(`  ✗ ${file.relative}`);
    }
    logger.dim('');
  }

  // Path Issues
  if (issues.pathIssues && issues.pathIssues.length > 0) {
    logger.info(`Path Issues (${issues.pathIssues.length}):`);
    for (const file of issues.pathIssues) {
      logger.dim(`  ✗ ${file.relative}`);
    }
    logger.dim('');
  }

  // Total
  logger.info(`Total issues: ${issues.totalIssues}`);
  logger.dim('');
}

/**
 * Displays detailed post-repair results.
 *
 * Shows success/failure status for each repaired file grouped by category.
 *
 * @param {Object} results - Repair results from repairService.repair()
 * @param {string} scopeLabel - Label for this scope (Global/Local)
 * @private
 */
function displayRepairResults(results, scopeLabel) {
  logger.heading(`Repair Results for ${scopeLabel} Installation`);
  logger.dim('=====================================');
  logger.dim('');

  // Missing Files results
  if (results.results.missing && results.results.missing.length > 0) {
    const succeeded = results.results.missing.filter(r => r.success).length;
    const failed = results.results.missing.filter(r => !r.success).length;
    const status = failed === 0 ? `${succeeded} fixed` : `${succeeded} fixed, ${failed} failed`;
    logger.info(`Missing Files: ${status}`);

    for (const result of results.results.missing) {
      if (result.success) {
        logger.success(`  ✓ ${path.basename(result.file)}`);
      } else {
        logger.error(`  ✗ ${path.basename(result.file)} (${result.error})`);
      }
    }
    logger.dim('');
  }

  // Corrupted Files results
  if (results.results.corrupted && results.results.corrupted.length > 0) {
    const succeeded = results.results.corrupted.filter(r => r.success).length;
    const failed = results.results.corrupted.filter(r => !r.success).length;
    const status = failed === 0 ? `${succeeded} fixed` : `${succeeded} fixed, ${failed} failed`;
    logger.info(`Corrupted Files: ${status}`);

    for (const result of results.results.corrupted) {
      const fileName = path.basename(result.file);
      if (result.success) {
        logger.success(`  ✓ ${fileName}`);
      } else {
        logger.error(`  ✗ ${fileName} (${result.error})`);
      }
    }
    logger.dim('');
  }

  // Path Issues results
  if (results.results.paths && results.results.paths.length > 0) {
    const succeeded = results.results.paths.filter(r => r.success).length;
    const failed = results.results.paths.filter(r => !r.success).length;
    const status = failed === 0 ? `${succeeded} fixed` : `${succeeded} fixed, ${failed} failed`;
    logger.info(`Path Issues: ${status}`);

    for (const result of results.results.paths) {
      const fileName = path.basename(result.file);
      if (result.success) {
        logger.success(`  ✓ ${fileName}`);
      } else {
        logger.error(`  ✗ ${fileName} (${result.error})`);
      }
    }
    logger.dim('');
  }

  // Summary
  const totalSucceeded = results.stats.succeeded;
  const totalFailed = results.stats.failed;
  logger.info(`Summary: ${totalSucceeded} succeeded, ${totalFailed} failed`);
  logger.dim('');
}

/**
 * Checks a single scope for issues and returns results.
 *
 * @param {string} scope - 'global' or 'local'
 * @param {Object} options - Options
 * @param {boolean} options.verbose - Enable verbose output
 * @param {boolean} options.fixStructure - Fix structure issues
 * @param {boolean} options.fixAll - Fix all issues including structure
 * @returns {Promise<Object>} Check results with installed flag, issues, and scopeLabel
 * @private
 */
async function checkScope(scope, options = {}) {
  const scopeManager = new ScopeManager({ scope });
  const scopeLabel = scope.charAt(0).toUpperCase() + scope.slice(1);

  logger.debug(`Checking ${scope} installation for issues...`);

  const isInstalled = await scopeManager.isInstalled();
  if (!isInstalled) {
    logger.debug(`No ${scope} installation found`);
    return {
      installed: false,
      scope,
      scopeLabel,
      issues: null
    };
  }

  logger.debug(`${scope} installation detected, detecting issues...`);

  const backupManager = new BackupManager(scopeManager, logger);
  const fileOps = new FileOperations(scopeManager, logger);
  const expectedVersion = await getPackageVersion();

  const repairService = new RepairService({
    scopeManager,
    backupManager,
    fileOps,
    logger,
    expectedVersion
  });

  try {
    // Check structure first
    const structureCheck = await repairService.checkStructure();

    // Handle structure issues if requested
    if ((options.fixStructure || options.fixAll) && structureCheck.canRepair) {
      logger.info(`Repairing ${scope} structure (${structureCheck.type})...`);

      const structureResult = structureCheck.type === STRUCTURE_TYPES.DUAL
        ? await repairService.fixDualStructure()
        : await repairService.repairStructure();

      if (structureResult.repaired || structureResult.fixed) {
        logger.success(`Structure repaired: ${structureResult.message}`);
        if (structureResult.backup) {
          logger.dim(`Backup created: ${structureResult.backup}`);
        }
      } else {
        logger.warning(`Structure repair: ${structureResult.message}`);
      }

      logger.dim('');
    }

    // Detect file issues
    const issues = await repairService.detectIssues();

    return {
      installed: true,
      scope,
      scopeLabel,
      issues,
      repairService,
      backupManager,
      structureCheck
    };
  } catch (error) {
    logger.debug(`Error during issue detection: ${error.message}`);
    return {
      installed: true,
      scope,
      scopeLabel,
      issues: null,
      error: error.message
    };
  }
}

/**
 * Main repair command function.
 *
 * Orchestrates the repair process:
 * 1. Parse options and set verbose mode
 * 2. Determine scopes to check (global, local, or both)
 * 3. For each scope:
 *    - Detect installation issues using RepairService
 *    - Check for structure issues (dual/old structure)
 *    - Repair structure if --fix-structure or --fix-all flag provided
 *    - Display summary of issues found
 *    - Prompt for user confirmation
 *    - Perform repairs with progress indication
 *    - Display post-repair results
 * 4. Return appropriate exit code
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Repair global installation only
 * @param {boolean} [options.local] - Repair local installation only
 * @param {boolean} [options.verbose] - Enable verbose output for debugging
 * @param {boolean} [options.fixStructure] - Fix structure issues (migrate old to new)
 * @param {boolean} [options.fixAll] - Fix all issues including structure
 * @returns {Promise<number>} Exit code (0=success, 1=error, 2=permission, 130=interrupted)
 * @async
 *
 * @example
 * // Repair with auto-detection
 * const exitCode = await repairCommand({});
 *
 * // Repair global installation
 * const exitCode = await repairCommand({ global: true });
 *
 * // Repair with verbose output
 * const exitCode = await repairCommand({ verbose: true });
 *
 * // Fix structure issues only
 * const exitCode = await repairCommand({ fixStructure: true });
 *
 * // Fix all issues including structure
 * const exitCode = await repairCommand({ fixAll: true });
 */
export async function repairCommand(options = {}) {
  const verbose = options.verbose || false;
  const fixStructure = options.fixStructure || false;
  const fixAll = options.fixAll || false;
  setVerbose(verbose);

  logger.debug('Starting repair command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, verbose=${verbose}, fixStructure=${fixStructure}, fixAll=${fixAll}`);

  try {
    logger.heading('GSD-OpenCode Installation Repair');
    logger.dim('================================');
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
    let anyRepaired = false;
    let anyFailed = false;

    for (const scope of scopesToCheck) {
      try {
        const result = await checkScope(scope, options);

        if (!result.installed) {
          logger.info(`No installation found at ${result.scopeLabel.toLowerCase()} scope`);
          logger.dim('');
          continue;
        }

        anyInstalled = true;

        if (result.error) {
          logger.error(`Failed to check ${scope} installation: ${result.error}`);
          anyFailed = true;
          continue;
        }

        // Check if there are structure issues to report
        const hasStructureIssues = result.structureCheck &&
                                   (result.structureCheck.type === STRUCTURE_TYPES.OLD ||
                                    result.structureCheck.type === STRUCTURE_TYPES.DUAL);

        // Handle structure-only repair mode
        if (fixStructure || fixAll) {
          // Structure was already repaired in checkScope
          if (!result.issues.hasIssues && !hasStructureIssues) {
            logger.success(`No issues detected at ${result.scopeLabel.toLowerCase()} scope`);
            logger.dim('');
            continue;
          }
        } else if (!result.issues.hasIssues) {
          // No file issues - but check for structure issues to report
          if (hasStructureIssues) {
            logger.warning(`No file issues, but structure requires attention`);
            logger.info(`  Current structure: ${result.structureCheck.type}`);
            logger.info(`  Run with --fix-structure to repair`);
            logger.dim('');
          } else {
            logger.success(`No issues detected at ${result.scopeLabel.toLowerCase()} scope`);
            logger.dim('');
          }
          continue;
        }

        // Display issues summary
        if (scopesToCheck.length > 1) {
          logger.dim('');
        }
        displayIssuesSummary(result.issues, result.scopeLabel);

        // Prompt for confirmation (repair always requires confirmation)
        logger.debug('Requesting user confirmation...');
        const confirmed = await promptConfirmation('Proceed with repairs?', false);

        // Handle SIGINT (Ctrl+C) - user cancelled with interrupt
        if (confirmed === null) {
          logger.info('Repair cancelled');
          return ERROR_CODES.INTERRUPTED;
        }

        // Handle explicit "no" response
        if (!confirmed) {
          logger.info('Repair cancelled');
          return ERROR_CODES.SUCCESS;
        }

        logger.debug('User confirmed repair');

        // Perform repairs with progress indication
        const spinner = ora({
          text: 'Starting repairs...',
          spinner: 'dots',
          color: 'cyan'
        }).start();

        const repairResult = await result.repairService.repair(result.issues, {
          onProgress: ({ current, total }) => {
            const percent = Math.round((current / total) * 100);
            spinner.text = `Repairing ${current}/${total} files... (${percent}%)`;
          }
        });

        if (repairResult.success) {
          spinner.succeed('Repairs completed');
        } else {
          spinner.fail('Some repairs failed');
        }

        logger.dim('');

        // Display post-repair results
        displayRepairResults(repairResult, result.scopeLabel);

        // Show backup location
        const backupDir = result.backupManager.getBackupDir();
        logger.dim(`Backups saved to: ${backupDir}`);
        logger.dim('');

        // Track overall status
        if (repairResult.stats.succeeded > 0) {
          anyRepaired = true;
        }
        if (repairResult.stats.failed > 0) {
          anyFailed = true;
        }

      } catch (error) {
        logger.error(`Failed to repair ${scope} installation: ${error.message}`);
        anyFailed = true;

        if (verbose) {
          logger.debug(error.stack);
        }
      }
    }

    // Overall status message
    logger.dim('');

    if (!anyInstalled) {
      logger.info('No GSD-OpenCode installation found to repair');
      logger.dim('');
      logger.info("Run 'gsd-opencode install' to install");
      logger.dim('');
      return ERROR_CODES.SUCCESS;
    }

    if (anyFailed) {
      logger.error('Some repairs failed. Run gsd-opencode check for details.');
      return ERROR_CODES.GENERAL_ERROR;
    }

    if (anyRepaired) {
      logger.success('All repairs completed successfully');
    }

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    // Handle Ctrl+C during async operations (AbortPromptError from @inquirer/prompts)
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('Repair cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    // Handle permission errors (EACCES)
    if (error.code === 'EACCES') {
      logger.error('Permission denied: Cannot access installation directory');
      logger.dim('');
      logger.dim('Suggestion: Check directory permissions or run with appropriate privileges');
      return ERROR_CODES.PERMISSION_ERROR;
    }

    // Handle all other errors
    logger.error(`Repair failed: ${error.message}`);

    if (verbose && error.stack) {
      logger.dim(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Default export for the repair command.
 *
 * @example
 * import repairCommand from './commands/repair.js';
 * const exitCode = await repairCommand({ global: true });
 */
export default repairCommand;
