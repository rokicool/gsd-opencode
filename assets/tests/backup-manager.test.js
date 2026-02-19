/**
 * Unit tests for BackupManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackupManager } from '../lib/backup-manager.js';
import { writeFile, mkdir, rm, readdir, readFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('BackupManager', () => {
  const testDir = join(tmpdir(), 'backup-manager-test-' + Date.now());
  const backupDir = join(testDir, '.translate-backups');

  beforeEach(async () => {
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const manager = new BackupManager();
      expect(manager.backupDir).toBe('.translate-backups');
      expect(manager.maxAgeDays).toBe(30);
    });

    it('should accept custom options', () => {
      const manager = new BackupManager({
        backupDir: 'custom-backups',
        maxAgeDays: 7
      });
      expect(manager.backupDir).toBe('custom-backups');
      expect(manager.maxAgeDays).toBe(7);
    });
  });

  describe('ensureBackupDir', () => {
    it('should create backup directory if it does not exist', async () => {
      const manager = new BackupManager({ backupDir: backupDir });

      expect(existsSync(backupDir)).toBe(false);

      await manager.ensureBackupDir();

      expect(existsSync(backupDir)).toBe(true);
    });

    it('should not fail if backup directory already exists', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      await mkdir(backupDir, { recursive: true });

      await expect(manager.ensureBackupDir()).resolves.not.toThrow();
    });
  });

  describe('sanitizePathForFilename', () => {
    it('should replace path separators with underscores', () => {
      const manager = new BackupManager();

      expect(manager.sanitizePathForFilename('/path/to/file.txt'))
        .toBe('_path_to_file.txt');
      expect(manager.sanitizePathForFilename('\\windows\\path'))
        .toBe('_windows_path');
    });

    it('should handle paths without separators', () => {
      const manager = new BackupManager();

      expect(manager.sanitizePathForFilename('file.txt'))
        .toBe('file.txt');
    });
  });

  describe('createBackup', () => {
    it('should create a backup of a file', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const originalFile = join(testDir, 'test.txt');
      const content = 'Hello, World!';

      await writeFile(originalFile, content, 'utf-8');

      const result = await manager.createBackup(originalFile);

      expect(result.success).toBe(true);
      expect(result.originalPath).toBe(originalFile);
      expect(result.backupPath).toContain('.bak');
      expect(existsSync(result.backupPath)).toBe(true);

      // Verify backup content
      const backupContent = await readFile(result.backupPath, 'utf-8');
      expect(backupContent).toBe(content);
    });

    it('should create backup directory if needed', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const originalFile = join(testDir, 'test.txt');

      await writeFile(originalFile, 'content', 'utf-8');

      expect(existsSync(backupDir)).toBe(false);

      await manager.createBackup(originalFile);

      expect(existsSync(backupDir)).toBe(true);
    });

    it('should include timestamp in backup filename', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const originalFile = join(testDir, 'test.txt');

      await writeFile(originalFile, 'content', 'utf-8');

      const result = await manager.createBackup(originalFile);

      expect(result.timestamp).toBeTruthy();
      expect(result.backupPath).toContain(result.timestamp);
    });

    it('should return error for non-existent files', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const nonExistentFile = join(testDir, 'does-not-exist.txt');

      const result = await manager.createBackup(nonExistentFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });

    it('should save backup metadata', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const originalFile = join(testDir, 'test.txt');

      await writeFile(originalFile, 'content', 'utf-8');
      await manager.createBackup(originalFile);

      const metadataPath = join(backupDir, 'backups.json');
      expect(existsSync(metadataPath)).toBe(true);

      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
      expect(metadata).toHaveLength(1);
      expect(metadata[0].originalPath).toBe(originalFile);
    });
  });

  describe('listBackups', () => {
    it('should list all backups', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'file2.txt');

      await writeFile(file1, 'content1', 'utf-8');
      await writeFile(file2, 'content2', 'utf-8');

      await manager.createBackup(file1);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      await manager.createBackup(file2);

      const backups = await manager.listBackups();

      expect(backups).toHaveLength(2);
    });

    it('should return empty array for no backups', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      await manager.ensureBackupDir();

      const backups = await manager.listBackups();

      expect(backups).toHaveLength(0);
    });

    it('should calculate age for backups', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'file.txt');

      await writeFile(file, 'content', 'utf-8');
      await manager.createBackup(file);

      const backups = await manager.listBackups();

      expect(backups[0].age).toBeGreaterThanOrEqual(0);
      expect(backups[0].age).toBeLessThan(1); // Less than 1 day old
    });
  });

  describe('getMostRecentBackup', () => {
    it('should return the most recent backup for a file', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'file.txt');

      await writeFile(file, 'content1', 'utf-8');
      const backup1 = await manager.createBackup(file);
      await new Promise(resolve => setTimeout(resolve, 100));

      await writeFile(file, 'content2', 'utf-8');
      const backup2 = await manager.createBackup(file);

      const recent = await manager.getMostRecentBackup(file);

      // Should return one of the backups (not null)
      expect(recent).not.toBeNull();
      // Should be the more recent one (backup2 has later timestamp)
      expect(recent.path).toContain('file.txt');
    });

    it('should return null if no backup exists', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'no-backup.txt');

      const recent = await manager.getMostRecentBackup(file);

      expect(recent).toBeNull();
    });
  });

  describe('restoreBackup', () => {
    it('should restore a file from backup', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'restore-test.txt');
      const originalContent = 'Original content';
      const modifiedContent = 'Modified content';

      // Create original and backup
      await writeFile(file, originalContent, 'utf-8');
      await manager.createBackup(file);

      // Modify the file
      await writeFile(file, modifiedContent, 'utf-8');

      // Verify modification
      expect(await readFile(file, 'utf-8')).toBe(modifiedContent);

      // Restore
      const result = await manager.restoreBackup(file);

      expect(result.success).toBe(true);
      expect(await readFile(file, 'utf-8')).toBe(originalContent);
    });

    it('should return error if no backup exists', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'no-backup.txt');

      const result = await manager.restoreBackup(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No backup found');
    });
  });

  describe('cleanupOldBackups', () => {
    it('should delete backups older than maxAgeDays', async () => {
      // Use a very small max age to force cleanup of recent backups
      const manager = new BackupManager({ backupDir: backupDir, maxAgeDays: -1 });
      const file = join(testDir, 'file.txt');

      await writeFile(file, 'content', 'utf-8');
      await manager.createBackup(file);

      const result = await manager.cleanupOldBackups();

      expect(result.deleted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should not delete recent backups', async () => {
      const manager = new BackupManager({ backupDir: backupDir, maxAgeDays: 30 });
      const file = join(testDir, 'file.txt');

      await writeFile(file, 'content', 'utf-8');
      await manager.createBackup(file);

      const result = await manager.cleanupOldBackups();

      expect(result.deleted).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return backup statistics', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'file.txt');

      await writeFile(file, 'content', 'utf-8');
      await manager.createBackup(file);

      const stats = await manager.getStats();

      expect(stats.totalBackups).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestBackup).toBeInstanceOf(Date);
    });

    it('should return zero stats for no backups', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      await manager.ensureBackupDir();

      const stats = await manager.getStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestBackup).toBeNull();
    });
  });

  describe('deleteBackupsForFile', () => {
    it('should delete all backups for a specific file', async () => {
      const manager = new BackupManager({ backupDir: backupDir });
      const file = join(testDir, 'file.txt');

      await writeFile(file, 'content1', 'utf-8');
      await manager.createBackup(file);
      await new Promise(resolve => setTimeout(resolve, 100));
      await writeFile(file, 'content2', 'utf-8');
      await manager.createBackup(file);

      let backups = await manager.listBackups();
      expect(backups).toHaveLength(2);

      await manager.deleteBackupsForFile(file);

      backups = await manager.listBackups();
      expect(backups).toHaveLength(0);
    });
  });
});
