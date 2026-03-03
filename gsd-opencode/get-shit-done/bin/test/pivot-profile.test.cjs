/**
 * Unit tests for pivot-profile.cjs
 *
 * Tests for the thin wrapper that delegates to setProfilePhase16
 * Focus: Verify correct import and delegation, not re-testing underlying functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock console.log and console.error to capture output
const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

// Test fixtures
const VALID_CONFIG = {
  current_oc_profile: 'smart',
  profiles: {
    presets: {
      simple: {
        planning: 'bailian-coding-plan/qwen3.5-plus',
        execution: 'bailian-coding-plan/qwen3.5-plus',
        verification: 'bailian-coding-plan/qwen3.5-plus'
      },
      smart: {
        planning: 'bailian-coding-plan/qwen3.5-plus',
        execution: 'bailian-coding-plan/qwen3.5-plus',
        verification: 'bailian-coding-plan/qwen3.5-plus'
      },
      genius: {
        planning: 'bailian-coding-plan/qwen3.5-plus',
        execution: 'bailian-coding-plan/qwen3.5-plus',
        verification: 'bailian-coding-plan/qwen3.5-plus'
      }
    }
  }
};

describe('pivot-profile.cjs', () => {
  let testDir;
  let planningDir;
  let configPath;
  let opencodePath;
  let capturedLog;
  let capturedError;
  let exitCode;
  let allLogs;
  let allErrors;

  beforeEach(() => {
    // Create isolated test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pivot-profile-test-'));
    planningDir = path.join(testDir, '.planning');
    configPath = path.join(planningDir, 'oc_config.json');
    opencodePath = path.join(testDir, 'opencode.json');

    fs.mkdirSync(planningDir, { recursive: true });

    // Reset captured output
    capturedLog = null;
    capturedError = null;
    exitCode = null;
    allLogs = [];
    allErrors = [];

    // Mock console.log to capture all output
    console.log = (msg) => {
      allLogs.push(msg);
      capturedLog = msg;
    };
    console.error = (msg) => {
      allErrors.push(msg);
      capturedError = msg;
    };
    process.exit = (code) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    };
  });

  afterEach(() => {
    // Restore original functions
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;

    // Cleanup test directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  // Import pivotProfile inside tests to use mocked functions
  const importPivotProfile = () => {
    const modulePath = '../gsd-oc-commands/pivot-profile.cjs';
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
  };

  describe('Export verification', () => {
    it('exports pivotProfile function', () => {
      const pivotProfile = importPivotProfile();
      expect(typeof pivotProfile).toBe('function');
    });

    it('function name is pivotProfile', () => {
      const pivotProfile = importPivotProfile();
      expect(pivotProfile.name).toBe('pivotProfile');
    });
  });

  describe('Delegation tests', () => {
    function writeOpencodeJson() {
      const opencode = {
        $schema: 'https://opencode.ai/schema.json',
        agent: {
          'gsd-planner': {
            model: 'bailian-coding-plan/qwen3.5-plus',
            tools: ['*']
          },
          'gsd-executor': {
            model: 'bailian-coding-plan/qwen3.5-plus',
            tools: ['*']
          }
        }
      };
      fs.writeFileSync(opencodePath, JSON.stringify(opencode, null, 2) + '\n', 'utf8');
    }

    beforeEach(() => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG, null, 2) + '\n', 'utf8');
      writeOpencodeJson();
    });

    it('pivotProfile delegates to setProfilePhase16', () => {
      const pivotProfile = importPivotProfile();
      
      try {
        pivotProfile(testDir, ['smart']);
      } catch (err) {
        // Expected to throw due to process.exit mock
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('smart');
    });

    it('pivotProfile accepts cwd and args parameters', () => {
      const pivotProfile = importPivotProfile();
      
      // Should not throw except for process.exit mock
      try {
        pivotProfile(testDir, ['smart']);
      } catch (err) {
        // Expected - only process.exit should throw
        expect(err.message).toContain('process.exit');
      }
    });

    it('pivotProfile passes arguments through unchanged', () => {
      const pivotProfile = importPivotProfile();
      
      try {
        pivotProfile(testDir, ['genius']);
      } catch (err) {
        // Expected
      }

      const output = JSON.parse(capturedLog);
      expect(output.data.profile).toBe('genius');
    });

    it('pivotProfile returns same output structure as setProfilePhase16', () => {
      const pivotProfile = importPivotProfile();
      
      try {
        pivotProfile(testDir, ['simple']);
      } catch (err) {
        // Expected
      }

      const output = JSON.parse(capturedLog);
      expect(output).toHaveProperty('success', true);
      expect(output.data).toHaveProperty('profile');
      expect(output.data).toHaveProperty('models');
      expect(output.data.models).toHaveProperty('planning');
      expect(output.data.models).toHaveProperty('execution');
      expect(output.data.models).toHaveProperty('verification');
    });

    it('pivotProfile handles --dry-run flag', () => {
      const pivotProfile = importPivotProfile();
      
      try {
        pivotProfile(testDir, ['--dry-run', 'genius']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.dryRun).toBe(true);
    });

    it('pivotProfile returns error for invalid profile', () => {
      const pivotProfile = importPivotProfile();
      
      try {
        pivotProfile(testDir, ['nonexistent']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const error = JSON.parse(capturedError);
      expect(error.error.code).toBe('PROFILE_NOT_FOUND');
    });

    it('pivotProfile works in Mode 1 (no profile name)', () => {
      const configWithCurrent = {
        ...VALID_CONFIG,
        current_oc_profile: 'smart'
      };
      fs.writeFileSync(configPath, JSON.stringify(configWithCurrent, null, 2) + '\n', 'utf8');

      const pivotProfile = importPivotProfile();
      
      try {
        pivotProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('smart');
    });

    it('pivotProfile handles inline profile creation (Mode 3)', () => {
      const pivotProfile = importPivotProfile();
      const profileDef = 'test:{"planning":"bailian-coding-plan/qwen3.5-plus","execution":"bailian-coding-plan/qwen3.5-plus","verification":"bailian-coding-plan/qwen3.5-plus"}';
      
      try {
        pivotProfile(testDir, [profileDef]);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('test');

      // Verify profile was added to config
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(updatedConfig.profiles.presets.test).toBeDefined();
      expect(updatedConfig.current_oc_profile).toBe('test');
    });
  });

  describe('Integration with gsd-oc-tools.cjs', () => {
    it('pivot-profile module can be imported', () => {
      const pivotProfile = importPivotProfile();
      expect(typeof pivotProfile).toBe('function');
    });
  });
});
