/**
 * BackupManager - Automatic backup creation and management
 *
 * Features:
 * - Creates timestamped backups before file modifications
 * - Organizes backups in .translate-backups/ directory
 * - Automatic cleanup of old backups (30 days default)
 * - Restore functionality for backed-up files
 */

import { mkdir, copyFile, readdir, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';

/**
 * @typedef {Object} BackupOptions
 * @property {string} [backupDir='.translate-backups'] - Directory for backups
 * @property {number} [maxAgeDays=30] - Maximum age of backups in days
 */

/**
 * @typedef {Object} BackupResult
 * @property {string} backupPath - Path to the created backup file
 * @property {string} timestamp - ISO timestamp of the backup
 * @property {string} originalPath - Original file path
 * @property {boolean} success - Whether backup was successful
 * @property {string|null} error - Error message if failed
 */

/**
 * Class for managing file backups
 */
export class BackupManager {
  /**
   * @param {BackupOptions} options
   */
  constructor(options = {}) {
    this.backupDir = options.backupDir || '.translate-backups';
    this.maxAgeDays = options.maxAgeDays || 30;
  }

  /**
   * Get the full path to the backup directory
   * @returns {string}
   */
  getBackupDirectory() {
    return resolve(this.backupDir);
  }

  /**
   * Ensure the backup directory exists
   * @returns {Promise<void>}
   */
  async ensureBackupDir() {
    const backupPath = this.getBackupDirectory();
    if (!existsSync(backupPath)) {
      await mkdir(backupPath, { recursive: true });
    }
  }

  /**
   * Generate a timestamp string for backup naming
   * @returns {string}
   */
  generateTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-');
  }

  /**
   * Sanitize a path for use in a filename
   * Replaces path separators with underscores
   * @param {string} filePath
   * @returns {string}
   */
  sanitizePathForFilename(filePath) {
    return filePath.replace(/[/\\]/g, '_');
  }

  /**
   * Create a backup of a file
   * @param {string} filePath - Path to the file to backup
   * @returns {Promise<BackupResult>}
   */
  async createBackup(filePath) {
    const resolvedPath = resolve(filePath);
    const timestamp = this.generateTimestamp();

    try {
      // Ensure backup directory exists
      await this.ensureBackupDir();

      // Generate backup filename
      const sanitizedPath = this.sanitizePathForFilename(resolvedPath);
      const backupFilename = `${sanitizedPath}.${timestamp}.bak`;
      const backupPath = join(this.getBackupDirectory(), backupFilename);

      // Copy the file
      await copyFile(resolvedPath, backupPath);

      // Store backup metadata
      await this.saveBackupMetadata(resolvedPath, backupPath, timestamp);

      return {
        backupPath,
        timestamp,
        originalPath: resolvedPath,
        success: true,
        error: null
      };
    } catch (error) {
      return {
        backupPath: '',
        timestamp,
        originalPath: resolvedPath,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save metadata about a backup for restore tracking
   * @param {string} originalPath
   * @param {string} backupPath
   * @param {string} timestamp
   * @returns {Promise<void>}
   */
  async saveBackupMetadata(originalPath, backupPath, timestamp) {
    const metadataPath = join(this.getBackupDirectory(), 'backups.json');

    let metadata = [];
    if (existsSync(metadataPath)) {
      try {
        const data = await readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(data);
      } catch (e) {
        // Start fresh if file is corrupt
        metadata = [];
      }
    }

    metadata.push({
      originalPath,
      backupPath,
      timestamp,
      created: new Date().toISOString()
    });

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * List all backups
   * @returns {Promise<Array<{path: string, originalPath: string, timestamp: string, age: number}>>}
   */
  async listBackups() {
    await this.ensureBackupDir();
    const backupPath = this.getBackupDirectory();

    try {
      const files = await readdir(backupPath);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.bak')) {
          const filePath = join(backupPath, file);
          const stats = await stat(filePath);
          const age = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

          // Extract original path and timestamp from filename
          // Timestamp format: 2026-02-19T20-46-13-123Z (from toISOString with : replaced by -)
          const match = file.match(/^(.+)\.([\d-TZ-]+)\.bak$/);
          if (match) {
            backups.push({
              path: filePath,
              originalPath: match[1].replace(/_/g, '/'),
              timestamp: match[2],
              age: Math.round(age * 10) / 10
            });
          }
        }
      }

      return backups.sort((a, b) => b.age - a.age);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get the most recent backup for a file
   * @param {string} filePath
   * @returns {Promise<{path: string, timestamp: string}|null>}
   */
  async getMostRecentBackup(filePath) {
    const resolvedPath = resolve(filePath);
    const sanitized = this.sanitizePathForFilename(resolvedPath);

    const backups = await this.listBackups();
    // Sort by age ascending (newest first)
    const sorted = backups.sort((a, b) => a.age - b.age);
    const matching = sorted.filter(b =>
      b.originalPath === resolvedPath ||
      b.path.includes(sanitized)
    );

    return matching.length > 0 ? matching[0] : null;
  }

  /**
   * Restore a file from its most recent backup
   * @param {string} filePath
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async restoreBackup(filePath) {
    const resolvedPath = resolve(filePath);

    try {
      const backup = await this.getMostRecentBackup(resolvedPath);

      if (!backup) {
        return { success: false, error: 'No backup found for this file' };
      }

      await copyFile(backup.path, resolvedPath);

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old backups
   * @returns {Promise<{deleted: number, errors: string[]}>}
   */
  async cleanupOldBackups() {
    const maxAgeMs = this.maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    const backups = await this.listBackups();
    const deleted = [];
    const errors = [];

    for (const backup of backups) {
      const stats = await stat(backup.path);
      if (stats.mtime.getTime() < cutoffTime) {
        try {
          await unlink(backup.path);
          deleted.push(backup.path);
        } catch (error) {
          errors.push(`Failed to delete ${backup.path}: ${error.message}`);
        }
      }
    }

    return { deleted: deleted.length, errors };
  }

  /**
   * Get backup statistics
   * @returns {Promise<{totalBackups: number, totalSize: number, oldestBackup: Date|null}>}
   */
  async getStats() {
    const backups = await this.listBackups();
    let totalSize = 0;
    let oldestDate = null;

    for (const backup of backups) {
      try {
        const stats = await stat(backup.path);
        totalSize += stats.size;
        if (!oldestDate || stats.mtime < oldestDate) {
          oldestDate = stats.mtime;
        }
      } catch (e) {
        // Skip files we can't stat
      }
    }

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: oldestDate
    };
  }

  /**
   * Delete all backups for a specific file
   * @param {string} filePath
   * @returns {Promise<{deleted: number, errors: string[]}>}
   */
  async deleteBackupsForFile(filePath) {
    const resolvedPath = resolve(filePath);
    const backups = await this.listBackups();
    const deleted = [];
    const errors = [];

    for (const backup of backups) {
      if (backup.originalPath === resolvedPath) {
        try {
          await unlink(backup.path);
          deleted.push(backup.path);
        } catch (error) {
          errors.push(`Failed to delete ${backup.path}: ${error.message}`);
        }
      }
    }

    return { deleted: deleted.length, errors };
  }
}

export default BackupManager;
