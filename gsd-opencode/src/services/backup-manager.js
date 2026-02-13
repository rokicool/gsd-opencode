/**
 * Backup manager service for safe backup and retention during repair operations.
 *
 * This module provides backup creation and retention management for GSD-OpenCode
 * installations. It handles:
 * - Creating date-stamped backups of files before they are overwritten
 * - Maintaining a backup directory with proper structure
 * - Enforcing retention policies (keeping only N most recent backups)
 * - Graceful error handling that doesn't fail the entire operation
 *
 * Used by the RepairService to ensure users can recover if repairs go wrong.
 *
 * @module backup-manager
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Manages backups for GSD-OpenCode installation repairs.
 *
 * This class provides safe backup creation with date-stamped filenames and
 * automatic retention management. It ensures that files are backed up before
 * being overwritten during repair operations, with configurable retention
 * policies to prevent disk space issues.
 *
 * @class BackupManager
 * @example
 * const scope = new ScopeManager({ scope: 'global' });
 * const logger = createLogger();
 * const backupManager = new BackupManager(scope, logger, { maxBackups: 5 });
 *
 * // Create a backup before repair
 * const result = await backupManager.backupFile(
 *   '/home/user/.config/opencode/agents/ro-commit.md',
 *   'agents/ro-commit.md'
 * );
 * if (result.success) {
 *   console.log(`Backed up to: ${result.backupPath}`);
 * }
 *
 * // Clean up old backups (keep only 5 newest)
 * const cleanup = await backupManager.cleanupOldBackups();
 * console.log(`Removed ${cleanup.cleaned} old backups`);
 */
export class BackupManager {
  /**
   * Creates a new BackupManager instance.
   *
   * @param {Object} scopeManager - ScopeManager instance for path resolution
   * @param {Object} logger - Logger instance for output (from logger.js)
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxBackups=5] - Maximum number of backups to retain
   * @throws {Error} If scopeManager is not provided or missing getTargetDir method
   * @throws {Error} If logger is not provided or missing required methods
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * const logger = createLogger();
   * const backupManager = new BackupManager(scope, logger);
   *
   * // With custom retention
   * const backupManager = new BackupManager(scope, logger, { maxBackups: 10 });
   */
  constructor(scopeManager, logger, options = {}) {
    // Validate scopeManager
    if (!scopeManager) {
      throw new Error('ScopeManager instance is required');
    }

    if (typeof scopeManager.getTargetDir !== 'function') {
      throw new Error('Invalid ScopeManager: missing getTargetDir method');
    }

    // Validate logger
    if (!logger) {
      throw new Error('Logger instance is required');
    }

    if (typeof logger.debug !== 'function') {
      throw new Error('Invalid Logger: missing debug method');
    }

    if (typeof logger.info !== 'function') {
      throw new Error('Invalid Logger: missing info method');
    }

    if (typeof logger.error !== 'function') {
      throw new Error('Invalid Logger: missing error method');
    }

    this.scopeManager = scopeManager;
    this.logger = logger;

    // Set backup directory (within target installation directory)
    const targetDir = scopeManager.getTargetDir();
    this._backupDir = path.join(targetDir, '.backups');

    // Set retention count (default to 5)
    this._retentionCount = options.maxBackups ?? 5;

    this.logger.debug(`BackupManager initialized with retention: ${this._retentionCount}`);
  }

  /**
   * Creates a date-stamped backup of a file.
   *
   * Copies the source file to the backup directory with a date prefix.
   * The backup filename format is: YYYY-MM-DD_original-filename.ext
   *
   * @param {string} sourcePath - Absolute path to the file being backed up
   * @param {string} relativePath - Path relative to installation root (for reference)
   * @returns {Promise<Object>} Backup result
   * @property {boolean} success - True if backup was successful
   * @property {string|null} backupPath - Path to the backup file, or null if failed
   * @property {string} originalPath - Original file path
   * @property {string|null} error - Error message if backup failed
   *
   * @example
   * const result = await backupManager.backupFile(
   *   '/home/user/.config/opencode/agents/ro-commit.md',
   *   'agents/ro-commit.md'
   * );
   * // Result: { success: true, backupPath: '/.../.backups/2026-02-10_ro-commit.md', ... }
   */
  async backupFile(sourcePath, relativePath) {
    try {
      // Check if source file exists
      try {
        await fs.access(sourcePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.logger.debug(`No backup needed for ${relativePath}: file doesn't exist`);
          return {
            success: true,
            backupPath: null,
            originalPath: sourcePath,
            note: 'File did not exist, no backup needed'
          };
        }
        throw error;
      }

      // Ensure backup directory exists
      await fs.mkdir(this._backupDir, { recursive: true });

      // Generate date-stamped backup filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const originalName = path.basename(relativePath);
      const backupFileName = `${timestamp}_${originalName}`;
      const backupPath = path.join(this._backupDir, backupFileName);

      this.logger.debug(`Creating backup: ${relativePath} -> ${backupFileName}`);

      // Copy file to backup location
      await fs.copyFile(sourcePath, backupPath);

      this.logger.info(`Backed up ${relativePath}`);

      return {
        success: true,
        backupPath,
        originalPath: sourcePath
      };
    } catch (error) {
      const errorMessage = `Failed to backup ${relativePath}: ${error.message}`;
      this.logger.error(errorMessage);

      return {
        success: false,
        backupPath: null,
        originalPath: sourcePath,
        error: errorMessage
      };
    }
  }

  /**
   * Cleans up old backups according to retention policy.
   *
   * Reads all backup files, sorts by date (newest first), and removes
   * files beyond the retention count. Files without valid date prefixes
   * are ignored and not deleted.
   *
   * @returns {Promise<Object>} Cleanup result
   * @property {number} cleaned - Number of backups removed
   * @property {number} kept - Number of backups retained
   * @property {Array<string>} errors - Array of error messages for failed deletions
   *
   * @example
   * const result = await backupManager.cleanupOldBackups();
   * console.log(`Cleaned ${result.cleaned} backups, kept ${result.kept}`);
   * if (result.errors.length > 0) {
   *   console.warn('Some backups could not be removed:', result.errors);
   * }
   */
  async cleanupOldBackups() {
    const errors = [];
    let cleaned = 0;
    let kept = 0;

    try {
      // Check if backup directory exists
      try {
        await fs.access(this._backupDir);
      } catch (error) {
        if (error.code === 'ENOENT') {
          this.logger.debug('Backup directory does not exist, nothing to clean up');
          return { cleaned: 0, kept: 0, errors: [] };
        }
        throw error;
      }

      // Read backup directory contents
      const entries = await fs.readdir(this._backupDir, { withFileTypes: true });

      // Filter for files (not directories) with date prefix
      const backupFiles = entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => this._isDatePrefixed(name));

      if (backupFiles.length === 0) {
        this.logger.debug('No backup files found in backup directory');
        return { cleaned: 0, kept: 0, errors: [] };
      }

      this.logger.debug(`Found ${backupFiles.length} backup files, retention: ${this._retentionCount}`);

      // Sort by date descending (newest first)
      const sortedFiles = backupFiles.sort((a, b) => {
        const dateA = this._extractDate(a);
        const dateB = this._extractDate(b);
        return dateB - dateA; // Descending order
      });

      // Remove files beyond retention count
      const filesToRemove = sortedFiles.slice(this._retentionCount);
      const filesToKeep = sortedFiles.slice(0, this._retentionCount);

      kept = filesToKeep.length;

      for (const fileName of filesToRemove) {
        const filePath = path.join(this._backupDir, fileName);
        try {
          await fs.unlink(filePath);
          cleaned++;
          this.logger.debug(`Removed old backup: ${fileName}`);
        } catch (error) {
          const errorMsg = `Failed to remove ${fileName}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      if (cleaned > 0) {
        this.logger.info(`Cleaned up ${cleaned} old backups, kept ${kept}`);
      }

      return { cleaned, kept, errors };
    } catch (error) {
      const errorMessage = `Failed to cleanup old backups: ${error.message}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Checks if a filename has a date prefix (YYYY-MM-DD format).
   *
   * @param {string} fileName - Filename to check
   * @returns {boolean} True if filename starts with date pattern
   * @private
   */
  _isDatePrefixed(fileName) {
    // Check if filename starts with YYYY-MM-DD pattern
    const datePattern = /^\d{4}-\d{2}-\d{2}_/;
    return datePattern.test(fileName);
  }

  /**
   * Extracts the date from a backup filename.
   *
   * @param {string} fileName - Backup filename with date prefix
   * @returns {Date} Date object parsed from filename
   * @private
   */
  _extractDate(fileName) {
    // Extract YYYY-MM-DD from beginning of filename
    const dateString = fileName.substring(0, 10);
    return new Date(dateString);
  }

  /**
   * Returns the backup directory path.
   *
   * @returns {string} Path to backup directory
   */
  getBackupDir() {
    return this._backupDir;
  }

  /**
   * Returns the current retention count.
   *
   * @returns {number} Number of backups to retain
   */
  getRetentionCount() {
    return this._retentionCount;
  }

  /**
   * Creates a migration backup of the entire installation.
   *
   * Creates a timestamped backup of the installation before migration,
   * including manifest, command/gsd/ directory, and all tracked files.
   * Stores backup in .backups/ subdirectory.
   *
   * @param {Object} options - Backup options
   * @param {string} options.targetDir - Path to the installation directory
   * @param {string} options.originalStructure - Structure type ('old', 'new', 'dual', 'none')
   * @param {number} options.timestamp - Timestamp for the backup
   * @returns {Promise<Object>} Backup metadata
   * @property {string} path - Path to the backup directory
   * @property {number} timestamp - Backup timestamp
   * @property {string} originalStructure - Original structure type
   * @property {string[]} affectedFiles - List of files that will be affected
   * @property {Object|null} originalManifest - Original manifest content (if exists)
   *
   * @example
   * const backup = await backupManager.createMigrationBackup({
   *   targetDir: '/home/user/.config/opencode',
   *   originalStructure: 'old',
   *   timestamp: Date.now()
   * });
   * // Returns: { path: '/.../.backups/backup-1234567890', ... }
   */
  async createMigrationBackup({ targetDir, originalStructure, timestamp }) {
    const backupDirName = `backup-${timestamp}`;
    const migrationBackupDir = path.join(targetDir, '.backups', backupDirName);

    this.logger.info('Creating migration backup...');

    try {
      // Ensure migration backup directory exists
      await fs.mkdir(migrationBackupDir, { recursive: true });

      // Determine files to backup based on structure type
      const affectedFiles = [];
      const oldPath = path.join(targetDir, 'command', 'gsd');
      const newPath = path.join(targetDir, 'commands', 'gsd');
      const manifestPath = path.join(targetDir, 'get-shit-done', 'INSTALLED_FILES.json');

      // Check and add old structure files
      try {
        await fs.access(oldPath);
        const oldFiles = await this._collectFilesRecursively(oldPath);
        for (const file of oldFiles) {
          const relativePath = path.relative(targetDir, file);
          affectedFiles.push(relativePath);
          await this._copyToBackup(file, migrationBackupDir, relativePath);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Check and add new structure files
      try {
        await fs.access(newPath);
        const newFiles = await this._collectFilesRecursively(newPath);
        for (const file of newFiles) {
          const relativePath = path.relative(targetDir, file);
          if (!affectedFiles.includes(relativePath)) {
            affectedFiles.push(relativePath);
            await this._copyToBackup(file, migrationBackupDir, relativePath);
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Backup manifest if it exists
      let originalManifest = null;
      try {
        await fs.access(manifestPath);
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        originalManifest = JSON.parse(manifestContent);
        await fs.writeFile(
          path.join(migrationBackupDir, 'manifest.json'),
          manifestContent,
          'utf-8'
        );
        affectedFiles.push('get-shit-done/INSTALLED_FILES.json');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        this.logger.debug('No manifest found, skipping manifest backup');
      }

      // Create backup metadata file
      const metadata = {
        timestamp,
        originalStructure,
        affectedFiles,
        backupPath: migrationBackupDir,
        created: new Date(timestamp).toISOString()
      };
      await fs.writeFile(
        path.join(migrationBackupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );

      this.logger.info(`Migration backup created at ${migrationBackupDir}`);
      this.logger.info(`Backed up ${affectedFiles.length} files`);

      return {
        path: migrationBackupDir,
        timestamp,
        originalStructure,
        affectedFiles,
        originalManifest
      };
    } catch (error) {
      // Clean up partial backup on failure
      try {
        await fs.rm(migrationBackupDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      throw new Error(`Failed to create migration backup: ${error.message}`);
    }
  }

  /**
   * Restores original structure from migration backup.
   *
   * Handles rollback of failed migrations by restoring files from backup
   * and cleaning up any partial migration artifacts.
   *
   * @param {Object} backup - Backup metadata object from createMigrationBackup
   * @returns {Promise<boolean>} True if restore succeeded
   *
   * @example
   * const success = await backupManager.restoreFromMigrationBackup(backup);
   * if (success) {
   *   console.log('Rollback completed successfully');
   * }
   */
  async restoreFromMigrationBackup(backup) {
    if (!backup || !backup.path) {
      throw new Error('Invalid backup metadata: path is required');
    }

    this.logger.info('Restoring from migration backup...');

    try {
      const backupDir = backup.path;
      const targetDir = this.scopeManager.getTargetDir();

      // Verify backup directory exists
      try {
        await fs.access(backupDir);
      } catch (error) {
        throw new Error(`Backup directory not found: ${backupDir}`);
      }

      // Load metadata
      let metadata;
      try {
        const metadataContent = await fs.readFile(
          path.join(backupDir, 'metadata.json'),
          'utf-8'
        );
        metadata = JSON.parse(metadataContent);
      } catch (error) {
        this.logger.warning('Could not load backup metadata, proceeding with file restoration');
        metadata = { affectedFiles: [] };
      }

      // Restore manifest if backed up
      const manifestBackupPath = path.join(backupDir, 'manifest.json');
      const manifestTargetPath = path.join(targetDir, 'get-shit-done', 'INSTALLED_FILES.json');
      try {
        await fs.access(manifestBackupPath);
        await fs.mkdir(path.dirname(manifestTargetPath), { recursive: true });
        await fs.copyFile(manifestBackupPath, manifestTargetPath);
        this.logger.debug('Restored manifest');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Restore files from backup
      for (const relativePath of metadata.affectedFiles || []) {
        if (relativePath === 'get-shit-done/INSTALLED_FILES.json') {
          continue; // Already handled above
        }

        const backupFilePath = path.join(backupDir, relativePath);
        const targetFilePath = path.join(targetDir, relativePath);

        try {
          await fs.access(backupFilePath);
          await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
          await fs.copyFile(backupFilePath, targetFilePath);
          this.logger.debug(`Restored: ${relativePath}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            this.logger.error(`Failed to restore ${relativePath}: ${error.message}`);
          }
        }
      }

      this.logger.success('Migration rollback completed');
      return true;
    } catch (error) {
      this.logger.error(`Migration rollback failed: ${error.message}`);
      return false;
    }
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
   * Copies a file to the backup directory maintaining relative path structure.
   *
   * @param {string} sourcePath - Source file path
   * @param {string} backupDir - Backup directory root
   * @param {string} relativePath - Relative path from target dir
   * @returns {Promise<void>}
   * @private
   */
  async _copyToBackup(sourcePath, backupDir, relativePath) {
    const targetPath = path.join(backupDir, relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
  }
}

/**
 * Default export for the backup-manager module.
 *
 * @example
 * import { BackupManager } from './services/backup-manager.js';
 * const backupManager = new BackupManager(scopeManager, logger);
 */
export default {
  BackupManager
};
