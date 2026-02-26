/**
 * Unit tests for SubmoduleService
 * 
 * Uses Node.js built-in test runner (node:test, node:assert)
 * Creates real git repositories for integration testing
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SubmoduleService, SubmoduleError } from '../SubmoduleService.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

describe('SubmoduleService', () => {
  const testDir = join(tmpdir(), 'submodule-service-test-' + Date.now());

  after(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should use default submodule path', () => {
      const service = new SubmoduleService();
      assert.ok(service.submodulePath.includes('original/get-shit-done'));
    });

    it('should accept custom submodule path', () => {
      const service = new SubmoduleService({ submodulePath: './custom/path' });
      assert.ok(service.submodulePath.includes('custom/path'));
    });
  });

  describe('isInitialized', () => {
    it('should return true when .git directory exists', async () => {
      const gitRepoDir = join(testDir, 'is-init-test');
      await createGitRepo(gitRepoDir);
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      const result = await service.isInitialized();
      
      assert.strictEqual(result, true);
    });

    it('should return false when submodule empty', async () => {
      const emptyDir = join(testDir, 'empty-submodule');
      await mkdir(emptyDir, { recursive: true });
      
      const service = new SubmoduleService({ submodulePath: emptyDir });
      const result = await service.isInitialized();
      
      assert.strictEqual(result, false);
    });
  });

  describe('verifySubmodule', () => {
    it('should throw with helpful message when not initialized', async () => {
      const emptyDir = join(testDir, 'not-initialized');
      await mkdir(emptyDir, { recursive: true });
      
      const service = new SubmoduleService({ submodulePath: emptyDir });
      
      await assert.rejects(
        async () => await service.verifySubmodule(),
        (err) => {
          assert.ok(err instanceof SubmoduleError);
          assert.strictEqual(err.code, 'SUBMODULE_NOT_INITIALIZED');
          assert.ok(err.suggestion.includes('git submodule update --init'));
          return true;
        }
      );
    });

    it('should not throw when submodule is initialized', async () => {
      const gitRepoDir = join(testDir, 'verify-test');
      await createGitRepo(gitRepoDir);
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      
      // Should not throw
      await service.verifySubmodule();
    });
  });

  describe('getCommitInfo', () => {
    it('should return hash and version from git commands', async () => {
      const gitRepoDir = join(testDir, 'commit-info-test');
      await createGitRepo(gitRepoDir);
      await createCommit(gitRepoDir, 'test.txt', 'test content', 'test commit');
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      const info = await service.getCommitInfo();
      
      assert.ok(info.hash);
      assert.strictEqual(info.hash.length, 40); // Full SHA-1
      assert.ok(info.shortHash);
      assert.strictEqual(info.shortHash.length, 7);
      assert.ok(info.date);
    });
  });

  describe('detectChanges', () => {
    it('should return proper structure with hasChanges and files array', async () => {
      const gitRepoDir = join(testDir, 'detect-changes-test-1');
      await createGitRepo(gitRepoDir);
      await createCommit(gitRepoDir, 'test.txt', 'test content', 'test commit');
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      
      // Get current commit
      const { stdout: commit } = await execAsync('git rev-parse HEAD', { cwd: gitRepoDir });
      const currentCommit = commit.trim();
      
      // Check with same commit (no changes)
      const result = await service.detectChanges(currentCommit);
      
      assert.strictEqual(typeof result.hasChanges, 'boolean');
      assert.ok(Array.isArray(result.files));
      assert.strictEqual(result.toCommit, currentCommit);
    });

    it('should return all files when no sinceCommit provided', async () => {
      const gitRepoDir = join(testDir, 'detect-changes-test-2');
      await createGitRepo(gitRepoDir);
      await createCommit(gitRepoDir, 'test.txt', 'test content', 'test commit');
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      const result = await service.detectChanges(null);
      
      assert.strictEqual(result.hasChanges, true);
      assert.strictEqual(result.fromCommit, 'none');
      assert.ok(Array.isArray(result.files));
      assert.ok(result.files.length > 0);
      assert.ok(result.files.includes('test.txt'));
    });

    it('should detect changes between commits', async () => {
      const gitRepoDir = join(testDir, 'detect-changes-test-3');
      await createGitRepo(gitRepoDir);
      await createCommit(gitRepoDir, 'first.txt', 'first content', 'first commit');
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      
      // Get current commit
      const { stdout: commit1 } = await execAsync('git rev-parse HEAD', { cwd: gitRepoDir });
      
      // Make another commit
      await createCommit(gitRepoDir, 'new-file.txt', 'new content', 'second commit');
      
      const result = await service.detectChanges(commit1.trim());
      
      assert.strictEqual(result.hasChanges, true);
      assert.ok(result.files.includes('new-file.txt'));
    });
  });

  describe('getStatus', () => {
    it('should return initialized status for valid git repo', async () => {
      const gitRepoDir = join(testDir, 'status-test');
      await createGitRepo(gitRepoDir);
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      const status = await service.getStatus();
      
      assert.strictEqual(status.initialized, true);
      assert.strictEqual(status.hasGit, true);
      assert.strictEqual(status.error, null);
    });

    it('should return error for non-existent submodule', async () => {
      const service = new SubmoduleService({ submodulePath: join(testDir, 'non-existent') });
      const status = await service.getStatus();
      
      assert.strictEqual(status.initialized, false);
      assert.ok(status.error);
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return false for clean working directory', async () => {
      const gitRepoDir = join(testDir, 'uncommitted-test');
      await createGitRepo(gitRepoDir);
      await createCommit(gitRepoDir, 'test.txt', 'test content', 'test commit');
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      const result = await service.hasUncommittedChanges();
      
      assert.strictEqual(result, false);
    });

    it('should return true for dirty working directory', async () => {
      const gitRepoDir = join(testDir, 'dirty-test');
      await createGitRepo(gitRepoDir);
      await createCommit(gitRepoDir, 'test.txt', 'test content', 'test commit');
      
      // Make uncommitted change
      await writeFile(join(gitRepoDir, 'test.txt'), 'modified content', 'utf-8');
      
      const service = new SubmoduleService({ submodulePath: gitRepoDir });
      const result = await service.hasUncommittedChanges();
      
      assert.strictEqual(result, true);
    });
  });

  describe('SubmoduleError', () => {
    it('should have proper error properties', () => {
      const error = new SubmoduleError('Test error', 'TEST_CODE', 'Try this');
      
      assert.strictEqual(error.name, 'SubmoduleError');
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.code, 'TEST_CODE');
      assert.strictEqual(error.suggestion, 'Try this');
      assert.ok(error instanceof Error);
    });
  });
});
