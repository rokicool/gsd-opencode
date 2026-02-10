/**
 * Install command for GSD-OpenCode CLI.
 *
 * This module provides the main install functionality, orchestrating the
 * installation process with support for global/local scope, interactive prompts,
 * file operations with progress indicators, and comprehensive error handling.
 *
 * Implements requirements:
 * - CLI-01: User can run gsd-opencode install to install the system
 * - INST-01: Install supports --global flag for global installation
 * - INST-02: Install supports --local flag for local installation
 * - INST-03: Install prompts interactively for location if neither flag provided
 * - INST-04: Install performs path replacement in .md files
 * - INST-05: Install supports --config-dir to specify custom directory
 * - INST-06: Install shows clear progress indicators during file operations
 * - INST-07: Install creates VERSION file to track installed version
 * - INST-08: Install validates target paths to prevent path traversal attacks
 * - INST-09: Install uses atomic operations (temp-then-move)
 * - INST-10: Install handles permission errors gracefully
 * - ERROR-02: All commands handle signal interrupts gracefully with cleanup
 *
 * @module install
 */

import { ScopeManager } from '../services/scope-manager.js';
import { ConfigManager } from '../services/config.js';
import { FileOperations } from '../services/file-ops.js';
import { logger, setVerbose } from '../utils/logger.js';
import { promptInstallScope, promptRepairOrFresh } from '../utils/interactive.js';
import { ERROR_CODES, DIRECTORIES_TO_COPY } from '../../lib/constants.js';
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
    // Get the directory of this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Navigate up to package root (from src/commands/ to package root)
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
 * Gets the source directory containing GSD-OpenCode files.
 *
 * @returns {string} Absolute path to the source directory
 * @private
 */
function getSourceDirectory() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '../..');

  // Source is the get-shit-done directory at package root
  // During development/distribution, this is where the files live
  return path.join(packageRoot, 'get-shit-done');
}

/**
 * Handles errors with helpful messages and appropriate exit codes.
 *
 * Categorizes errors by code and provides actionable suggestions:
 * - EACCES: Permission denied - suggest --local or sudo
 * - ENOENT: File not found - check source directory exists
 * - ENOSPC: Disk full - suggest freeing space
 * - Path traversal: Invalid path - suggest valid paths
 * - Generic: Show message with --verbose suggestion
 *
 * @param {Error} error - The error to handle
 * @param {boolean} verbose - Whether verbose mode is enabled
 * @returns {number} Exit code for the error
 */
function handleError(error, verbose) {
  // Log error in verbose mode
  if (verbose) {
    logger.debug(`Error details: ${error.stack || error.message}`);
    logger.debug(`Error code: ${error.code}`);
  }

  // Categorize by error code
  switch (error.code) {
    case 'EACCES':
      logger.error('Permission denied: Cannot write to installation directory');
      logger.dim('');
      logger.dim('Suggestion: Try one of the following:');
      logger.dim('  - Use --local for user directory installation');
      logger.dim('  - Use sudo for global system-wide install');
      logger.dim('  - Check directory ownership and permissions');
      return ERROR_CODES.PERMISSION_ERROR;

    case 'ENOENT':
      logger.error(`File or directory not found: ${error.message}`);
      logger.dim('');
      logger.dim('Suggestion: Check that the source directory exists and is accessible.');
      if (error.message.includes('get-shit-done')) {
        logger.dim('The get-shit-done directory may be missing from the package.');
      }
      return ERROR_CODES.GENERAL_ERROR;

    case 'ENOSPC':
      logger.error('Insufficient disk space for installation');
      logger.dim('');
      logger.dim('Suggestion: Free up disk space and try again');
      return ERROR_CODES.GENERAL_ERROR;

    case 'EEXIST':
      logger.error('Installation target already exists and cannot be overwritten');
      logger.dim('');
      logger.dim('Suggestion: Use --force or remove the existing installation first');
      return ERROR_CODES.GENERAL_ERROR;

    case 'ENOTEMPTY':
      // This is handled internally by file-ops, but catch it here too
      logger.error('Target directory is not empty');
      return ERROR_CODES.GENERAL_ERROR;

    default:
      // Check for path traversal errors from validatePath
      if (error.message?.includes('traversal') || error.message?.includes('outside allowed')) {
        logger.error('Invalid installation path: Path traversal detected');
        logger.dim('');
        logger.dim('Suggestion: Use absolute or relative paths within allowed directories');
        logger.dim('  - Global: within home directory (~/)');
        logger.dim('  - Local: within current working directory');
        return ERROR_CODES.PATH_TRAVERSAL;
      }

      // Generic error
      logger.error(`Installation failed: ${error.message}`);
      logger.dim('');
      if (!verbose) {
        logger.dim('Suggestion: Run with --verbose for detailed error information');
      }
      return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Performs pre-flight checks before installation.
 *
 * Verifies:
 * - Source directory exists
 * - Source directory contains expected subdirectories
 * - Parent directory of target is writable (if exists)
 *
 * @param {string} sourceDir - Source directory to check
 * @param {string} targetDir - Target directory for installation
 * @returns {Promise<void>}
 * @throws {Error} If pre-flight checks fail
 * @private
 */
async function preflightChecks(sourceDir, targetDir) {
  // Check source directory exists
  try {
    const sourceStat = await fs.stat(sourceDir);
    if (!sourceStat.isDirectory()) {
      throw new Error(`Source path is not a directory: ${sourceDir}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Source directory not found: ${sourceDir}\n` +
        'The get-shit-done directory may be missing from the package installation.'
      );
    }
    throw error;
  }

  // Check target parent directory exists and is writable
  const targetParent = path.dirname(targetDir);
  try {
    const parentStat = await fs.stat(targetParent);
    if (!parentStat.isDirectory()) {
      throw new Error(`Target parent is not a directory: ${targetParent}`);
    }

    // Test write permission by trying to access with write intent
    try {
      await fs.access(targetParent, fs.constants.W_OK);
    } catch (accessError) {
      // On some systems, access check might fail even if we can write
      // Try to create a test file
      const testFile = path.join(targetParent, '.gsd-write-test');
      try {
        await fs.writeFile(testFile, '', 'utf-8');
        await fs.unlink(testFile);
      } catch (writeError) {
        throw new Error(
          `Cannot write to target directory: ${targetParent}\n` +
          'Check directory permissions or run with appropriate privileges.'
        );
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Parent doesn't exist, we'll create it during install
      logger.debug(`Target parent directory does not exist, will create: ${targetParent}`);
    } else {
      throw error;
    }
  }

  // Check if target is a file (not directory)
  try {
    const targetStat = await fs.stat(targetDir);
    if (targetStat.isFile()) {
      throw new Error(`Target path exists and is a file: ${targetDir}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // ENOENT is fine - target doesn't exist yet
  }
}

/**
 * Main install command function.
 *
 * Orchestrates the installation process:
 * 1. Parse options and set verbose mode
 * 2. Determine installation scope (global/local) via flags or prompt
 * 3. Check for existing installation and prompt for action
 * 4. Perform installation with file operations
 * 5. Create VERSION file
 * 6. Show success summary
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Install globally
 * @param {boolean} [options.local] - Install locally
 * @param {string} [options.configDir] - Custom configuration directory
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code (0 for success, non-zero for errors)
 *
 * @example
 * // Install globally
 * await installCommand({ global: true });
 *
 * // Install locally with verbose output
 * await installCommand({ local: true, verbose: true });
 *
 * // Install interactively (prompts for scope)
 * await installCommand({});
 */
export async function installCommand(options = {}) {
  // Set verbose mode early
  const verbose = options.verbose || false;
  setVerbose(verbose);

  logger.debug('Starting install command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, configDir=${options.configDir}, verbose=${verbose}`);

  try {
    // Step 1: Determine scope
    let scope;
    if (options.global) {
      scope = 'global';
      logger.debug('Scope determined by --global flag');
    } else if (options.local) {
      scope = 'local';
      logger.debug('Scope determined by --local flag');
    } else {
      // Prompt user interactively
      logger.debug('No scope flags provided, prompting user...');
      scope = await promptInstallScope();

      if (scope === null) {
        // User cancelled (Ctrl+C)
        logger.info('Installation cancelled by user');
        return ERROR_CODES.INTERRUPTED;
      }
    }

    logger.debug(`Selected scope: ${scope}`);

    // Step 2: Create ScopeManager and ConfigManager
    const scopeManager = new ScopeManager({
      scope,
      configDir: options.configDir
    });
    const config = new ConfigManager(scopeManager);

    logger.debug(`Target directory: ${scopeManager.getTargetDir()}`);

    // Step 3: Check for existing installation
    if (scopeManager.isInstalled()) {
      const existingVersion = scopeManager.getInstalledVersion();
      logger.warning(`Existing installation detected${existingVersion ? ` (version ${existingVersion})` : ''}`);

      const action = await promptRepairOrFresh();

      if (action === 'cancel' || action === null) {
        logger.info('Installation cancelled by user');
        return ERROR_CODES.INTERRUPTED;
      }

      if (action === 'repair') {
        // Phase 4 will implement proper repair
        // For now, treat as fresh install
        logger.info('Repair selected - performing fresh install (repair functionality coming in Phase 4)');
      } else {
        logger.info('Fresh install selected - removing existing installation');
      }

      // Fresh install: remove existing directory
      const targetDir = scopeManager.getTargetDir();
      try {
        await fs.rm(targetDir, { recursive: true, force: true });
        logger.debug('Removed existing installation');
      } catch (error) {
        logger.warning(`Could not remove existing installation: ${error.message}`);
        // Continue anyway - file-ops will handle conflicts
      }
    }

    // Step 4: Show starting message
    const scopeLabel = scope === 'global' ? 'Global' : 'Local';
    const pathPrefix = scopeManager.getPathPrefix();
    logger.heading(`${scopeLabel} Installation`);
    logger.info(`Installing to ${pathPrefix}...`);

    // Step 5: Pre-flight checks
    const sourceDir = getSourceDirectory();
    const targetDir = scopeManager.getTargetDir();

    logger.debug(`Source directory: ${sourceDir}`);
    logger.debug(`Target directory: ${targetDir}`);

    await preflightChecks(sourceDir, targetDir);

    // Step 6: Perform installation
    const fileOps = new FileOperations(scopeManager, logger);
    const result = await fileOps.install(sourceDir, targetDir);

    // Step 7: Create VERSION file
    const version = await getPackageVersion();
    await config.setVersion(version);
    logger.debug(`Created VERSION file with version: ${version}`);

    // Step 8: Show success summary
    logger.success('Installation complete!');
    logger.dim('');
    logger.dim('Summary:');
    logger.dim(`  Files copied: ${result.filesCopied}`);
    logger.dim(`  Directories: ${result.directories}`);
    logger.dim(`  Location: ${pathPrefix}`);
    logger.dim(`  Version: ${version}`);

    if (verbose) {
      logger.dim('');
      logger.dim('Additional details:');
      logger.dim(`  Full path: ${targetDir}`);
      logger.dim(`  Scope: ${scope}`);
    }

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    // Handle Ctrl+C during async operations
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('\nInstallation cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    // Handle all other errors
    return handleError(error, verbose);
  }
}

/**
 * Default export for the install command.
 *
 * @example
 * import installCommand from './commands/install.js';
 * await installCommand({ global: true });
 */
export default installCommand;
