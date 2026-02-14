/**
 * Repair service for detecting and fixing installation issues.
 *
 * This module provides the core repair logic that detects issues and fixes them
 * safely with backups and progress reporting. It orchestrates detection, backup,
 * and repair operations for broken GSD-OpenCode installations.
 *
 * Works in conjunction with HealthChecker for issue detection, BackupManager for
 * safe backups before destructive operations, and FileOperations for file reinstall.
 *
 * @module repair-service
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScopeManager } from './scope-manager.js';
import { BackupManager } from './backup-manager.js';
import { FileOperations } from './file-ops.js';
import { MigrationService } from './migration-service.js';
import { StructureDetector, STRUCTURE_TYPES } from './structure-detector.js';
import { PATH_PATTERNS } from '../../lib/constants.js';

// Get the directory of the current module for resolving source paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manages repair operations for GSD-OpenCode installations.
 *
 * This class provides methods to detect installation issues (missing files,
 * corrupted files, path issues) and repair them safely with backup creation
 * and progress reporting. It uses a two-phase repair strategy: first fixing
 * non-destructive issues (missing files), then destructive issues (corrupted
 * files, path issues) with proper backups.
 *
 * @class RepairService
 * @example
 * const scope = new ScopeManager({ scope: 'global' });
 * const backupManager = new BackupManager(scope, logger);
 * const fileOps = new FileOperations(scope, logger);
 * const repairService = new RepairService({
 *   scopeManager: scope,
 *   backupManager: backupManager,
 *   fileOps: fileOps,
 *   logger: logger,
 *   expectedVersion: '1.0.0'
 * });
 *
 * // Detect issues
 * const issues = await repairService.detectIssues();
 * if (issues.hasIssues) {
 *   console.log(repairService.generateSummary(issues));
 *
 *   // Repair with progress tracking
 *   const result = await repairService.repair(issues, {
 *     onProgress: ({ current, total, operation, file }) => {
 *       console.log(`${operation}: ${current}/${total} - ${file}`);
 *     }
 *   });
 *
 *   console.log(`Repairs: ${result.stats.succeeded}/${result.stats.total} succeeded`);
 * }
 */
export class RepairService {
  /**
   * Creates a new RepairService instance.
   *
   * @param {Object} dependencies - Required dependencies
   * @param {ScopeManager} dependencies.scopeManager - ScopeManager instance for path resolution
   * @param {BackupManager} dependencies.backupManager - BackupManager instance for creating backups
   * @param {FileOperations} dependencies.fileOps - FileOperations instance for file reinstall
   * @param {Object} dependencies.logger - Logger instance for output
   * @param {string} dependencies.expectedVersion - Expected version string for version checks
   * @throws {Error} If any required dependency is missing or invalid
   *
   * @example
   * const repairService = new RepairService({
   *   scopeManager: scope,
   *   backupManager: backupManager,
   *   fileOps: fileOps,
   *   logger: logger,
   *   expectedVersion: '1.0.0'
   * });
   */
  constructor(dependencies) {
    // Validate all required dependencies
    if (!dependencies) {
      throw new Error('Dependencies object is required');
    }

    const { scopeManager, backupManager, fileOps, logger, expectedVersion } = dependencies;

    // Validate scopeManager
    if (!scopeManager) {
      throw new Error('ScopeManager instance is required');
    }
    if (typeof scopeManager.getTargetDir !== 'function') {
      throw new Error('Invalid ScopeManager: missing getTargetDir method');
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

    // Validate logger
    if (!logger) {
      throw new Error('Logger instance is required');
    }
    if (typeof logger.info !== 'function' || typeof logger.error !== 'function') {
      throw new Error('Invalid Logger: missing required methods (info, error)');
    }

    // Validate expectedVersion
    if (!expectedVersion || typeof expectedVersion !== 'string') {
      throw new Error('Expected version must be a non-empty string');
    }

    // Store dependencies
    this.scopeManager = scopeManager;
    this.backupManager = backupManager;
    this.fileOps = fileOps;
    this.logger = logger;
    this.expectedVersion = expectedVersion;

    // Initialize structure detector for migration support
    this.structureDetector = new StructureDetector(this.scopeManager.getTargetDir());

    // Lazy-load HealthChecker to avoid circular dependencies
    this._healthChecker = null;

    this.logger.debug('RepairService initialized');
  }

  /**
   * Checks the directory structure status.
   *
   * Detects which command directory structure is present (old/new/dual/none)
   * and determines if repair is needed.
   *
   * @returns {Promise<Object>} Structure check results
   * @property {string} type - One of STRUCTURE_TYPES values
   * @property {boolean} canRepair - True if structure can be repaired
   * @property {string|null} repairCommand - Command to run for repair, or null
   * @property {boolean} needsMigration - True if migration is recommended
   *
   * @example
   * const structureCheck = await repairService.checkStructure();
   * if (structureCheck.needsMigration) {
   *   console.log(`Run: ${structureCheck.repairCommand}`);
   * }
   */
  async checkStructure() {
    const structure = await this.structureDetector.detect();
    const details = await this.structureDetector.getDetails();

    const canRepair = structure === STRUCTURE_TYPES.OLD ||
                      structure === STRUCTURE_TYPES.DUAL;

    return {
      type: structure,
      canRepair,
      repairCommand: canRepair ? 'gsd-opencode repair --fix-structure' : null,
      needsMigration: canRepair,
      details: {
        oldExists: details.oldExists,
        newExists: details.newExists,
        recommendedAction: details.recommendedAction
      }
    };
  }

  /**
   * Repairs the directory structure by migrating to new format.
   *
   * Uses MigrationService to perform atomic migration from old to new
   * structure with full backup and rollback capability.
   *
   * @returns {Promise<Object>} Repair result
   * @property {boolean} repaired - True if structure was repaired
   * @property {string} message - Human-readable status message
   * @property {string} [backup] - Path to backup if repair performed
   * @property {Error} [error] - Error if repair failed
   *
   * @example
   * const result = await repairService.repairStructure();
   * if (result.repaired) {
   *   console.log('Structure repaired successfully');
   *   console.log(`Backup: ${result.backup}`);
   * } else {
   *   console.log(`No repair needed: ${result.message}`);
   * }
   */
  async repairStructure() {
    const structure = await this.structureDetector.detect();

    if (structure === STRUCTURE_TYPES.NEW) {
      return {
        repaired: false,
        message: 'Already using new structure (commands/gsd/)'
      };
    }

    if (structure === STRUCTURE_TYPES.NONE) {
      return {
        repaired: false,
        message: 'No structure to repair - fresh installation needed'
      };
    }

    // Use MigrationService to fix structure
    const migrationService = new MigrationService(this.scopeManager, this.logger);

    try {
      const result = await migrationService.migrate();

      if (result.migrated) {
        return {
          repaired: true,
          message: 'Structure repaired successfully - migrated to commands/gsd/',
          backup: result.backup
        };
      } else {
        return {
          repaired: false,
          message: `No repair needed: ${result.reason}`
        };
      }
    } catch (error) {
      return {
        repaired: false,
        message: `Repair failed: ${error.message}`,
        error
      };
    }
  }

  /**
   * Fixes dual structure state (both old and new exist).
   *
   * This handles interrupted migrations by consolidating to new structure.
   * Verifies new structure is complete, then removes old structure.
   *
   * @returns {Promise<Object>} Fix result
   * @property {boolean} fixed - True if dual structure was fixed
   * @property {string} message - Status message
   * @property {string} [backup] - Backup path if created
   * @property {Error} [error] - Error if fix failed
   *
   * @example
   * const result = await repairService.fixDualStructure();
   * if (result.fixed) {
   *   console.log('Dual structure fixed');
   * }
   */
  async fixDualStructure() {
    const structure = await this.structureDetector.detect();

    if (structure !== STRUCTURE_TYPES.DUAL) {
      return {
        fixed: false,
        message: `Not in dual structure state (current: ${structure})`
      };
    }

    this.logger.info('Fixing dual structure - consolidating to new structure...');

    // Delegate to migration service which handles dual state
    const migrationService = new MigrationService(this.scopeManager, this.logger);

    try {
      const result = await migrationService.migrate();

      if (result.migrated) {
        return {
          fixed: true,
          message: 'Dual structure fixed - removed old command/gsd/ directory',
          backup: result.backup
        };
      } else {
        return {
          fixed: false,
          message: 'Could not fix dual structure: migration returned no changes'
        };
      }
    } catch (error) {
      return {
        fixed: false,
        message: `Failed to fix dual structure: ${error.message}`,
        error
      };
    }
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
   * Detects installation issues by running health checks.
   *
   * Uses HealthChecker to verify file existence, version matching, and file
   * integrity. Categorizes issues into missing files, corrupted files, and
   * path issues. Does not modify any files during detection.
   *
   * @returns {Promise<Object>} Categorized issues
   * @property {boolean} hasIssues - True if any issues were found
   * @property {Array} missingFiles - Files/directories that don't exist
   * @property {Array} corruptedFiles - Files that failed integrity checks
   * @property {Array} pathIssues - .md files with incorrect @gsd-opencode/ references
   * @property {number} totalIssues - Total count of all issues
   *
   * @example
   * const issues = await repairService.detectIssues();
   * console.log(issues.hasIssues); // true/false
   * console.log(issues.missingFiles); // [{ path, type }]
   * console.log(issues.corruptedFiles); // [{ path, relative, error }]
   * console.log(issues.pathIssues); // [{ path, relative, currentContent }]
   */
  async detectIssues() {
    this.logger.info('Detecting installation issues...');

    const healthChecker = await this._getHealthChecker();
    const targetDir = this.scopeManager.getTargetDir();

    // Run all health checks
    const checkResult = await healthChecker.checkAll({
      expectedVersion: this.expectedVersion
    });

    // Categorize issues
    const missingFiles = [];
    const corruptedFiles = [];

    // Parse file existence checks
    if (checkResult.categories.files && !checkResult.categories.files.passed) {
      for (const check of checkResult.categories.files.checks) {
        if (!check.passed) {
          const isDirectory = check.name.includes('directory');
          missingFiles.push({
            path: check.path,
            type: isDirectory ? 'directory' : 'file',
            name: check.name
          });
        }
      }
    }

    // Parse integrity checks for corrupted files
    if (checkResult.categories.integrity && !checkResult.categories.integrity.passed) {
      for (const check of checkResult.categories.integrity.checks) {
        if (!check.passed && check.error) {
          // Only include actual file errors, not missing files (those go in missingFiles)
          if (!check.error.includes('not found')) {
            corruptedFiles.push({
              path: check.file,
              relative: check.relative,
              error: check.error
            });
          }
        }
      }
    }

    // Detect path issues in .md files
    const pathIssues = await this._detectPathIssues(targetDir);

    const totalIssues = missingFiles.length + corruptedFiles.length + pathIssues.length;
    const hasIssues = totalIssues > 0;

    this.logger.info(`Found ${totalIssues} issue(s): ${missingFiles.length} missing, ${corruptedFiles.length} corrupted, ${pathIssues.length} path issues`);

    return {
      hasIssues,
      missingFiles,
      corruptedFiles,
      pathIssues,
      totalIssues
    };
  }

  /**
   * Detects path issues in .md files.
   *
   * Reads .md files and checks for @gsd-opencode/ pattern references.
   * Compares expected path (targetDir + '/') with actual references.
   *
   * @param {string} targetDir - Target installation directory
   * @returns {Promise<Array>} Array of path issues
   * @private
   */
  async _detectPathIssues(targetDir) {
    const pathIssues = [];

    // Sample files to check for path issues (same as integrity check samples)
    const sampleFiles = [
      { dir: 'agents', file: 'gsd-executor.md' },
      { dir: 'command', file: 'gsd/help.md' },
      { dir: 'get-shit-done', file: 'templates/summary.md' }
    ];

    const expectedPrefix = targetDir + '/';

    for (const { dir, file } of sampleFiles) {
      const filePath = path.join(targetDir, dir, file);
      const relativePath = path.join(dir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Check for @gsd-opencode/ references that haven't been replaced
        const hasWrongReferences = PATH_PATTERNS.gsdReference.test(content);

        if (hasWrongReferences) {
          pathIssues.push({
            path: filePath,
            relative: relativePath,
            currentContent: content
          });
        }
      } catch (error) {
        // File doesn't exist or can't be read - this is a missing file issue, not a path issue
        this.logger.debug(`Could not check path issues for ${relativePath}: ${error.message}`);
      }
    }

    return pathIssues;
  }

  /**
   * Repairs detected issues with backup and progress reporting.
   *
   * Uses a two-phase repair strategy:
   * - Phase 1: Fix non-destructive issues (missing files) - auto, no backup needed
   * - Phase 2: Fix destructive issues (corrupted files, path issues) - backup first
   *
   * Continues with remaining repairs if one fails, collecting all results.
   *
   * @param {Object} issues - Issues object from detectIssues()
   * @param {Array} issues.missingFiles - Missing files/directories to create
   * @param {Array} issues.corruptedFiles - Corrupted files to replace
   * @param {Array} issues.pathIssues - Files with path reference issues
   * @param {Object} [options={}] - Repair options
   * @param {Function} [options.onProgress] - Progress callback ({ current, total, operation, file })
   * @param {Function} [options.onBackup] - Backup callback ({ file, backupPath })
   * @returns {Promise<Object>} Repair results
   * @property {boolean} success - True only if ALL repairs succeeded
   * @property {Object} results - Detailed results by category
   * @property {Object} stats - Summary statistics
   *
   * @example
   * const result = await repairService.repair(issues, {
   *   onProgress: ({ current, total, operation, file }) => {
   *     console.log(`${operation}: ${current}/${total} - ${file}`);
   *   }
   * });
   *
   * console.log(result.success); // true/false
   * console.log(result.stats.succeeded + '/' + result.stats.total);
   */
  async repair(issues, options = {}) {
    const { onProgress, onBackup } = options;

    this.logger.info('Starting repair process...');

    // Initialize results structure
    const results = {
      missing: [],
      corrupted: [],
      paths: []
    };

    // Calculate total operations
    const totalOperations =
      (issues.missingFiles?.length || 0) +
      (issues.corruptedFiles?.length || 0) +
      (issues.pathIssues?.length || 0);

    if (totalOperations === 0) {
      this.logger.info('No repairs needed');
      return {
        success: true,
        results,
        stats: {
          total: 0,
          succeeded: 0,
          failed: 0,
          byCategory: { missing: { succeeded: 0, failed: 0 }, corrupted: { succeeded: 0, failed: 0 }, paths: { succeeded: 0, failed: 0 } }
        }
      };
    }

    let currentOperation = 0;
    let succeededCount = 0;
    let failedCount = 0;

    // Phase 1: Fix missing files (non-destructive)
    for (const missingFile of (issues.missingFiles || [])) {
      currentOperation++;

      try {
        await this._repairMissingFile(missingFile);
        succeededCount++;
        results.missing.push({
          file: missingFile.path,
          success: true
        });
        this.logger.info(`Fixed missing ${missingFile.type}: ${missingFile.name}`);
      } catch (error) {
        failedCount++;
        results.missing.push({
          file: missingFile.path,
          success: false,
          error: error.message
        });
        this.logger.error(`Failed to fix missing ${missingFile.type}: ${missingFile.name}`, error);
      }

      if (onProgress) {
        onProgress({
          current: currentOperation,
          total: totalOperations,
          operation: 'installing',
          file: missingFile.name
        });
      }
    }

    // Phase 2: Fix corrupted files (destructive - backup first)
    for (const corruptedFile of (issues.corruptedFiles || [])) {
      currentOperation++;

      try {
        // Backup before replacing
        const backupResult = await this.backupManager.backupFile(
          corruptedFile.path,
          corruptedFile.relative
        );

        if (onBackup && backupResult.backupPath) {
          onBackup({
            file: corruptedFile.relative,
            backupPath: backupResult.backupPath
          });
        }

        // Reinstall the file
        const sourcePath = this._getSourcePath(corruptedFile.relative);
        const targetPath = corruptedFile.path;
        await this.fileOps._copyFile(sourcePath, targetPath);

        succeededCount++;
        results.corrupted.push({
          file: corruptedFile.path,
          success: true
        });
        this.logger.info(`Fixed corrupted file: ${corruptedFile.relative}`);
      } catch (error) {
        failedCount++;
        results.corrupted.push({
          file: corruptedFile.path,
          success: false,
          error: error.message
        });
        this.logger.error(`Failed to fix corrupted file: ${corruptedFile.relative}`, error);
      }

      if (onProgress) {
        onProgress({
          current: currentOperation,
          total: totalOperations,
          operation: 'replacing',
          file: corruptedFile.relative
        });
      }
    }

    // Phase 3: Fix path issues (destructive - backup first)
    for (const pathIssue of (issues.pathIssues || [])) {
      currentOperation++;

      try {
        // Backup before modifying
        const backupResult = await this.backupManager.backupFile(
          pathIssue.path,
          pathIssue.relative
        );

        if (onBackup && backupResult.backupPath) {
          onBackup({
            file: pathIssue.relative,
            backupPath: backupResult.backupPath
          });
        }

        // Fix path references
        const targetDir = this.scopeManager.getTargetDir();
        const updatedContent = pathIssue.currentContent.replace(
          PATH_PATTERNS.gsdReference,
          targetDir + '/'
        );

        await fs.writeFile(pathIssue.path, updatedContent, 'utf-8');

        succeededCount++;
        results.paths.push({
          file: pathIssue.path,
          success: true
        });
        this.logger.info(`Fixed path issues in: ${pathIssue.relative}`);
      } catch (error) {
        failedCount++;
        results.paths.push({
          file: pathIssue.path,
          success: false,
          error: error.message
        });
        this.logger.error(`Failed to fix path issues in: ${pathIssue.relative}`, error);
      }

      if (onProgress) {
        onProgress({
          current: currentOperation,
          total: totalOperations,
          operation: 'updating-paths',
          file: pathIssue.relative
        });
      }
    }

    const success = failedCount === 0;

    this.logger.info(`Repair complete: ${succeededCount}/${totalOperations} succeeded`);

    return {
      success,
      results,
      stats: {
        total: totalOperations,
        succeeded: succeededCount,
        failed: failedCount,
        byCategory: {
          missing: {
            succeeded: results.missing.filter(r => r.success).length,
            failed: results.missing.filter(r => !r.success).length
          },
          corrupted: {
            succeeded: results.corrupted.filter(r => r.success).length,
            failed: results.corrupted.filter(r => !r.success).length
          },
          paths: {
            succeeded: results.paths.filter(r => r.success).length,
            failed: results.paths.filter(r => !r.success).length
          }
        }
      }
    };
  }

  /**
   * Repairs a missing file or directory.
   *
   * For directories, recreates the entire directory structure from source.
   * For files, copies from the package source.
   *
   * @param {Object} missingFile - Missing file descriptor
   * @param {string} missingFile.path - Absolute path to the missing file/directory
   * @param {string} missingFile.type - 'directory' or 'file'
   * @param {string} missingFile.name - Display name for logging
   * @returns {Promise<void>}
   * @private
   */
  async _repairMissingFile(missingFile) {
    const targetDir = this.scopeManager.getTargetDir();

    if (missingFile.type === 'directory') {
      // Recreate directory from source
      const dirName = path.basename(missingFile.path);
      const sourceDir = this._getSourcePath(dirName);
      const targetPath = path.join(targetDir, dirName);

      // Use fileOps._copyFile for each file in the directory
      await this._copyDirectory(sourceDir, targetPath);
    } else {
      // Recreate single file
      const relativePath = path.relative(targetDir, missingFile.path);
      const sourcePath = this._getSourcePath(relativePath);
      await this.fileOps._copyFile(sourcePath, missingFile.path);
    }
  }

  /**
   * Recursively copies a directory.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<void>}
   * @private
   */
  async _copyDirectory(sourceDir, targetDir) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await this._copyDirectory(sourcePath, targetPath);
      } else {
        await this.fileOps._copyFile(sourcePath, targetPath);
      }
    }
  }

  /**
   * Resolves source file path from package installation.
   *
   * Uses __dirname to find the source file in the package.
   *
   * @param {string} relativePath - Path relative to installation root
   * @returns {string} Absolute path to source file
   * @throws {Error} If source file doesn't exist
   * @private
   */
  _getSourcePath(relativePath) {
    // Resolve from the package root (parent of src/services)
    const packageRoot = path.resolve(__dirname, '../..');
    const sourcePath = path.join(packageRoot, 'gsd-opencode', relativePath);

    return sourcePath;
  }

  /**
   * Generates a human-readable summary of issues.
   *
   * @param {Object} issues - Issues object from detectIssues()
   * @returns {string} Formatted summary string
   *
   * @example
   * const summary = repairService.generateSummary(issues);
   * console.log(summary);
   * // Missing Files (2):
   * //   - agents directory
   * //   - command/gsd/help.md
   * //
   * // Corrupted Files (1):
   * //   - agents/ro-commit.md
   */
  generateSummary(issues) {
    const lines = [];

    // Missing Files
    if (issues.missingFiles && issues.missingFiles.length > 0) {
      lines.push(`Missing Files (${issues.missingFiles.length}):`);
      for (const file of issues.missingFiles) {
        lines.push(`  - ${file.name}`);
      }
      lines.push('');
    }

    // Corrupted Files
    if (issues.corruptedFiles && issues.corruptedFiles.length > 0) {
      lines.push(`Corrupted Files (${issues.corruptedFiles.length}):`);
      for (const file of issues.corruptedFiles) {
        lines.push(`  - ${file.relative}`);
      }
      lines.push('');
    }

    // Path Issues
    if (issues.pathIssues && issues.pathIssues.length > 0) {
      lines.push(`Path Issues (${issues.pathIssues.length}):`);
      for (const file of issues.pathIssues) {
        lines.push(`  - ${file.relative}`);
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Validates the repair results structure.
   *
   * @param {Object} results - Repair results from repair()
   * @returns {boolean} True if results structure is valid
   * @private
   */
  _validateRepairResults(results) {
    if (!results || typeof results !== 'object') {
      this.logger.warning('Invalid repair results: not an object');
      return false;
    }

    if (typeof results.success !== 'boolean') {
      this.logger.warning('Invalid repair results: missing success boolean');
      return false;
    }

    if (!results.results || typeof results.results !== 'object') {
      this.logger.warning('Invalid repair results: missing results object');
      return false;
    }

    if (!results.stats || typeof results.stats !== 'object') {
      this.logger.warning('Invalid repair results: missing stats object');
      return false;
    }

    return true;
  }
}

/**
 * Default export for the repair-service module.
 *
 * @example
 * import { RepairService } from './services/repair-service.js';
 * const repairService = new RepairService({ scopeManager, backupManager, fileOps, logger, expectedVersion });
 */
export default {
  RepairService
};
