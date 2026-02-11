/**
 * Integration tests for uninstall safety features.
 *
 * Tests namespace protection, manifest-based removal, dry-run accuracy,
 * backup integrity, and recovery workflow with actual file operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Import test utilities
import {
  createMockInstallWithMixedFiles,
  verifyNamespaceProtection,
  verifyBackupIntegrity,
  restoreFromBackup,
  calculateDirectoryContents,
  createTempDir,
  removeDir,
  findAllFiles
} from './helpers/test-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../bin/gsd.js');

/**
 * Helper to run CLI commands in tests.
 */
function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      GSD_TEST_MODE: 'true',
      ...options.env
    };

    const child = spawn('node', [CLI_PATH, ...args], {
      cwd: options.cwd || process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
        combined: stdout + stderr
      });
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Simulate typed input if provided
    if (options.input) {
      child.stdin.write(options.input + '\n');
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
}

describe('Uninstall Safety Features', () => {
  let tempDir;
  let globalConfigDir;
  let homeDir;

  beforeEach(async () => {
    tempDir = await createTempDir();
    homeDir = path.join(tempDir, 'home');
    globalConfigDir = path.join(homeDir, '.config', 'opencode');
    await fs.mkdir(globalConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await removeDir(tempDir);
  });

  describe('Namespace Protection', () => {
    it('should preserve user files (non-gsd) during uninstall', async () => {
      // Create installation with mixed files
      const { removedFiles, preservedFiles } = await createMockInstallWithMixedFiles(globalConfigDir);

      // Run uninstall with --force and --global
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // Verify namespace protection
      const protectionOk = await verifyNamespaceProtection(globalConfigDir, removedFiles, preservedFiles);
      expect(protectionOk).toBe(true);
    });

    it('should remove only gsd-* files from agents directory', async () => {
      // Setup
      await fs.mkdir(path.join(globalConfigDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.mkdir(path.join(globalConfigDir, 'agents', 'user-custom'), { recursive: true });
      await fs.writeFile(path.join(globalConfigDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'gsd content');
      await fs.writeFile(path.join(globalConfigDir, 'agents', 'user-custom', 'config.json'), 'user content');
      await fs.writeFile(path.join(globalConfigDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(globalConfigDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 11, hash: 'sha256:test' },
        { path: path.join(globalConfigDir, 'agents/user-custom/config.json'), relativePath: 'agents/user-custom/config.json', size: 13, hash: 'sha256:test2' },
        { path: path.join(globalConfigDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test3' }
      ];
      await fs.writeFile(
        path.join(globalConfigDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // gsd-debugger should be removed
      await expect(fs.access(path.join(globalConfigDir, 'agents', 'gsd-debugger')))
        .rejects.toThrow();

      // user-custom should still exist
      await expect(fs.access(path.join(globalConfigDir, 'agents', 'user-custom', 'config.json')))
        .resolves.not.toThrow();
    });

    it('should handle mixed content in command directory', async () => {
      // Setup command directory with both gsd and user files
      await fs.mkdir(path.join(globalConfigDir, 'command', 'gsd'), { recursive: true });
      await fs.mkdir(path.join(globalConfigDir, 'command', 'other-tool'), { recursive: true });
      await fs.writeFile(path.join(globalConfigDir, 'command', 'gsd', 'install.js'), '// gsd');
      await fs.writeFile(path.join(globalConfigDir, 'command', 'other-tool', 'script.js'), '// other');
      await fs.writeFile(path.join(globalConfigDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(globalConfigDir, 'command/gsd/install.js'), relativePath: 'command/gsd/install.js', size: 6, hash: 'sha256:test' },
        { path: path.join(globalConfigDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(globalConfigDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // gsd command should be removed
      await expect(fs.access(path.join(globalConfigDir, 'command', 'gsd')))
        .rejects.toThrow();

      // other-tool should still exist (directory preserved)
      await expect(fs.access(path.join(globalConfigDir, 'command', 'other-tool', 'script.js')))
        .resolves.not.toThrow();
    });
  });

  describe('Manifest-Based Removal', () => {
    it('should use manifest when present to determine files to remove', async () => {
      // Create installation with manifest
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest with specific files
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 7, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // Files should be removed
      await expect(fs.access(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md')))
        .rejects.toThrow();
      await expect(fs.access(path.join(installDir, 'VERSION')))
        .rejects.toThrow();
    });

    it('should handle extra files in manifest that do not exist', async () => {
      // Create installation with manifest referencing non-existent files
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest with one existing and one non-existing file
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 7, hash: 'sha256:test' },
        { path: path.join(installDir, 'agents/non-existent/file.txt'), relativePath: 'agents/non-existent/file.txt', size: 0, hash: 'sha256:test2' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test3' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);
      // Should show warning about missing files
      expect(result.combined).toContain('already missing');
    });
  });

  describe('Fallback Mode (No Manifest)', () => {
    it('should use namespace-based detection when manifest is missing', async () => {
      // Create installation WITHOUT manifest
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Run uninstall - no manifest present
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);
      // Should indicate fallback mode
      expect(result.combined.toLowerCase()).toContain('fallback');

      // Files should still be removed
      await expect(fs.access(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md')))
        .rejects.toThrow();
    });
  });

  describe('Directory Preservation', () => {
    it('should preserve non-empty directories after file removal', async () => {
      // Create agents with gsd file and user file
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.mkdir(path.join(installDir, 'agents', 'user-custom'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'gsd');
      await fs.writeFile(path.join(installDir, 'agents', 'user-custom', 'config.json'), 'user');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 3, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // gsd-debugger directory should be gone (was empty after removal)
      await expect(fs.access(path.join(installDir, 'agents', 'gsd-debugger')))
        .rejects.toThrow();

      // agents directory should still exist (contains user-custom)
      const agentsEntries = await fs.readdir(path.join(installDir, 'agents'));
      expect(agentsEntries).toContain('user-custom');
    });

    it('should remove empty directories after file cleanup', async () => {
      // Create installation with only gsd files
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'gsd');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 3, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // All directories should be gone (empty after removal)
      await expect(fs.access(path.join(installDir, 'agents')))
        .rejects.toThrow();
    });
  });

  describe('Dry-Run Mode', () => {
    it('should show preview without removing files', async () => {
      // Create installation
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 7, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run dry-run
      const result = await runCli(['uninstall', '--global', '--dry-run'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);
      expect(result.combined).toContain('Dry run');
      expect(result.combined).toContain('gsd-debugger');

      // Files should still exist
      await expect(fs.access(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md')))
        .resolves.not.toThrow();
      await expect(fs.access(path.join(installDir, 'VERSION')))
        .resolves.not.toThrow();
    });

    it('should accurately predict which files will be removed', async () => {
      // Create installation with mixed files
      const { removedFiles, preservedFiles } = await createMockInstallWithMixedFiles(globalConfigDir);

      // Get pre-uninstall state
      const beforeContents = await calculateDirectoryContents(globalConfigDir);

      // Run dry-run
      const dryRunResult = await runCli(['uninstall', '--global', '--dry-run'], {
        env: { HOME: homeDir }
      });

      expect(dryRunResult.exitCode).toBe(0);

      // Files should still exist after dry-run
      const afterDryRunContents = await calculateDirectoryContents(globalConfigDir);
      expect(afterDryRunContents.files.length).toBe(beforeContents.files.length);

      // Now run actual uninstall
      await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      // Get post-uninstall state
      const afterUninstallContents = await calculateDirectoryContents(globalConfigDir);

      // Calculate actually removed files
      const actualRemoved = beforeContents.files.filter(
        f => !afterUninstallContents.files.includes(f)
      );

      // Verify all removed files are gsd-* files
      for (const file of actualRemoved) {
        const isGsdFile = file.startsWith('agents/gsd-') ||
                         file.startsWith('command/gsd/') ||
                         file.startsWith('skills/gsd-') ||
                         file.startsWith('get-shit-done/') ||
                         file === 'VERSION' ||
                         file === 'INSTALLED_FILES.json';
        expect(isGsdFile).toBe(true);
      }
    });
  });

  describe('Backup and Recovery', () => {
    it('should create backup before removal', async () => {
      // Create installation
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'backup test content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 19, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);
      expect(result.combined).toContain('Backup');

      // Backup directory should exist
      const backupDir = path.join(installDir, '.uninstall-backups');
      await expect(fs.access(backupDir)).resolves.not.toThrow();

      // Backup should contain files
      const backupFiles = await fs.readdir(backupDir);
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it('should skip backup creation with --no-backup flag', async () => {
      // Create installation
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 7, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall with --no-backup
      const result = await runCli(['uninstall', '--global', '--force', '--no-backup'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // Backup directory should not exist
      const backupDir = path.join(installDir, '.uninstall-backups');
      await expect(fs.access(backupDir)).rejects.toThrow();
    });

    it('should backup files with correct content', async () => {
      // Create installation with specific content
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      const originalContent = 'This is the original content for backup test';
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), originalContent);
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: originalContent.length, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      // Read backup content
      const backupDir = path.join(installDir, '.uninstall-backups');
      const backupFiles = await fs.readdir(backupDir);
      const skillBackup = backupFiles.find(f => f.includes('SKILL'));
      expect(skillBackup).toBeDefined();

      const backupContent = await fs.readFile(path.join(backupDir, skillBackup), 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    it('should allow restoring from backup', async () => {
      // Create installation
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'restorable content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 18, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      // Get backup directory
      const backupDir = path.join(installDir, '.uninstall-backups');

      // Restore files
      await restoreFromBackup(backupDir, installDir);

      // Verify restoration
      await expect(fs.access(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md')))
        .resolves.not.toThrow();

      const restoredContent = await fs.readFile(
        path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'),
        'utf-8'
      );
      expect(restoredContent).toBe('restorable content');
    });
  });

  describe('Safety Summary', () => {
    it('should display accurate file and directory counts', async () => {
      // Create installation with known counts
      const installDir = globalConfigDir;
      await fs.mkdir(path.join(installDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(installDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(installDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(installDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 7, hash: 'sha256:test' },
        { path: path.join(installDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);

      // Should show safety summary
      expect(result.combined).toMatch(/\d+ files will be removed/);
      expect(result.combined).toMatch(/\d+ directories will be/);
    });
  });

  describe('Scope Detection', () => {
    it('should handle global scope correctly', async () => {
      // Create global installation only
      await fs.mkdir(path.join(globalConfigDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(globalConfigDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'content');
      await fs.writeFile(path.join(globalConfigDir, 'VERSION'), '1.0.0');

      // Create manifest
      const manifestEntries = [
        { path: path.join(globalConfigDir, 'agents/gsd-debugger/SKILL.md'), relativePath: 'agents/gsd-debugger/SKILL.md', size: 7, hash: 'sha256:test' },
        { path: path.join(globalConfigDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test2' }
      ];
      await fs.writeFile(
        path.join(globalConfigDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      // Run uninstall with --global
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      expect(result.exitCode).toBe(0);
      expect(result.combined.toLowerCase()).toContain('global');
    });

    it('should show error when both global and local exist without scope flag', async () => {
      // Create both global and local installations
      await fs.mkdir(path.join(globalConfigDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(globalConfigDir, 'VERSION'), '1.0.0');

      const localDir = path.join(tempDir, 'project', '.opencode');
      await fs.mkdir(path.join(localDir, 'agents', 'gsd-debugger'), { recursive: true });
      await fs.writeFile(path.join(localDir, 'VERSION'), '1.0.0');

      // Create manifests
      const globalManifest = [
        { path: path.join(globalConfigDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test' }
      ];
      await fs.writeFile(
        path.join(globalConfigDir, 'INSTALLED_FILES.json'),
        JSON.stringify(globalManifest, null, 2)
      );

      const localManifest = [
        { path: path.join(localDir, 'VERSION'), relativePath: 'VERSION', size: 5, hash: 'sha256:test' }
      ];
      await fs.writeFile(
        path.join(localDir, 'INSTALLED_FILES.json'),
        JSON.stringify(localManifest, null, 2)
      );

      // Run uninstall without --global or --local
      const result = await runCli(['uninstall', '--force'], {
        env: { HOME: homeDir },
        cwd: path.join(tempDir, 'project')
      });

      // Should show error about ambiguity
      expect(result.exitCode).not.toBe(0);
      expect(result.combined.toLowerCase()).toContain('both');
    });
  });

  describe('Performance', () => {
    it('should handle large installations efficiently', async () => {
      // Create installation with many files
      const installDir = globalConfigDir;
      const manifestEntries = [];

      for (let i = 0; i < 20; i++) {
        const dir = path.join(installDir, 'agents', `gsd-agent-${i}`);
        await fs.mkdir(dir, { recursive: true });
        const content = `Agent ${i} content`;
        const filePath = path.join(dir, 'SKILL.md');
        await fs.writeFile(filePath, content);

        manifestEntries.push({
          path: filePath,
          relativePath: `agents/gsd-agent-${i}/SKILL.md`,
          size: content.length,
          hash: `sha256:agent${i}`
        });
      }

      await fs.writeFile(
        path.join(installDir, 'INSTALLED_FILES.json'),
        JSON.stringify(manifestEntries, null, 2)
      );

      const startTime = Date.now();

      // Run uninstall
      const result = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });

      const duration = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent installation gracefully', async () => {
      // Run uninstall without any installation
      const result = await runCli(['uninstall', '--global'], {
        env: { HOME: homeDir }
      });

      // Should indicate nothing to uninstall
      expect(result.combined.toLowerCase()).toContain('not');
    });

    it('should handle installation with only user files', async () => {
      // Create directory with only user files (no VERSION)
      await fs.mkdir(path.join(globalConfigDir, 'agents', 'user-custom'), { recursive: true });
      await fs.writeFile(path.join(globalConfigDir, 'agents', 'user-custom', 'config.json'), 'user');

      // Run uninstall
      const result = await runCli(['uninstall', '--global'], {
        env: { HOME: homeDir }
      });

      // Should indicate not installed
      expect(result.combined.toLowerCase()).toContain('not');
    });
  });
});

describe('Safety Integration', () => {
  it('should perform complete safe uninstall workflow', async () => {
    const tempDir = await createTempDir();
    const homeDir = path.join(tempDir, 'home');
    const globalConfigDir = path.join(homeDir, '.config', 'opencode');
    await fs.mkdir(globalConfigDir, { recursive: true });

    try {
      // 1. Create realistic installation
      const { removedFiles, preservedFiles } = await createMockInstallWithMixedFiles(globalConfigDir);

      // 2. Verify installation exists
      const beforeFiles = await findAllFiles(globalConfigDir);
      expect(beforeFiles.length).toBeGreaterThan(0);

      // 3. Run dry-run first
      const dryRunResult = await runCli(['uninstall', '--global', '--dry-run'], {
        env: { HOME: homeDir }
      });
      expect(dryRunResult.exitCode).toBe(0);

      // Verify files still exist after dry-run
      const afterDryRunFiles = await findAllFiles(globalConfigDir);
      expect(afterDryRunFiles.length).toBe(beforeFiles.length);

      // 4. Run actual uninstall
      const uninstallResult = await runCli(['uninstall', '--global', '--force'], {
        env: { HOME: homeDir }
      });
      expect(uninstallResult.exitCode).toBe(0);
      expect(uninstallResult.combined).toContain('successfully uninstalled');

      // 5. Verify namespace protection
      const protectionOk = await verifyNamespaceProtection(globalConfigDir, removedFiles, preservedFiles);
      expect(protectionOk).toBe(true);

      // 6. Verify backup created
      const backupDir = path.join(globalConfigDir, '.uninstall-backups');
      const backupExists = await fs.access(backupDir).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);

      // 7. Verify recovery is possible
      const restoredFiles = await restoreFromBackup(backupDir, globalConfigDir);
      expect(restoredFiles.length).toBeGreaterThan(0);

    } finally {
      await removeDir(tempDir);
    }
  });
});
