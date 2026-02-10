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
