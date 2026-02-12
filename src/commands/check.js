/**
 * Check command for GSD-OpenCode CLI.
 *
 * This module provides the check functionality to verify installation health,
 * showing detailed pass/fail results for file existence, version matching,
 * and file integrity checks.
 *
 * Implements requirements:
 * - CLI-03: User can run gsd-opencode check to verify installation health
 * - CHECK-01: Check verifies all required files exist
 * - CHECK-02: Check verifies installed version matches expected version
 * - CHECK-03: Check detects corrupted or modified files
 * - CHECK-04: Check provides clear pass/fail output for each verification
 * - CHECK-05: Check returns appropriate exit codes (0 for healthy, non-zero for issues)
 * - ERROR-03: All commands support --verbose flag for detailed debugging output
 * - ERROR-06: CLI shows consistent branding and formatted output using colors
 *
 * @module check
 */

import { ScopeManager } from '../services/scope-manager.js';
import { HealthChecker } from '../services/health-checker.js';
import { logger, setVerbose } from '../utils/logger.js';
import { ERROR_CODES } from '../../lib/constants.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
 * Displays health check results with pass/fail indicators.
 *
 * @param {Object} results - Health check results from HealthChecker
 * @param {string} scopeLabel - Label for this scope
 * @private
 */
function displayCheckResults(results, scopeLabel) {
  logger.heading(`${scopeLabel} Installation Health`);
  logger.dim('================================');

  if (!results) {
    logger.info('Not installed');
    logger.dim('');
    return;
  }

  const { categories } = results;

  // Files check section
  logger.dim('');
  logger.info('Required Files');
  if (categories.files && categories.files.checks) {
    for (const check of categories.files.checks) {
      const status = check.passed ? 'OK' : (check.error || 'Missing');
      if (check.passed) {
        logger.success(`${check.name}: ${status}`);
      } else {
        logger.error(`${check.name}: ${status}`);
      }
    }
  }

  // Version check section
  if (categories.version) {
    logger.dim('');
    logger.info('Version Verification');
    const versionCheck = categories.version.checks[0];
    if (versionCheck.passed) {
      logger.success(`Version: ${versionCheck.installed} - OK`);
    } else {
      const errorMsg = versionCheck.error
        ? `Version check failed - ${versionCheck.error}`
        : `Version mismatch (installed: ${versionCheck.installed || 'none'}, expected: ${versionCheck.expected})`;
      logger.error(errorMsg);
    }
  }

  // Integrity check section
  logger.dim('');
  logger.info('File Integrity');
  if (categories.integrity && categories.integrity.checks) {
    for (const check of categories.integrity.checks) {
      const relativePath = check.relative || path.basename(check.file);
      const message = check.passed
        ? `${relativePath} - OK`
        : `${relativePath} - ${check.error || 'Corrupted or missing'}`;

      if (check.passed) {
        logger.success(message);
      } else {
        logger.error(message);
      }
    }
  }

  // Structure check section (NEW)
  if (categories.structure) {
    logger.dim('');
    logger.info('Directory Structure');
    const structure = categories.structure;
    const statusText = structure.label;

    if (structure.type === 'dual') {
      logger.error(`${statusText} - Action required`);
      logger.dim('  Both old (command/gsd/) and new (commands/gsd/) structures detected.');
      logger.dim('  This can happen if an update was interrupted.');
      logger.dim("  Run 'gsd-opencode update' to complete migration");
    } else if (structure.needsMigration) {
      logger.warning(`${statusText} - Migration recommended`);
      logger.dim("  Run 'gsd-opencode update' to migrate to new structure");
    } else if (structure.type === 'new') {
      logger.success(`${statusText} - OK`);
    } else if (structure.type === 'none') {
      logger.info(`${statusText}`);
    } else {
      logger.info(statusText);
    }
  }

  // Overall status
  logger.dim('');
  if (results.passed) {
    logger.success('All checks passed - Installation is healthy');
  } else {
    logger.error('Some checks failed - Issues detected');
  }
  logger.dim('');
}

/**
 * Checks health for a single scope.
 *
 * @param {string} scope - 'global' or 'local'
 * @param {Object} options - Options
 * @param {boolean} options.verbose - Enable verbose output
 * @returns {Promise<Object>} Health check results
 * @private
 */
async function checkScope(scope, options = {}) {
  const scopeManager = new ScopeManager({ scope });
  const scopeLabel = scope.charAt(0).toUpperCase() + scope.slice(1);

  logger.debug(`Checking ${scope} installation...`);

  if (!scopeManager.isInstalled()) {
    logger.debug(`No ${scope} installation found`);
    return {
      installed: false,
      scope,
      scopeLabel,
      results: null,
      passed: false
    };
  }

  logger.debug(`${scope} installation detected, running health checks...`);

  const healthChecker = new HealthChecker(scopeManager);
  const expectedVersion = await getPackageVersion();

  try {
    const results = await healthChecker.checkAll({
      expectedVersion,
      verbose: options.verbose
    });

    return {
      installed: true,
      scope,
      scopeLabel,
      results,
      passed: results.passed
    };
  } catch (error) {
    logger.debug(`Error during health check: ${error.message}`);
    return {
      installed: true,
      scope,
      scopeLabel,
      results: null,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Handles errors with helpful messages.
 *
 * @param {Error} error - The error to handle
 * @param {boolean} verbose - Whether verbose mode is enabled
 * @returns {number} Exit code for the error
 * @private
 */
function handleError(error, verbose) {
  if (verbose) {
    logger.debug(`Error details: ${error.stack || error.message}`);
    logger.debug(`Error code: ${error.code}`);
  }

  if (error.code === 'EACCES') {
    logger.error('Permission denied: Cannot access installation directory');
    logger.dim('');
    logger.dim('Suggestion: Check directory permissions or run with appropriate privileges.');
    return ERROR_CODES.PERMISSION_ERROR;
  }

  logger.error(`Failed to check installation health: ${error.message}`);

  if (!verbose) {
    logger.dim('');
    logger.dim('Suggestion: Run with --verbose for detailed error information');
  }

  return ERROR_CODES.GENERAL_ERROR;
}

/**
 * Main check command function.
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Check global installation only
 * @param {boolean} [options.local] - Check local installation only
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code
 */
export async function checkCommand(options = {}) {
  const verbose = options.verbose || false;
  setVerbose(verbose);

  logger.debug('Starting check command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, verbose=${verbose}`);

  try {
    logger.heading('GSD-OpenCode Installation Health');
    logger.dim('================================');

    const scopesToCheck = [];
    if (options.global) {
      scopesToCheck.push('global');
    } else if (options.local) {
      scopesToCheck.push('local');
    } else {
      scopesToCheck.push('global', 'local');
    }

    let anyInstalled = false;
    let allPassed = true;

    for (const scope of scopesToCheck) {
      try {
        const result = await checkScope(scope, options);

        if (result.installed) {
          anyInstalled = true;
          if (!result.passed) {
            allPassed = false;
          }
        }

        if (scopesToCheck.length > 1) {
          logger.dim('');
        }

        displayCheckResults(result.results, result.scopeLabel);

        if (verbose && result.error) {
          logger.debug(`Error checking ${scope}: ${result.error}`);
        }
      } catch (error) {
        logger.error(`Failed to check ${scope} installation: ${error.message}`);
        allPassed = false;

        if (verbose) {
          logger.debug(error.stack);
        }
      }
    }

    if (!anyInstalled) {
      logger.dim('');
      logger.dim('Not installed anywhere');
      logger.dim('');
      logger.info("Run 'gsd-opencode install' to install");
      logger.dim('');
      return ERROR_CODES.SUCCESS;
    }

    const exitCode = allPassed ? ERROR_CODES.SUCCESS : ERROR_CODES.GENERAL_ERROR;

    if (verbose) {
      logger.debug(`Check complete. Exit code: ${exitCode}`);
    }

    return exitCode;

  } catch (error) {
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('Command cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    return handleError(error, verbose);
  }
}

export default checkCommand;
