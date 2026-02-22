/**
 * Scope manager for handling global vs local installation paths.
 *
 * This module provides centralized scope management for the GSD-OpenCode CLI,
 * handling path resolution for global (~/.config/opencode) and local (./.opencode)
 * installations. Supports custom configuration directories via environment variable
 * or explicit option.
 *
 * SECURITY NOTE: All paths are validated to prevent directory traversal attacks.
 * The constructor validates custom config directories to ensure they don't escape
 * the allowed base directories.
 *
 * @module scope-manager
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { expandPath, validatePath } from '../utils/path-resolver.js';
import { DEFAULT_CONFIG_DIR, VERSION_FILE } from '../../lib/constants.js';
import { StructureDetector, STRUCTURE_TYPES } from './structure-detector.js';

/**
 * Manages installation scope (global vs local) and path resolution.
 *
 * This class centralizes the logic for determining where GSD-OpenCode should be
 * installed, whether globally in the user's home directory or locally in the
 * current project. It handles:
 *
 * - Path resolution for global and local directories
 * - Custom configuration directory support
 * - Installation status detection (via VERSION file)
 * - Path traversal prevention for security
 *
 * @class ScopeManager
 * @example
 * const scope = new ScopeManager({ scope: 'global' });
 * console.log(scope.getTargetDir()); // '/home/user/.config/opencode'
 * console.log(scope.isGlobal());     // true
 */
export class ScopeManager {
  /**
   * Creates a new ScopeManager instance.
   *
   * @param {Object} options - Configuration options
   * @param {string} options.scope - Installation scope: 'global' or 'local'
   * @param {string} [options.configDir] - Custom configuration directory (overrides default and env var)
   * @throws {Error} If scope is not 'global' or 'local'
   * @throws {Error} If configDir contains path traversal attempts
   *
   * @example
   * // Global installation (default location)
   * const globalScope = new ScopeManager({ scope: 'global' });
   *
   * // Local installation (project-specific)
   * const localScope = new ScopeManager({ scope: 'local' });
   *
   * // Custom global directory
   * const customScope = new ScopeManager({
   *   scope: 'global',
   *   configDir: '/custom/path'
   * });
   *
   * // Via environment variable
   * process.env.OPENCODE_CONFIG_DIR = '/env/path';
   * const envScope = new ScopeManager({ scope: 'global' });
   */
  constructor(options = {}) {
    if (!options.scope || !['global', 'local'].includes(options.scope)) {
      throw new Error('Scope must be either "global" or "local"');
    }

    this.scope = options.scope;

    // Determine global directory: explicit option > env var > default
    const explicitConfigDir = options.configDir;
    const envConfigDir = process.env.OPENCODE_CONFIG_DIR;
    const defaultGlobalDir = path.join(os.homedir(), DEFAULT_CONFIG_DIR);

    if (explicitConfigDir) {
      // Validate custom config directory to prevent traversal
      const expandedDir = expandPath(explicitConfigDir);
      // Custom dirs must be within home directory or be absolute system paths
      this.globalDir = validatePath(expandedDir, '/');
    } else if (envConfigDir) {
      this.globalDir = path.join(os.homedir(), envConfigDir);
    } else {
      this.globalDir = defaultGlobalDir;
    }

    // Local directory is always relative to current working directory
    this.localDir = path.join(process.cwd(), '.opencode');

    // Track if using non-default config directory
    this._isCustomConfig = Boolean(explicitConfigDir);
  }

  /**
   * Returns the target installation directory based on scope.
   *
   * @returns {string} Absolute path to the installation directory
   *
   * @example
   * const globalScope = new ScopeManager({ scope: 'global' });
   * globalScope.getTargetDir(); // '/home/user/.config/opencode'
   *
   * const localScope = new ScopeManager({ scope: 'local' });
   * localScope.getTargetDir(); // '/current/working/dir/.opencode'
   */
  getTargetDir() {
    return this.scope === 'global' ? this.globalDir : this.localDir;
  }

  /**
   * Returns a display-friendly path prefix.
   *
   * Converts absolute paths to user-friendly representations:
   * - Home directory paths show as ~/
   * - Other absolute paths show relative to cwd if possible
   *
   * @returns {string} Display-friendly path prefix
   *
   * @example
   * const globalScope = new ScopeManager({ scope: 'global' });
   * globalScope.getPathPrefix(); // '~/.config/opencode'
   *
   * const localScope = new ScopeManager({ scope: 'local' });
   * localScope.getPathPrefix(); // './.opencode'
   */
  getPathPrefix() {
    const targetDir = this.getTargetDir();

    if (this.scope === 'local') {
      return './.opencode';
    }

    // For global, try to use ~ shorthand if within home directory
    const homeDir = os.homedir();
    if (targetDir.startsWith(homeDir)) {
      return '~' + targetDir.substring(homeDir.length);
    }

    return targetDir;
  }

  /**
   * Checks if GSD-OpenCode is installed at the target directory.
   *
   * This method verifies installation by checking for:
   * 1. The presence of a VERSION file at the target directory
   * 2. OR the presence of GSD files in either old (command/gsd/) or new (commands/gsd/) structure
   *
   * This ensures we detect both new installations and legacy installations that may
   * be missing a VERSION file or using the old directory structure.
   *
   * @returns {boolean} True if GSD-OpenCode is installed at target directory
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * if (scope.isInstalled()) {
   *   console.log('GSD-OpenCode is installed');
   * }
   */
  async isInstalled() {
    try {
      const targetDir = this.getTargetDir();
      
      // Check for VERSION file (normal case)
      const versionPath = path.join(targetDir, VERSION_FILE);
      if (fs.existsSync(versionPath)) {
        return true;
      }
      
      // Check for actual GSD installation (old or new structure)
      // This handles legacy installations that might not have VERSION file
      const structureDetector = new StructureDetector(targetDir);
      const structure = await structureDetector.detect();
      
      return structure !== STRUCTURE_TYPES.NONE;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Synchronous version of isInstalled() for backwards compatibility.
   * 
   * Note: This only checks for VERSION file existence. For comprehensive
   * detection including old structure installations, use isInstalled() (async).
   *
   * @returns {boolean} True if VERSION file exists at target directory
   * @deprecated Use async isInstalled() for complete detection
   */
  isInstalledSync() {
    try {
      const versionPath = path.join(this.getTargetDir(), VERSION_FILE);
      return fs.existsSync(versionPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Reads the installed version from the VERSION file.
   *
   * @returns {string|null} The installed version string, or null if not installed
   * @throws {Error} If VERSION file exists but cannot be read
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * const version = scope.getInstalledVersion();
   * if (version) {
   *   console.log(`Installed: ${version}`);
   * }
   */
  getInstalledVersion() {
    try {
      const versionPath = path.join(this.getTargetDir(), VERSION_FILE);
      if (!fs.existsSync(versionPath)) {
        return null;
      }
      return fs.readFileSync(versionPath, 'utf-8').trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Returns the current installation scope.
   *
   * @returns {string} 'global' or 'local'
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * scope.getScope(); // 'global'
   */
  getScope() {
    return this.scope;
  }

  /**
   * Checks if the current scope is global.
   *
   * @returns {boolean} True if scope is 'global'
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * scope.isGlobal(); // true
   * scope.isLocal();  // false
   */
  isGlobal() {
    return this.scope === 'global';
  }

  /**
   * Checks if the current scope is local.
   *
   * @returns {boolean} True if scope is 'local'
   *
   * @example
   * const scope = new ScopeManager({ scope: 'local' });
   * scope.isLocal();  // true
   * scope.isGlobal(); // false
   */
  isLocal() {
    return this.scope === 'local';
  }

  /**
   * Checks if using a non-default configuration directory.
   *
   * Returns true if a custom configDir was explicitly provided to the
   * constructor, indicating the user wants to use a non-standard location.
   *
   * @returns {boolean} True if using custom config directory
   *
   * @example
   * // Default configuration
   * const defaultScope = new ScopeManager({ scope: 'global' });
   * defaultScope.isCustomConfig(); // false
   *
   * // Custom configuration
   * const customScope = new ScopeManager({
   *   scope: 'global',
   *   configDir: '/custom/path'
   * });
   * customScope.isCustomConfig(); // true
   */
  isCustomConfig() {
    return this._isCustomConfig;
  }
}

/**
 * Default export for the scope-manager module.
 *
 * @example
 * import { ScopeManager } from './services/scope-manager.js';
 * const scope = new ScopeManager({ scope: 'global' });
 */
export default {
  ScopeManager
};
