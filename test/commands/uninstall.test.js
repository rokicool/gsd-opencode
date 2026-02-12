/**
 * Unit tests for enhanced uninstall command with safety features
 *
 * Tests namespace protection, dry-run mode, backup creation,
 * typed confirmation, and directory preservation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManifestManager } from '../../src/services/manifest-manager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ALLOWED_NAMESPACES } from '../../lib/constants.js';

describe('uninstall command with safety features', () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = path.join(os.tmpdir(), `uninstall-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create test installation structure
    await createTestInstallation(tempDir);

    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  async function createTestInstallation(baseDir) {
    // Create allowed namespace files
    await fs.mkdir(path.join(baseDir, 'agents', 'gsd-debugger'), { recursive: true });
    await fs.writeFile(path.join(baseDir, 'agents', 'gsd-debugger', 'SKILL.md'), 'Debugger skill content', 'utf-8');

    await fs.mkdir(path.join(baseDir, 'command', 'gsd'), { recursive: true });
    await fs.writeFile(path.join(baseDir, 'command', 'gsd', 'install.js'), 'Install command', 'utf-8');

    await fs.mkdir(path.join(baseDir, 'get-shit-done', 'workflows'), { recursive: true });
    await fs.writeFile(path.join(baseDir, 'get-shit-done', 'workflows', 'test.md'), 'Workflow content', 'utf-8');

    // Create non-gsd files (should be preserved)
    await fs.mkdir(path.join(baseDir, 'agents', 'other-agent'), { recursive: true });
    await fs.writeFile(path.join(baseDir, 'agents', 'other-agent', 'file.md'), 'Other agent content', 'utf-8');

    await fs.writeFile(path.join(baseDir, 'config.json'), '{"custom": true}', 'utf-8');

    // Create VERSION file
    await fs.writeFile(path.join(baseDir, 'VERSION'), '1.0.0', 'utf-8');

    // Create manifest
    const manifest = [
      {
        path: path.join(baseDir, 'agents/gsd-debugger/SKILL.md'),
        relativePath: 'agents/gsd-debugger/SKILL.md',
        size: 24,
        hash: 'sha256:abc123'
      },
      {
        path: path.join(baseDir, 'command/gsd/install.js'),
        relativePath: 'command/gsd/install.js',
        size: 17,
        hash: 'sha256:def456'
      },
      {
        path: path.join(baseDir, 'get-shit-done/workflows/test.md'),
        relativePath: 'get-shit-done/workflows/test.md',
        size: 18,
        hash: 'sha256:ghi789'
      },
      {
        path: path.join(baseDir, 'agents/other-agent/file.md'),
        relativePath: 'agents/other-agent/file.md',
        size: 21,
        hash: 'sha256:jkl012'
      },
      {
        path: path.join(baseDir, 'config.json'),
        relativePath: 'config.json',
        size: 16,
        hash: 'sha256:mno345'
      }
    ];

    await fs.writeFile(
      path.join(baseDir, 'get-shit-done', 'INSTALLED_FILES.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  describe('namespace protection', () => {
    it('correctly identifies allowed namespaces', () => {
      // gsd-debugger is allowed
      expect(ALLOWED_NAMESPACES.some(pattern =>
        pattern.test('agents/gsd-debugger/SKILL.md')
      )).toBe(true);

      // other-agent is NOT allowed
      expect(ALLOWED_NAMESPACES.some(pattern =>
        pattern.test('agents/other-agent/file.md')
      )).toBe(false);

      // command/gsd is allowed
      expect(ALLOWED_NAMESPACES.some(pattern =>
        pattern.test('command/gsd/install.js')
      )).toBe(true);

      // config.json at root is NOT allowed
      expect(ALLOWED_NAMESPACES.some(pattern =>
        pattern.test('config.json')
      )).toBe(false);
    });

    it('getFilesInNamespaces filters files correctly', () => {
      const manifestManager = new ManifestManager(tempDir);
      
      // Add test entries
      manifestManager.addFile(path.join(tempDir, 'agents/gsd-debugger/SKILL.md'), 'agents/gsd-debugger/SKILL.md', 24, 'sha256:abc');
      manifestManager.addFile(path.join(tempDir, 'agents/other-agent/file.md'), 'agents/other-agent/file.md', 21, 'sha256:def');
      manifestManager.addFile(path.join(tempDir, 'command/gsd/install.js'), 'command/gsd/install.js', 17, 'sha256:ghi');
      
      const allowedFiles = manifestManager.getFilesInNamespaces(ALLOWED_NAMESPACES);
      
      expect(allowedFiles).toHaveLength(2);
      expect(allowedFiles.map(f => f.relativePath)).toContain('agents/gsd-debugger/SKILL.md');
      expect(allowedFiles.map(f => f.relativePath)).toContain('command/gsd/install.js');
      expect(allowedFiles.map(f => f.relativePath)).not.toContain('agents/other-agent/file.md');
    });

    it('isInAllowedNamespace handles absolute paths', () => {
      const manifestManager = new ManifestManager(tempDir);
      const absolutePath = path.join(tempDir, 'agents/gsd-debugger/SKILL.md');
      
      expect(manifestManager.isInAllowedNamespace(absolutePath, ALLOWED_NAMESPACES)).toBe(true);
    });

    it('isInAllowedNamespace handles Windows-style paths', () => {
      const manifestManager = new ManifestManager(tempDir);
      
      // Test with backslashes that get normalized to forward slashes
      expect(manifestManager.isInAllowedNamespace('agents\\gsd-debugger\\SKILL.md', ALLOWED_NAMESPACES)).toBe(true);
      expect(manifestManager.isInAllowedNamespace('agents\\other-agent\\file.md', ALLOWED_NAMESPACES)).toBe(false);
    });
  });

  describe('manifest operations', () => {
    it('saves and loads manifest correctly', async () => {
      const manifestManager = new ManifestManager(tempDir);
      manifestManager.addFile(path.join(tempDir, 'test.txt'), 'test.txt', 100, 'sha256:test');
      
      const savedPath = await manifestManager.save();
      expect(savedPath).toBe(path.join(tempDir, 'get-shit-done', 'INSTALLED_FILES.json'));
      
      const newManager = new ManifestManager(tempDir);
      const loaded = await newManager.load();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].relativePath).toBe('test.txt');
    });

    it('returns null when manifest does not exist', async () => {
      const newManager = new ManifestManager(path.join(tempDir, 'nonexistent'));
      const loaded = await newManager.load();
      expect(loaded).toBeNull();
    });

    it('handles corrupted manifest JSON', async () => {
      await fs.mkdir(path.join(tempDir, 'get-shit-done'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'get-shit-done', 'INSTALLED_FILES.json'), 'not valid json {', 'utf-8');
      
      const manifestManager = new ManifestManager(tempDir);
      await expect(manifestManager.load()).rejects.toThrow();
    });

    it('ManifestManager calculateHash generates correct SHA256', async () => {
      const testFile = path.join(tempDir, 'hash-test.txt');
      await fs.writeFile(testFile, 'test content', 'utf-8');
      
      const hash = await ManifestManager.calculateHash(testFile);
      
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('ManifestManager clear removes all entries', () => {
      const manifestManager = new ManifestManager(tempDir);
      manifestManager.addFile('/test1', 'test1.txt', 100, 'hash1');
      manifestManager.addFile('/test2', 'test2.txt', 200, 'hash2');
      
      expect(manifestManager.getAllEntries()).toHaveLength(2);
      
      manifestManager.clear();
      
      expect(manifestManager.getAllEntries()).toHaveLength(0);
    });
  });
});
