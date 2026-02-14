/**
 * Test to verify that fresh install preserves existing opencode configuration
 * 
 * This test ensures that when running a fresh install, only gsd-opencode files
 * are removed, not the entire config directory.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { ScopeManager } from '../../src/services/scope-manager.js';
import { ManifestManager } from '../../src/services/manifest-manager.js';
import { ConfigManager } from '../../src/services/config.js';
import { ALLOWED_NAMESPACES } from '../../lib/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fresh Install Safety', () => {
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory to simulate opencode config
    tempDir = await fs.mkdtemp('/tmp/fresh-install-test-');
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should preserve non-gsd files during fresh install', async () => {
    // Setup: Create existing opencode config with both gsd and non-gsd files
    const targetDir = tempDir;
    
    // Create non-gsd files (user's existing config)
    await fs.mkdir(path.join(targetDir, 'agents', 'user-agent'), { recursive: true });
    await fs.writeFile(path.join(targetDir, 'agents', 'user-agent', 'SKILL.md'), '# User Agent');
    await fs.writeFile(path.join(targetDir, 'settings.json'), '{"user": "config"}');
    
    // Create gsd-opencode files
    await fs.mkdir(path.join(targetDir, 'agents', 'gsd-debugger'), { recursive: true });
    await fs.writeFile(path.join(targetDir, 'agents', 'gsd-debugger', 'SKILL.md'), '# GSD Debugger');
    await fs.mkdir(path.join(targetDir, 'get-shit-done'), { recursive: true });
    await fs.writeFile(path.join(targetDir, 'get-shit-done', 'VERSION'), '1.0.0');
    
    // Create manifest with gsd files
    const manifestManager = new ManifestManager(targetDir);
    manifestManager.addFile(
      path.join(targetDir, 'agents', 'gsd-debugger', 'SKILL.md'),
      'agents/gsd-debugger/SKILL.md',
      16,
      'sha256:test'
    );
    manifestManager.addFile(
      path.join(targetDir, 'get-shit-done', 'VERSION'),
      'get-shit-done/VERSION',
      6,
      'sha256:test2'
    );
    await manifestManager.save();
    
    // Simulate the cleanup that happens during fresh install
    const manifestEntries = await manifestManager.load();
    const filesToRemove = manifestEntries.filter(entry =>
      manifestManager.isInAllowedNamespace(entry.relativePath, ALLOWED_NAMESPACES)
    );
    
    // Remove gsd files
    for (const entry of filesToRemove) {
      try {
        await fs.unlink(entry.path);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    
    // Verify non-gsd files still exist
    const userAgentExists = await fs.access(path.join(targetDir, 'agents', 'user-agent', 'SKILL.md'))
      .then(() => true).catch(() => false);
    const settingsExists = await fs.access(path.join(targetDir, 'settings.json'))
      .then(() => true).catch(() => false);
    
    expect(userAgentExists).toBe(true);
    expect(settingsExists).toBe(true);
    
    // Verify gsd files were removed
    const gsdDebuggerExists = await fs.access(path.join(targetDir, 'agents', 'gsd-debugger', 'SKILL.md'))
      .then(() => true).catch(() => false);
    
    expect(gsdDebuggerExists).toBe(false);
  });
});
