/**
 * Backup utilities for creating and managing file backups
 * @module utils/backup
 */

import { copyFile, mkdir, rm, stat, access } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { tmpdir } from 'os';
import { mkdtemp } from 'fs/promises';

/**
 * Create a backup of a file before modification
 * Backups are stored in .planning/backups/{ISO-date}/{relative-path}
 * @param {string} filePath - Absolute path to the file to backup
 * @param {string} projectRoot - Project root directory for relative path calculation
 * @returns {Promise<string>} Path to the backup file
 */
export async function createBackup(filePath, projectRoot = process.cwd()) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const relativePath = relative(projectRoot, filePath);
  const backupDir = join(projectRoot, '.planning', 'backups', timestamp);
  const backupPath = join(backupDir, relativePath);
  
  // Create backup directory structure
  await mkdir(dirname(backupPath), { recursive: true });
  
  // Check if source file exists
  try {
    await access(filePath);
  } catch {
    // File doesn't exist, nothing to backup
    return null;
  }
  
  // Copy file to backup location
  await copyFile(filePath, backupPath);
  
  return backupPath;
}

/**
 * Restore a file from its backup
 * @param {string} backupPath - Path to the backup file
 * @param {string} originalPath - Path to restore the file to
 * @returns {Promise<boolean>} True if restore succeeded
 */
export async function restoreBackup(backupPath, originalPath) {
  try {
    await access(backupPath);
  } catch {
    // Backup doesn't exist
    return false;
  }
  
  // Ensure target directory exists
  await mkdir(dirname(originalPath), { recursive: true });
  
  // Copy backup to original location
  await copyFile(backupPath, originalPath);
  
  return true;
}

/**
 * Remove a backup file after successful sync
 * @param {string} backupPath - Path to the backup to remove
 * @returns {Promise<boolean>} True if cleanup succeeded
 */
export async function cleanupBackup(backupPath) {
  try {
    await rm(backupPath, { force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up all backups in a backup directory
 * @param {string} backupDir - Path to backup directory (timestamped)
 * @returns {Promise<boolean>} True if cleanup succeeded
 */
export async function cleanupBackupDir(backupDir) {
  try {
    await rm(backupDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a temporary backup directory for atomic operations
 * @param {string} prefix - Prefix for the temp directory name
 * @returns {Promise<{path: string, cleanup: Function}>} Temp directory path and cleanup function
 */
export async function createTempBackupDir(prefix = 'gsd-backup-') {
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  
  return {
    path: tempDir,
    cleanup: async () => {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

/**
 * Get backup info for a file
 * @param {string} backupPath - Path to the backup file
 * @returns {Promise<Object|null>} Backup info or null if doesn't exist
 */
export async function getBackupInfo(backupPath) {
  try {
    const stats = await stat(backupPath);
    return {
      path: backupPath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch {
    return null;
  }
}

export default {
  createBackup,
  restoreBackup,
  cleanupBackup,
  cleanupBackupDir,
  createTempBackupDir,
  getBackupInfo
};
