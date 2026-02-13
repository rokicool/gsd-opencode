/**
 * Integration test: Install command preserves existing opencode configuration
 * 
 * This test verifies that running `gsd-opencode install` on a directory that
 * already contains other opencode files does NOT delete those files.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { ScopeManager } from '../../src/services/scope-manager.js';
import { FileOperations } from '../../src/services/file-ops.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, '../..');

function createMockLogger() {
  return {
    debug: () => {},
    info: () => {},
    success: () => {},
    warning: () => {},
    error: () => {},
    heading: () => {},
    dim: () => {}
  };
}

describe('Install Command Preserves Existing Config', () => {
  let tempDir;
  let mockLogger;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp('/tmp/install-preserves-test-');
    mockLogger = createMockLogger();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should NOT delete existing non-gsd files during install', async () => {
    const targetDir = tempDir;
    
    await fs.mkdir(path.join(targetDir, 'agents', 'my-custom-agent'), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, 'agents', 'my-custom-agent', 'SKILL.md'),
      '# My Custom Agent'
    );
    
    await fs.mkdir(path.join(targetDir, 'skills'), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, 'skills', 'my-skill.json'),
      '{"name": "my-skill"}'
    );
    
    await fs.writeFile(
      path.join(targetDir, 'settings.json'),
      '{"theme": "dark"}'
    );
    
    const scopeManager = new ScopeManager({ scope: 'global' });
    scopeManager.globalDir = targetDir;
    
    const fileOps = new FileOperations(scopeManager, mockLogger);
    await fileOps.install(SOURCE_DIR, targetDir);
    
    const settingsExists = await fs.access(path.join(targetDir, 'settings.json')).then(() => true).catch(() => false);
    const skillExists = await fs.access(path.join(targetDir, 'skills', 'my-skill.json')).then(() => true).catch(() => false);
    const customAgentExists = await fs.access(path.join(targetDir, 'agents', 'my-custom-agent', 'SKILL.md')).then(() => true).catch(() => false);
    
    expect(settingsExists).toBe(true);
    expect(skillExists).toBe(true);
    expect(customAgentExists).toBe(true);
  });
});
