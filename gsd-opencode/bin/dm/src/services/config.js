/**
 * Configuration manager for GSD-OpenCode installation state.
 *
 * This module provides persistent configuration management through the VERSION
 * file, tracking installed versions and providing comprehensive installation
 * information. Works in conjunction with ScopeManager to handle different
 * installation scopes.
 *
 * All file operations are async and include proper error handling for common
 * filesystem issues like permission errors and missing files.
 *
 * @module config
 */

import fs from 'fs/promises';
import path from 'path';
import { VERSION_FILE } from '../../lib/constants.js';
import { ScopeManager } from './scope-manager.js';

/**
 * Manages configuration persistence and installation state.
 *
 * This class handles reading and writing the VERSION file, which tracks the
 * installed version of GSD-OpenCode. It delegates path resolution to a
 * ScopeManager instance, allowing it to work with both global and local
 * installations seamlessly.
 *
 * @class ConfigManager
 * @example
 * const scope = new ScopeManager({ scope: 'global' });
 * const config = new ConfigManager(scope);
 *
 * // Check installation status
 * const info = await config.getInstallationInfo();
 * console.log(info.installed);  // true/false
 * console.log(info.version);    // '1.0.0' or null
 * console.log(info.location);   // '/home/user/.config/opencode'
 * console.log(info.scope);      // 'global'
 *
 * // Set version during installation
 * await config.setVersion('1.0.0');
 */
export class ConfigManager {
  /**
   * Creates a new ConfigManager instance.
   *
   * @param {ScopeManager} scopeManager - ScopeManager instance for path resolution
   * @throws {Error} If scopeManager is not provided or invalid
   *
   * @example
   * const scope = new ScopeManager({ scope: 'global' });
   * const config = new ConfigManager(scope);
   */
  constructor(scopeManager) {
    if (!scopeManager) {
      throw new Error('ScopeManager instance is required');
    }

    if (typeof scopeManager.getTargetDir !== 'function') {
      throw new Error('Invalid ScopeManager: missing getTargetDir method');
    }

    this.scopeManager = scopeManager;
  }

  /**
   * Gets the target installation directory.
   *
   * Delegates to the ScopeManager's getTargetDir method.
   *
   * @returns {string} Absolute path to the installation directory
   *
   * @example
   * const config = new ConfigManager(scope);
   * config.getTargetDir(); // '/home/user/.config/opencode'
   */
  getTargetDir() {
    return this.scopeManager.getTargetDir();
  }

  /**
   * Gets the full path to the VERSION file.
   *
   * Private helper method that constructs the path to the VERSION file
   * in the target installation directory.
   *
   * @returns {string} Absolute path to VERSION file
   * @private
   *
   * @example
   * const versionPath = config._getVersionPath();
   * // Returns: '/home/user/.config/opencode/VERSION'
   */
  _getVersionPath() {
    return path.join(this.getTargetDir(), VERSION_FILE);
  }

  /**
   * Checks if GSD-OpenCode is installed.
   *
   * Async version that checks for VERSION file existence. This is the
   * preferred method for checking installation status in async contexts.
   *
   * @returns {Promise<boolean>} True if VERSION file exists
   *
   * @example
   * const config = new ConfigManager(scope);
   * if (await config.isInstalled()) {
   *   console.log('Already installed');
   * }
   */
  async isInstalled() {
    try {
      await fs.access(this._getVersionPath(), fs.constants.F_OK);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      // For other errors (permissions, etc.), assume not installed
      return false;
    }
  }

  /**
   * Reads the installed version from the VERSION file.
   *
   * Returns the version string stored in the VERSION file, or null if
   * the file doesn't exist or can't be read.
   *
   * @returns {Promise<string|null>} The installed version, or null if not installed
   *
   * @example
   * const config = new ConfigManager(scope);
   * const version = await config.getVersion();
   * if (version) {
   *   console.log(`Installed version: ${version}`);
   * } else {
   *   console.log('Not installed');
   * }
   */
  async getVersion() {
    try {
      const content = await fs.readFile(this._getVersionPath(), 'utf-8');
      return content.trim();
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      if (error.code === 'EACCES') {
        throw new Error(
          `Permission denied: Cannot read version file at ${this._getVersionPath()}. ` +
          'Check file permissions or run with appropriate privileges.'
        );
      }
      // Return null for any other error
      return null;
    }
  }

  /**
   * Writes the version to the VERSION file.
   *
   * Creates the target directory if it doesn't exist, then writes the
   * version string to the VERSION file. Handles permission errors
   * gracefully with helpful error messages.
   *
   * @param {string} version - Version string to write (e.g., '1.0.0')
   * @returns {Promise<void>}
   * @throws {Error} If directory cannot be created or file cannot be written
   *
   * @example
   * const config = new ConfigManager(scope);
   * await config.setVersion('1.0.0');
   * console.log('Version set successfully');
   */
  async setVersion(version) {
    if (!version || typeof version !== 'string') {
      throw new Error('Version must be a non-empty string');
    }

    const targetDir = this.getTargetDir();
    const versionPath = this._getVersionPath();

    try {
      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // write version file
      await fs.writeFile(versionPath, version.trim(), 'utf-8');
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(
          `Permission denied: Cannot write version file to ${targetDir}. ` +
          'Check directory permissions or run with appropriate privileges.'
        );
      }
      if (error.code === 'ENOSPC') {
        throw new Error(
          `No space left on device: Cannot write version file to ${targetDir}. ` +
          'Free up disk space and try again.'
        );
      }
      throw new Error(
        `Failed to write version file: ${error.message}`
      );
    }
  }

  /**
   * Gets comprehensive installation information.
   *
   * Returns an object containing all relevant installation details:
   * whether GSD-OpenCode is installed, the installed version, the
   * installation location, scope (global/local), and a display-friendly
   * path prefix.
   *
   * @returns {Promise<Object>} Installation information object
   * @property {boolean} installed - Whether GSD-OpenCode is installed
   * @property {string|null} version - The installed version, or null
   * @property {string} location - Absolute path to installation directory
   * @property {string} scope - 'global' or 'local'
   * @property {string} pathPrefix - Display-friendly path (e.g., '~/.config/opencode')
   *
   * @example
   * const config = new ConfigManager(scope);
   * const info = await config.getInstallationInfo();
   * console.log(info);
   * // {
   * //   installed: true,
   * //   version: '1.0.0',
   * //   location: '/home/user/.config/opencode',
   * //   scope: 'global',
   * //   pathPrefix: '~/.config/opencode'
   * // }
   */
  async getInstallationInfo() {
    const [installed, version] = await Promise.all([
      this.isInstalled(),
      this.getVersion()
    ]);

    return {
      installed,
      version,
      location: this.getTargetDir(),
      scope: this.scopeManager.getScope(),
      pathPrefix: this.scopeManager.getPathPrefix()
    };
  }
}

/**
 * Default export for the config module.
 *
 * @example
 * import { ConfigManager } from './services/config.js';
 * const config = new ConfigManager(scope);
 */
export default {
  ConfigManager
};
