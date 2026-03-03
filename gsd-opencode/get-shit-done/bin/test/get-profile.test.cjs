/**
 * Unit tests for get-profile.cjs command
 *
 * Tests for both operation modes:
 * - Mode 1: No parameters (get current profile)
 * - Mode 2: Profile name parameter (get specific profile)
 *
 * Also tests --raw and --verbose flags, and error handling
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
const VALID_CONFIG_WITH_CURRENT = {
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

const VALID_CONFIG_WITHOUT_CURRENT = {
  profiles: {
    presets: {
      simple: {
        planning: 'bailian-coding-plan/qwen3.5-plus',
        execution: 'bailian-coding-plan/qwen3.5-plus',
        verification: 'bailian-coding-plan/qwen3.5-plus'
      }
    }
  }
};

const VALID_CONFIG_INCOMPLETE_PROFILE = {
  current_oc_profile: 'broken',
  profiles: {
    presets: {
      broken: {
        planning: 'bailian-coding-plan/qwen3.5-plus'
        // missing execution and verification
      }
    }
  }
};

describe('get-profile.cjs', () => {
  let testDir;
  let planningDir;
  let configPath;
  let capturedLog;
  let capturedError;
  let exitCode;
  let allLogs;
  let allErrors;

  beforeEach(() => {
    // Create isolated test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-profile-test-'));
    planningDir = path.join(testDir, '.planning');
    configPath = path.join(planningDir, 'oc_config.json');
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

  // Import getProfile inside tests to use mocked functions
  const importGetProfile = () => {
    // Need to clear cache to get fresh import with mocked dependencies
    const modulePath = '../gsd-oc-commands/get-profile.cjs';
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
  };

  describe('Mode 1: No parameters (get current profile)', () => {
    it('returns current profile when current_oc_profile is set', () => {
      // Write config with current_oc_profile
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, []);
      } catch (err) {
        // Expected to throw due to process.exit mock
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data).toHaveProperty('smart');
      expect(output.data.smart).toEqual(VALID_CONFIG_WITH_CURRENT.profiles.presets.smart);
    });

    it('returns MISSING_CURRENT_PROFILE error when current_oc_profile not set', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITHOUT_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error.code).toBe('MISSING_CURRENT_PROFILE');
      expect(output.error.message).toContain('current_oc_profile not set');
    });

    it('returns PROFILE_NOT_FOUND when current profile does not exist', () => {
      const configWithMissingProfile = {
        current_oc_profile: 'nonexistent',
        profiles: {
          presets: {
            smart: {
              planning: 'bailian-coding-plan/qwen3.5-plus',
              execution: 'bailian-coding-plan/qwen3.5-plus',
              verification: 'bailian-coding-plan/qwen3.5-plus'
            }
          }
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(configWithMissingProfile, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error.code).toBe('PROFILE_NOT_FOUND');
      expect(output.error.message).toContain('nonexistent');
      expect(output.error.message).toContain('smart');
    });
  });

  describe('Mode 2: Profile name parameter (get specific profile)', () => {
    it('returns specified profile when it exists', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['genius']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data).toHaveProperty('genius');
      expect(output.data.genius).toEqual(VALID_CONFIG_WITH_CURRENT.profiles.presets.genius);
    });

    it('works even when current_oc_profile is not set', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITHOUT_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['simple']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data).toHaveProperty('simple');
      expect(output.data.simple).toEqual(VALID_CONFIG_WITHOUT_CURRENT.profiles.presets.simple);
    });

    it('returns PROFILE_NOT_FOUND with available profiles when profile does not exist', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['nonexistent']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error.code).toBe('PROFILE_NOT_FOUND');
      expect(output.error.message).toContain('nonexistent');
      expect(output.error.message).toContain('simple');
      expect(output.error.message).toContain('smart');
      expect(output.error.message).toContain('genius');
    });
  });

  describe('--raw flag', () => {
    it('outputs raw JSON without envelope in Mode 1', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['--raw']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      // capturedLog is already a string from JSON.stringify
      const output = JSON.parse(capturedLog);
      // Raw output should NOT have success/data envelope
      expect(output).not.toHaveProperty('success');
      expect(output).toHaveProperty('smart');
    });

    it('outputs raw JSON without envelope in Mode 2', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['genius', '--raw']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output).not.toHaveProperty('success');
      expect(output).toHaveProperty('genius');
    });
  });

  describe('--verbose flag', () => {
    it('outputs diagnostic info to stderr in Mode 1', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['--verbose']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      expect(allErrors.length).toBeGreaterThan(0);
      // Check if any error message contains the expected content
      const hasVerboseOutput = allErrors.some(msg => msg.includes('[get-profile]'));
      expect(hasVerboseOutput).toBe(true);
    });

    it('outputs diagnostic info to stderr in Mode 2', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['genius', '--verbose']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      // Verbose output is sent to console.error, check if any errors were logged
      expect(allErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error format', () => {
    it('uses structured JSON error format for CONFIG_NOT_FOUND', () => {
      // Don't create config file
      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error).toHaveProperty('code');
      expect(output.error).toHaveProperty('message');
      expect(output.error.code).toBe('CONFIG_NOT_FOUND');
    });

    it('uses structured JSON error format for INVALID_JSON', () => {
      fs.writeFileSync(configPath, 'invalid json {');

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error.code).toBe('INVALID_JSON');
    });

    it('provides descriptive error messages', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITHOUT_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.error.message).toContain('current_oc_profile');
      expect(output.error.message).toContain('Run set-profile first');
    });
  });

  describe('Output format', () => {
    it('returns profile definition as {profileName: {planning, execution, verification}}', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['smart']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.data).toHaveProperty('smart');
      expect(output.data.smart).toHaveProperty('planning');
      expect(output.data.smart).toHaveProperty('execution');
      expect(output.data.smart).toHaveProperty('verification');
    });
  });

  describe('Error handling', () => {
    it('handles missing .planning directory', () => {
      const badTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-profile-test-'));
      // Don't create .planning directory

      const getProfile = importGetProfile();
      
      try {
        getProfile(badTestDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error.code).toBe('CONFIG_NOT_FOUND');

      fs.rmSync(badTestDir, { recursive: true, force: true });
    });

    it('handles too many arguments', () => {
      fs.writeFileSync(configPath, JSON.stringify(VALID_CONFIG_WITH_CURRENT, null, 2));

      const getProfile = importGetProfile();
      
      try {
        getProfile(testDir, ['smart', 'genius']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const output = JSON.parse(capturedError);
      expect(output.success).toBe(false);
      expect(output.error.code).toBe('INVALID_ARGS');
      expect(output.error.message).toContain('Too many arguments');
    });
  });
});
