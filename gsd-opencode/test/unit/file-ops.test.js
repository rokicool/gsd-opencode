/**
 * Unit tests for FileOperations path replacement functionality.
 *
 * Tests cover:
 * - Global scope path replacement (→ ~/.config/opencode/)
 * - Local scope path replacement (→ ./.opencode/)
 * - Nested directory handling
 * - File formatting preservation
 * - Non-.md file copying
 * - Edge cases (empty files, multiple references, etc.)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileOperations } from '../../src/services/file-ops.js';
import { ScopeManager } from '../../src/services/scope-manager.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Helper to create a temporary directory for test isolation
 */
async function createTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gsd-test-'));
  return tempDir;
}

/**
 * Helper to clean up temporary directory
 */
async function cleanupTempDir(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

describe('FileOperations._copyFile path replacement', () => {
  let tempDir;
  let fixturesDir;

  beforeEach(async () => {
    tempDir = await createTempDir();
    fixturesDir = path.join(process.cwd(), 'test/fixtures/path-replacement');
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('Global scope path replacement', () => {
    it('should replace @gsd-opencode/ with global config path in .md files', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedTargetDir + '/workflows/execute-plan.md');
      expect(content).toContain(expectedTargetDir + '/templates/summary.md');
      expect(content).toContain(expectedTargetDir + '/agents/ro-commit/SKILL.md');
    });

    it('should replace all occurrences in the file', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const content = await fs.readFile(sourcePath, 'utf-8');
      const originalCount = (content.match(/@gsd-opencode\//g) || []).length;

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const resultContent = await fs.readFile(targetPath, 'utf-8');
      const remainingRefs = (resultContent.match(/@gsd-opencode\//g) || []).length;
      expect(remainingRefs).toBe(0);
      expect(originalCount).toBeGreaterThan(0);
    });

    it('should handle references in code blocks', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain(expectedTargetDir + '/README.md');
      expect(content).toContain(expectedTargetDir + '/get-shit-done/references/checkpoints.md');
    });

    it('should handle references in lists', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('- First workflow: ' + expectedTargetDir + '/workflows/execute-phase.md');
      expect(content).toContain('- Second workflow: ' + expectedTargetDir + '/workflows/verify-phase.md');
    });
  });

  describe('Local scope path replacement', () => {
    it('should replace @gsd-opencode/ with local config path in .md files', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedTargetDir + '/workflows/execute-plan.md');
    });

    it('should use absolute path for local scope', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      const expectedLocalDir = path.join(process.cwd(), '.opencode');
      expect(content).toContain(expectedLocalDir);
    });
  });

  describe('Nested directory handling', () => {
    it('should replace paths in deeply nested .md files', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-nested/deep-reference.md');
      const targetPath = path.join(tempDir, 'nested', 'deep', 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Ensure nested directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedTargetDir + '/workflows/verify-phase.md');
      expect(content).toContain(expectedTargetDir + '/agents/gsd-verifier/SKILL.md');
    });

    it('should preserve nested directory structure in source', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-nested/deep-reference.md');
      const targetPath = path.join(tempDir, 'deep-output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('# Deeply Nested Reference');
      expect(content).toContain('This file is nested in a subdirectory');
    });
  });

  describe('File formatting preservation', () => {
    it('should preserve line endings', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const originalContent = await fs.readFile(sourcePath, 'utf-8');
      const resultContent = await fs.readFile(targetPath, 'utf-8');
      // Check that newlines are preserved (file structure intact)
      const originalLines = originalContent.split('\n').length;
      const resultLines = resultContent.split('\n').length;
      expect(resultLines).toBe(originalLines);
    });

    it('should preserve whitespace and indentation', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      // Check that list indentation is preserved
      expect(content).toMatch(/^- First workflow:/m);
      expect(content).toMatch(/^- Second workflow:/m);
    });

    it('should preserve code block formatting', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('```markdown');
      expect(content).toContain('```');
    });

    it('should use UTF-8 encoding', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const stats = await fs.stat(targetPath);
      expect(stats.isFile()).toBe(true);
      // Should be able to read as UTF-8 without errors
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBeTruthy();
    });
  });

  describe('Non-.md files copied directly', () => {
    it('should copy binary files without modification', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-binary.bin');
      const targetPath = path.join(tempDir, 'output.bin');

      // Get original content
      const originalContent = await fs.readFile(sourcePath);

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const resultContent = await fs.readFile(targetPath);
      expect(resultContent.equals(originalContent)).toBe(true);
    });

    it('should copy .txt files without modification', async () => {
      // Arrange - create a temporary txt file
      const txtContent = 'This has @gsd-opencode/ but should not be replaced\n';
      const sourcePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(sourcePath, txtContent);

      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const targetPath = path.join(tempDir, 'output.txt');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('@gsd-opencode/');
      expect(content).toBe(txtContent);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty .md files', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'empty.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe('');
    });

    it('should handle .md files with no @gsd-opencode/ references', async () => {
      // Arrange - create a file that truly has no references
      const sourcePath = path.join(tempDir, 'no-refs.md');
      const trulyNoRefs = '# Truly No References\n\nThis document has no special references.\nJust plain text.\n';
      await fs.writeFile(sourcePath, trulyNoRefs);

      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe(trulyNoRefs);
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain('Truly No References');
    });

    it('should replace @gsd-opencode/ even in descriptive text', async () => {
      // Arrange - test that even "no @gsd-opencode/" text gets replaced
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-without-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain('no ' + expectedTargetDir + '/ references');
      expect(content).toContain('Document Without References');
    });

    it('should handle multiple references on same line', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-multiple-same-line.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedTargetDir + '/first.md');
      expect(content).toContain(expectedTargetDir + '/second.md');
      expect(content).toContain(expectedTargetDir + '/a.md');
      expect(content).toContain(expectedTargetDir + '/b.md');
      expect(content).toContain(expectedTargetDir + '/c.md');
    });

    it('should handle reference at start of content', async () => {
      // Arrange - create test file with reference at start
      const sourcePath = path.join(tempDir, 'start-ref.md');
      await fs.writeFile(sourcePath, '@gsd-opencode/workflows/start.md is at the beginning');

      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content.startsWith(expectedTargetDir + '/workflows/start.md')).toBe(true);
    });

    it('should handle reference at end of content', async () => {
      // Arrange - create test file with reference at end
      const sourcePath = path.join(tempDir, 'end-ref.md');
      await fs.writeFile(sourcePath, 'This document references @gsd-opencode/agents/gsd-executor.md');

      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedTargetDir + '/agents/gsd-executor.md');
    });
  });

  describe('PATH_PATTERNS regex', () => {
    it('should match the correct pattern for @gsd-opencode/ references', async () => {
      // This test verifies the regex pattern works as expected
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedTargetDir = scopeManager.getTargetDir();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert - verify all patterns were replaced
      const content = await fs.readFile(targetPath, 'utf-8');
      const matches = content.match(/@gsd-opencode\//g);
      expect(matches).toBeNull(); // Should be no remaining matches

      // Verify replacements happened
      expect(content).toContain(expectedTargetDir + '/workflows/execute-plan.md');
      expect(content).toContain(expectedTargetDir + '/templates/summary.md');
      expect(content).toContain(expectedTargetDir + '/agents/ro-commit/SKILL.md');
    });
  });
});
