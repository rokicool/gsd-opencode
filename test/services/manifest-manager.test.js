/**
 * Unit tests for ManifestManager service
 *
 * Tests manifest creation, saving, loading, namespace filtering,
 * and hash generation for safe uninstallation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ManifestManager } from '../../src/services/manifest-manager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ALLOWED_NAMESPACES } from '../../lib/constants.js';

describe('ManifestManager', () => {
  let tempDir;
  let manifestManager;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `manifest-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    manifestManager = new ManifestManager(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('creates instance with installPath', () => {
      expect(manifestManager).toBeInstanceOf(ManifestManager);
      expect(manifestManager.getInstallPath()).toBe(tempDir);
    });

    it('throws error if installPath is not provided', () => {
      expect(() => new ManifestManager()).toThrow('installPath is required');
      expect(() => new ManifestManager(null)).toThrow('installPath is required');
      expect(() => new ManifestManager('')).toThrow('installPath is required');
    });

    it('sets manifest path correctly', () => {
      const expectedPath = path.join(tempDir, 'INSTALLED_FILES.json');
      expect(manifestManager.getManifestPath()).toBe(expectedPath);
    });
  });

  describe('addFile', () => {
    it('adds file to internal array', () => {
      const entry = manifestManager.addFile(
        '/full/path/to/file.md',
        'agents/gsd-debugger/SKILL.md',
        2847,
        'sha256:a1b2c3'
      );

      expect(entry).toEqual({
        path: '/full/path/to/file.md',
        relativePath: 'agents/gsd-debugger/SKILL.md',
        size: 2847,
        hash: 'sha256:a1b2c3'
      });

      expect(manifestManager.getAllEntries()).toHaveLength(1);
    });

    it('accepts and stores size and hash', () => {
      manifestManager.addFile('/path/1', 'file1.md', 100, 'sha256:hash1');
      manifestManager.addFile('/path/2', 'file2.md', 200, 'sha256:hash2');

      const entries = manifestManager.getAllEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].size).toBe(100);
      expect(entries[0].hash).toBe('sha256:hash1');
      expect(entries[1].size).toBe(200);
      expect(entries[1].hash).toBe('sha256:hash2');
    });

    it('returns the created manifest entry', () => {
      const entry = manifestManager.addFile('/test', 'test.txt', 42, 'sha256:test');
      expect(entry).toHaveProperty('path', '/test');
      expect(entry).toHaveProperty('relativePath', 'test.txt');
      expect(entry).toHaveProperty('size', 42);
      expect(entry).toHaveProperty('hash', 'sha256:test');
    });
  });

  describe('save', () => {
    it('writes valid JSON to INSTALLED_FILES.json', async () => {
      manifestManager.addFile(
        path.join(tempDir, 'agents/gsd-debugger/SKILL.md'),
        'agents/gsd-debugger/SKILL.md',
        2847,
        'sha256:a1b2c3d4e5f6'
      );

      const savedPath = await manifestManager.save();

      expect(savedPath).toBe(manifestManager.getManifestPath());

      const content = await fs.readFile(savedPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        path: expect.any(String),
        relativePath: 'agents/gsd-debugger/SKILL.md',
        size: 2847,
        hash: 'sha256:a1b2c3d4e5f6'
      });
    });

    it('saves multiple entries', async () => {
      manifestManager.addFile('/path/1', 'file1.md', 100, 'hash1');
      manifestManager.addFile('/path/2', 'file2.md', 200, 'hash2');
      manifestManager.addFile('/path/3', 'file3.md', 300, 'hash3');

      await manifestManager.save();

      const content = await fs.readFile(manifestManager.getManifestPath(), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveLength(3);
    });

    it('formats JSON with indentation', async () => {
      manifestManager.addFile('/test', 'test.txt', 42, 'hash');

      await manifestManager.save();

      const content = await fs.readFile(manifestManager.getManifestPath(), 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });
  });

  describe('load', () => {
    it('reads manifest and returns array', async () => {
      const testData = [
        {
          path: '/test/file1.md',
          relativePath: 'agents/gsd-debugger/SKILL.md',
          size: 2847,
          hash: 'sha256:abc123'
        },
        {
          path: '/test/file2.md',
          relativePath: 'command/gsd/install.js',
          size: 1024,
          hash: 'sha256:def456'
        }
      ];

      await fs.writeFile(
        manifestManager.getManifestPath(),
        JSON.stringify(testData, null, 2),
        'utf-8'
      );

      const entries = await manifestManager.load();

      expect(entries).toHaveLength(2);
      expect(entries[0].relativePath).toBe('agents/gsd-debugger/SKILL.md');
      expect(entries[1].relativePath).toBe('command/gsd/install.js');
    });

    it('returns null if manifest does not exist', async () => {
      const entries = await manifestManager.load();
      expect(entries).toBeNull();
    });

    it('throws error if manifest has corrupted JSON', async () => {
      await fs.writeFile(
        manifestManager.getManifestPath(),
        'this is not valid json {',
        'utf-8'
      );

      await expect(manifestManager.load()).rejects.toThrow();
    });

    it('updates internal entries array when loading', async () => {
      const testData = [{ path: '/test', relativePath: 'test.txt', size: 42, hash: 'hash' }];
      await fs.writeFile(
        manifestManager.getManifestPath(),
        JSON.stringify(testData),
        'utf-8'
      );

      await manifestManager.load();

      expect(manifestManager.getAllEntries()).toHaveLength(1);
    });

    it('clears internal entries when manifest not found', async () => {
      manifestManager.addFile('/test', 'test.txt', 42, 'hash');

      await manifestManager.load();

      expect(manifestManager.getAllEntries()).toHaveLength(0);
    });
  });

  describe('calculateHash', () => {
    it('calculates SHA256 hash of file content', async () => {
      const testFile = path.join(tempDir, 'test-hash.txt');
      await fs.writeFile(testFile, 'Hello World', 'utf-8');

      const hash = await ManifestManager.calculateHash(testFile);

      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('returns consistent hash for same content', async () => {
      const testFile = path.join(tempDir, 'consistent.txt');
      await fs.writeFile(testFile, 'Test content', 'utf-8');

      const hash1 = await ManifestManager.calculateHash(testFile);
      const hash2 = await ManifestManager.calculateHash(testFile);

      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different content', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'Content A', 'utf-8');
      await fs.writeFile(file2, 'Content B', 'utf-8');

      const hash1 = await ManifestManager.calculateHash(file1);
      const hash2 = await ManifestManager.calculateHash(file2);

      expect(hash1).not.toBe(hash2);
    });

    it('throws error if file cannot be read', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.txt');

      await expect(ManifestManager.calculateHash(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('isInAllowedNamespace', () => {
    it('returns true for gsd-debugger paths', () => {
      expect(manifestManager.isInAllowedNamespace('agents/gsd-debugger/SKILL.md', ALLOWED_NAMESPACES)).toBe(true);
    });

    it('returns true for command/gsd paths', () => {
      expect(manifestManager.isInAllowedNamespace('command/gsd/install.js', ALLOWED_NAMESPACES)).toBe(true);
    });

    it('returns true for get-shit-done paths', () => {
      expect(manifestManager.isInAllowedNamespace('get-shit-done/workflows/execute.md', ALLOWED_NAMESPACES)).toBe(true);
    });

    it('returns true for skills/gsd-* paths', () => {
      expect(manifestManager.isInAllowedNamespace('skills/gsd-helper/SKILL.md', ALLOWED_NAMESPACES)).toBe(true);
    });

    it('returns false for non-gsd agents', () => {
      expect(manifestManager.isInAllowedNamespace('agents/other-agent/file.md', ALLOWED_NAMESPACES)).toBe(false);
    });

    it('returns false for non-gsd commands', () => {
      expect(manifestManager.isInAllowedNamespace('command/other/file.js', ALLOWED_NAMESPACES)).toBe(false);
    });

    it('returns false for config.json at root', () => {
      expect(manifestManager.isInAllowedNamespace('config.json', ALLOWED_NAMESPACES)).toBe(false);
    });

    it('handles absolute paths by converting to relative', () => {
      const absolutePath = path.join(tempDir, 'agents/gsd-debugger/SKILL.md');
      expect(manifestManager.isInAllowedNamespace(absolutePath, ALLOWED_NAMESPACES)).toBe(true);
    });

    it('normalizes Windows-style paths', () => {
      expect(manifestManager.isInAllowedNamespace('agents\\gsd-debugger\\SKILL.md', ALLOWED_NAMESPACES)).toBe(true);
      expect(manifestManager.isInAllowedNamespace('command\\other\\file.js', ALLOWED_NAMESPACES)).toBe(false);
    });
  });

  describe('getFilesInNamespaces', () => {
    it('filters files correctly by namespace', () => {
      manifestManager.addFile('/p1', 'agents/gsd-debugger/SKILL.md', 100, 'hash1');
      manifestManager.addFile('/p2', 'agents/other-agent/file.md', 200, 'hash2');
      manifestManager.addFile('/p3', 'command/gsd/install.js', 300, 'hash3');
      manifestManager.addFile('/p4', 'config.json', 400, 'hash4');

      const allowedFiles = manifestManager.getFilesInNamespaces(ALLOWED_NAMESPACES);

      expect(allowedFiles).toHaveLength(2);
      expect(allowedFiles.map(e => e.relativePath)).toContain('agents/gsd-debugger/SKILL.md');
      expect(allowedFiles.map(e => e.relativePath)).toContain('command/gsd/install.js');
    });

    it('returns empty array if no matches', () => {
      manifestManager.addFile('/p1', 'agents/other-agent/file.md', 100, 'hash1');
      manifestManager.addFile('/p2', 'config.json', 200, 'hash2');

      const allowedFiles = manifestManager.getFilesInNamespaces(ALLOWED_NAMESPACES);

      expect(allowedFiles).toEqual([]);
    });

    it('returns all entries when all match', () => {
      manifestManager.addFile('/p1', 'agents/gsd-test/file.md', 100, 'hash1');
      manifestManager.addFile('/p2', 'skills/gsd-helper/SKILL.md', 200, 'hash2');

      const allowedFiles = manifestManager.getFilesInNamespaces(ALLOWED_NAMESPACES);

      expect(allowedFiles).toHaveLength(2);
    });
  });

  describe('getAllEntries', () => {
    it('returns copy of internal entries array', () => {
      manifestManager.addFile('/test', 'test.txt', 42, 'hash');

      const entries1 = manifestManager.getAllEntries();
      const entries2 = manifestManager.getAllEntries();

      expect(entries1).toEqual(entries2);
      expect(entries1).not.toBe(entries2); // Different array instances
    });

    it('modifying returned array does not affect internal state', () => {
      manifestManager.addFile('/test', 'test.txt', 42, 'hash');

      const entries = manifestManager.getAllEntries();
      entries.pop(); // Modify the returned array

      expect(manifestManager.getAllEntries()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes all tracked entries', () => {
      manifestManager.addFile('/p1', 'file1.txt', 100, 'hash1');
      manifestManager.addFile('/p2', 'file2.txt', 200, 'hash2');

      manifestManager.clear();

      expect(manifestManager.getAllEntries()).toHaveLength(0);
    });

    it('does not affect saved manifest file', async () => {
      manifestManager.addFile('/test', 'test.txt', 42, 'hash');
      await manifestManager.save();

      manifestManager.clear();

      // File should still exist
      const content = await fs.readFile(manifestManager.getManifestPath(), 'utf-8');
      expect(JSON.parse(content)).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty manifest (no files added)', async () => {
      await manifestManager.save();

      const content = await fs.readFile(manifestManager.getManifestPath(), 'utf-8');
      expect(JSON.parse(content)).toEqual([]);
    });

    it('handles manifest with special characters in paths', async () => {
      manifestManager.addFile('/test', 'file with spaces.md', 100, 'hash');
      manifestManager.addFile('/test', 'file-with-dashes_and_underscores.txt', 200, 'hash');

      await manifestManager.save();
      const entries = await manifestManager.load();

      expect(entries).toHaveLength(2);
      expect(entries[0].relativePath).toBe('file with spaces.md');
    });

    it('handles zero-size files', () => {
      const entry = manifestManager.addFile('/test', 'empty.txt', 0, 'hash');
      expect(entry.size).toBe(0);
    });

    it('handles very large file sizes', () => {
      const largeSize = 1024 * 1024 * 1024; // 1GB
      const entry = manifestManager.addFile('/test', 'large.bin', largeSize, 'hash');
      expect(entry.size).toBe(largeSize);
    });
  });
});
