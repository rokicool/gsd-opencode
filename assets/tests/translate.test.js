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

    it('should use include patterns as whitelist', async () => {
      // Create multiple files
      await writeFile(join(testDir, 'test.md'), 'gsd is great', 'utf-8');
      await mkdir(join(testDir, 'docs'), { recursive: true });
      await writeFile(join(testDir, 'docs', 'readme.md'), 'gsd docs', 'utf-8');
      await mkdir(join(testDir, 'src'), { recursive: true });
      await writeFile(join(testDir, 'src', 'code.js'), 'gsd code', 'utf-8');
      await writeFile(join(testDir, 'skip.txt'), 'gsd text', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        include: ['**/*.md', 'src/*.js'],
        patterns: ['**/*'], // Should be ignored when include is specified
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--no-color'], testDir);

      // Should process .md files and src/code.js
      expect(result.stdout).toContain('test.md');
      expect(result.stdout).toContain('docs/readme.md');
      expect(result.stdout).toContain('src/code.js');
      // Should NOT process skip.txt
      expect(result.stdout).not.toContain('skip.txt');
      // Check processed count (expecting 3 files)
      expect(result.stdout).toMatch(/Found 3 file\(s\) to process/);
    });

    it('should apply exclude after include patterns', async () => {
      // Create files
      await mkdir(join(testDir, 'docs'), { recursive: true });
      await writeFile(join(testDir, 'docs', 'test.md'), 'gsd test', 'utf-8');
      await writeFile(join(testDir, 'docs', 'internal.md'), 'gsd internal', 'utf-8');
      await mkdir(join(testDir, 'src'), { recursive: true });
      await writeFile(join(testDir, 'src', 'readme.md'), 'gsd readme', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        include: ['docs/**/*.md', 'src/**/*.md'],
        exclude: ['docs/internal.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--no-color'], testDir);

      // Should process docs/test.md and src/readme.md
      expect(result.stdout).toContain('docs/test.md');
      expect(result.stdout).toContain('src/readme.md');
      // Should NOT process docs/internal.md (excluded)
      expect(result.stdout).not.toContain('docs/internal.md');
      // Check processed count (expecting 2 files: docs/test.md and src/readme.md)
      expect(result.stdout).toMatch(/Found 2 file\(s\) to process/);
    });

    it('should fall back to patterns when include is empty', async () => {
      await writeFile(join(testDir, 'test.md'), 'gsd is great', 'utf-8');
      await writeFile(join(testDir, 'skip.txt'), 'gsd text', 'utf-8');

      const configPath = join(testDir, 'config.json');
      await writeFile(configPath, JSON.stringify({
        include: [],
        patterns: ['**/*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--no-color'], testDir);

      // Should process only .md files (patterns behavior)
      expect(result.stdout).toContain('test.md');
      expect(result.stdout).not.toContain('skip.txt');
      // Check processed count (expecting 1 file)
      expect(result.stdout).toMatch(/Found 1 file\(s\) to process/);
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

  describe('multi-config support', () => {
    it('should merge rules from multiple configs', async () => {
      // Create test file
      const testFile = join(testDir, 'multi.md');
      await writeFile(testFile, 'gsd and get-shit-done are great', 'utf-8');

      // Create base config with first rule
      const baseConfig = join(testDir, 'base.json');
      await writeFile(baseConfig, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Create override config with second rule
      const overrideConfig = join(testDir, 'override.json');
      await writeFile(overrideConfig, JSON.stringify({
        rules: [{ pattern: 'get-shit-done', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([baseConfig, overrideConfig, '--apply', '--no-color'], testDir);

      // Both rules should be applied
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe('gsd-opencode and gsd-opencode are great');
      expect(result.stdout).toContain('Updated');
    });

    it('should preserve rule order from multiple configs', async () => {
      // Create test file
      const testFile = join(testDir, 'order.md');
      await writeFile(testFile, 'foo bar baz', 'utf-8');

      // Config 1: replace foo with bar
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'foo', replacement: 'bar' }]
      }), 'utf-8');

      // Config 2: replace bar with baz
      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        rules: [{ pattern: 'bar', replacement: 'baz' }]
      }), 'utf-8');

      const result = await runTranslate([config1, config2, '--apply', '--no-color'], testDir);

      // First config's rules should apply first, then config2's
      const content = await readFile(testFile, 'utf-8');
      // "foo bar baz" -> "bar bar baz" (config1) -> "baz baz baz" (config2)
      expect(content).toBe('baz baz baz');
      expect(result.stdout).toContain('Updated');
    });

    it('should merge include patterns from multiple configs', async () => {
      // Create test files
      await writeFile(join(testDir, 'test.md'), 'gsd markdown', 'utf-8');
      await writeFile(join(testDir, 'test.txt'), 'gsd text', 'utf-8');

      // Config 1: include markdown
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        include: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Config 2: include text files
      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        include: ['*.txt'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([config1, config2, '--no-color'], testDir);

      // Should process both .md and .txt files
      expect(result.stdout).toContain('test.md');
      expect(result.stdout).toContain('test.txt');
    });

    it('should deduplicate include patterns', async () => {
      // Create test file
      await writeFile(join(testDir, 'test.md'), 'gsd is great', 'utf-8');

      // Config 1: include *.md
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        include: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Config 2: also include *.md (duplicate)
      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        include: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([config1, config2, '--no-color'], testDir);

      // Should process file (should not error or process twice)
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('test.md');
    });

    it('should merge exclude patterns from multiple configs', async () => {
      // Create test files
      await mkdir(join(testDir, 'node_modules'), { recursive: true });
      await mkdir(join(testDir, '.git'), { recursive: true });
      await writeFile(join(testDir, 'test.md'), 'gsd is great', 'utf-8');
      await writeFile(join(testDir, 'node_modules', 'skip1.md'), 'gsd here', 'utf-8');
      await writeFile(join(testDir, '.git', 'skip2.md'), 'gsd here', 'utf-8');

      // Config 1: exclude node_modules
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        patterns: ['**/*.md'],
        exclude: ['node_modules/**'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Config 2: exclude .git
      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        exclude: ['.git/**'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([config1, config2, '--no-color'], testDir);

      // Should only process test.md, not skip1.md or skip2.md
      expect(result.stdout).toContain('test.md');
      expect(result.stdout).not.toContain('skip1.md');
      expect(result.stdout).not.toContain('skip2.md');
    });

    it('should use largest maxFileSize from configs', async () => {
      // Config 1: smaller maxFileSize
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        patterns: ['*.md'],
        maxFileSize: 100,
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Config 2: larger maxFileSize
      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        maxFileSize: 10485760, // 10MB
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Create file larger than config1's limit but smaller than config2's
      const testFile = join(testDir, 'large.md');
      await writeFile(testFile, 'gsd '.repeat(50), 'utf-8'); // > 100 bytes

      const result = await runTranslate([config1, config2, '--no-color'], testDir);

      // Should process file using largest maxFileSize (config2's)
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('large.md');
    });

    it('should override properties from later configs', async () => {
      // Create test file
      const testFile = join(testDir, 'custom.md');
      await writeFile(testFile, 'foo bar baz', 'utf-8');

      // Config 1: custom property
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        patterns: ['*.md'],
        customSetting: 'value1',
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // Config 2: override custom property
      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        customSetting: 'value2',
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      // This test verifies the configs load without error
      const result = await runTranslate([config1, config2, '--no-color'], testDir);

      // Should succeed (custom properties don't affect operation)
      expect(result.code).toBe(0);
    });

    it('should error for invalid config in multi-config', async () => {
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        // Missing rules array
        patterns: ['*.md']
      }), 'utf-8');

      const result = await runTranslate([config1, config2], testDir);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('rules');
    });

    it('should error for empty rules in multi-config', async () => {
      const config1 = join(testDir, 'config1.json');
      await writeFile(config1, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const config2 = join(testDir, 'config2.json');
      await writeFile(config2, JSON.stringify({
        rules: [] // Empty rules
      }), 'utf-8');

      const result = await runTranslate([config1, config2], testDir);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('at least one rule');
    });

    it('should work with single config (backward compatibility)', async () => {
      const testFile = join(testDir, 'compat.md');
      await writeFile(testFile, 'gsd is great', 'utf-8');

      const configPath = join(testDir, 'single.json');
      await writeFile(configPath, JSON.stringify({
        patterns: ['*.md'],
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      }), 'utf-8');

      const result = await runTranslate([configPath, '--apply', '--no-color'], testDir);

      expect(result.code).toBe(0);
      const content = await readFile(testFile, 'utf-8');
      expect(content).toBe('gsd-opencode is great');
    });
  });
});
