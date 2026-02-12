/**
 * Structure detector for identifying GSD-OpenCode directory layout.
 *
 * This module provides detection and analysis of the command directory structure,
 * supporting both legacy (command/gsd/) and new (commands/gsd/) layouts.
 * Used during installation, update, and health checks to determine the correct
 * structure and handle migration scenarios.
 *
 * @module structure-detector
 */

import fs from 'fs/promises';
import path from 'path';
import { OLD_COMMAND_DIR, NEW_COMMAND_DIR, STRUCTURE_TYPES } from '../../lib/constants.js';

/**
 * Detects and analyzes GSD-OpenCode directory structure.
 *
 * This class provides methods to determine which command directory structure
 * exists at a given installation path: legacy (command/gsd/), new (commands/gsd/),
 * both (dual/migration state), or neither (fresh install).
 *
 * @class StructureDetector
 * @example
 * const detector = new StructureDetector('/home/user/.config/opencode');
 * const structure = await detector.detect();
 * console.log(structure); // 'old', 'new', 'dual', or 'none'
 */
export class StructureDetector {
  /**
   * Creates a new StructureDetector instance.
   *
   * @param {string} installPath - Path to the GSD-OpenCode installation directory
   * @throws {Error} If installPath is not provided
   *
   * @example
   * // Detect structure in global installation
   * const detector = new StructureDetector('/home/user/.config/opencode');
   *
   * // Detect structure in local installation
   * const detector = new StructureDetector('/project/.opencode');
   */
  constructor(installPath) {
    if (!installPath) {
      throw new Error('installPath is required');
    }

    this.installPath = installPath;
  }

  /**
   * Detects the directory structure at the installation path.
   *
   * Checks for the existence of both old (command/gsd/) and new (commands/gsd/)
   * directory structures and returns the appropriate STRUCTURE_TYPES value.
   *
   * @returns {Promise<string>} One of STRUCTURE_TYPES values:
   *   - 'old': Only legacy structure exists (command/gsd/)
   *   - 'new': Only new structure exists (commands/gsd/)
   *   - 'dual': Both structures exist (migration in progress)
   *   - 'none': Neither structure exists (fresh install or not installed)
   *
   * @example
   * const detector = new StructureDetector('/home/user/.config/opencode');
   *
   * // Returns 'old' if only command/gsd/ exists
   * // Returns 'new' if only commands/gsd/ exists
   * // Returns 'dual' if both exist
   * // Returns 'none' if neither exists
   * const structure = await detector.detect();
   */
  async detect() {
    const oldPath = path.join(this.installPath, OLD_COMMAND_DIR, 'gsd');
    const newPath = path.join(this.installPath, NEW_COMMAND_DIR, 'gsd');

    const [oldExists, newExists] = await Promise.all([
      this._pathExists(oldPath),
      this._pathExists(newPath)
    ]);

    if (oldExists && newExists) return STRUCTURE_TYPES.DUAL;
    if (newExists) return STRUCTURE_TYPES.NEW;
    if (oldExists) return STRUCTURE_TYPES.OLD;
    return STRUCTURE_TYPES.NONE;
  }

  /**
   * Checks if a path exists on the filesystem.
   *
   * Uses fs.access() for existence checking with proper error handling.
   *
   * @private
   * @param {string} checkPath - Path to check for existence
   * @returns {Promise<boolean>} True if path exists, false otherwise
   */
  async _pathExists(checkPath) {
    try {
      await fs.access(checkPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the appropriate command directory name for a structure type.
   *
   * Returns the command directory name to use based on the detected structure.
   * For fresh installs (NONE), defaults to the new structure.
   *
   * @param {string} structureType - One of STRUCTURE_TYPES values
   * @returns {string} The command directory name:
   *   - 'commands' for NEW, DUAL, or NONE
   *   - 'command' for OLD
   *
   * @example
   * const detector = new StructureDetector('/home/user/.config/opencode');
   *
   * detector.getCommandDir('new');    // returns 'commands'
   * detector.getCommandDir('old');    // returns 'command'
   * detector.getCommandDir('dual');   // returns 'commands' (prefer new)
   * detector.getCommandDir('none');   // returns 'commands' (default for fresh)
   */
  getCommandDir(structureType) {
    switch (structureType) {
      case STRUCTURE_TYPES.NEW:
      case STRUCTURE_TYPES.DUAL:
      case STRUCTURE_TYPES.NONE:
        return NEW_COMMAND_DIR;
      case STRUCTURE_TYPES.OLD:
        return OLD_COMMAND_DIR;
      default:
        return NEW_COMMAND_DIR; // Default to new for unknown types
    }
  }

  /**
   * Gets detailed information about the structure state.
   *
   * Returns an object with detailed information about both structures,
   * useful for health checks and diagnostic output.
   *
   * @returns {Promise<Object>} Structure state details:
   *   - type: The detected structure type
   *   - oldPath: Full path to old structure
   *   - newPath: Full path to new structure
   *   - oldExists: Whether old structure exists
   *   - newExists: Whether new structure exists
   *   - recommendedAction: Suggested action based on state
   *
   * @example
   * const detector = new StructureDetector('/home/user/.config/opencode');
   * const details = await detector.getDetails();
   * // {
   * //   type: 'dual',
   * //   oldPath: '/home/user/.config/opencode/command/gsd',
   * //   newPath: '/home/user/.config/opencode/commands/gsd',
   * //   oldExists: true,
   * //   newExists: true,
   * //   recommendedAction: 'Run update to complete migration'
   * // }
   */
  async getDetails() {
    const oldPath = path.join(this.installPath, OLD_COMMAND_DIR, 'gsd');
    const newPath = path.join(this.installPath, NEW_COMMAND_DIR, 'gsd');

    const [oldExists, newExists] = await Promise.all([
      this._pathExists(oldPath),
      this._pathExists(newPath)
    ]);

    let type;
    let recommendedAction;

    if (oldExists && newExists) {
      type = STRUCTURE_TYPES.DUAL;
      recommendedAction = 'Run update to complete migration from old to new structure';
    } else if (newExists) {
      type = STRUCTURE_TYPES.NEW;
      recommendedAction = 'Structure is up to date';
    } else if (oldExists) {
      type = STRUCTURE_TYPES.OLD;
      recommendedAction = 'Run update to migrate to new structure';
    } else {
      type = STRUCTURE_TYPES.NONE;
      recommendedAction = 'Fresh installation recommended';
    }

    return {
      type,
      oldPath,
      newPath,
      oldExists,
      newExists,
      recommendedAction
    };
  }
}

/**
 * Convenience function for one-off structure detection.
 *
 * Creates a temporary StructureDetector instance and returns the detected type.
 * Use this for simple detection without needing the full class instance.
 *
 * @param {string} installPath - Path to the installation directory
 * @returns {Promise<string>} The detected structure type
 *
 * @example
 * // Quick detection without instantiating a class
 * const type = await detectStructure('/home/user/.config/opencode');
 * if (type === 'old') {
   *   console.log('Legacy structure detected, migration needed');
 * }
 */
export async function detectStructure(installPath) {
  const detector = new StructureDetector(installPath);
  return await detector.detect();
}

/**
 * Re-export of STRUCTURE_TYPES from constants for convenience.
 *
 * @type {Object.<string, string>}
 */
export { STRUCTURE_TYPES } from '../../lib/constants.js';

/**
 * Default export for the structure-detector module.
 *
 * @example
 * import { StructureDetector, detectStructure, STRUCTURE_TYPES } from './services/structure-detector.js';
 * const detector = new StructureDetector('/path/to/opencode');
 * const type = await detector.detect();
 */
export default {
  StructureDetector,
  detectStructure,
  STRUCTURE_TYPES
};
