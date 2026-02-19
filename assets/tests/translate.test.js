/**
 * Integration tests for translate.js CLI
 *
 * Note: These tests use child_process to run the CLI in a separate process
 * to avoid issues with Vitest workers and process.chdir()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const translateScript = join(__dirname, '../bin/translate.js');

/**
 * Run the translate script and return results
 * @param {string[]} args - Arguments to pass to the script
 * @param {string} cwd - Working directory
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runTranslate(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [translateScript, ...args], {
      cwd,
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
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

describe('translate.js CLI', () => {
  const testDir = join(tmpdir(), 'translate-cli-test-' + Date.now());

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

  describe('--help', () => {
    it('should show help with --help flag', async () => {
      const result = await runTranslate(['--help'], testDir);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Translation Utility');
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Options:');
    });

    it('should show help when no arguments provided', async () => {
      const result = await runTranslate([], testDir);

      // Should show help, not fail
      expect(result.stdout).toContain('Translation Utility');
    });
  });

  describe('config loading', () => {
    it('should error for missing config file', async () => {
      const result = await runTranslate(['nonexistent-config.json'], testDir);

      expect(result.code).toBe(1); // EXIT_VALIDATION_ERROR
      expect(result.stderr).toContain('not found');
    });

    it('should error for invalid JSON', async () => {
      const configPath = join(testDir, 'bad-config.json');
      await writeFile(configPath, 'not valid json', 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Invalid JSON');
    });

    it('should error for missing rules array', async () => {
      const configPath = join(testDir, 'no-rules.json');
      await writeFile(configPath, JSON.stringify({ patterns: ['**/*.md'] }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('rules');
    });

    it('should error for empty rules array', async () => {
      const configPath = join(testDir, 'empty-rules.json');
      await writeFile(configPath, JSON.stringify({ rules: [] }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('at least one rule');
    });

    it('should accept valid config', async () => {
      // Create a test file first
      const testFile = join(testDir, 'test.md');
      await writeFile(testFile, '# Test\n', 'utf-8');

      const configPath = join(testDir, 'valid-config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Translation Summary');
    });
  });

  describe('dry-run mode', () => {
    it('should not modify files in dry-run mode', async () => {
      const testFile = join(testDir, 'dry-run.md');
      const originalContent = 'gsd is great';
      await writeFile(testFile, originalContent, 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      // File should remain unchanged
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe(originalContent);

      // Should show dry-run warning
      expect(result.stdout).toContain('dry-run');
    });

    it('should show summary table', async () => {
      const testFile = join(testDir, 'summary.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.stdout).toContain('Translation Summary');
      expect(result.stdout).toContain('File');
      expect(result.stdout).toContain('Changes');
      expect(result.stdout).toContain('Status');
    });

    it('should report change counts', async () => {
      const testFile = join(testDir, 'changes.md');
      await writeFile(testFile, 'gsd is great\ngsd is useful', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.stdout).toContain('2'); // 2 changes
      expect(result.stdout).toContain('Modified');
    });
  });

  describe('--apply mode', () => {
    it('should modify files with --apply flag', async () => {
      const testFile = join(testDir, 'apply.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--apply'], testDir);

      // File should be modified
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe('gsd-opencode is great');
      expect(result.stdout).toContain('Updated');
    });

    it('should create backups with --apply', async () => {
      const testFile = join(testDir, 'backup.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      await runTranslate([configPath, '--apply'], testDir);

      // Backup should exist
      const backupDir = join(testDir, '.translate-backups');
      expect(existsSync(backupDir)).toBe(true);
    });

    it('should show success message', async () => {
      const testFile = join(testDir, 'success.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--apply'], testDir);

      expect(result.stdout).toContain('Done!');
    });
  });

  describe('--show-diff', () => {
    it('should show diffs with --show-diff flag', async () => {
      const testFile = join(testDir, 'diff.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--show-diff'], testDir);

      expect(result.stdout).toContain('Diffs');
    });
  });

  describe('--no-color', () => {
    it('should work with --no-color flag', async () => {
      const testFile = join(testDir, 'nocolor.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--no-color'], testDir);

      expect(result.code).toBe(0);
    });
  });

  describe('glob patterns', () => {
    it('should process multiple files', async () => {
      await writeFile(join(testDir, 'file1.md'), 'gsd is great', 'utf-8');
      await writeFile(join(testDir, 'file2.md'), 'gsd is useful', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--no-color'], testDir);

      expect(result.stdout).toContain('Total files processed: 2');
    });

    it('should respect exclude patterns', async () => {
      await writeFile(join(testDir, 'include.md'), 'gsd is great', 'utf-8');
      await mkdir(join(testDir, 'node_modules'), { recursive: true });
      await writeFile(join(testDir, 'node_modules', 'skip.md'), 'gsd here', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['**/*.md'],
        exclude: ['node_modules/**'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      // Should only process include.md
      expect(result.stdout).toContain('include.md');
      expect(result.stdout).not.toContain('skip.md');
    });
  });

  describe('post-translation validation', () => {
    it('should run validation after --apply', async () => {
      const testFile = join(testDir, 'validate.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--apply', '--no-color'], testDir);

      expect(result.stdout).toContain('Validation');
      expect(result.stdout).toContain('Valid files: 1');
    });
  });

  describe('edge cases', () => {
    it('should handle files with no changes', async () => {
      const testFile = join(testDir, 'nochanges.md');
      await writeFile(testFile, 'hello world', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      expect(result.stdout).toContain('No changes');
    });

    it('should handle empty config patterns gracefully', async () => {
      const testFile = join(testDir, 'patternless.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath], testDir);

      // Should default to '**/*'
      expect(result.code).toBe(0);
    });
  });
});
