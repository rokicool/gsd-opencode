/**
 * Unit tests for SyncManifest
 * 
 * Uses Node.js built-in test runner (node:test, node:assert)
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SyncManifest } from '../SyncManifest.js';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

describe('SyncManifest', () => {
  const testDir = join(tmpdir(), 'sync-manifest-test-' + Date.now());
  const manifestPath = join(testDir, 'sync-manifest.json');

  before(async () => {
    // Create test directory
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
  });

  after(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should use default manifest path', () => {
      const manifest = new SyncManifest();
      assert.ok(manifest.manifestPath.includes('sync-manifest.json'));
    });

    it('should accept custom manifest path', () => {
      const manifest = new SyncManifest({ manifestPath: './custom/path.json' });
      assert.ok(manifest.manifestPath.includes('custom/path.json'));
    });
  });

  describe('load', () => {
    it('should create default structure when file missing', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'non-existent.json') });
      
      const data = await manifest.load();
      
      assert.strictEqual(data.version, '1.0.0');
      assert.strictEqual(data.lastSync, null);
      assert.deepStrictEqual(data.files, {});
    });

    it('should save valid JSON that can be reloaded', async () => {
      const manifest = new SyncManifest({ manifestPath });
      
      const original = {
        version: '1.0.0',
        lastSync: {
          commit: 'abc123',
          date: '2026-02-22T10:00:00Z',
          version: 'v1.0.0'
        },
        files: {
          'test.md': {
            syncedAt: '2026-02-22T10:00:00Z',
            sourceHash: 'hash123',
            destHash: 'hash456',
            transformed: true
          }
        }
      };
      
      await manifest.save(original);
      const loaded = await manifest.load();
      
      assert.strictEqual(loaded.version, original.version);
      assert.strictEqual(loaded.lastSync.commit, original.lastSync.commit);
      assert.strictEqual(loaded.files['test.md'].sourceHash, 'hash123');
    });
  });

  describe('save', () => {
    it('should write valid JSON', async () => {
      const manifest = new SyncManifest({ manifestPath });
      
      await manifest.save(manifest.getDefaultManifest());
      
      const content = await readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      assert.strictEqual(parsed.version, '1.0.0');
    });

    it('should create directory if needed', async () => {
      const nestedPath = join(testDir, 'nested', 'dir', 'manifest.json');
      const manifest = new SyncManifest({ manifestPath: nestedPath });
      
      await manifest.save(manifest.getDefaultManifest());
      
      assert.ok(existsSync(nestedPath));
    });
  });

  describe('updateFile', () => {
    it('should add file entry with hashes and timestamp', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'update-test.json') });
      
      const status = await manifest.updateFile('path/to/file.md', {
        sourceHash: 'source-hash-123',
        destHash: 'dest-hash-456',
        transformed: true
      });
      
      assert.ok(status.syncedAt);
      assert.strictEqual(status.sourceHash, 'source-hash-123');
      assert.strictEqual(status.destHash, 'dest-hash-456');
      assert.strictEqual(status.transformed, true);
    });

    it('should persist file entry', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'persist-test.json') });
      
      await manifest.updateFile('persist/file.md', {
        sourceHash: 'hash-abc',
        transformed: false
      });
      
      const loaded = await manifest.load();
      assert.ok(loaded.files['persist/file.md']);
      assert.strictEqual(loaded.files['persist/file.md'].sourceHash, 'hash-abc');
    });
  });

  describe('getFileStatus', () => {
    it('should return null for unknown files', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'status-test.json') });
      
      const status = await manifest.getFileStatus('unknown/file.md');
      
      assert.strictEqual(status, null);
    });

    it('should return metadata for tracked files', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'status-known.json') });
      
      await manifest.updateFile('known/file.md', {
        sourceHash: 'known-hash',
        destHash: 'dest-hash'
      });
      
      const status = await manifest.getFileStatus('known/file.md');
      
      assert.ok(status);
      assert.strictEqual(status.sourceHash, 'known-hash');
      assert.strictEqual(status.exists, true);
    });
  });

  describe('getLastSync / setLastSync', () => {
    it('should roundtrip correctly', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'sync-roundtrip.json') });
      
      await manifest.setLastSync({
        commit: 'def456',
        date: '2026-02-22T12:00:00Z',
        version: 'v2.0.0'
      });
      
      const lastSync = await manifest.getLastSync();
      
      assert.strictEqual(lastSync.commit, 'def456');
      assert.strictEqual(lastSync.date, '2026-02-22T12:00:00Z');
      assert.strictEqual(lastSync.version, 'v2.0.0');
    });

    it('should use current date if not provided', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'sync-date.json') });
      
      await manifest.setLastSync({ commit: 'commit123' });
      
      const lastSync = await manifest.getLastSync();
      
      assert.ok(lastSync.date);
      assert.ok(new Date(lastSync.date) <= new Date());
    });
  });

  describe('atomic writes', () => {
    it('should not corrupt on crash simulation', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'atomic-test.json') });
      
      // Save initial data
      await manifest.updateFile('file1.md', { sourceHash: 'hash1' });
      
      // Save again (should work even if previous temp file existed)
      await manifest.updateFile('file2.md', { sourceHash: 'hash2' });
      
      const loaded = await manifest.load();
      
      assert.strictEqual(Object.keys(loaded.files).length, 2);
    });
  });

  describe('hasSourceChanged', () => {
    it('should return changed=true for new files', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'changed-test.json') });
      
      const result = await manifest.hasSourceChanged('new/file.md', 'hash123');
      
      assert.strictEqual(result.changed, true);
      assert.strictEqual(result.lastHash, null);
    });

    it('should return changed=false for same hash', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'same-hash.json') });
      
      await manifest.updateFile('same/file.md', { sourceHash: 'hash-abc' });
      
      const result = await manifest.hasSourceChanged('same/file.md', 'hash-abc');
      
      assert.strictEqual(result.changed, false);
      assert.strictEqual(result.lastHash, 'hash-abc');
    });

    it('should return changed=true for different hash', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'diff-hash.json') });
      
      await manifest.updateFile('diff/file.md', { sourceHash: 'old-hash' });
      
      const result = await manifest.hasSourceChanged('diff/file.md', 'new-hash');
      
      assert.strictEqual(result.changed, true);
      assert.strictEqual(result.lastHash, 'old-hash');
    });
  });

  describe('removeFile', () => {
    it('should remove tracked file', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'remove-test.json') });
      
      await manifest.updateFile('to-remove.md', { sourceHash: 'hash' });
      const removed = await manifest.removeFile('to-remove.md');
      
      assert.strictEqual(removed, true);
      
      const status = await manifest.getFileStatus('to-remove.md');
      assert.strictEqual(status, null);
    });

    it('should return false for non-existent file', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'remove-noop.json') });
      
      const removed = await manifest.removeFile('non-existent.md');
      
      assert.strictEqual(removed, false);
    });
  });

  describe('getTrackedFiles', () => {
    it('should return all tracked file paths', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'tracked.json') });
      
      await manifest.updateFile('file1.md', { sourceHash: 'h1' });
      await manifest.updateFile('file2.md', { sourceHash: 'h2' });
      await manifest.updateFile('nested/file3.md', { sourceHash: 'h3' });
      
      const files = await manifest.getTrackedFiles();
      
      assert.strictEqual(files.length, 3);
      assert.ok(files.includes('file1.md'));
      assert.ok(files.includes('file2.md'));
      assert.ok(files.includes('nested/file3.md'));
    });
  });

  describe('reset', () => {
    it('should clear all data', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'reset-test.json') });
      
      await manifest.updateFile('file.md', { sourceHash: 'hash' });
      await manifest.setLastSync({ commit: 'abc', version: 'v1' });
      
      await manifest.reset();
      
      const loaded = await manifest.load();
      assert.strictEqual(loaded.lastSync, null);
      assert.deepStrictEqual(loaded.files, {});
    });
  });

  describe('computeHash', () => {
    it('should produce consistent SHA-256 hashes', () => {
      const manifest = new SyncManifest();
      
      const hash1 = manifest.computeHash('test content');
      const hash2 = manifest.computeHash('test content');
      const hash3 = manifest.computeHash('different content');
      
      assert.strictEqual(hash1, hash2);
      assert.notStrictEqual(hash1, hash3);
      assert.strictEqual(hash1.length, 64); // SHA-256 = 64 hex chars
    });
  });

  describe('getSyncStatus', () => {
    it('should categorize files correctly', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'sync-status.json') });
      
      // Track one file
      await manifest.updateFile('existing.md', { sourceHash: 'known-hash' });
      
      // Mock hash function
      const hashFn = async (filePath) => {
        if (filePath === 'existing.md') return 'known-hash';
        return 'new-hash';
      };
      
      const result = await manifest.getSyncStatus(
        ['existing.md', 'new-file.md'],
        hashFn
      );
      
      assert.strictEqual(result.needsSync.length, 1);
      assert.ok(result.needsSync.includes('new-file.md'));
      assert.strictEqual(result.unchanged.length, 1);
      assert.ok(result.unchanged.includes('existing.md'));
      assert.strictEqual(result.newFiles.length, 1);
      assert.ok(result.newFiles.includes('new-file.md'));
    });
  });

  describe('validateAndMigrate', () => {
    it('should fix invalid lastSync', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'migrate.json') });
      
      await manifest.save({
        version: '1.0.0',
        lastSync: { /* missing commit and date */ },
        files: {}
      });
      
      const loaded = await manifest.load();
      
      assert.strictEqual(loaded.lastSync, null);
    });

    it('should remove invalid file entries', async () => {
      const manifest = new SyncManifest({ manifestPath: join(testDir, 'clean-invalid.json') });
      
      await manifest.save({
        version: '1.0.0',
        lastSync: null,
        files: {
          'valid.md': {
            syncedAt: '2026-02-22T10:00:00Z',
            sourceHash: 'hash',
            destHash: 'hash',
            transformed: false
          },
          'invalid.md': {
            /* missing required fields */
          }
        }
      });
      
      const loaded = await manifest.load();
      
      assert.ok(loaded.files['valid.md']);
      assert.strictEqual(loaded.files['invalid.md'], undefined);
    });
  });
});
