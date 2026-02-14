/**
 * Unit tests for StructureDetector service
 *
 * Tests structure detection for old, new, dual, and none states,
 * getCommandDir helper, and getDetails diagnostic method.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StructureDetector, detectStructure, STRUCTURE_TYPES } from '../../src/services/structure-detector.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('StructureDetector', () => {
  let tempDir;
  let detector;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `structure-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    detector = new StructureDetector(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('creates instance with installPath', () => {
      expect(detector).toBeInstanceOf(StructureDetector);
      expect(detector.installPath).toBe(tempDir);
    });

    it('throws error if installPath is not provided', () => {
      expect(() => new StructureDetector()).toThrow('installPath is required');
      expect(() => new StructureDetector(null)).toThrow('installPath is required');
      expect(() => new StructureDetector('')).toThrow('installPath is required');
    });
  });

  describe('detect', () => {
    it('returns "none" when neither structure exists', async () => {
      const result = await detector.detect();
      expect(result).toBe(STRUCTURE_TYPES.NONE);
    });

    it('returns "old" when only command/gsd/ exists', async () => {
      await fs.mkdir(path.join(tempDir, 'command', 'gsd'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'command', 'gsd', 'test.md'), 'test');

      const result = await detector.detect();
      expect(result).toBe(STRUCTURE_TYPES.OLD);
    });

    it('returns "new" when only commands/gsd/ exists', async () => {
      await fs.mkdir(path.join(tempDir, 'commands', 'gsd'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'commands', 'gsd', 'test.md'), 'test');

      const result = await detector.detect();
      expect(result).toBe(STRUCTURE_TYPES.NEW);
    });

    it('returns "dual" when both structures exist', async () => {
      await fs.mkdir(path.join(tempDir, 'command', 'gsd'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'commands', 'gsd'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'command', 'gsd', 'old.md'), 'old');
      await fs.writeFile(path.join(tempDir, 'commands', 'gsd', 'new.md'), 'new');

      const result = await detector.detect();
      expect(result).toBe(STRUCTURE_TYPES.DUAL);
    });

    it('works with paths containing spaces', async () => {
      const spaceDir = path.join(os.tmpdir(), `structure test ${Date.now()}`);
      await fs.mkdir(spaceDir, { recursive: true });
      const spaceDetector = new StructureDetector(spaceDir);

      try {
        await fs.mkdir(path.join(spaceDir, 'commands', 'gsd'), { recursive: true });
        const result = await spaceDetector.detect();
        expect(result).toBe(STRUCTURE_TYPES.NEW);
      } finally {
        await fs.rm(spaceDir, { recursive: true, force: true });
      }
    });

    it('works with paths containing special characters', async () => {
      const specialDir = path.join(os.tmpdir(), `structure-test_special.${Date.now()}`);
      await fs.mkdir(specialDir, { recursive: true });
      const specialDetector = new StructureDetector(specialDir);

      try {
        await fs.mkdir(path.join(specialDir, 'command', 'gsd'), { recursive: true });
        const result = await specialDetector.detect();
        expect(result).toBe(STRUCTURE_TYPES.OLD);
      } finally {
        await fs.rm(specialDir, { recursive: true, force: true });
      }
    });
  });

  describe('getCommandDir', () => {
    it('returns "commands" for NEW structure type', () => {
      expect(detector.getCommandDir(STRUCTURE_TYPES.NEW)).toBe('commands');
    });

    it('returns "command" for OLD structure type', () => {
      expect(detector.getCommandDir(STRUCTURE_TYPES.OLD)).toBe('command');
    });

    it('returns "commands" for DUAL structure type (prefer new)', () => {
      expect(detector.getCommandDir(STRUCTURE_TYPES.DUAL)).toBe('commands');
    });

    it('returns "commands" for NONE structure type (default for fresh)', () => {
      expect(detector.getCommandDir(STRUCTURE_TYPES.NONE)).toBe('commands');
    });

    it('returns "commands" for unknown structure type (default)', () => {
      expect(detector.getCommandDir('unknown')).toBe('commands');
    });
  });

  describe('getDetails', () => {
    it('returns correct details when neither structure exists', async () => {
      const details = await detector.getDetails();

      expect(details.type).toBe(STRUCTURE_TYPES.NONE);
      expect(details.oldExists).toBe(false);
      expect(details.newExists).toBe(false);
      expect(details.oldPath).toBe(path.join(tempDir, 'command', 'gsd'));
      expect(details.newPath).toBe(path.join(tempDir, 'commands', 'gsd'));
      expect(details.recommendedAction).toContain('Fresh installation');
    });

    it('returns correct details when only old structure exists', async () => {
      await fs.mkdir(path.join(tempDir, 'command', 'gsd'), { recursive: true });

      const details = await detector.getDetails();

      expect(details.type).toBe(STRUCTURE_TYPES.OLD);
      expect(details.oldExists).toBe(true);
      expect(details.newExists).toBe(false);
      expect(details.recommendedAction).toContain('migrate');
    });

    it('returns correct details when only new structure exists', async () => {
      await fs.mkdir(path.join(tempDir, 'commands', 'gsd'), { recursive: true });

      const details = await detector.getDetails();

      expect(details.type).toBe(STRUCTURE_TYPES.NEW);
      expect(details.oldExists).toBe(false);
      expect(details.newExists).toBe(true);
      expect(details.recommendedAction).toContain('up to date');
    });

    it('returns correct details when both structures exist', async () => {
      await fs.mkdir(path.join(tempDir, 'command', 'gsd'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'commands', 'gsd'), { recursive: true });

      const details = await detector.getDetails();

      expect(details.type).toBe(STRUCTURE_TYPES.DUAL);
      expect(details.oldExists).toBe(true);
      expect(details.newExists).toBe(true);
      expect(details.recommendedAction).toContain('migration');
    });
  });

  describe('detectStructure convenience function', () => {
    it('returns structure type for given path', async () => {
      await fs.mkdir(path.join(tempDir, 'commands', 'gsd'), { recursive: true });

      const result = await detectStructure(tempDir);
      expect(result).toBe(STRUCTURE_TYPES.NEW);
    });

    it('returns "none" for path without structure', async () => {
      const result = await detectStructure(tempDir);
      expect(result).toBe(STRUCTURE_TYPES.NONE);
    });
  });

  describe('STRUCTURE_TYPES constants', () => {
    it('has correct constant values', () => {
      expect(STRUCTURE_TYPES.OLD).toBe('old');
      expect(STRUCTURE_TYPES.NEW).toBe('new');
      expect(STRUCTURE_TYPES.DUAL).toBe('dual');
      expect(STRUCTURE_TYPES.NONE).toBe('none');
    });
  });
});
