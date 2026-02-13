/**
 * Migration service for atomic migration from old to new directory structure.
 *
 * This module provides safe migration from the legacy `command/gsd/` structure
 * to the new `commands/gsd/` structure with full rollback capability.
 *
 * Key features:
 * - Pre-migration backup creation before any changes
 * - Atomic file operations using temp-then-move pattern
 * - Automatic rollback on any failure
 * - Manifest path transformation
 * - Verification after migration
 *
 * @module migration-service
 */

import fs from 'fs/promises';
import path from 'path';
import { StructureDetector, STRUCTURE_TYPES } from './structure-detector.js';
import { ManifestManager } from './manifest-manager.js';
import { BackupManager } from './backup-manager.js';
import { OLD_COMMAND_DIR, NEW_COMMAND_DIR } from '../../lib/constants.js';
import { createHash } from 'crypto';

/**
 * Performs atomic migration from old to new directory structure.
 *
 * This class handles the migration of GSD-OpenCode installations from the legacy
 * `command/gsd/` structure to the new `commands/gsd/` structure. It provides
 * full rollback capability and ensures data integrity throughout the migration.
 *
 * @class MigrationService
 * @example
 * const scopeManager = new ScopeManager({ scope: 'global' });
 * const logger = createLogger();
 * const migrationService = new MigrationService(scopeManager, logger);
 *
 * // Perform migration
 * const result = await migrationService.migrate();
 * if (result.migrated) {
 *   console.log('Migration completed successfully');
 * }
 *
 * // Or perform dry run first
 * const dryRun = await migrationService.dryRun();
 * console.log(`Would migrate ${dryRun.filesToMigrate.length} files`);
 */
export class MigrationService {
  /**
   * Creates a new MigrationService instance.
   *
   * @param {Object} scopeManager - ScopeManager instance for path resolution
   * @param {Object} logger - Logger instance for output
   * @throws {Error} If scopeManager or logger is not provided
   *
   * @example
   * const scopeManager = new ScopeManager({ scope: 'global' });
   * const logger = createLogger();
   * const migrationService = new MigrationService(scopeManager, logger);
   */
  constructor(scopeManager, logger) {
    if (!scopeManager) {
      throw new Error('scopeManager is required');
    }

    if (!logger) {
      throw new Error('logger is required');
    }

    this.scopeManager = scopeManager;
    this.logger = logger;
    this.targetDir = scopeManager.getTargetDir();
    this.structureDetector = new StructureDetector(this.targetDir);
    this.manifestManager = new ManifestManager(this.targetDir);
    this.backupManager = new BackupManager(scopeManager, logger);

    /**
     * Migration state for potential rollback.
     * @type {Object|null}
     * @private
     */
    this._migrationState = null;
  }

  /**
   * Performs the migration from old to new structure.
   *
   * The migration process:
   * 1. Detects current structure type
   * 2. Creates backup before any changes
   * 3. Performs migration based on current state
   * 4. Verifies migration succeeded
   * 5. Cleans up backup on success
   *
   * On any error, automatically rolls back to the original state.
   *
   * @returns {Promise<Object>} Migration result
   * @property {boolean} migrated - True if migration was performed
   * @property {string} [reason] - Reason if migration was skipped
   * @property {string} [backup] - Path to backup if migration performed
   *
   * @throws {Error} If migration fails (rollback is attempted automatically)
   *
   * @example
   * const result = await migrationService.migrate();
   * if (result.migrated) {
   *   console.log(`Migration completed. Backup at: ${result.backup}`);
   * } else {
   *   console.log(`Migration skipped: ${result.reason}`);
   * }
   */
  async migrate() {
    // Step 1: Detect current structure
    const currentStructure = await this.structureDetector.detect();

    if (currentStructure === STRUCTURE_TYPES.NEW) {
      this.logger.info('Already using new structure, no migration needed');
      return { migrated: false, reason: 'already_new' };
    }

    if (currentStructure === STRUCTURE_TYPES.NONE) {
      this.logger.info('No existing structure found, fresh install needed');
      return { migrated: false, reason: 'none_found' };
    }

    this.logger.info(`Starting migration from ${currentStructure} structure...`);

    // Step 2: Create backup before any changes
    const backup = await this._createBackup(currentStructure);
    this._migrationState = { backup, originalStructure: currentStructure };

    try {
      // Step 3: Perform migration based on current state
      if (currentStructure === STRUCTURE_TYPES.OLD) {
        await this._migrateFromOld();
      } else if (currentStructure === STRUCTURE_TYPES.DUAL) {
        await this._migrateFromDual();
      }

      // Step 4: Verify migration succeeded
      const newStructure = await this.structureDetector.detect();
      if (newStructure !== STRUCTURE_TYPES.NEW) {
        throw new Error(`Migration verification failed: expected 'new', got '${newStructure}'`);
      }

      // Step 5: Clean up backup on success
      await this._cleanupBackup(backup);

      this.logger.success('Migration completed successfully');
      return { migrated: true, backup: backup.path };

    } catch (error) {
      // Rollback on any error
      this.logger.error(`Migration failed: ${error.message}`);
      await this.rollback();
      throw error;
    }
  }

  /**
   * Migrates from old structure (command/gsd/) to new structure (commands/gsd/).
   *
   * @returns {Promise<void>}
   * @private
   */
  async _migrateFromOld() {
    const oldPath = path.join(this.targetDir, OLD_COMMAND_DIR, 'gsd');
    const newPath = path.join(this.targetDir, NEW_COMMAND_DIR, 'gsd');

    this.logger.info('Migrating from old structure...');

    // Step 1: Create new directory structure
    await fs.mkdir(path.dirname(newPath), { recursive: true });

    // Step 2: Copy files from old to new location using atomic move
    await this._atomicCopy(oldPath, newPath);

    // Step 3: Update manifest paths
    await this._updateManifestPaths();

    // Step 4: Remove old directory (after successful copy)
    await fs.rm(oldPath, { recursive: true, force: true });

    // Step 5: Clean up empty parent directory if applicable
    await this._cleanupEmptyParent(OLD_COMMAND_DIR);

    this.logger.info('Files migrated successfully');
  }

  /**
   * Migrates from dual structure (both exist) to new structure.
   *
   * When both structures exist, prefers new structure and removes old.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _migrateFromDual() {
    const oldPath = path.join(this.targetDir, OLD_COMMAND_DIR, 'gsd');

    this.logger.info('Dual structure detected, consolidating to new structure...');

    // Update manifest to point to new paths
    await this._updateManifestPaths();

    // Remove old structure
    await fs.rm(oldPath, { recursive: true, force: true });

    // Clean up empty parent directory if applicable
    await this._cleanupEmptyParent(OLD_COMMAND_DIR);

    this.logger.info('Old structure removed, migration complete');
  }

  /**
   * Performs atomic copy of directory using temp-then-move pattern.
   *
   * @param {string} source - Source directory path
   * @param {string} target - Target directory path
   * @returns {Promise<void>}
   * @private
   */
  async _atomicCopy(source, target) {
    const tempTarget = `${target}.tmp-${Date.now()}`;

    try {
      this.logger.debug(`Copying files to temp location: ${tempTarget}`);
      await fs.cp(source, tempTarget, { recursive: true, force: true });

      this.logger.debug(`Performing atomic move: ${tempTarget} -> ${target}`);
      await fs.rename(tempTarget, target);
    } catch (error) {
      // Clean up temp on failure
      await fs.rm(tempTarget, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  /**
   * Updates manifest paths from old to new structure.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateManifestPaths() {
    this.logger.debug('Updating manifest paths...');

    const entries = await this.manifestManager.load();
    if (!entries || entries.length === 0) {
      this.logger.debug('No manifest entries to update');
      return;
    }

    // Transform paths from command/gsd/ to commands/gsd/
    const updatedEntries = entries.map(entry => ({
      ...entry,
      path: entry.path.replace(
        new RegExp(`/${OLD_COMMAND_DIR}/gsd/`, 'g'),
        `/${NEW_COMMAND_DIR}/gsd/`
      ),
      relativePath: entry.relativePath.replace(
        new RegExp(`^${OLD_COMMAND_DIR}/gsd/`, 'g'),
        `${NEW_COMMAND_DIR}/gsd/`
      )
    }));

    // Clear and re-add updated entries
    this.manifestManager.clear();
    for (const entry of updatedEntries) {
      this.manifestManager.addFile(entry.path, entry.relativePath, entry.size, entry.hash);
    }

    await this.manifestManager.save();
    this.logger.debug(`Updated ${updatedEntries.length} manifest entries`);
  }

  /**
   * Cleans up empty parent directory after migration.
   *
   * @param {string} dirName - Directory name to check
   * @returns {Promise<void>}
   * @private
   */
  async _cleanupEmptyParent(dirName) {
    const dirPath = path.join(this.targetDir, dirName);

    try {
      const entries = await fs.readdir(dirPath);
      if (entries.length === 0) {
        await fs.rmdir(dirPath);
        this.logger.debug(`Removed empty directory: ${dirName}`);
      } else {
        this.logger.debug(`Directory not empty, preserving: ${dirName}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.debug(`Could not check directory ${dirName}: ${error.message}`);
      }
    }
  }

  /**
   * Rolls back migration to original state.
   *
   * Restores files from backup and cleans up any partial migration artifacts.
   *
   * @returns {Promise<boolean>} True if rollback succeeded
   *
   * @example
   * const success = await migrationService.rollback();
   * if (!success) {
   *   console.error('Rollback failed, manual intervention may be required');
   * }
   */
  async rollback() {
    if (!this._migrationState) {
      this.logger.warning('No migration state to rollback');
      return false;
    }

    this.logger.info('Rolling back migration...');

    const { backup, originalStructure } = this._migrationState;

    try {
      // Restore from backup
      await this.backupManager.restoreFromMigrationBackup(backup);

      // Clean up any partial migration artifacts
      const newPath = path.join(this.targetDir, NEW_COMMAND_DIR, 'gsd');
      await fs.rm(newPath, { recursive: true, force: true }).catch(() => {});

      // Clean up temp files that might exist
      const tempPattern = path.join(this.targetDir, `${NEW_COMMAND_DIR}.tmp-*`);
      await this._cleanupTempFiles(tempPattern);

      this.logger.success('Rollback completed');
      return true;
    } catch (error) {
      this.logger.error(`Rollback failed: ${error.message}`);
      this.logger.error('Manual intervention may be required');
      return false;
    }
  }

  /**
   * Cleans up temporary files matching a pattern.
   *
   * @param {string} pattern - Pattern to match (directory prefix)
   * @returns {Promise<void>}
   * @private
   */
  async _cleanupTempFiles(pattern) {
    const baseDir = path.dirname(pattern);
    const prefix = path.basename(pattern).replace('*', '');

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith(prefix)) {
          const tempPath = path.join(baseDir, entry.name);
          await fs.rm(tempPath, { recursive: true, force: true });
          this.logger.debug(`Cleaned up temp directory: ${entry.name}`);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Creates backup before migration.
   *
   * @param {string} structureType - Current structure type
   * @returns {Promise<Object>} Backup metadata
   * @private
   */
  async _createBackup(structureType) {
    return await this.backupManager.createMigrationBackup({
      targetDir: this.targetDir,
      originalStructure: structureType,
      timestamp: Date.now()
    });
  }

  /**
   * Cleans up backup after successful migration.
   *
   * For now, preserves the backup for safety. Could be extended to
   * remove backups after a retention period.
   *
   * @param {Object} backup - Backup metadata
   * @returns {Promise<void>}
   * @private
   */
  async _cleanupBackup(backup) {
    this.logger.debug(`Backup preserved at: ${backup.path}`);
  }

  /**
   * Verifies integrity of migrated files by comparing hashes.
   *
   * Checks that all expected files exist in new location and have
   * matching hashes to verify no data loss occurred.
   *
   * @returns {Promise<Object>} Verification report
   * @property {boolean} success - True if verification passed
   * @property {number} totalFiles - Total files checked
   * @property {number} passed - Files that passed verification
   * @property {number} failed - Files that failed verification
   * @property {Array<Object>} details - Per-file verification details
   *
   * @example
   * const report = await migrationService.verify();
   * console.log(`Verification: ${report.passed}/${report.totalFiles} files OK`);
   * if (!report.success) {
   *   console.log('Failed files:', report.details.filter(d => !d.passed));
   * }
   */
  async verify() {
    this.logger.info('Verifying migration integrity...');

    const report = {
      success: true,
      totalFiles: 0,
      passed: 0,
      failed: 0,
      details: []
    };

    try {
      const newPath = path.join(this.targetDir, NEW_COMMAND_DIR, 'gsd');

      // Check if new structure exists
      try {
        await fs.access(newPath);
      } catch (error) {
        return {
          ...report,
          success: false,
          error: 'New structure not found'
        };
      }

      // Load manifest
      const entries = await this.manifestManager.load();
      if (!entries) {
        // No manifest, just verify directory structure exists
        const files = await this._collectFilesRecursively(newPath);
        report.totalFiles = files.length;
        report.passed = files.length;
        return report;
      }

      // Verify each manifest entry in new structure
      for (const entry of entries) {
        // Only check entries in command directories
        if (!entry.relativePath.includes('/gsd/')) {
          continue;
        }

        report.totalFiles++;

        const checkPath = path.join(this.targetDir, entry.relativePath);
        const detail = {
          relativePath: entry.relativePath,
          passed: false,
          error: null
        };

        try {
          await fs.access(checkPath);

          // If we have a hash, verify it
          if (entry.hash && entry.hash.startsWith('sha256:')) {
            const currentHash = await this._calculateFileHash(checkPath);
            if (currentHash === entry.hash) {
              detail.passed = true;
              report.passed++;
            } else {
              detail.error = 'Hash mismatch';
              detail.expectedHash = entry.hash;
              detail.actualHash = currentHash;
              report.failed++;
              report.success = false;
            }
          } else {
            detail.passed = true;
            report.passed++;
          }
        } catch (error) {
          detail.error = error.message;
          report.failed++;
          report.success = false;
        }

        report.details.push(detail);
      }

      if (report.success) {
        this.logger.success(`Verification passed: ${report.passed}/${report.totalFiles} files OK`);
      } else {
        this.logger.error(`Verification failed: ${report.failed}/${report.totalFiles} files failed`);
      }

      return report;
    } catch (error) {
      return {
        ...report,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Simulates migration without making changes.
   *
   * Returns a preview of actions that would be performed during migration,
   * allowing users to see what will happen before committing.
   *
   * @returns {Promise<Object>} Dry run report
   * @property {boolean} wouldMigrate - True if migration would be performed
   * @property {string} currentStructure - Current structure type
   * @property {Array<string>} actions - List of actions that would be taken
   * @property {number} filesToMigrate - Number of files that would be moved
   * @property {number} estimatedBytes - Estimated bytes to be moved
   *
   * @example
   * const dryRun = await migrationService.dryRun();
   * console.log(`Would perform ${dryRun.actions.length} actions`);
   * console.log('Actions:', dryRun.actions);
   */
  async dryRun() {
    const currentStructure = await this.structureDetector.detect();

    const result = {
      wouldMigrate: false,
      currentStructure,
      actions: [],
      filesToMigrate: 0,
      estimatedBytes: 0
    };

    if (currentStructure === STRUCTURE_TYPES.NEW) {
      result.actions.push('No migration needed - already using new structure');
      return result;
    }

    if (currentStructure === STRUCTURE_TYPES.NONE) {
      result.actions.push('No migration possible - no existing structure found');
      return result;
    }

    result.wouldMigrate = true;

    if (currentStructure === STRUCTURE_TYPES.OLD) {
      result.actions.push('1. Create backup of current structure');
      result.actions.push(`2. Create new directory: ${NEW_COMMAND_DIR}/gsd/`);
      result.actions.push(`3. Copy files from ${OLD_COMMAND_DIR}/gsd/ to ${NEW_COMMAND_DIR}/gsd/`);
      result.actions.push('4. Update manifest paths');
      result.actions.push(`5. Remove old directory: ${OLD_COMMAND_DIR}/gsd/`);
      result.actions.push('6. Verify migration integrity');

      // Count files and estimate size
      const oldPath = path.join(this.targetDir, OLD_COMMAND_DIR, 'gsd');
      const stats = await this._calculateDirectoryStats(oldPath);
      result.filesToMigrate = stats.fileCount;
      result.estimatedBytes = stats.totalBytes;
    } else if (currentStructure === STRUCTURE_TYPES.DUAL) {
      result.actions.push('1. Update manifest to use new structure paths');
      result.actions.push(`2. Remove old directory: ${OLD_COMMAND_DIR}/gsd/`);
      result.actions.push('3. Verify migration integrity');

      const oldPath = path.join(this.targetDir, OLD_COMMAND_DIR, 'gsd');
      const stats = await this._calculateDirectoryStats(oldPath);
      result.filesToMigrate = stats.fileCount;
      result.estimatedBytes = stats.totalBytes;
    }

    return result;
  }

  /**
   * Gets current migration status.
   *
   * Provides information about whether migration is needed and
   * what the current state is.
   *
   * @returns {Promise<Object>} Migration status
   * @property {string} structureType - Current structure type
   * @property {boolean} migrationNeeded - Whether migration is needed
   * @property {Array<Object>} backups - Available migration backups
   * @property {number} estimatedFileCount - Estimated number of files to migrate
   * @property {number} estimatedSize - Estimated total size to migrate
   *
   * @example
   * const status = await migrationService.getMigrationStatus();
   * console.log(`Current structure: ${status.structureType}`);
   * console.log(`Migration needed: ${status.migrationNeeded}`);
   */
  async getMigrationStatus() {
    const structureType = await this.structureDetector.detect();
    const migrationNeeded = structureType === STRUCTURE_TYPES.OLD ||
                            structureType === STRUCTURE_TYPES.DUAL;

    // Get available backups
    const backups = await this._listMigrationBackups();

    // Calculate estimated migration size
    let estimatedFileCount = 0;
    let estimatedSize = 0;

    if (structureType === STRUCTURE_TYPES.OLD) {
      const oldPath = path.join(this.targetDir, OLD_COMMAND_DIR, 'gsd');
      const stats = await this._calculateDirectoryStats(oldPath);
      estimatedFileCount = stats.fileCount;
      estimatedSize = stats.totalBytes;
    } else if (structureType === STRUCTURE_TYPES.DUAL) {
      const oldPath = path.join(this.targetDir, OLD_COMMAND_DIR, 'gsd');
      const stats = await this._calculateDirectoryStats(oldPath);
      estimatedFileCount = stats.fileCount;
      estimatedSize = stats.totalBytes;
    }

    return {
      structureType,
      migrationNeeded,
      backups,
      estimatedFileCount,
      estimatedSize
    };
  }

  /**
   * Lists available migration backups.
   *
   * @returns {Promise<Array<Object>>} Array of backup metadata
   * @private
   */
  async _listMigrationBackups() {
    const backups = [];
    const migrationBackupDir = path.join(this.targetDir, '.backups');

    try {
      await fs.access(migrationBackupDir);
      const entries = await fs.readdir(migrationBackupDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('backup-')) {
          try {
            const metadataPath = path.join(migrationBackupDir, entry.name, 'metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            backups.push(metadata);
          } catch (error) {
            // Skip invalid backup directories
          }
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.debug(`Could not list migration backups: ${error.message}`);
      }
    }

    // Sort by timestamp descending
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Calculates directory statistics.
   *
   * @param {string} dirPath - Directory to analyze
   * @returns {Promise<Object>} Directory statistics
   * @property {number} fileCount - Number of files
   * @property {number} totalBytes - Total bytes
   * @private
   */
  async _calculateDirectoryStats(dirPath) {
    const stats = { fileCount: 0, totalBytes: 0 };

    try {
      const files = await this._collectFilesRecursively(dirPath);
      for (const file of files) {
        try {
          const fileStat = await fs.stat(file);
          stats.fileCount++;
          stats.totalBytes += fileStat.size;
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Directory might not exist
    }

    return stats;
  }

  /**
   * Collects all files recursively in a directory.
   *
   * @param {string} dirPath - Directory to scan
   * @returns {Promise<string[]>} Array of file paths
   * @private
   */
  async _collectFilesRecursively(dirPath) {
    const files = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this._collectFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    return files;
  }

  /**
   * Calculates SHA256 hash of a file.
   *
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} SHA256 hash with 'sha256:' prefix
   * @private
   */
  async _calculateFileHash(filePath) {
    const content = await fs.readFile(filePath);
    const hash = createHash('sha256').update(content).digest('hex');
    return `sha256:${hash}`;
  }

  /**
   * Cleans up old migration backups.
   *
   * Removes migration backups older than the specified retention period.
   *
   * @param {Object} [options={}] - Cleanup options
   * @param {number} [options.retentionDays=30] - Number of days to retain backups
   * @returns {Promise<Object>} Cleanup result
   * @property {number} cleaned - Number of backups removed
   * @property {number} kept - Number of backups retained
   * @property {Array<string>} errors - Errors encountered during cleanup
   *
   * @example
   * const result = await migrationService.cleanup({ retentionDays: 7 });
   * console.log(`Cleaned ${result.cleaned} old backups`);
   */
  async cleanup(options = {}) {
    const retentionDays = options.retentionDays ?? 30;
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    this.logger.info(`Cleaning up migration backups older than ${retentionDays} days...`);

    const result = {
      cleaned: 0,
      kept: 0,
      errors: []
    };

    const migrationBackupDir = path.join(this.targetDir, '.backups');

    try {
      await fs.access(migrationBackupDir);
      const entries = await fs.readdir(migrationBackupDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('backup-')) {
          continue;
        }

        const backupPath = path.join(migrationBackupDir, entry.name);

        try {
          // Extract timestamp from directory name
          const timestamp = parseInt(entry.name.replace('backup-', ''), 10);

          if (isNaN(timestamp)) {
            result.errors.push(`Invalid backup name: ${entry.name}`);
            continue;
          }

          if (timestamp < cutoffTime) {
            await fs.rm(backupPath, { recursive: true, force: true });
            result.cleaned++;
            this.logger.debug(`Removed old backup: ${entry.name}`);
          } else {
            result.kept++;
          }
        } catch (error) {
          result.errors.push(`Failed to process ${entry.name}: ${error.message}`);
        }
      }

      if (result.cleaned > 0) {
        this.logger.info(`Cleaned up ${result.cleaned} old backups, kept ${result.kept}`);
      } else {
        this.logger.info('No old backups to clean up');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        result.errors.push(`Failed to access backup directory: ${error.message}`);
      }
    }

    return result;
  }
}

/**
 * Default export for the migration-service module.
 *
 * @example
 * import { MigrationService } from './services/migration-service.js';
 * const migrationService = new MigrationService(scopeManager, logger);
 */
export default {
  MigrationService
};
