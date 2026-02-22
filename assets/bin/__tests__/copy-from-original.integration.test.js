/**
 * Integration tests for copy-from-original CLI command
 *
 * Tests the complete workflow including:
 * - No changes scenario
 * - Change detection
 * - Dry-run mode
 * - Full sync
 * - Force mode
 * - Show-diff mode
 * - Error handling
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdir,
  writeFile,
  readFile,
  rm,
  cp,
  access,
  symlink
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to CLI script
const CLI_PATH = resolve(__dirname, '../copy-from-original.js');

/**
 * Create a temporary test environment
 */
async function createTestEnv() {
  const testDir = join(tmpdir(), `copy-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Create directory structure
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, 'original', 'get-shit-done'), { recursive: true });
  await mkdir(join(testDir, 'gsd-opencode', 'agents'), { recursive: true });
  await mkdir(join(testDir, 'gsd-opencode', 'commands', 'gsd'), { recursive: true });
  await mkdir(join(testDir, '.planning'), { recursive: true });

  // Initialize git repos
  await execAsync('git init', { cwd: testDir });
  await execAsync('git config user.email "test@test.com"', { cwd: testDir });
  await execAsync('git config user.name "Test"', { cwd: testDir });

  // Initialize submodule as a real git repo
  const submodulePath = join(testDir, 'original', 'get-shit-done');
  await execAsync('git init', { cwd: submodulePath });
  await execAsync('git config user.email "test@test.com"', { cwd: submodulePath });
  await execAsync('git config user.name "Test"', { cwd: submodulePath });

  return testDir;
}

/**
 * Clean up test environment
 */
async function cleanupTestEnv(testDir) {
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Run CLI command and return result
 */
async function runCli(args, cwd) {
  try {
    const { stdout, stderr } = await execAsync(
      `node "${CLI_PATH}" ${args}`,
      { cwd, encoding: 'utf-8', timeout: 30000 }
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1
    };
  }
}

describe('copy-from-original CLI', () => {
  let testDir;

  beforeEach(async () => {
    testDir = await createTestEnv();
  });

  afterEach(async () => {
    await cleanupTestEnv(testDir);
  });

  describe('basic functionality', () => {
    it('should show help with --help flag', async () => {
      const { stdout, exitCode } = await runCli('--help', testDir);
      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /Sync files from original/);
      assert.match(stdout, /--dry-run/);
      assert.match(stdout, /--force/);
      assert.match(stdout, /--show-diff/);
    });

    it('should exit 0 when no changes (already up to date)', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create a test file and commit
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'test.md'), '# Test Agent\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Initial commit"', { cwd: submodulePath });

      // Create manifest with this commit as last sync
      const { stdout: commitHash } = await execAsync('git rev-parse HEAD', { cwd: submodulePath });
      const manifest = {
        version: '1.0.0',
        lastSync: {
          commit: commitHash.trim(),
          date: new Date().toISOString(),
          version: 'v1.0.0'
        },
        files: {}
      };
      await writeFile(
        join(testDir, '.planning', 'sync-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      const { stdout, exitCode } = await runCli('', testDir);
      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /Already up to date/);
    });

    it('should detect and sync new files', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create a test file in agents directory
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'gsd-planner.md'), '# GSD Planner\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add planner agent"', { cwd: submodulePath });

      const { stdout, exitCode } = await runCli('', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /Sync complete|Copied/);

      // Verify file was copied
      const targetPath = join(testDir, 'gsd-opencode', 'agents', 'gsd-planner.md');
      assert.ok(existsSync(targetPath), 'File should be copied to target');
    });

    it('should skip binary files', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create a binary file (PNG header)
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
      ]);
      await writeFile(join(submodulePath, 'agents', 'image.png'), pngHeader);
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add binary"', { cwd: submodulePath });

      const { stdout, exitCode } = await runCli('-v', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /Skipped.*binary/i);
    });
  });

  describe('dry-run mode', () => {
    it('should preview changes without modifying files', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create test file
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'test-dry.md'), '# Test\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add test"', { cwd: submodulePath });

      const { stdout, exitCode } = await runCli('--dry-run', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /DRY RUN|Would copy/i);

      // Verify file was NOT copied
      const targetPath = join(testDir, 'gsd-opencode', 'agents', 'test-dry.md');
      assert.ok(!existsSync(targetPath), 'File should NOT be copied in dry-run');
    });

    it('should show what would happen in dry-run', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create multiple test files
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'a.md'), '# A\n');
      await writeFile(join(submodulePath, 'agents', 'b.md'), '# B\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add files"', { cwd: submodulePath });

      const { stdout, exitCode } = await runCli('-d -v', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /Would copy|Would sync/i);
    });
  });

  describe('force mode', () => {
    it('should overwrite diverged files with --force', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create test file in original
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'diverged.md'), '# Original\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add original"', { cwd: submodulePath });

      // Create different file in target
      await writeFile(join(testDir, 'gsd-opencode', 'agents', 'diverged.md'), '# Modified Locally\n');

      const { stdout, exitCode } = await runCli('--force', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /Copied|Sync complete/);

      // Verify file was overwritten
      const content = await readFile(join(testDir, 'gsd-opencode', 'agents', 'diverged.md'), 'utf-8');
      assert.match(content, /Original/);
    });

    it('should warn about diverged files without --force', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create test file in original
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'diverged2.md'), '# Original\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add original"', { cwd: submodulePath });

      // Create different file in target
      await writeFile(join(testDir, 'gsd-opencode', 'agents', 'diverged2.md'), '# Modified Locally\n');

      const { stdout, exitCode } = await runCli('-v', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /diverged|Divergence/i);
    });
  });

  describe('show-diff mode', () => {
    it('should display file diffs with --show-diff', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create test file
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'diff-test.md'), '# New Content\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add test"', { cwd: submodulePath });

      // Create existing file in target with different content
      await writeFile(join(testDir, 'gsd-opencode', 'agents', 'diff-test.md'), '# Old Content\n');

      const { stdout, exitCode } = await runCli('--dry-run --show-diff', testDir);

      assert.strictEqual(exitCode, 0);
      // Should show diff output (with + and - lines)
      assert.match(stdout, /\+|Diff|-/);
    });
  });

  describe('error handling', () => {
    it('should show helpful error when submodule not initialized', async () => {
      // Remove .git directory from submodule to simulate uninitialized state
      await rm(join(testDir, 'original', 'get-shit-done', '.git'), { force: true, recursive: true });

      const { stderr, exitCode } = await runCli('', testDir);

      assert.strictEqual(exitCode, 1);
      assert.match(stderr + '', /not initialized|submodule/i);
    });

    it('should handle empty submodule gracefully', async () => {
      // Remove .git directory
      await rm(join(testDir, 'original', 'get-shit-done', '.git'), { force: true, recursive: true });

      const { exitCode } = await runCli('', testDir);
      assert.strictEqual(exitCode, 1);
    });
  });

  describe('directory mapping', () => {
    it('should map agents/ to gsd-opencode/agents/', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'mapped.md'), '# Agent\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add agent"', { cwd: submodulePath });

      await runCli('', testDir);

      const targetPath = join(testDir, 'gsd-opencode', 'agents', 'mapped.md');
      assert.ok(existsSync(targetPath), 'Should map agents/ correctly');
    });

    it('should map commands/gsd/ to gsd-opencode/commands/gsd/', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      await mkdir(join(submodulePath, 'commands', 'gsd'), { recursive: true });
      await writeFile(join(submodulePath, 'commands', 'gsd', 'test.md'), '# Command\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add command"', { cwd: submodulePath });

      await runCli('', testDir);

      const targetPath = join(testDir, 'gsd-opencode', 'commands', 'gsd', 'test.md');
      assert.ok(existsSync(targetPath), 'Should map commands/gsd/ correctly');
    });

    it('should map get-shit-done/references/ correctly', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      await mkdir(join(submodulePath, 'get-shit-done', 'references'), { recursive: true });
      await writeFile(join(submodulePath, 'get-shit-done', 'references', 'test.md'), '# Reference\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add reference"', { cwd: submodulePath });

      await runCli('', testDir);

      const targetPath = join(testDir, 'gsd-opencode', 'get-shit-done', 'references', 'test.md');
      assert.ok(existsSync(targetPath), 'Should map references/ correctly');
    });
  });

  describe('manifest tracking', () => {
    it('should create manifest on first sync', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'manifest-test.md'), '# Test\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add test"', { cwd: submodulePath });

      await runCli('', testDir);

      const manifestPath = join(testDir, '.planning', 'sync-manifest.json');
      assert.ok(existsSync(manifestPath), 'Manifest should be created');

      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
      assert.ok(manifest.lastSync, 'Should have lastSync');
      assert.ok(manifest.lastSync.commit, 'Should have commit hash');
    });

    it('should update lastSync after successful sync', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // First commit
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'a.md'), '# A\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "First"', { cwd: submodulePath });

      await runCli('', testDir);

      const { stdout: commit1 } = await execAsync('git rev-parse HEAD', { cwd: submodulePath });

      // Second commit
      await writeFile(join(submodulePath, 'agents', 'b.md'), '# B\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Second"', { cwd: submodulePath });

      await runCli('', testDir);

      const manifest = JSON.parse(
        await readFile(join(testDir, '.planning', 'sync-manifest.json'), 'utf-8')
      );
      const { stdout: commit2 } = await execAsync('git rev-parse HEAD', { cwd: submodulePath });

      assert.strictEqual(manifest.lastSync.commit, commit2.trim());
    });
  });

  describe('orphan detection', () => {
    it('should report files in gsd-opencode not in original', async () => {
      const submodulePath = join(testDir, 'original', 'get-shit-done');

      // Create original file
      await mkdir(join(submodulePath, 'agents'), { recursive: true });
      await writeFile(join(submodulePath, 'agents', 'original.md'), '# Original\n');
      await execAsync('git add .', { cwd: submodulePath });
      await execAsync('git commit -m "Add"', { cwd: submodulePath });

      // Create orphan file in target
      await writeFile(join(testDir, 'gsd-opencode', 'agents', 'orphan.md'), '# Orphan\n');

      const { stdout, exitCode } = await runCli('-v', testDir);

      assert.strictEqual(exitCode, 0);
      assert.match(stdout, /orphan/i);
    });
  });
});
