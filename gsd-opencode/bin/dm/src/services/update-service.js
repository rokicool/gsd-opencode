/**
 * Update service for orchestrating GSD-OpenCode version updates.
 *
 * This module provides the core update logic that coordinates all aspects of updating
 * GSD-OpenCode: detecting current version, checking for updates, performing health checks,
 * creating backups, installing new versions, and verifying results. It is the core business
 * logic for the update command.
 *
 * Works in conjunction with NpmRegistry for version queries, ScopeManager for path resolution,
 * BackupManager for safe backups, FileOperations for installation, and HealthChecker for
 * pre/post validation.
 *
 * @module update-service
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScopeManager } from './scope-manager.js';
import { BackupManager } from './backup-manager.js';
import { FileOperations } from './file-ops.js';
import { NpmRegistry } from '../utils/npm-registry.js';
import { StructureDetector, STRUCTURE_TYPES } from './structure-detector.js';

const execAsync = promisify(exec);

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manages update operations for GSD-OpenCode installations.
 *
 * This class provides methods to check for available updates and perform updates
 * safely with health checks, backup creation, and progress reporting. It uses a
 * phased approach: pre-update validation, backup, install, and post-update verification.
 *
 * @class UpdateService
 * @example
 * const scope = new ScopeManager({ scope: 'global' });
 * const backupManager = new BackupManager(scope, logger);
 * const fileOps = new FileOperations(scope, logger);
 * const npmRegistry = new NpmRegistry(logger);
 * const updateService = new UpdateService({
 *   scopeManager: scope,
 *   backupManager,
 *   fileOps,
 *   npmRegistry,
 *   logger,
 *   packageName: 'gsd-opencode'
 * });
 *
 * // Check for updates
 * const updateInfo = await updateService.checkForUpdate();
 * if (updateInfo.updateAvailable) {
 *   console.log(`Update available: ${updateInfo.currentVersion} -> ${updateInfo.latestVersion}`);
 *
 *   // Perform update with progress tracking
 *   const result = await updateService.performUpdate(null, {
 *     onProgress: ({ phase, current, total, message }) => {
 *       console.log(`${phase}: ${current}/${total} - ${message}`);
 *     }
 *   });
 *
 *   console.log(`Update ${result.success ? 'successful' : 'failed'}`);
 * }
 */
export class UpdateService {
  /**
   * Creates a new UpdateService instance.
   *
   * @param {Object} dependencies - Required dependencies
   * @param {ScopeManager} dependencies.scopeManager - ScopeManager instance for path resolution
   * @param {BackupManager} dependencies.backupManager - BackupManager instance for creating backups
   * @param {FileOperations} dependencies.fileOps - FileOperations instance for file installation
   * @param {NpmRegistry} dependencies.npmRegistry - NpmRegistry instance for version queries
   * @param {Object} dependencies.logger - Logger instance for output
   * @param {string} [dependencies.packageName='gsd-opencode'] - Package name to update (can be '@rokicool/gsd-opencode' for beta)
   * @throws {Error} If any required dependency is missing or invalid
   *
   * @example
   * const updateService = new UpdateService({
   *   scopeManager: scope,
   *   backupManager,
   *   fileOps,
   *   npmRegistry,
   *   logger,
   *   packageName: 'gsd-opencode'
   * });
   */
  constructor(dependencies) {
    // Validate all required dependencies
    if (!dependencies) {
      throw new Error('Dependencies object is required');
    }

    const { scopeManager, backupManager, fileOps, npmRegistry, logger, packageName } = dependencies;

    // Validate scopeManager
    if (!scopeManager) {
      throw new Error('ScopeManager instance is required');
    }
    if (typeof scopeManager.getTargetDir !== 'function') {
      throw new Error('Invalid ScopeManager: missing getTargetDir method');
    }
    if (typeof scopeManager.isGlobal !== 'function') {
      throw new Error('Invalid ScopeManager: missing isGlobal method');
    }
    if (typeof scopeManager.getInstalledVersion !== 'function') {
      throw new Error('Invalid ScopeManager: missing getInstalledVersion method');
    }

    // Validate backupManager
    if (!backupManager) {
      throw new Error('BackupManager instance is required');
    }
    if (typeof backupManager.backupFile !== 'function') {
      throw new Error('Invalid BackupManager: missing backupFile method');
    }

    // Validate fileOps
    if (!fileOps) {
      throw new Error('FileOperations instance is required');
    }
    if (typeof fileOps._copyFile !== 'function') {
      throw new Error('Invalid FileOperations: missing _copyFile method');
    }

    // Validate npmRegistry
    if (!npmRegistry) {
      throw new Error('NpmRegistry instance is required');
    }
    if (typeof npmRegistry.getLatestVersion !== 'function') {
      throw new Error('Invalid NpmRegistry: missing getLatestVersion method');
    }
    if (typeof npmRegistry.compareVersions !== 'function') {
      throw new Error('Invalid NpmRegistry: missing compareVersions method');
    }

    // Validate logger
    if (!logger) {
      throw new Error('Logger instance is required');
    }
    if (typeof logger.info !== 'function' || typeof logger.error !== 'function') {
      throw new Error('Invalid Logger: missing required methods (info, error)');
    }

    // Store dependencies
    this.scopeManager = scopeManager;
    this.backupManager = backupManager;
    this.fileOps = fileOps;
    this.npmRegistry = npmRegistry;
    this.logger = logger;
    this.packageName = packageName || 'gsd-opencode';

    // Lazy-load HealthChecker to avoid circular dependencies
    this._healthChecker = null;

    // Structure detection for migration support
    this.structureDetector = new StructureDetector(this.scopeManager.getTargetDir());

    this.logger.debug('UpdateService initialized');
  }

  /**
   * Gets or creates the HealthChecker instance.
   *
   * @returns {Promise<Object>} HealthChecker instance
   * @private
   */
  async _getHealthChecker() {
    if (!this._healthChecker) {
      const { HealthChecker } = await import('./health-checker.js');
      this._healthChecker = new HealthChecker(this.scopeManager);
    }
    return this._healthChecker;
  }

  /**
   * Gets the current installed version.
   *
   * Reads the VERSION file via ScopeManager to determine the installed version.
   *
   * @returns {Promise<string|null>} The installed version string, or null if not installed
   * @private
   */
  async _getCurrentVersion() {
    return this.scopeManager.getInstalledVersion();
  }

  /**
   * Performs pre-update health check.
   *
   * Runs health checks on the current installation to ensure it's safe to update.
   * Only runs checks if the installation exists.
   *
   * @returns {Promise<Object>} Health check result
   * @property {boolean} passed - True if health check passed
   * @property {Object} details - Detailed check results
   * @private
   */
  async _performPreUpdateCheck() {
    const isInstalled = await this.scopeManager.isInstalled();
    if (!isInstalled) {
      this.logger.debug('No existing installation, skipping pre-update health check');
      return { passed: true, details: null };
    }

    this.logger.info('Performing pre-update health check...');

    const healthChecker = await this._getHealthChecker();
    const currentVersion = await this._getCurrentVersion();

    const checkResult = await healthChecker.checkAll({
      expectedVersion: currentVersion
    });

    if (!checkResult.passed) {
      this.logger.warning('Pre-update health check found issues');
    } else {
      this.logger.success('Pre-update health check passed');
    }

    return {
      passed: checkResult.passed,
      details: checkResult
    };
  }

  /**
   * Performs post-update verification.
   *
   * Runs health checks on the new installation to verify it was installed correctly.
   *
   * @param {string} expectedVersion - The expected version after update
   * @returns {Promise<Object>} Verification result
   * @property {boolean} passed - True if verification passed
   * @property {Object} details - Detailed check results
   * @private
   */
  async _performPostUpdateCheck(expectedVersion) {
    this.logger.info('Performing post-update verification...');

    const healthChecker = await this._getHealthChecker();

    const checkResult = await healthChecker.checkAll({
      expectedVersion
    });

    if (!checkResult.passed) {
      this.logger.error('Post-update verification failed');
    } else {
      this.logger.success('Post-update verification passed');
    }

    return {
      passed: checkResult.passed,
      details: checkResult
    };
  }

  /**
   * Installs a specific version using npm.
   *
   * Uses npm install to download and install the package. Handles both global
   * and local installations based on scope.
   *
   * @param {string} version - Version to install (e.g., '1.9.2')
   * @returns {Promise<Object>} Installation result
   * @property {boolean} success - True if installation succeeded
   * @property {string|null} error - Error message if installation failed
   * @private
   */
  async _installVersion(version) {
    const isGlobal = this.scopeManager.isGlobal();
    const escapedPackage = this._escapePackageName(this.packageName);
    const escapedVersion = version.replace(/[^0-9.a-zA-Z-]/g, '');

    this.logger.info(`Installing ${this.packageName}@${escapedVersion}...`);

    try {
      if (isGlobal) {
        // Global installation with --force to overwrite existing binaries
        await execAsync(`npm install -g --force ${escapedPackage}@${escapedVersion}`);
      } else {
        // Local installation in target directory
        const targetDir = this.scopeManager.getTargetDir();
        await fs.mkdir(targetDir, { recursive: true });
        await execAsync(`npm install ${escapedPackage}@${escapedVersion}`, {
          cwd: targetDir
        });
      }

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Installation failed'
      };
    }
  }

  /**
   * Escapes a package name for safe use in shell commands.
   *
   * @param {string} packageName - The package name to escape
   * @returns {string} Escaped package name
   * @private
   */
  _escapePackageName(packageName) {
    // Replace any potentially dangerous characters
    return packageName.replace(/[^a-zA-Z0-9@._/-]/g, '');
  }

  /**
   * Checks if an update is available.
   *
   * Compares the current installed version with the latest version from npm registry.
   *
   * @returns {Promise<Object>} Update check result
   * @property {string|null} currentVersion - The currently installed version
   * @property {string|null} latestVersion - The latest version available on npm
   * @property {boolean} updateAvailable - True if an update is available
   * @property {boolean} isBeta - True if using a beta/scoped package
   * @property {string|null} error - Error message if check failed
   *
   * @example
   * const result = await updateService.checkForUpdate();
   * console.log(result.currentVersion);  // '1.9.1'
   * console.log(result.latestVersion);   // '1.9.2'
   * console.log(result.updateAvailable); // true
   */
  async checkForUpdate() {
    this.logger.info('Checking for updates...');

    try {
      // Get current installed version
      const currentVersion = await this._getCurrentVersion();

      // Get latest version from npm
      const latestVersion = await this.npmRegistry.getLatestVersion(this.packageName);

      if (!latestVersion) {
        return {
          currentVersion,
          latestVersion: null,
          updateAvailable: false,
          isBeta: this._isBetaPackage(),
          error: 'Failed to fetch latest version from npm'
        };
      }

      // Compare versions
      let updateAvailable = false;
      if (currentVersion) {
        const comparison = this.npmRegistry.compareVersions(latestVersion, currentVersion);
        updateAvailable = comparison > 0;
      } else {
        // Not currently installed, treat as update available
        updateAvailable = true;
      }

      this.logger.info(
        updateAvailable
          ? `Update available: ${currentVersion || 'none'} -> ${latestVersion}`
          : `Up to date (${currentVersion})`
      );

      return {
        currentVersion,
        latestVersion,
        updateAvailable,
        isBeta: this._isBetaPackage(),
        error: null
      };
    } catch (error) {
      this.logger.error('Failed to check for updates', error);

      return {
        currentVersion: null,
        latestVersion: null,
        updateAvailable: false,
        isBeta: this._isBetaPackage(),
        error: error.message || 'Unknown error checking for updates'
      };
    }
  }

  /**
   * Checks if the current package is a beta/scoped package.
   *
   * @returns {boolean} True if using a scoped package name
   * @private
   */
  _isBetaPackage() {
    return this.packageName.startsWith('@');
  }

  /**
   * Performs pre-flight validation before update.
   *
   * Validates that the update can proceed by checking:
   * - Installation exists (if required)
   * - Target version exists
   * - write permissions are available
   *
   * @param {string|null} targetVersion - Specific version to validate (null for latest)
   * @returns {Promise<Object>} Validation result
   * @property {boolean} valid - True if validation passed
   * @property {string[]} errors - Array of error messages if validation failed
   *
   * @example
   * const validation = await updateService.validateUpdate('1.9.2');
   * if (!validation.valid) {
   *   console.log('Cannot update:', validation.errors.join(', '));
   * }
   */
  async validateUpdate(targetVersion = null) {
    const errors = [];

    this.logger.debug('Performing pre-flight validation...');

    // Check if target version exists (if specified)
    if (targetVersion) {
      const versionExists = await this.npmRegistry.versionExists(this.packageName, targetVersion);
      if (!versionExists) {
        errors.push(`Version ${targetVersion} does not exist in npm registry`);
      }
    }

    // Check write permissions
    try {
      const targetDir = this.scopeManager.getTargetDir();
      const testPath = path.join(targetDir, '.write-test');
      await fs.writeFile(testPath, '', 'utf-8');
      await fs.unlink(testPath).catch(() => {});
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        errors.push('Permission denied: Cannot write to installation directory');
      } else if (error.code === 'ENOENT') {
        // Directory doesn't exist, which is fine for new installs
      } else {
        errors.push(`write permission check failed: ${error.message}`);
      }
    }

    const valid = errors.length === 0;

    if (valid) {
      this.logger.debug('Pre-flight validation passed');
    } else {
      this.logger.warning(`Pre-flight validation failed: ${errors.join(', ')}`);
    }

    return { valid, errors };
  }

  /**
   * Performs the full update workflow.
   *
   * Orchestrates the complete update process:
   * 1. Pre-update health check
   * 2. Create backup of current installation
   * 3. Download and install new version
   * 4. Run FileOperations for path replacement
   * 5. Post-update verification
   *
   * @param {string|null} targetVersion - Specific version to install (null for latest)
   * @param {Object} [options={}] - Update options
   * @param {Function} [options.onProgress] - Progress callback ({ phase, current, total, message })
   * @param {boolean} [options.force] - Skip confirmation (not used here, handled by CLI)
   * @returns {Promise<Object>} Update result
   * @property {boolean} success - True if update succeeded
   * @property {Object} stats - Statistics about the update
   * @property {Array} errors - Array of error messages if update failed
   *
   * @example
   * const result = await updateService.performUpdate(null, {
   *   onProgress: ({ phase, current, total, message }) => {
   *     console.log(`${phase}: ${message} (${current}/${total})`);
   *   }
   * });
   *
   * if (result.success) {
   *   console.log('Update complete!');
   * } else {
   *   console.log('Update failed:', result.errors);
   * }
   */
  async performUpdate(targetVersion = null, options = {}) {
    const { onProgress, dryRun, skipMigration } = options;
    const errors = [];
    const stats = {
      preUpdateChecksPassed: false,
      backupCreated: false,
      structureMigrated: false,
      migrationSkipped: false,
      migrationBackup: null,
      installSucceeded: false,
      postUpdateChecksPassed: false,
      startTime: Date.now(),
      endTime: null
    };

    this.logger.info('Starting update process...');

    // Define progress phases (includes structure check and migration)
    const phases = [
      { id: 'structure-check', name: 'Checking structure', weight: 5 },
      { id: 'pre-check', name: 'Pre-update health check', weight: 10 },
      { id: 'migration', name: 'Migrating structure', weight: 15 },
      { id: 'backup', name: 'Creating backup', weight: 15 },
      { id: 'install', name: 'Installing new version', weight: 40 },
      { id: 'post-check', name: 'Post-update verification', weight: 15 }
    ];

    const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
    let currentWeight = 0;

    const reportProgress = (phaseId, current, total, message) => {
      if (onProgress) {
        const phase = phases.find(p => p.id === phaseId);
        const phaseProgress = total > 0 ? (current / total) * phase.weight : 0;
        const overallProgress = Math.round(((currentWeight + phaseProgress) / totalWeight) * 100);

        onProgress({
          phase: phase.name,
          current,
          total,
          message: message || phase.name,
          overallProgress
        });
      }
    };

    try {
      // Phase 1: Check current structure
      reportProgress('structure-check', 0, 1, 'Detecting directory structure');
      const structure = await this.structureDetector.detect();
      reportProgress('structure-check', 1, 1, 'Structure detection complete');
      currentWeight += phases[0].weight;

      // Phase 2: Pre-update health check
      reportProgress('pre-check', 0, 1, 'Running pre-update health check');
      const preCheckResult = await this._performPreUpdateCheck();
      stats.preUpdateChecksPassed = preCheckResult.passed;
      reportProgress('pre-check', 1, 1, 'Pre-update health check complete');
      currentWeight += phases[1].weight;

      // Phase 3: Migrate if needed (before downloading new version)
      if (!skipMigration && (structure === STRUCTURE_TYPES.OLD || structure === STRUCTURE_TYPES.DUAL)) {
        if (dryRun) {
          this.logger.info('Would migrate from old structure to new structure');
          stats.structureMigrated = false;
        } else {
          reportProgress('migration', 0, 1, 'Converting to new directory structure');

          // Lazy-load MigrationService to avoid circular dependencies
          const { MigrationService } = await import('./migration-service.js');
          const migrationService = new MigrationService(this.scopeManager, this.logger);

          try {
            const migrationResult = await migrationService.migrate();

            if (migrationResult.migrated) {
              this.logger.success('Structure migration completed successfully');
              stats.structureMigrated = true;
              stats.migrationBackup = migrationResult.backup;
            } else {
              this.logger.info(`Migration skipped: ${migrationResult.reason}`);
              stats.structureMigrated = false;
            }
          } catch (error) {
            this.logger.error(`Migration failed: ${error.message}`);
            stats.structureMigrated = false;

            // Enhanced error handling for specific failure scenarios
            const errorMessage = this._formatMigrationError(error, structure);

            return {
              success: false,
              version: targetVersion,
              stats,
              errors: [errorMessage]
            };
          }

          reportProgress('migration', 1, 1, 'Structure migration complete');
        }
      } else {
        // Check if migration was skipped due to flag
        if (skipMigration && (structure === STRUCTURE_TYPES.OLD || structure === STRUCTURE_TYPES.DUAL)) {
          this.logger.warning('Skipping structure migration (--skip-migration flag)');
          stats.migrationSkipped = true;
        }
        reportProgress('migration', 1, 1, 'No migration needed');
      }
      currentWeight += phases[2].weight;

      // Phase 4: Create backup (if installed)
      reportProgress('backup', 0, 1, 'Creating backup');
      const isInstalled = await this.scopeManager.isInstalled();
      if (isInstalled) {
        const targetDir = this.scopeManager.getTargetDir();
        const versionFile = path.join(targetDir, 'VERSION');

        try {
          await this.backupManager.backupFile(versionFile, 'VERSION');
          stats.backupCreated = true;
          this.logger.success('Backup created');
        } catch (error) {
          this.logger.warning('Failed to create backup, continuing anyway');
          // Non-fatal: continue without backup
        }
      }
      reportProgress('backup', 1, 1, 'Backup complete');
      currentWeight += phases[3].weight;

      // Determine target version
      let versionToInstall = targetVersion;
      if (!versionToInstall) {
        const checkResult = await this.checkForUpdate();
        versionToInstall = checkResult.latestVersion;
      }

      if (!versionToInstall) {
        throw new Error('Could not determine version to install');
      }

      // Phase 5: Install new version
      reportProgress('install', 0, 3, 'Downloading package');
      const installResult = await this._installVersion(versionToInstall);

      if (!installResult.success) {
        throw new Error(`Installation failed: ${installResult.error}`);
      }

      reportProgress('install', 1, 3, 'Package downloaded');

      // Run FileOperations for path replacement
      reportProgress('install', 2, 3, 'Performing path replacement');
      const packageRoot = this._getPackageRoot();
      const targetDir = this.scopeManager.getTargetDir();

      // Copy files from package to target directory with path replacement
      const sourceDir = packageRoot;
      try {
        await this._copyWithPathReplacement(sourceDir, targetDir);
      } catch (error) {
        this.logger.warning(`Path replacement had issues: ${error.message}`);
        // Continue anyway - npm install may have already placed files
      }

      reportProgress('install', 3, 3, 'Installation complete');
      stats.installSucceeded = true;
      currentWeight += phases[4].weight;

      // Phase 6: Post-update verification
      reportProgress('post-check', 0, 1, 'Running post-update verification');
      const postCheckResult = await this._performPostUpdateCheck(versionToInstall);
      stats.postUpdateChecksPassed = postCheckResult.passed;

      if (!postCheckResult.passed) {
        errors.push('Post-update verification failed - installation may be incomplete');
      }

      reportProgress('post-check', 1, 1, 'Post-update verification complete');

      // Verify structure is correct after update
      if (!dryRun) {
        const structureOk = await this._verifyPostUpdateStructure();
        if (!structureOk) {
          errors.push('Post-update structure verification failed');
        }
      }

      currentWeight += phases[5].weight;

      stats.endTime = Date.now();

      const success = errors.length === 0;

      if (success) {
        this.logger.success(`Update to ${versionToInstall} completed successfully`);
      } else {
        this.logger.error('Update completed with errors');
      }

      return {
        success,
        version: versionToInstall,
        stats,
        errors
      };
    } catch (error) {
      stats.endTime = Date.now();
      errors.push(error.message || 'Unknown error during update');

      this.logger.error('Update failed', error);

      return {
        success: false,
        version: targetVersion,
        stats,
        errors
      };
    }
  }

  /**
   * Copies files with path replacement for .md files.
   *
   * Recursively copies files from source to target, performing path
   * replacement in markdown files.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<void>}
   * @private
   */
  async _copyWithPathReplacement(sourceDir, targetDir) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await this._copyWithPathReplacement(sourcePath, targetPath);
      } else {
        await this.fileOps._copyFile(sourcePath, targetPath);
      }
    }
  }

  /**
   * Verifies that the directory structure is correct after update.
   *
   * Checks that the installation uses the new structure after a successful
   * update. If not, shows a warning suggesting repair.
   *
   * @returns {Promise<boolean>} True if structure is correct
   * @private
   */
  async _verifyPostUpdateStructure() {
    try {
      const structure = await this.structureDetector.detect();

      if (structure === STRUCTURE_TYPES.OLD) {
        this.logger.warning('Post-update check: Installation still uses old structure');
        this.logger.dim("  Run 'gsd-opencode update' again to complete migration");
        return false;
      }

      if (structure === STRUCTURE_TYPES.DUAL) {
        this.logger.warning('Post-update check: Both old and new structures detected');
        this.logger.dim("  Run 'gsd-opencode repair' to fix the installation");
        return false;
      }

      return true;
    } catch (error) {
      this.logger.debug(`Could not verify post-update structure: ${error.message}`);
      return true; // Don't fail update for verification errors
    }
  }

  /**
   * Formats migration error messages with helpful suggestions.
   *
   * Provides specific error messages and recovery suggestions based on
   * the type of error encountered during migration.
   *
   * @param {Error} error - The error that occurred
   * @param {string} structureType - The structure type being migrated
   * @returns {string} Formatted error message with suggestions
   * @private
   */
  _formatMigrationError(error, structureType) {
    const baseMessage = `Migration failed: ${error.message}`;

    // Disk space errors
    if (error.code === 'ENOSPC' || error.message.includes('no space left')) {
      return `${baseMessage}\n\n` +
        'Insufficient disk space for migration.\n' +
        'Migration requires approximately 2x the current installation size.\n' +
        'Suggestions:\n' +
        '  - Free up disk space and try again\n' +
        '  - Run with --skip-migration to update without migrating (not recommended)';
    }

    // Permission errors
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return `${baseMessage}\n\n` +
        'Permission denied during migration.\n' +
        'Suggestions:\n' +
        '  - Check that you have write access to the installation directory\n' +
        '  - On Unix systems, you may need to use sudo for global installations\n' +
        '  - Ensure no other processes are using the files';
    }

    // File busy errors (open file handles)
    if (error.code === 'EBUSY' || error.message.includes('resource busy')) {
      return `${baseMessage}\n\n` +
        'Some files are currently in use and cannot be moved.\n' +
        'Suggestions:\n' +
        '  - Close any editors or terminals with files open in the installation\n' +
        '  - Close any running GSD-OpenCode commands\n' +
        '  - Try again after closing conflicting applications';
    }

    // Interrupted migration (dual structure)
    if (structureType === STRUCTURE_TYPES.DUAL) {
      return `${baseMessage}\n\n` +
        'Previous migration may have been interrupted.\n' +
        'Suggestions:\n' +
        '  - Run "gsd-opencode repair" to fix the installation\n' +
        '  - Or manually remove the old structure and run update again\n' +
        '  - Migration backup may be available for rollback';
    }

    // Default error with rollback info
    return `${baseMessage}\n\n` +
      'The migration was automatically rolled back to prevent data loss.\n' +
      'You can try again or use --skip-migration (not recommended).';
  }

  /**
   * Gets the package root directory.
   *
   * Resolves the path to the installed npm package.
   *
   * @returns {string} Path to package root
   * @private
   */
  _getPackageRoot() {
    // For global installs, find the global npm root
    // For local installs, use the target directory's node_modules
    if (this.scopeManager.isGlobal()) {
      // Global packages are typically in npm's global root
      // We'll need to find where npm installed our package
      return path.resolve(__dirname, '../..');
    } else {
      // Local installs go in node_modules
      const targetDir = this.scopeManager.getTargetDir();
      return path.join(targetDir, 'node_modules', this.packageName);
    }
  }
}

/**
 * Default export for the update-service module.
 *
 * @example
 * import { UpdateService } from './services/update-service.js';
 * const updateService = new UpdateService({ scopeManager, backupManager, fileOps, npmRegistry, logger });
 */
export default {
  UpdateService
};
