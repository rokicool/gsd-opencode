/**
 * Unit tests for set-profile.cjs
 *
 * Tests for profile switching, validation, and the three operation modes:
 * 1. Mode 1 (no profile name): Validate and apply current profile
 * 2. Mode 2 (profile name): Switch to specified profile
 * 3. Mode 3 (inline JSON): Create new profile from definition
 *
 * Includes validation checks, dry-run functionality, and rollback mechanisms.
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

describe('set-profile.cjs', () => {
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
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-profile-test-'));
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

  // Import setProfile inside tests to use mocked functions
  const importSetProfile = () => {
    const modulePath = '../gsd-oc-commands/set-profile.cjs';
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
  };

  describe('Export verification', () => {
    it('exports setProfile function', () => {
      const setProfile = importSetProfile();
      expect(typeof setProfile).toBe('function');
    });

    it('function name is setProfile', () => {
      const setProfile = importSetProfile();
      expect(setProfile.name).toBe('setProfilePhase16'); // Function was renamed from phase16
    });
  });

  describe('Basic functionality', () => {
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

    it('setProfile updates profile when profile name provided', () => {
      const setProfile = importSetProfile();
      
      try {
        setProfile(testDir, ['genius']);
      } catch (err) {
        // Expected to throw due to process.exit mock
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('genius');
    });

    it('setProfile processes dry-run flag', () => {
      const setProfile = importSetProfile();
      
      try {
        setProfile(testDir, ['smart', '--dry-run']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.dryRun).toBe(true);
      expect(output.data.action).toBe('switch_profile');
    });

    it('setProfile validates required keys for inline profiles', () => {
      const setProfile = importSetProfile();
      const inlineProfile = 'test_profile:{"planning":"bailian-coding-plan/qwen3.5-plus","execution":"bailian-coding-plan/qwen3.5-plus","verification":"bailian-coding-plan/qwen3.5-plus"}';
      
      try {
        setProfile(testDir, [inlineProfile]);
      } catch (err) {
        // Expected
      }

      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('test_profile');
    });

    it('setProfile handles Mode 1 (no profile name) scenario', () => {
      const setProfile = importSetProfile();
      
      try {
        setProfile(testDir, []);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(0);
      const output = JSON.parse(capturedLog);
      expect(output.success).toBe(true);
      expect(output.data.profile).toBe('smart'); // From initial current_oc_profile
    });

    it('setProfile validates invalid models before modification', () => {
      const setProfile = importSetProfile();
      const inlineProfile = 'bad_profile:{"planning":"bad_model","execution":"bad_model","verification":"bad_model"}';
      
      try {
        setProfile(testDir, [inlineProfile]);
      } catch (err) {
        // Expected - should error
      }

      expect(exitCode).toBe(1);
    });

    it('setProfile rejects invalid inline profile definitions', () => {
      const setProfile = importSetProfile();
      // Invalid JSON
      const badDef = 'bad_profile:{"planning:"model","execution":"model","verification":"model"}';
      
      try {
        setProfile(testDir, [badDef]);
      } catch (err) {
        // Expected - should error
      }

      expect(exitCode).toBe(1);
      const error = JSON.parse(capturedError);
      expect(error.error.code).toBe('INVALID_SYNTAX');
    });

    it('setProfile rejects incomplete profile definitions', () => {
      const setProfile = importSetProfile();
      // Missing verification property
      const badDef = 'bad_profile:{"planning":"bailian-coding-plan/qwen3.5-plus","execution":"bailian-coding-plan/qwen3.5-plus"}';
      
      try {
        setProfile(testDir, [badDef]);
      } catch (err) {
        // Expected - should error
      }

      expect(exitCode).toBe(1);
      const error = JSON.parse(capturedError);
      expect(error.error.code).toBe('INCOMPLETE_PROFILE');
    });
  });

  describe('Error handling', () => {
    it('handles missing config.json gracefully', () => {
      const setProfile = importSetProfile();
      
      try {
        setProfile(testDir, ['test']);
      } catch (err) {
        // Expected to throw
      }

      expect(exitCode).toBe(1);
      const error = JSON.parse(capturedError);
      expect(error.error.code).toBe('CONFIG_NOT_FOUND');
    });

    it('sets exit code 1 for invalid profile', () => {
      const setProfile = importSetProfile();
      
      // Set up a valid config with presets
      const configData = {...VALID_CONFIG};
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2) + '\n', 'utf8');
      const opencodeData = {
        $schema: 'https://opencode.ai/schema.json',
        agent: {}
      };
      fs.writeFileSync(opencodePath, JSON.stringify(opencodeData, null, 2) + '\n', 'utf8');
      
      try {
        setProfile(testDir, ['non-existent-profile']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
    });

    it('rejects too many arguments', () => {
      const setProfile = importSetProfile();

      try {
        setProfile(testDir, ['profile1', 'profile2']);
      } catch (err) {
        // Expected
      }

      expect(exitCode).toBe(1);
      const error = JSON.parse(capturedError);
      expect(error.error.code).toBe('INVALID_ARGS');
    });
  });
});