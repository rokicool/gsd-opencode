/**
 * Test utilities for integration tests.
 *
 * This module provides helper functions for integration testing of GSD-OpenCode
 * commands, including temporary directory management, path replacement assertions,
 * and mock object creation.
 *
 * @module test-utils
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Creates a temporary directory for testing.
 *
 * @param {string} [prefix='gsd-test-'] - Prefix for the temp directory name
 * @returns {Promise<string>} Path to the created temp directory
 * @example
 * const tempDir = await createTempDir('install-test-');
 */
export async function createTempDir(prefix = 'gsd-test-') {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return tempDir;
}

/**
 * Removes a temporary directory recursively.
 *
 * Handles errors gracefully and is safe to call multiple times.
 *
 * @param {string} dirPath - Path to the temp directory to remove
 * @returns {Promise<void>}
 * @example
 * await cleanupTempDir(tempDir);
 */
export async function cleanupTempDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors during cleanup - directory may not exist
    if (error.code !== 'ENOENT') {
      console.warn(`Warning: Failed to cleanup temp directory ${dirPath}: ${error.message}`);
    }
  }
}

/**
 * Asserts that @gsd-opencode/ references have been replaced in a file.
 *
 * Reads the file content and checks that all @gsd-opencode/ references
 * have been replaced with the expected installation path.
 *
 * @param {string} filePath - Path to the file to check
 * @param {string} expectedPath - Expected path that should replace @gsd-opencode/
 * @param {string} [scope] - Optional scope for context ('global' | 'local' | 'custom')
 * @returns {Promise<{passed: boolean, message: string, replacementsFound: number}>}
 * @example
 * const result = await assertPathReplaced('/path/to/file.md', '/home/user/.config/opencode/');
 * if (!result.passed) console.error(result.message);
 */
export async function assertPathReplaced(filePath, expectedPath, scope) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const gsdPattern = /@gsd-opencode\//g;
    const matches = content.match(gsdPattern);
    const remainingRefs = matches ? matches.length : 0;

    if (remainingRefs > 0) {
      return {
        passed: false,
        message: `Found ${remainingRefs} unprocessed @gsd-opencode/ references in ${filePath}`,
        replacementsFound: 0
      };
    }

    // Count how many times the expected path appears
    const escapedPath = expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pathPattern = new RegExp(escapedPath, 'g');
    const pathMatches = content.match(pathPattern);
    const replacementsFound = pathMatches ? pathMatches.length : 0;

    return {
      passed: true,
      message: `All @gsd-opencode/ references replaced with ${expectedPath} (${replacementsFound} occurrences)`,
      replacementsFound
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error reading file ${filePath}: ${error.message}`,
      replacementsFound: 0
    };
  }
}

/**
 * Creates a mock GSD-OpenCode source directory structure for testing.
 *
 * Creates a realistic source structure with agents/, command/, and
 * get-shit-done/ directories containing sample .md files with
 * @gsd-opencode/ references.
 *
 * @param {string} tempDir - Base temp directory path
 * @returns {Promise<string>} Path to the created mock source directory
 * @example
 * const mockSource = await createMockSourceDir(tempDir);
 */
export async function createMockSourceDir(tempDir) {
  const sourceDir = path.join(tempDir, 'gsd-opencode');

  // Create directory structure
  const dirs = [
    path.join(sourceDir, 'agents', 'test-agent'),
    path.join(sourceDir, 'commands', 'gsd'),
    path.join(sourceDir, 'get-shit-done', 'templates'),
    path.join(sourceDir, 'get-shit-done', 'workflows')
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Create sample SKILL.md with @gsd-opencode/ references
  const skillContent = `---
name: Test Agent
description: A test agent for integration testing
references:
  - @gsd-opencode/templates/summary.md
  - @gsd-opencode/workflows/execute-plan.md
---

# Test Agent

This agent references:
- Templates from @gsd-opencode/templates/
- Workflows from @gsd-opencode/workflows/
- Other agents via @gsd-opencode/agents/

## Usage

See @gsd-opencode/get-shit-done/templates/summary.md for examples.
`;

  await fs.writeFile(
    path.join(sourceDir, 'agents', 'test-agent', 'SKILL.md'),
    skillContent,
    'utf-8'
  );

  // Create sample command documentation
  const commandContent = `# Test Command

This command documentation references:
- @gsd-opencode/agents/test-agent/SKILL.md
- @gsd-opencode/templates/context.md

## Implementation

Uses files from @gsd-opencode/get-shit-done/templates/
`;

  await fs.writeFile(
    path.join(sourceDir, 'commands', 'gsd', 'test.md'),
    commandContent,
    'utf-8'
  );

  // Create sample summary template
  const summaryContent = `---
template: summary
related:
  - @gsd-opencode/workflows/execute-plan.md
  - @gsd-opencode/templates/context.md
---

# Summary Template

This template references:
- @gsd-opencode/agents/ for agent definitions
- @gsd-opencode/command/ for command documentation
- @gsd-opencode/get-shit-done/ for core files

## References

- Workflow: @gsd-opencode/workflows/execute-plan.md
- Template: @gsd-opencode/templates/context.md
- Agent: @gsd-opencode/agents/test-agent/SKILL.md
`;

  await fs.writeFile(
    path.join(sourceDir, 'get-shit-done', 'templates', 'summary.md'),
    summaryContent,
    'utf-8'
  );

  // Create sample workflow file
  const workflowContent = `---
workflow: execute-plan
---

# Execute Plan Workflow

This workflow uses:
- Templates from @gsd-opencode/templates/
- Context from @gsd-opencode/templates/context.md

## Steps

1. Load @gsd-opencode/templates/summary.md
2. Execute using @gsd-opencode/agents/executor
`;

  await fs.writeFile(
    path.join(sourceDir, 'get-shit-done', 'workflows', 'test-workflow.md'),
    workflowContent,
    'utf-8'
  );

  return sourceDir;
}

/**
 * Creates a mock logger for testing.
 *
 * Captures log output for assertions while being silent by default.
 *
 * @param {Object} [options] - Logger options
 * @param {boolean} [options.verbose=false] - Enable verbose output
 * @param {boolean} [options.captureOutput=true] - Capture output for assertions
 * @returns {Object} Mock logger object with standard logging methods
 * @example
 * const logger = createMockLogger({ captureOutput: true });
 * logger.info('test message');
 * console.log(logger.getOutput()); // ['test message']
 */
export function createMockLogger(options = {}) {
  const { verbose = false, captureOutput = true } = options;
  const output = [];

  const logger = {
    debug: (msg) => {
      if (verbose && captureOutput) output.push({ level: 'debug', message: msg });
    },
    info: (msg) => {
      if (captureOutput) output.push({ level: 'info', message: msg });
    },
    success: (msg) => {
      if (captureOutput) output.push({ level: 'success', message: msg });
    },
    warning: (msg) => {
      if (captureOutput) output.push({ level: 'warning', message: msg });
    },
    error: (msg) => {
      if (captureOutput) output.push({ level: 'error', message: msg });
    },
    heading: (msg) => {
      if (captureOutput) output.push({ level: 'heading', message: msg });
    },
    dim: (msg) => {
      if (captureOutput) output.push({ level: 'dim', message: msg });
    },
    getOutput: () => output,
    getMessages: () => output.map(o => o.message),
    clear: () => { output.length = 0; }
  };

  return logger;
}

/**
 * Asserts that no @gsd-opencode/ references remain in a directory.
 *
 * Recursively scans all .md files in the directory and returns
 * a list of files that still contain @gsd-opencode/ references.
 *
 * @param {string} dirPath - Directory to scan
 * @returns {Promise<{passed: boolean, filesWithRefs: Array<{file: string, count: number}>}>}
 * @example
 * const result = await assertNoGsdReferences('/path/to/installation');
 * if (!result.passed) {
 *   console.error('Files with references:', result.filesWithRefs);
 * }
 */
export async function assertNoGsdReferences(dirPath) {
  const filesWithRefs = [];
  const gsdPattern = /@gsd-opencode\//g;

  async function scanDirectory(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const matches = content.match(gsdPattern);
            if (matches && matches.length > 0) {
              filesWithRefs.push({
                file: fullPath,
                count: matches.length
              });
            }
          } catch (error) {
            // Skip files we can't read
            console.warn(`Warning: Could not read file ${fullPath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${currentDir}: ${error.message}`);
    }
  }

  await scanDirectory(dirPath);

  return {
    passed: filesWithRefs.length === 0,
    filesWithRefs
  };
}

/**
 * Extracts all file references from replaced content.
 *
 * Finds all absolute paths in the content that look like they
 * were replaced from @gsd-opencode/ references.
 *
 * @param {string} content - File content to scan
 * @returns {Array<string>} Array of found file paths
 * @example
 * const refs = extractFileReferences(content);
 * // ['/home/user/.config/opencode/templates/summary.md', ...]
 */
export function extractFileReferences(content) {
  // Match patterns like /path/to/opencode/... or ~/.config/opencode/...
  // After replacement, paths will be absolute
  const pathPattern = /(?:\/[^\s\n]+\.md|~\/[^\s\n]+\.md)/g;
  const matches = content.match(pathPattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Verifies that a file is valid markdown with parseable frontmatter.
 *
 * @param {string} filePath - Path to the markdown file
 * @returns {Promise<{valid: boolean, hasFrontmatter: boolean, error?: string}>}
 * @example
 * const result = await validateMarkdownFile('/path/to/file.md');
 * if (!result.valid) console.error(result.error);
 */
export async function validateMarkdownFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for frontmatter (--- at start)
    const hasFrontmatter = content.startsWith('---');

    // Basic markdown validation - check structure
    const lines = content.split('\n');
    let inFrontmatter = false;
    let frontmatterClosed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line.trim() === '---') {
        inFrontmatter = true;
        continue;
      }

      if (inFrontmatter && line.trim() === '---') {
        inFrontmatter = false;
        frontmatterClosed = true;
        break;
      }
    }

    return {
      valid: true,
      hasFrontmatter: hasFrontmatter && frontmatterClosed,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      hasFrontmatter: false,
      error: error.message
    };
  }
}

/**
 * Creates a test fixture from an existing source directory.
 *
 * Copies the source directory to a temp location for testing,
 * ensuring all @gsd-opencode/ references are preserved.
 *
 * @param {string} sourceDir - Source directory to copy
 * @param {string} targetDir - Target directory for the fixture
 * @returns {Promise<void>}
 * @example
 * await createFixtureFromSource('./gsd-opencode', tempDir);
 */
export async function createFixtureFromSource(sourceDir, targetDir) {
  async function copyRecursive(src, dest) {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await copyRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  await fs.mkdir(targetDir, { recursive: true });
  await copyRecursive(sourceDir, targetDir);
}

// Default export with all utilities
export default {
  createTempDir,
  cleanupTempDir,
  assertPathReplaced,
  createMockSourceDir,
  createMockLogger,
  assertNoGsdReferences,
  extractFileReferences,
  validateMarkdownFile,
  createFixtureFromSource
};
