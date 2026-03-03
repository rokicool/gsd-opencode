/**
 * Unit tests for oc-profile-config.cjs
 *
 * Tests for loadOcProfileConfig, validateProfile, and applyProfileWithValidation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  loadOcProfileConfig,
  validateProfile,
  applyProfileWithValidation,
  getAgentsForProfile,
  ERROR_CODES
} from '../gsd-oc-lib/oc-profile-config.cjs';

// Test fixtures
import VALID_CONFIG from './fixtures/oc-config-valid.json' assert { type: 'json' };
import INVALID_CONFIG from './fixtures/oc-config-invalid.json' assert { type: 'json' };

// Mock model catalog (simulates opencode models output)
const MOCK_MODELS = [
  'bailian-coding-plan/qwen3.5-plus',
  'bailian-coding-plan/qwen3.5-pro',
  'opencode/gpt-5-nano',
  'kilo/anthropic/claude-3.7-sonnet',
  'kilo/anthropic/claude-3.5-haiku'
];

describe('oc-profile-config.cjs', () => {
  let testDir;
  let planningDir;
  let configPath;

  beforeEach(() => {
    // Create isolated test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-profile-test-'));
    planningDir = path.join(testDir, '.planning');
    configPath = path.join(planningDir, 'oc_config.json');
    fs.mkdirSync(planningDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('loadOcProfileConfig', () => {
    it('returns CONFIG_NOT_FOUND when file does not exist', () => {
      const result = loadOcProfileConfig(testDir);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.CONFIG_NOT_FOUND);
      expect(result.error.message).toContain('oc_config.json not found');
    });

    it('returns INVALID_JSON for malformed JSON', () => {
      fs.writeFileSync(configPath, '{ invalid json }', 'utf8');
      
      const result = loadOcProfileConfig(testDir);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.INVALID_JSON);
      expect(result.error.message).toContain('Invalid JSON');
    });

    it('returns config and configPath for valid file', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf8');
      
      const result = loadOcProfileConfig(testDir);
      
      expect(result.success).toBe(true);
      expect(result.config).toEqual(VALID_CONFIG);
      expect(result.configPath).toBe(configPath);
    });
  });

  describe('validateProfile', () => {
    it('returns valid: true for existing profile with valid models', () => {
      const result = validateProfile(VALID_CONFIG, 'simple', MOCK_MODELS);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns PROFILE_NOT_FOUND for non-existent profile', () => {
      const result = validateProfile(VALID_CONFIG, 'nonexistent', MOCK_MODELS);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ERROR_CODES.PROFILE_NOT_FOUND);
      expect(result.errors[0].message).toContain('not found');
    });

    it('returns INVALID_MODELS for profile with invalid model IDs', () => {
      const result = validateProfile(INVALID_CONFIG, 'invalid-models', MOCK_MODELS);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_MODELS);
      expect(result.errors[0].invalidModels).toHaveLength(3);
    });

    it('returns INCOMPLETE_PROFILE for missing planning/execution/verification', () => {
      const result = validateProfile(INVALID_CONFIG, 'incomplete', MOCK_MODELS);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ERROR_CODES.INCOMPLETE_PROFILE);
      expect(result.errors[0].missingKeys).toContain('execution');
      expect(result.errors[0].missingKeys).toContain('verification');
    });
  });

  describe('applyProfileWithValidation', () => {
    it('dry-run mode returns preview without file modifications', () => {
      // Setup opencode.json for applyProfileToOpencode to work
      const opencodePath = path.join(testDir, 'opencode.json');
      fs.writeFileSync(opencodePath, JSON.stringify({
        "$schema": "https://opencode.ai/config.json",
        "agent": {}
      }, null, 2), 'utf8');

      // Write config file
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf8');

      const result = applyProfileWithValidation(testDir, 'smart', {
        dryRun: true,
        verbose: false
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.preview).toBeDefined();
      expect(result.preview.profile).toBe('smart');
      expect(result.preview.models).toHaveProperty('planning');
      expect(result.preview.models).toHaveProperty('execution');
      expect(result.preview.models).toHaveProperty('verification');
      
      // Verify no backup was created in dry-run
      const backupDir = path.join(testDir, '.planning', 'backups');
      expect(fs.existsSync(backupDir)).toBe(false);
    });

    it('creates backups before modifications', () => {
      // Setup opencode.json
      const opencodePath = path.join(testDir, 'opencode.json');
      fs.writeFileSync(opencodePath, JSON.stringify({
        "$schema": "https://opencode.ai/config.json",
        "agent": {}
      }, null, 2), 'utf8');

      // Write config file
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf8');

      const result = applyProfileWithValidation(testDir, 'simple', {
        dryRun: false,
        verbose: false
      });

      expect(result.success).toBe(true);
      expect(result.data.backup).toBeDefined();
      expect(fs.existsSync(result.data.backup)).toBe(true);
      expect(result.data.backup).toContain('.planning/backups');
    });

    it('updates oc_config.json with current_oc_profile', () => {
      // Setup initial config with different current profile
      const initialConfig = {
        current_oc_profile: 'simple',
        profiles: VALID_CONFIG.profiles
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf8');

      // Setup opencode.json
      const opencodePath = path.join(testDir, 'opencode.json');
      fs.writeFileSync(opencodePath, JSON.stringify({
        "$schema": "https://opencode.ai/config.json",
        "agent": {}
      }, null, 2), 'utf8');

      const result = applyProfileWithValidation(testDir, 'genius', {
        dryRun: false,
        verbose: false
      });

      expect(result.success).toBe(true);

      // Verify config was updated
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.current_oc_profile).toBe('genius');
    });

    it('applies to opencode.json via applyProfileToOpencode', () => {
      // Setup opencode.json
      const opencodePath = path.join(testDir, 'opencode.json');
      fs.writeFileSync(opencodePath, JSON.stringify({
        "$schema": "https://opencode.ai/config.json",
        "agent": {}
      }, null, 2), 'utf8');

      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf8');

      const result = applyProfileWithValidation(testDir, 'smart', {
        dryRun: false,
        verbose: false
      });

      expect(result.success).toBe(true);
      expect(result.data.updated).toBeDefined();
      expect(Array.isArray(result.data.updated)).toBe(true);
      
      // Verify opencode.json was updated with gsd-* agents
      const updatedOpencode = JSON.parse(fs.readFileSync(opencodePath, 'utf8'));
      expect(updatedOpencode.agent).toBeDefined();
      expect(updatedOpencode.agent['gsd-planner']).toBeDefined();
      expect(updatedOpencode.agent['gsd-executor']).toBeDefined();
      expect(updatedOpencode.agent['gsd-verifier']).toBeDefined();
    });

    it('returns error for non-existent profile', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf8');

      const result = applyProfileWithValidation(testDir, 'nonexistent', {
        dryRun: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.PROFILE_NOT_FOUND);
    });

    it('validates models before file modifications', () => {
      // Config with invalid models
      const invalidConfig = {
        current_oc_profile: 'simple',
        profiles: {
          presets: {
            'bad-profile': {
              planning: 'invalid-model',
              execution: 'invalid-model',
              verification: 'invalid-model'
            }
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2), 'utf8');

      const result = applyProfileWithValidation(testDir, 'bad-profile', {
        dryRun: false,
        verbose: false
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.INVALID_MODELS);

      // Verify config was NOT modified (validation happened first)
      const configAfter = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(configAfter.current_oc_profile).toBe('simple');
    });

    it('supports inline profile definition', () => {
      // Setup opencode.json
      const opencodePath = path.join(testDir, 'opencode.json');
      fs.writeFileSync(opencodePath, JSON.stringify({
        "$schema": "https://opencode.ai/config.json",
        "agent": {}
      }, null, 2), 'utf8');

      // Start with empty profiles
      const initialConfig = {
        profiles: {
          presets: {}
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf8');

      const inlineProfile = {
        planning: 'bailian-coding-plan/qwen3.5-plus',
        execution: 'bailian-coding-plan/qwen3.5-plus',
        verification: 'bailian-coding-plan/qwen3.5-plus'
      };

      const result = applyProfileWithValidation(testDir, 'custom', {
        dryRun: false,
        verbose: false,
        inlineProfile
      });

      expect(result.success).toBe(true);

      // Verify profile was added
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.profiles.presets.custom).toEqual(inlineProfile);
      expect(updatedConfig.current_oc_profile).toBe('custom');
    });

    it('rejects incomplete inline profile definition', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf8');

      const incompleteProfile = {
        planning: 'bailian-coding-plan/qwen3.5-plus'
        // Missing execution and verification
      };

      const result = applyProfileWithValidation(testDir, 'new-profile', {
        dryRun: false,
        verbose: false,
        inlineProfile: incompleteProfile
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ERROR_CODES.INCOMPLETE_PROFILE);
      expect(result.error.missingKeys).toContain('execution');
    });
  });

  describe('getAgentsForProfile', () => {
    it('returns all agents for complete profile', () => {
      const profile = {
        planning: 'bailian-coding-plan/qwen3.5-plus',
        execution: 'opencode/gpt-5-nano',
        verification: 'kilo/anthropic/claude-3.7-sonnet'
      };

      const agents = getAgentsForProfile(profile);

      expect(agents).toBeInstanceOf(Array);
      expect(agents.length).toBeGreaterThan(10); // Should have 11 agents

      // Check planning agents
      const planningAgents = agents.filter(a => a.model === 'bailian-coding-plan/qwen3.5-plus');
      expect(planningAgents.length).toBe(7);

      // Check execution agents
      const executionAgents = agents.filter(a => a.model === 'opencode/gpt-5-nano');
      expect(executionAgents.length).toBe(2);

      // Check verification agents
      const verificationAgents = agents.filter(a => a.model === 'kilo/anthropic/claude-3.7-sonnet');
      expect(verificationAgents.length).toBe(2);
    });

    it('handles profile with missing categories', () => {
      const profile = {
        planning: 'bailian-coding-plan/qwen3.5-plus'
        // Missing execution and verification
      };

      const agents = getAgentsForProfile(profile);

      expect(agents).toBeInstanceOf(Array);
      expect(agents.length).toBe(7); // Only planning agents
      expect(agents.every(a => a.model === 'bailian-coding-plan/qwen3.5-plus')).toBe(true);
    });
  });

  describe('ERROR_CODES', () => {
    it('exports all expected error codes', () => {
      expect(ERROR_CODES).toHaveProperty('CONFIG_NOT_FOUND');
      expect(ERROR_CODES).toHaveProperty('INVALID_JSON');
      expect(ERROR_CODES).toHaveProperty('PROFILE_NOT_FOUND');
      expect(ERROR_CODES).toHaveProperty('INVALID_MODELS');
      expect(ERROR_CODES).toHaveProperty('INCOMPLETE_PROFILE');
      expect(ERROR_CODES).toHaveProperty('WRITE_FAILED');
      expect(ERROR_CODES).toHaveProperty('APPLY_FAILED');
      expect(ERROR_CODES).toHaveProperty('ROLLBACK_FAILED');
    });
  });
});
