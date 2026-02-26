/**
 * Unit tests for SyncService
 *
 * Uses Node.js built-in test runner (node:test, node:assert)
 * Creates temp directories for isolated testing
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SyncService, SyncError } from '../SyncService.js';
import { SubmoduleService } from '../SubmoduleService.js';
import { SyncManifest } from '../SyncManifest.js';
import { writeFile, mkdir, rm, rename } from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { exec as realExec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(realExec);

// Helper to create a fresh git repository
async function createGitRepo(dir) {
  await mkdir(dir, { recursive: true });
  await execAsync('git init', { cwd: dir });
  await execAsync('git config user.email "test@test.com"', { cwd: dir });
  await execAsync('git config user.name "Test"', { cwd: dir });
}

// Helper to create a commit
async function createCommit(dir, filename, content, message) {
  await writeFile(join(dir, filename), content, 'utf-8');
  await execAsync('git add .', { cwd: dir });
  await execAsync(`git commit -m "${message}"`, { cwd: dir });
}

// Helper to create a file in the test project
async function createProjectFile(projectRoot, relativePath, content) {
  const fullPath = join(projectRoot, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf-8');
}

// Mock SubmoduleService for testing
function createMockSubmoduleService(files = [], commitInfo = {}) {
  return {
    verifySubmodule: async () => {},
    getCommitInfo: async () => ({
      hash: 'abc123def456789',
      shortHash: 'abc123d',
      version: 'v1.0.0',
      date: '2026-02-22T00:00:00Z',
      ...commitInfo
    }),
    detectChanges: async () => ({
      hasChanges: files.length > 0,
      files,
      fromCommit: 'none',
      toCommit: 'abc123def456789',
      message: files.length > 0 ? `Found ${files.length} file(s)` : 'No changes'
    })
  };
}

// Mock SyncManifest for testing
function createMockSyncManifest() {
  const data = {
    files: {},
    lastSync: null
  };

  return {
    load: async () => data,
    save: async (manifest) => { Object.assign(data, manifest); },
    getFileStatus: async (path) => data.files[path] || null,
    updateFile: async (path, status) => {
      data.files[path] = { ...status, syncedAt: new Date().toISOString() };
      return data.files[path];
    },
    getLastSync: async () => data.lastSync,
    setLastSync: async (info) => {
      data.lastSync = { ...info, date: new Date().toISOString() };
      return data.lastSync;
    },
    getTrackedFiles: async () => Object.keys(data.files),
    reset: async () => {
      data.files = {};
      data.lastSync = null;
    }
  };
}

describe('SyncService', () => {
  const testDir = join(tmpdir(), 'sync-service-test-' + Date.now());
  let originalDir;
  let manifestPath;

  before(async () => {
    // Create test directories
    await mkdir(testDir, { recursive: true });
    originalDir = join(testDir, 'original');
    manifestPath = join(testDir, 'sync-manifest.json');
  });

  after(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Clean up gsd-opencode directory before each test
    const gsdDir = join(testDir, 'gsd-opencode');
    if (existsSync(gsdDir)) {
      await rm(gsdDir, { recursive: true, force: true });
    }
    // Clean up original directory
    if (existsSync(originalDir)) {
      await rm(originalDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should require submoduleService', () => {
      assert.throws(
        () => new SyncService({ syncManifest: createMockSyncManifest() }),
        (err) => {
          assert.ok(err instanceof SyncError);
          assert.strictEqual(err.code, 'MISSING_DEPENDENCY');
          return true;
        }
      );
    });

    it('should require syncManifest', () => {
      assert.throws(
        () => new SyncService({ submoduleService: createMockSubmoduleService() }),
        (err) => {
          assert.ok(err instanceof SyncError);
          assert.strictEqual(err.code, 'MISSING_DEPENDENCY');
          return true;
        }
      );
    });

    it('should create instance with required dependencies', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });
      assert.ok(service instanceof SyncService);
    });
  });

  describe('getTargetPath', () => {
    it('should map agents/ to gsd-opencode/agents/', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });

      const result = service.getTargetPath('agents/test.md');
      assert.strictEqual(result, 'gsd-opencode/agents/test.md');
    });

    it('should map commands/gsd/ to gsd-opencode/commands/gsd/', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });

      const result = service.getTargetPath('commands/gsd/planner.md');
      assert.strictEqual(result, 'gsd-opencode/commands/gsd/planner.md');
    });

    it('should map get-shit-done/references/ to gsd-opencode/get-shit-done/references/', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });

      const result = service.getTargetPath('get-shit-done/references/guidelines.md');
      assert.strictEqual(result, 'gsd-opencode/get-shit-done/references/guidelines.md');
    });

    it('should return null for unmapped paths', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });

      assert.strictEqual(service.getTargetPath('README.md'), null);
      assert.strictEqual(service.getTargetPath('package.json'), null);
      assert.strictEqual(service.getTargetPath('other/path/file.txt'), null);
    });
  });

  describe('isMapped', () => {
    it('should return true for mapped paths', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });

      assert.strictEqual(service.isMapped('agents/test.md'), true);
      assert.strictEqual(service.isMapped('commands/gsd/planner.md'), true);
    });

    it('should return false for unmapped paths', () => {
      const service = new SyncService({
        submoduleService: createMockSubmoduleService(),
        syncManifest: createMockSyncManifest()
      });

      assert.strictEqual(service.isMapped('README.md'), false);
      assert.strictEqual(service.isMapped('package.json'), false);
    });
  });

  describe('findOrphanedFiles', () => {
    it('should find files in target not present in source', async () => {
      // Create source with one file
      await createProjectFile(originalDir, 'agents/standard.md', 'Standard agent');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/standard.md', 'Standard agent', 'init');

      // Create target with extra file (using projectRoot = testDir)
      await createProjectFile(testDir, 'gsd-opencode/agents/standard.md', 'Standard agent');
      await createProjectFile(testDir, 'gsd-opencode/agents/custom.md', 'Custom agent');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = new SyncManifest({ manifestPath });
      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const orphans = await service.findOrphanedFiles();

      assert.ok(Array.isArray(orphans));
      assert.ok(orphans.some(p => p.includes('custom.md')));
    });

    it('should return empty array when no orphans exist', async () => {
      // Create matching files
      await createProjectFile(originalDir, 'agents/standard.md', 'Standard agent');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/standard.md', 'Standard agent', 'init');

      await createProjectFile(testDir, 'gsd-opencode/agents/standard.md', 'Standard agent');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = new SyncManifest({ manifestPath });
      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const orphans = await service.findOrphanedFiles();
      assert.strictEqual(orphans.length, 0);
    });
  });

  describe('detectDivergence', () => {
    it('should return no divergence when destination does not exist', async () => {
      await createProjectFile(originalDir, 'agents/test.md', 'Source content');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/test.md', 'Source content', 'init');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = createMockSyncManifest();
      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const result = await service.detectDivergence('agents/test.md', 'gsd-opencode/agents/test.md');

      assert.strictEqual(result.diverged, false);
      assert.strictEqual(result.message, null);
    });

    it('should detect divergence when destination differs from source and last sync', async () => {
      // Create source
      await createProjectFile(originalDir, 'agents/test.md', 'Source content v2');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/test.md', 'Source content v2', 'init');

      // Create destination with different content
      await createProjectFile(testDir, 'gsd-opencode/agents/test.md', 'Modified locally');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = createMockSyncManifest();

      // Simulate previous sync with different hash
      syncManifest.files = {
        'gsd-opencode/agents/test.md': {
          syncedAt: '2026-02-20T00:00:00Z',
          sourceHash: 'oldhash123',
          destHash: 'oldhash123'
        }
      };

      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const result = await service.detectDivergence('agents/test.md', 'gsd-opencode/agents/test.md');

      assert.strictEqual(result.diverged, true);
      assert.ok(result.message);
    });
  });

  describe('sync', () => {
    it('should copy files with dryRun=true (no actual changes)', async () => {
      // Create source files
      await createProjectFile(originalDir, 'agents/planner.md', '# Planner Agent');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/planner.md', '# Planner Agent', 'init');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = new SyncManifest({ manifestPath });
      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const result = await service.sync({ dryRun: true });

      assert.ok(Array.isArray(result.copied));
      assert.ok(result.warnings.some(w => w.includes('DRY RUN')));

      // Verify file was NOT copied
      assert.strictEqual(existsSync(join(testDir, 'gsd-opencode/agents/planner.md')), false);
    });

    it('should copy files with dryRun=false', async () => {
      // Create source files
      await createProjectFile(originalDir, 'agents/executor.md', '# Executor Agent');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/executor.md', '# Executor Agent', 'init');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = new SyncManifest({ manifestPath });
      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const result = await service.sync({ dryRun: false });

      assert.ok(result.copied.some(p => p.includes('executor.md')));

      // Verify file was copied
      assert.strictEqual(existsSync(join(testDir, 'gsd-opencode/agents/executor.md')), true);
    });

    it('should skip binary files automatically', async () => {
      // Create binary file (PNG header bytes)
      const binaryContent = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
      ]);
      const iconPath = join(originalDir, 'agents/icon.png');
      await mkdir(dirname(iconPath), { recursive: true });
      writeFileSync(iconPath, binaryContent);
      await createGitRepo(originalDir);
      await execAsync('git add .', { cwd: originalDir });
      await execAsync('git commit -m "add binary"', { cwd: originalDir });

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      // Use fresh manifest with no previous sync
      const syncManifest = createMockSyncManifest();
      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const result = await service.sync({ dryRun: true });

      assert.ok(result.skipped.some(s => s.reason === 'binary'));
    });

    it('should bypass divergence warnings with force flag', async () => {
      // Create source
      await createProjectFile(originalDir, 'agents/test.md', 'Source v2');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/test.md', 'Source v2', 'init');

      // Create destination with different content
      await createProjectFile(testDir, 'gsd-opencode/agents/test.md', 'Modified locally');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = createMockSyncManifest();
      syncManifest.files = {
        'gsd-opencode/agents/test.md': {
          syncedAt: '2026-02-20T00:00:00Z',
          sourceHash: 'oldhash',
          destHash: 'oldhash'
        }
      };

      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const result = await service.sync({ dryRun: true, force: true });

      assert.strictEqual(Object.keys(result.divergences).length, 0);
      assert.ok(result.copied.some(p => p.includes('test.md')));
    });
  });

  describe('getStats', () => {
    it('should return sync statistics', async () => {
      await createProjectFile(originalDir, 'agents/test.md', 'Test');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/test.md', 'Test', 'init');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = createMockSyncManifest();
      syncManifest.files = {
        'gsd-opencode/agents/test.md': {
          syncedAt: '2026-02-20T00:00:00Z',
          sourceHash: 'hash123',
          destHash: 'hash123'
        }
      };

      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const stats = await service.getStats();

      assert.ok('lastSync' in stats);
      assert.ok('trackedFileCount' in stats);
      assert.ok('orphanCount' in stats);
    });
  });

  describe('needsSync', () => {
    it('should return true when no previous sync', async () => {
      await createProjectFile(originalDir, 'agents/test.md', 'Test');
      await createGitRepo(originalDir);
      await createCommit(originalDir, 'agents/test.md', 'Test', 'init');

      const submoduleService = new SubmoduleService({ submodulePath: originalDir });
      const syncManifest = createMockSyncManifest();

      const service = new SyncService({
        submoduleService,
        syncManifest,
        projectRoot: testDir,
        originalPath: originalDir
      });

      const needsSync = await service.needsSync();
      assert.strictEqual(needsSync, true);
    });
  });

  describe('SyncError', () => {
    it('should have proper error properties', () => {
      const error = new SyncError('Test error', 'TEST_CODE', { detail: 'info' });

      assert.strictEqual(error.name, 'SyncError');
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.code, 'TEST_CODE');
      assert.deepStrictEqual(error.details, { detail: 'info' });
      assert.ok(error instanceof Error);
    });
  });
});
