/**
 * List command for GSD-OpenCode CLI.
 *
 * This module provides the list functionality to display installation status,
 * showing version, location, and scope for global and/or local installations.
 *
 * Implements requirements:
 * - CLI-06: User can run gsd-opencode list to show installed version and location
 * - LIST-01: List shows currently installed version
 * - LIST-02: List shows installation location (global or local path)
 * - LIST-03: List shows installation scope (global vs local)
 * - LIST-04: List handles case when not installed with appropriate message
 * - ERROR-03: All commands support --verbose flag for detailed debugging output
 * - ERROR-06: CLI shows consistent branding and formatted output using colors
 *
 * @module list
 */

import { ScopeManager } from '../services/scope-manager.js';
import { ConfigManager } from '../services/config.js';
import { logger, setVerbose } from '../utils/logger.js';
import { ERROR_CODES } from '../../lib/constants.js';

/**
 * Displays installation information for a single scope.
 *
 * @param {Object} info - Installation information object
 * @param {boolean} info.installed - Whether GSD-OpenCode is installed
 * @param {string|null} info.version - The installed version
 * @param {string} info.location - Absolute path to installation directory
 * @param {string} info.scope - 'global' or 'local'
 * @param {string} info.pathPrefix - Display-friendly path
 * @private
 */
function displayInstallationInfo(info) {
  if (info.installed) {
    logger.info(`Scope:    ${info.scope}`);
    logger.info(`Location: ${info.pathPrefix}`);
    logger.info(`Version:  ${info.version || 'unknown'}`);
  } else {
    logger.info('Not installed');
  }
}

/**
 * Displays a separator line.
 *
 * @private
 */
function displaySeparator() {
  logger.dim('================================');
}

/**
 * Checks and displays installation status for a single scope.
 *
 * @param {string} scope - 'global' or 'local'
 * @param {Object} options - Options
 * @param {boolean} options.verbose - Enable verbose output
 * @returns {Promise<Object>} Installation info object
 * @private
 */
async function checkScope(scope, options = {}) {
  const scopeManager = new ScopeManager({ scope });
  const config = new ConfigManager(scopeManager);

  logger.debug(`Checking ${scope} installation...`);

  try {
    const info = await config.getInstallationInfo();

    if (options.verbose) {
      logger.debug(`  Full path: ${info.location}`);
      logger.debug(`  VERSION file: ${info.location}/VERSION`);
    }

    return info;
  } catch (error) {
    logger.debug(`Error checking ${scope} scope: ${error.message}`);

    // Return not installed on error
    return {
      installed: false,
      version: null,
      location: scopeManager.getTargetDir(),
      scope: scope,
      pathPrefix: scopeManager.getPathPrefix(),
      error: error.message
    };
  }
}

/**
 * Lists installation status for all scopes.
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Check global installation only
 * @param {boolean} [options.local] - Check local installation only
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<Object>} Result with exit code
 * @private
 */
async function listAllScopes(options = {}) {
  logger.heading('GSD-OpenCode Installation Status');
  displaySeparator();

  const scopesToCheck = [];

  if (options.global) {
    scopesToCheck.push('global');
  } else if (options.local) {
    scopesToCheck.push('local');
  } else {
    scopesToCheck.push('global', 'local');
  }

  const results = [];
  let anyInstalled = false;
  let hasError = false;

  for (const scope of scopesToCheck) {
    try {
      const info = await checkScope(scope, options);
      results.push(info);

      if (info.installed) {
        anyInstalled = true;
      }

      // Display this scope's status
      if (scopesToCheck.length > 1) {
        logger.dim('');
        logger.heading(`${scope.charAt(0).toUpperCase() + scope.slice(1)} Installation`);
      }

      displayInstallationInfo(info);

      if (options.verbose && info.error) {
        logger.debug(`Error checking ${scope}: ${info.error}`);
      }
    } catch (error) {
      hasError = true;
      logger.error(`Failed to check ${scope} installation: ${error.message}`);

      if (options.verbose) {
        logger.debug(error.stack);
      }
    }
  }

  // Show "not installed anywhere" message if nothing found
  if (!anyInstalled && !hasError) {
    logger.dim('');
    logger.dim('Not installed anywhere');
    logger.dim('');
    logger.info("Run 'gsd-opencode install' to install");
  }

  return {
    exitCode: hasError ? ERROR_CODES.GENERAL_ERROR : ERROR_CODES.SUCCESS,
    results,
    anyInstalled
  };
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

  // Check for permission errors
  if (error.code === 'EACCES') {
    logger.error('Permission denied: Cannot access installation directory');
    logger.dim('');
    logger.dim('Suggestion: Check directory permissions or run with appropriate privileges.');
    return ERROR_CODES.PERMISSION_ERROR;
  }

  // Generic error
  logger.error(`Failed to list installation status: ${error.message}`);

  if (!verbose) {
    logger.dim('');
    logger.dim('Suggestion: Run with --verbose for detailed error information');
  }

  return ERROR_CODES.GENERAL_ERROR;
}

/**
 * Main list command function.
 *
 * Displays installation status for GSD-OpenCode. Shows version, location,
 * and scope information for installed instances, or "Not installed" message
 * when nothing is found.
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Show global installation only
 * @param {boolean} [options.local] - Show local installation only
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code (0 for success, non-zero for errors)
 *
 * @example
 * // List all installations
 * await listCommand({});
 *
 * // List global installation only
 * await listCommand({ global: true });
 *
 * // List local installation only
 * await listCommand({ local: true });
 *
 * // List with verbose output
 * await listCommand({ verbose: true });
 */
export async function listCommand(options = {}) {
  // Set verbose mode early
  const verbose = options.verbose || false;
  setVerbose(verbose);

  logger.debug('Starting list command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, verbose=${verbose}`);

  try {
    const result = await listAllScopes(options);
    return result.exitCode;

  } catch (error) {
    // Handle Ctrl+C
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('\nCommand cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    // Handle all other errors
    return handleError(error, verbose);
  }
}

/**
 * Default export for the list command.
 *
 * @example
 * import listCommand from './commands/list.js';
 * await listCommand({ global: true });
 */
export default listCommand;
