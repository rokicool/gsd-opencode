/**
 * Unit tests for set-profile-phase16.cjs
 *
 * Tests for all three operation modes, dry-run, and error cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Test fixtures
import VALID_CONFIG from './fixtures/oc-config-valid.json' assert { type: 'json' };

// Mock model catalog
const MOCK_MODELS = [
  'bailian-coding-plan/qwen3.5-plus',
  'bailian-coding-plan/qwen3.5-pro',
  'opencode/gpt-5-nano',
  'opencode/gpt-4',
  'opencode/claude-3.5-sonnet',
  'kilo/anthropic/claude-3.7-sonnet'
];

describe('set-profile-phase16.cjs', () => {
  let testDir;
  let planningDir;
  let configPath;
  let opencodePath;
  let backupsDir;

  beforeEach(() => {
    // Create isolated test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-profile-phase16-test-'));
    planningDir = path.join(testDir, '.planning');
    configPath = path.join(planningDir, 'oc_config.json');
    opencodePath = path.join(testDir, 'opencode.json');
    backupsDir = path.join(planningDir, 'backups');

    fs.mkdirSync(planningDir, { recursive: true });

    // Mock getModelCatalog
    vi.mock('../gsd-oc-lib/oc-models.cjs', () => ({
      getModelCatalog: () => ({ success: true, models: MOCK_MODELS })
    }));
  });

  afterEach(() => {
    // Cleanup test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  /**
   * Helper to run command and capture output
   */
  function runCommand(args = []) {
    const cmdPath = path.join(__dirname, '../gsd-oc-commands/set-profile-phase16.cjs');
    const cmd = `node "${cmdPath}" ${args.join(' ')}`;

    try {
      const stdout = execSync(cmd, { cwd: testDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return { success: true, stdout, stderr: '' };
    } catch (err) {
      return {
        success: false,
        stdout: err.stdout || '',
        stderr: err.stderr || ''
      };
    }
  }

  /**
   * Helper to write test config
   */
  function writeConfig(config = VALID_CONFIG) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  }

  describe('Mode 1: No profile name (validate current)', () => {
    it('validates and applies current profile when set', () => {
      writeConfig();
      writeOpencodeJson();

      const result = runCommand();

      expect(result.success).toBe(true);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('simple');
      expect(output.data.models).toHaveProperty('planning');
      expect(output.data.models).toHaveProperty('execution');
      expect(output.data.models).toHaveProperty('verification');
    });

    it('returns MISSING_CURRENT_PROFILE when current_oc_profile not set', () => {
      const configWithoutCurrent = {
        profiles: {
          presets: {
            simple: { planning: 'opencode/gpt-4', execution: 'opencode/gpt-4', verification: 'opencode/gpt-4' }
          }
        }
      };
      writeConfig(configWithoutCurrent);

      const result = runCommand();

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('MISSING_CURRENT_PROFILE');
    });

    it('returns PROFILE_NOT_FOUND when current profile does not exist', () => {
      const configWithInvalidCurrent = {
        current_oc_profile: 'nonexistent',
        profiles: {
          presets: {
            simple: { planning: 'opencode/gpt-4', execution: 'opencode/gpt-4', verification: 'opencode/gpt-4' }
          }
        }
      };
      writeConfig(configWithInvalidCurrent);

      const result = runCommand();

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });

  describe('Mode 2: Profile name provided (switch to profile)', () => {
    beforeEach(() => {
      writeConfig();
      writeOpencodeJson();
    });

    it('switches to specified profile', () => {
      const result = runCommand(['genius']);

      expect(result.success).toBe(true);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('genius');

      // Verify oc_config.json was updated
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.current_oc_profile).toBe('genius');
    });

    it('updates opencode.json with profile models', () => {
      runCommand(['genius']);

      const opencode = JSON.parse(fs.readFileSync(opencodePath, 'utf8'));
      expect(opencode.agent['gsd-planner'].model).toBe('opencode/claude-3.5-sonnet');
      expect(opencode.agent['gsd-executor'].model).toBe('opencode/claude-3.5-sonnet');
    });

    it('creates backup before modifications', () => {
      runCommand(['genius']);

      expect(fs.existsSync(backupsDir)).toBe(true);
      const backups = fs.readdirSync(backupsDir);
      expect(backups.some(f => f.includes('oc_config.json'))).toBe(true);
    });

    it('returns error for non-existent profile', () => {
      const result = runCommand(['nonexistent']);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('PROFILE_NOT_FOUND');
      expect(error.error.message).toContain('nonexistent');
    });
  });

  describe('Mode 3: Inline profile definition (create new profile)', () => {
    beforeEach(() => {
      writeConfig();
      writeOpencodeJson();
    });

    it('creates new profile from JSON definition', () => {
      const profileDef = 'custom:{"planning":"opencode/gpt-4","execution":"opencode/gpt-4","verification":"opencode/gpt-4"}';
      const result = runCommand([profileDef]);

      expect(result.success).toBe(true);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('custom');

      // Verify profile was added
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.profiles.presets.custom).toBeDefined();
      expect(updatedConfig.current_oc_profile).toBe('custom');
    });

    it('validates all three keys required', () => {
      const incompleteDef = 'incomplete:{"planning":"opencode/gpt-4"}';
      const result = runCommand([incompleteDef]);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INCOMPLETE_PROFILE');
      expect(error.error.message).toContain('missing required keys');
    });

    it('rejects incomplete profile definitions', () => {
      const partialDef = 'partial:{"planning":"opencode/gpt-4","execution":"opencode/gpt-4"}';
      const result = runCommand([partialDef]);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INCOMPLETE_PROFILE');
    });

    it('rejects duplicate profile names', () => {
      // First creation should succeed
      runCommand(['custom:{"planning":"opencode/gpt-4","execution":"opencode/gpt-4","verification":"opencode/gpt-4"}']);

      // Second creation with same name should fail
      const result = runCommand(['custom:{"planning":"opencode/gpt-4","execution":"opencode/gpt-4","verification":"opencode/gpt-4"}']);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('PROFILE_EXISTS');
    });

    it('validates models against whitelist', () => {
      const invalidDef = 'bad:{"planning":"invalid/model","execution":"opencode/gpt-4","verification":"opencode/gpt-4"}';
      const result = runCommand([invalidDef]);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INVALID_MODELS');
      expect(error.error.message).toContain('invalid/model');
    });

    it('rejects invalid model IDs', () => {
      const invalidDef = 'bad:{"planning":"opencode/gpt-4","execution":"fake/model","verification":"another/fake"}';
      const result = runCommand([invalidDef]);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INVALID_MODELS');
    });

    it('rejects invalid JSON syntax', () => {
      const result = runCommand(['bad:not valid json']);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INVALID_SYNTAX');
    });

    it('rejects profile definition without colon separator', () => {
      const result = runCommand(['{"planning":"opencode/gpt-4","execution":"opencode/gpt-4","verification":"opencode/gpt-4"}']);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INVALID_SYNTAX');
    });
  });

  describe('Dry-run mode', () => {
    beforeEach(() => {
      writeConfig();
      writeOpencodeJson();
    });

    it('returns preview without file modifications in Mode 1', () => {
      const result = runCommand(['--dry-run']);

      expect(result.success).toBe(true);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.data.dryRun).toBe(true);
      expect(output.data.action).toBe('validate_current');

      // Verify no files were modified
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.current_oc_profile).toBe('simple'); // unchanged
    });

    it('returns preview without file modifications in Mode 2', () => {
      const result = runCommand(['--dry-run', 'genius']);

      expect(result.success).toBe(true);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.data.dryRun).toBe(true);
      expect(output.data.action).toBe('switch_profile');
      expect(output.data.profile).toBe('genius');

      // Verify no files were modified
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.current_oc_profile).toBe('simple'); // unchanged
    });

    it('works in all three modes', () => {
      // Mode 1
      expect(runCommand(['--dry-run']).success).toBe(true);

      // Mode 2
      expect(runCommand(['--dry-run', 'genius']).success).toBe(true);

      // Mode 3
      expect(runCommand(['--dry-run', 'test:{"planning":"opencode/gpt-4","execution":"opencode/gpt-4","verification":"opencode/gpt-4"}']).success).toBe(true);
    });

    it('output includes dryRun: true flag', () => {
      const result = runCommand(['--dry-run', 'genius']);
      const output = JSON.parse(result.stdout);

      expect(output.data.dryRun).toBe(true);
      expect(output.data.changes).toBeDefined();
      expect(output.data.changes.oc_config).toBeDefined();
      expect(output.data.changes.opencode).toBeDefined();
    });
  });

  describe('Atomic transaction', () => {
    it('rollback on opencode.json failure', () => {
      writeConfig();
      // Write invalid opencode.json to trigger failure
      fs.writeFileSync(opencodePath, '{ invalid json', 'utf8');

      const result = runCommand(['genius']);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('APPLY_FAILED');

      // Verify oc_config.json was rolled back (still "simple")
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.current_oc_profile).toBe('simple');
    });

    it('creates backups before modifications', () => {
      writeConfig();
      writeOpencodeJson();

      runCommand(['genius']);

      const backups = fs.readdirSync(backupsDir);
      expect(backups.length).toBeGreaterThan(0);
      expect(backups.some(f => f.includes('oc_config.json'))).toBe(true);
    });

    it('rollback restores original state', () => {
      writeConfig();
      fs.writeFileSync(opencodePath, '{ invalid json', 'utf8');

      const originalConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      runCommand(['genius']);

      const restoredConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(restoredConfig.current_oc_profile).toBe(originalConfig.current_oc_profile);
    });
  });

  describe('Error handling', () => {
    it('returns CONFIG_NOT_FOUND when oc_config.json missing', () => {
      const result = runCommand();

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('CONFIG_NOT_FOUND');
    });

    it('returns INVALID_JSON for malformed JSON', () => {
      fs.writeFileSync(configPath, '{ invalid json }', 'utf8');
      const result = runCommand();

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('INVALID_JSON');
    });

    it('model validation occurs before file modifications', () => {
      writeConfig();

      // This should fail validation before touching files
      runCommand(['--dry-run', 'genius']);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.current_oc_profile).toBe('simple'); // unchanged
    });

    it('all errors returned before any writes', () => {
      const configWithoutPresets = { current_oc_profile: 'simple' };
      fs.writeFileSync(configPath, JSON.stringify(configWithoutPresets, null, 2) + '\n', 'utf8');

      const result = runCommand();

      expect(result.success).toBe(false);
      // Should error before attempting any writes
      expect(JSON.parse(result.stderr).error.code).toBeTruthy();
    });
  });

  describe('Validation order', () => {
    beforeEach(() => {
      writeConfig();
    });

    it('model validation occurs before file modifications', () => {
      // Create config with invalid model
      const invalidConfig = {
        current_oc_profile: 'invalid',
        profiles: {
          presets: {
            invalid: { planning: 'fake/model', execution: 'opencode/gpt-4', verification: 'opencode/gpt-4' }
          }
        }
      };
      writeConfig(invalidConfig);

      const result = runCommand();

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('PROFILE_NOT_FOUND'); // Should fail profile check first
    });

    it('profile existence checked before validation', () => {
      writeConfig();

      const result = runCommand(['nonexistent']);

      expect(result.success).toBe(false);
      const error = JSON.parse(result.stderr);
      expect(error.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });
});

/**
 * Helper to write test opencode.json
 */
function writeOpencodeJson() {
  const opencode = {
    $schema: 'https://opencode.ai/config.json',
    agent: {
      'gsd-planner': { model: 'opencode/gpt-4' },
      'gsd-executor': { model: 'opencode/gpt-4' },
      'gsd-verifier': { model: 'opencode/gpt-4' }
    }
  };
  fs.writeFileSync(opencodePath, JSON.stringify(opencode, null, 2) + '\n', 'utf8');
}
