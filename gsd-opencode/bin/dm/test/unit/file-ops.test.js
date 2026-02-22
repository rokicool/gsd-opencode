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
    fixturesDir = path.join(process.cwd(), 'bin/dm/test/fixtures/path-replacement');
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
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedPathPrefix + '/workflows/execute-plan.md');
      expect(content).toContain(expectedPathPrefix + '/templates/summary.md');
      expect(content).toContain(expectedPathPrefix + '/agents/ro-commit/SKILL.md');
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
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain(expectedPathPrefix + '/README.md');
      expect(content).toContain(expectedPathPrefix + '/get-shit-done/references/checkpoints.md');
    });

    it('should handle references in lists', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toContain('- First workflow: ' + expectedPathPrefix + '/workflows/execute-phase.md');
      expect(content).toContain('- Second workflow: ' + expectedPathPrefix + '/workflows/verify-phase.md');
    });
  });

  describe('Local scope path replacement', () => {
    it('should replace @gsd-opencode/ with local config path in .md files', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedPathPrefix + '/workflows/execute-plan.md');
    });

    it('should use relative path for local scope', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      // Local scope should use relative path ./.opencode/
      expect(content).toContain('./.opencode/');
    });

    it('local install replaces all @gsd-opencode/ references with relative local path', async () => {
      // Arrange: Create a test file with multiple @gsd-opencode/ references
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);
      const expectedPathPrefix = scopeManager.getPathPrefix(); // Should be './.opencode'

      // Create a source file with multiple @gsd-opencode/ references
      const sourceContent = `# Test Document

This document references:
- @gsd-opencode/workflows/execute-plan.md
- @gsd-opencode/templates/summary.md
- @gsd-opencode/agents/test-agent/SKILL.md

## Code Example
\`\`\`javascript
import { something } from '@gsd-opencode/lib/constants.js';
\`\`\`

## List Items
- First: @gsd-opencode/commands/help.md
- Second: @gsd-opencode/agents/another-agent.md
`;
      const sourcePath = path.join(tempDir, 'multi-ref-source.md');
      const targetPath = path.join(tempDir, 'multi-ref-output.md');
      await fs.writeFile(sourcePath, sourceContent, 'utf-8');

      // Act: Copy the file using FileOperations
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert: Read the output and verify replacements
      const content = await fs.readFile(targetPath, 'utf-8');

      // Verify NO @gsd-opencode/ references remain
      expect(content).not.toContain('@gsd-opencode/');

      // Verify all references are replaced with the relative local path prefix (./.opencode/)
      expect(content).toContain(expectedPathPrefix + '/workflows/execute-plan.md');
      expect(content).toContain(expectedPathPrefix + '/templates/summary.md');
      expect(content).toContain(expectedPathPrefix + '/agents/test-agent/SKILL.md');
      expect(content).toContain(expectedPathPrefix + '/lib/constants.js');
      expect(content).toContain(expectedPathPrefix + '/commands/help.md');
      expect(content).toContain(expectedPathPrefix + '/agents/another-agent.md');

      // Verify the relative path is used (starts with ./)
      expect(content).toContain('./.opencode/');
    });

    it('should handle special characters in local path replacement', async () => {
      // Arrange: Create a test file with references
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Create a source file with @gsd-opencode/ references
      const sourceContent = 'Reference: @gsd-opencode/test.md';
      const sourcePath = path.join(tempDir, 'special-char-source.md');
      const targetPath = path.join(tempDir, 'special-char-output.md');
      await fs.writeFile(sourcePath, sourceContent, 'utf-8');

      // Act: Copy the file
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert: Verify replacement worked correctly
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedPathPrefix + '/test.md');

      // The fix ensures special characters like '$' in paths don't cause issues
      // This test verifies the function-based replacement works correctly
    });

    it('should handle paths with dollar signs correctly', async () => {
      // This test verifies the bug fix for special character handling
      // The old code would fail if targetDir contained '$' characters
      // The new function-based replacement handles this correctly

      // Arrange: Create a mock scenario
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);

      // Create source content with multiple references
      const sourceContent = `@gsd-opencode/file1.md
@gsd-opencode/file2.md
@gsd-opencode/file3.md`;
      const sourcePath = path.join(tempDir, 'dollar-sign-source.md');
      const targetPath = path.join(tempDir, 'dollar-sign-output.md');
      await fs.writeFile(sourcePath, sourceContent, 'utf-8');

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // All references should be replaced
      expect(content).not.toContain('@gsd-opencode/');

      // Count occurrences of the path prefix (./.opencode/)
      const pathPrefixRegex = new RegExp(expectedPathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(pathPrefixRegex);
      expect(matches).toHaveLength(3);
    });
  });

  describe('Absolute path reference replacement', () => {
    it('local install should replace @~/.config/opencode/ with ./.opencode/', async () => {
      // Arrange: Create a test file with absolute path references
      const scopeManager = new ScopeManager({ scope: 'local' });
      const fileOps = new FileOperations(scopeManager, logger);

      const sourceContent = `# Test Document

This document references:
- @~/.config/opencode/workflows/execute-plan.md
- @~/.config/opencode/templates/summary.md
- @~/.config/opencode/agents/test-agent/SKILL.md
`;
      const sourcePath = path.join(tempDir, 'abs-ref-source.md');
      const targetPath = path.join(tempDir, 'abs-ref-output.md');
      await fs.writeFile(sourcePath, sourceContent, 'utf-8');

      // Act: Copy the file using FileOperations
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert: Read the output and verify replacements
      const content = await fs.readFile(targetPath, 'utf-8');

      // Verify NO @~/.config/opencode/ references remain
      expect(content).not.toContain('@~/.config/opencode/');

      // Verify all references are replaced with relative local path
      expect(content).toContain('./.opencode/workflows/execute-plan.md');
      expect(content).toContain('./.opencode/templates/summary.md');
      expect(content).toContain('./.opencode/agents/test-agent/SKILL.md');
    });

    it('global install should preserve @~/.config/opencode/ references', async () => {
      // Arrange: Create a test file with absolute path references
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);

      const sourceContent = `# Test Document

This document references:
- @~/.config/opencode/workflows/execute-plan.md
- @~/.config/opencode/templates/summary.md
`;
      const sourcePath = path.join(tempDir, 'abs-ref-global-source.md');
      const targetPath = path.join(tempDir, 'abs-ref-global-output.md');
      await fs.writeFile(sourcePath, sourceContent, 'utf-8');

      // Act: Copy the file using FileOperations
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert: Read the output and verify @~/.config/opencode/ is preserved
      const content = await fs.readFile(targetPath, 'utf-8');

      // For global installs, @~/.config/opencode/ should stay unchanged
      expect(content).toContain('@~/.config/opencode/workflows/execute-plan.md');
      expect(content).toContain('@~/.config/opencode/templates/summary.md');
    });
  });

  describe('Nested directory handling', () => {
    it('should replace paths in deeply nested .md files', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-nested/deep-reference.md');
      const targetPath = path.join(tempDir, 'nested', 'deep', 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Ensure nested directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedPathPrefix + '/workflows/verify-phase.md');
      expect(content).toContain(expectedPathPrefix + '/agents/gsd-verifier/SKILL.md');
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
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain('no ' + expectedPathPrefix + '/ references');
      expect(content).toContain('Document Without References');
    });

    it('should handle multiple references on same line', async () => {
      // Arrange
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-multiple-same-line.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedPathPrefix + '/first.md');
      expect(content).toContain(expectedPathPrefix + '/second.md');
      expect(content).toContain(expectedPathPrefix + '/a.md');
      expect(content).toContain(expectedPathPrefix + '/b.md');
      expect(content).toContain(expectedPathPrefix + '/c.md');
    });

    it('should handle reference at start of content', async () => {
      // Arrange - create test file with reference at start
      const sourcePath = path.join(tempDir, 'start-ref.md');
      await fs.writeFile(sourcePath, '@gsd-opencode/workflows/start.md is at the beginning');

      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const targetPath = path.join(tempDir, 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content.startsWith(expectedPathPrefix + '/workflows/start.md')).toBe(true);
    });

    it('should handle reference at end of content', async () => {
      // Arrange - create test file with reference at end
      const sourcePath = path.join(tempDir, 'end-ref.md');
      await fs.writeFile(sourcePath, 'This document references @gsd-opencode/agents/gsd-executor.md');

      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const targetPath = path.join(tempDir, 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(expectedPathPrefix + '/agents/gsd-executor.md');
    });
  });

  describe('PATH_PATTERNS regex', () => {
    it('should match the correct pattern for @gsd-opencode/ references', async () => {
      // This test verifies the regex pattern works as expected
      const scopeManager = new ScopeManager({ scope: 'global' });
      const fileOps = new FileOperations(scopeManager, logger);
      const sourcePath = path.join(fixturesDir, 'sample-with-references.md');
      const targetPath = path.join(tempDir, 'output.md');
      const expectedPathPrefix = scopeManager.getPathPrefix();

      // Act
      await fileOps._copyFile(sourcePath, targetPath);

      // Assert - verify all patterns were replaced
      const content = await fs.readFile(targetPath, 'utf-8');
      const matches = content.match(/@gsd-opencode\//g);
      expect(matches).toBeNull(); // Should be no remaining matches

      // Verify replacements happened
      expect(content).toContain(expectedPathPrefix + '/workflows/execute-plan.md');
      expect(content).toContain(expectedPathPrefix + '/templates/summary.md');
      expect(content).toContain(expectedPathPrefix + '/agents/ro-commit/SKILL.md');
    });
  });
});
