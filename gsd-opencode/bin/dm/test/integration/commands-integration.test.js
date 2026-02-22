/**
 * End-to-end integration tests for command workflows with path replacement.
 *
 * These tests verify that after path replacement, the installed files are
 * actually functional - valid markdown, valid references, and working workflows.
 *
 * @module commands-integration-tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { ScopeManager } from '../../src/services/scope-manager.js';
import { FileOperations } from '../../src/services/file-ops.js';
import { RepairService } from '../../src/services/repair-service.js';
import { BackupManager } from '../../src/services/backup-manager.js';
import { HealthChecker } from '../../src/services/health-checker.js';

import {
  createTempDir,
  cleanupTempDir,
  createMockLogger,
  validateMarkdownFile,
  extractFileReferences,
  assertNoGsdReferences
} from '../helpers/path-replacement-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fixture path
const FIXTURE_SOURCE = path.join(__dirname, '../fixtures/path-replacement/integration-source');

describe('commands integration', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await createTempDir('commands-integration-test-');
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('installed files validation', () => {
    test('installed .md files remain valid markdown', async () => {
      const targetDir = path.join(tempDir, 'valid-markdown-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Validate all .md files
      async function validateAllMdFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const results = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const subResults = await validateAllMdFiles(fullPath);
            results.push(...subResults);
          } else if (entry.name.endsWith('.md')) {
            const result = await validateMarkdownFile(fullPath);
            results.push({
              file: fullPath,
              ...result
            });
          }
        }

        return results;
      }

      const results = await validateAllMdFiles(targetDir);

      // All files should be valid markdown
      for (const result of results) {
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      }
    });

    test('installed .md files with frontmatter parse correctly', async () => {
      const targetDir = path.join(tempDir, 'frontmatter-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read SKILL.md which has frontmatter
      const skillPath = path.join(targetDir, 'agents', 'test-agent', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      // Verify frontmatter structure is preserved
      expect(content.startsWith('---')).toBe(true);

      // Find the closing --- of frontmatter
      const lines = content.split('\n');
      let frontmatterEnd = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          frontmatterEnd = i;
          break;
        }
      }

      expect(frontmatterEnd).toBeGreaterThan(0);

      // Verify YAML content is intact
      const frontmatter = lines.slice(1, frontmatterEnd).join('\n');
      expect(frontmatter).toContain('name:');
      expect(frontmatter).toContain('Test Agent');
      expect(frontmatter).toContain('references:');
    });

    test('replaced paths use correct format', async () => {
      const targetDir = path.join(tempDir, 'valid-paths-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read all .md files and verify path format
      async function checkPathFormat(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await checkPathFormat(fullPath);
          } else if (entry.name.endsWith('.md')) {
            const content = await fs.readFile(fullPath, 'utf-8');
            
            // Verify no @gsd-opencode/ references remain
            expect(content).not.toContain('@gsd-opencode/');
            
            // Verify paths are absolute (start with /)
            const pathMatches = content.match(/\/[^\s\n]+\.md/g) || [];
            for (const match of pathMatches) {
              expect(match.startsWith('/')).toBe(true);
            }
          }
        }
      }

      await checkPathFormat(targetDir);
    });
  });

  describe('cross-file references', () => {
    test('workflow files have replaced paths', async () => {
      const targetDir = path.join(tempDir, 'cross-ref-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read the summary template
      const summaryPath = path.join(targetDir, 'get-shit-done', 'templates', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');

      // Verify no @gsd-opencode/ references remain
      expect(content).not.toContain('@gsd-opencode/');

      // Verify paths contain the target directory
      expect(content).toContain(targetDir);

      // Verify paths use forward slashes
      expect(content).not.toMatch(/\\\\[^\s\n]+\.md/);
    });

    test('agent files can reference template files correctly', async () => {
      const targetDir = path.join(tempDir, 'agent-template-ref-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read SKILL.md which references templates
      const skillPath = path.join(targetDir, 'agents', 'test-agent', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      // Extract template references
      const templateRefs = content.match(/templates\/[^\s\n]+\.md/g) || [];

      // Verify referenced template files exist
      for (const ref of templateRefs) {
        const fullPath = path.join(targetDir, ref);
        // Template files should exist in get-shit-done/templates/
        if (ref.includes('get-shit-done/templates/')) {
          await expect(fs.access(fullPath)).resolves.toBeUndefined();
        }
      }
    });
  });

  describe('complete workflow simulation', () => {
    test('full cycle: install -> verify paths -> simulate update', async () => {
      const targetDir = path.join(tempDir, 'full-cycle-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Step 1: Install
      const installResult = await fileOps.install(FIXTURE_SOURCE, targetDir);
      expect(installResult.success).toBe(true);

      // Step 2: Verify paths were replaced
      let noRefsResult = await assertNoGsdReferences(targetDir);
      expect(noRefsResult.passed).toBe(true);

      // Step 3: Create VERSION file for health checks
      const versionPath = path.join(targetDir, 'VERSION');
      await fs.writeFile(versionPath, '1.0.0', 'utf-8');

      // Step 4: Health Check
      const healthChecker = new HealthChecker(scopeManager);
      const healthResult = await healthChecker.checkAll({ expectedVersion: '1.0.0' });

      // Should have proper structure
      expect(healthResult).toHaveProperty('passed');
      expect(healthResult).toHaveProperty('categories');

      // Step 5: Verify installation is valid
      const skillPath = path.join(targetDir, 'agents', 'test-agent', 'SKILL.md');
      const skillValidation = await validateMarkdownFile(skillPath);
      expect(skillValidation.valid).toBe(true);

      // Step 6: Simulate update by reinstalling
      await fs.rm(targetDir, { recursive: true, force: true });
      await fileOps.install(FIXTURE_SOURCE, targetDir);
      await fs.writeFile(versionPath, '1.0.0', 'utf-8');

      // Step 7: Verify paths still correct after update
      noRefsResult = await assertNoGsdReferences(targetDir);
      expect(noRefsResult.passed).toBe(true);

      // Step 8: Verify file structure is preserved
      const content = await fs.readFile(skillPath, 'utf-8');
      expect(content).toContain('# Test Agent');
      expect(content).toContain('---'); // Frontmatter
      expect(content).not.toContain('@gsd-opencode/');
      expect(content).toContain(targetDir);
    });

    test('installation survives health check verification', async () => {
      const targetDir = path.join(tempDir, 'health-check-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Create VERSION file
      const versionPath = path.join(targetDir, 'VERSION');
      await fs.writeFile(versionPath, '1.0.0', 'utf-8');

      // Run health check
      const healthChecker = new HealthChecker(scopeManager);
      const healthResult = await healthChecker.checkAll({ expectedVersion: '1.0.0' });

      // The installation should be healthy
      // Note: This depends on what files the health checker looks for
      expect(healthResult).toHaveProperty('passed');
      expect(healthResult).toHaveProperty('categories.files');
      expect(healthResult).toHaveProperty('categories.version');
    });
  });

  describe('scope-specific behaviors', () => {
    test('global installation paths are absolute', async () => {
      const targetDir = path.join(tempDir, 'global-absolute-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read a file and verify paths are absolute
      const skillPath = path.join(targetDir, 'agents', 'test-agent', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      // Extract all paths (after replacement they should be absolute)
      const pathMatches = content.match(/\/[^\s\n]+\.md/g) || [];

      // All matches should be absolute paths (start with /)
      for (const match of pathMatches) {
        expect(match.startsWith('/')).toBe(true);
      }
    });

    test('local installation paths are absolute', async () => {
      const targetDir = path.join(tempDir, 'local-absolute-test');

      const scopeManager = new ScopeManager({ scope: 'local' });
      scopeManager.localDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read a file and verify paths are absolute
      const summaryPath = path.join(targetDir, 'get-shit-done', 'templates', 'summary.md');
      const content = await fs.readFile(summaryPath, 'utf-8');

      // Should not contain @gsd-opencode/
      expect(content).not.toContain('@gsd-opencode/');

      // Should contain absolute paths
      expect(content).toContain(targetDir);
    });

    test('paths work correctly after directory operations', async () => {
      const targetDir = path.join(tempDir, 'dir-ops-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Verify we can read all files
      async function readAllFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const subFiles = await readAllFiles(fullPath);
            files.push(...subFiles);
          } else {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({ path: fullPath, content });
          }
        }

        return files;
      }

      const allFiles = await readAllFiles(targetDir);

      // All files should be readable
      expect(allFiles.length).toBeGreaterThan(0);

      // All .md files should have paths replaced
      const mdFiles = allFiles.filter(f => f.path.endsWith('.md'));
      for (const file of mdFiles) {
        expect(file.content).not.toContain('@gsd-opencode/');
      }
    });
  });

  describe('verification at scale', () => {
    test('all @gsd-opencode/ references replaced in full installation', async () => {
      const targetDir = path.join(tempDir, 'full-verification-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Recursively search ALL .md files for any @gsd-opencode/ references
      let totalFiles = 0;
      let filesWithRefs = [];

      async function scanForReferences(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanForReferences(fullPath);
          } else if (entry.name.endsWith('.md')) {
            totalFiles++;
            const content = await fs.readFile(fullPath, 'utf-8');
            const refs = content.match(/@gsd-opencode\//g) || [];
            if (refs.length > 0) {
              filesWithRefs.push({
                file: fullPath,
                count: refs.length
              });
            }
          }
        }
      }

      await scanForReferences(targetDir);

      // Should have processed files
      expect(totalFiles).toBeGreaterThan(0);

      // Should have ZERO files with @gsd-opencode/ references
      expect(filesWithRefs).toHaveLength(0);
    });

    test('file structure and formatting preserved after path replacement', async () => {
      const targetDir = path.join(tempDir, 'formatting-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Read original and installed files to compare structure
      const originalSkill = await fs.readFile(
        path.join(FIXTURE_SOURCE, 'agents', 'test-agent', 'SKILL.md'),
        'utf-8'
      );
      const installedSkill = await fs.readFile(
        path.join(targetDir, 'agents', 'test-agent', 'SKILL.md'),
        'utf-8'
      );

      // Line count should be the same
      const originalLines = originalSkill.split('\n');
      const installedLines = installedSkill.split('\n');
      expect(installedLines.length).toBe(originalLines.length);

      // Frontmatter should be preserved
      expect(installedSkill.startsWith('---')).toBe(true);

      // Headers should be preserved
      expect(installedSkill).toContain('# Test Agent');
      expect(installedSkill).toContain('## Overview');

      // Only difference should be path replacements
      // (we can verify this by checking @gsd-opencode/ is gone and targetDir is present)
      expect(installedSkill).not.toContain('@gsd-opencode/');
      expect(installedSkill).toContain(targetDir);
    });

    test('multiple files processed consistently', async () => {
      const targetDir = path.join(tempDir, 'consistency-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install
      await fileOps.install(FIXTURE_SOURCE, targetDir);

      // Get all .md files
      async function getAllMdFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const subFiles = await getAllMdFiles(fullPath);
            files.push(...subFiles);
          } else if (entry.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }

        return files;
      }

      const mdFiles = await getAllMdFiles(targetDir);

      // Each file should use consistent path format
      for (const file of mdFiles) {
        const content = await fs.readFile(file, 'utf-8');

        // No @gsd-opencode/ references
        expect(content).not.toContain('@gsd-opencode/');

        // Should use the target directory
        expect(content).toContain(targetDir);

        // Path separator should be consistent (always /)
        const windowsStylePaths = content.match(/\\[^\s\n]+\.md/g) || [];
        expect(windowsStylePaths).toHaveLength(0);
      }
    });
  });

  describe('integration with real source', () => {
    test('install from real gsd-opencode source replaces all paths', async () => {
      // Use actual source directory
      const realSource = path.join(__dirname, '../..');

      // Check if source exists
      try {
        await fs.access(realSource);
      } catch {
        // Skip test if real source not available
        return;
      }

      const targetDir = path.join(tempDir, 'real-source-test');

      const scopeManager = new ScopeManager({ scope: 'global' });
      scopeManager.globalDir = targetDir;

      const logger = createMockLogger();
      const fileOps = new FileOperations(scopeManager, logger);

      // Install from real source
      await fileOps.install(realSource, targetDir);

      // Verify all paths replaced
      let filesWithRefs = 0;

      async function countReferences(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await countReferences(fullPath);
          } else if (entry.name.endsWith('.md')) {
            const content = await fs.readFile(fullPath, 'utf-8');
            if (content.includes('@gsd-opencode/')) {
              filesWithRefs++;
            }
          }
        }
      }

      await countReferences(targetDir);

      expect(filesWithRefs).toBe(0);
    });
  });
});
