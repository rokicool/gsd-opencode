/**
 * NPM Registry query utility for fetching package version information.
 *
 * Provides a clean abstraction for querying npm registry versions, supporting
 * both public packages (gsd-opencode) and scoped packages (@rokicool/gsd-opencode).
 * This utility is the foundation for the update command's version checking capabilities.
 *
 * @module npm-registry
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Valid npm package name pattern.
 * Supports scoped packages like @scope/name and regular packages.
 * @type {RegExp}
 */
const VALID_PACKAGE_NAME = /^(?:@([^/]+)\/)?([^/]+)$/;

/**
 * Utility class for querying npm registry version information.
 *
 * @example
 * const npm = new NpmRegistry();
 * const version = await npm.getLatestVersion('gsd-opencode');
 * const allVersions = await npm.getAllVersions('@rokicool/gsd-opencode');
 */
export class NpmRegistry {
  /**
   * Creates a new NpmRegistry instance.
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.logger] - Logger instance for output (defaults to console)
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Validates a package name to prevent command injection.
   *
   * @param {string} packageName - The package name to validate
   * @returns {boolean} True if valid, false otherwise
   * @private
   */
  _validatePackageName(packageName) {
    if (!packageName || typeof packageName !== 'string') {
      return false;
    }
    return VALID_PACKAGE_NAME.test(packageName);
  }

  /**
   * Escapes a package name for safe use in shell commands.
   *
   * @param {string} packageName - The package name to escape
   * @returns {string} Escaped package name
   * @private
   */
  _escapePackageName(packageName) {
    // Replace any potentially dangerous characters
    return packageName.replace(/[^a-zA-Z0-9@._/-]/g, '');
  }

  /**
   * Gets the latest version of a package from npm registry.
   *
   * @param {string} packageName - The package name (e.g., 'gsd-opencode' or '@rokicool/gsd-opencode')
   * @returns {Promise<string|null>} The latest version string (e.g., '1.9.2') or null on error
   * @example
   * const npm = new NpmRegistry();
   * const version = await npm.getLatestVersion('gsd-opencode');
   * console.log(version); // '1.9.2'
   */
  async getLatestVersion(packageName) {
    if (!this._validatePackageName(packageName)) {
      this.logger.error(`Invalid package name: ${packageName}`);
      return null;
    }

    const escapedName = this._escapePackageName(packageName);

    try {
      const { stdout } = await execAsync(`npm view ${escapedName} version`);
      const version = stdout.trim();
      return version;
    } catch (error) {
      this._handleError('getLatestVersion', packageName, error);
      return null;
    }
  }

  /**
   * Gets all available versions of a package from npm registry.
   *
   * @param {string} packageName - The package name (e.g., 'gsd-opencode' or '@rokicool/gsd-opencode')
   * @returns {Promise<string[]>} Array of version strings sorted newest first, empty array on error
   * @example
   * const npm = new NpmRegistry();
   * const versions = await npm.getAllVersions('gsd-opencode');
   * console.log(versions); // ['1.9.2', '1.9.1', '1.9.0', ...]
   */
  async getAllVersions(packageName) {
    if (!this._validatePackageName(packageName)) {
      this.logger.error(`Invalid package name: ${packageName}`);
      return [];
    }

    const escapedName = this._escapePackageName(packageName);

    try {
      const { stdout } = await execAsync(`npm view ${escapedName} versions --json`);
      const versions = JSON.parse(stdout);

      if (!Array.isArray(versions)) {
        this.logger.error(`Unexpected response format for ${packageName}`);
        return [];
      }

      // Sort versions newest first using compareVersions
      return versions.sort((a, b) => -this.compareVersions(a, b));
    } catch (error) {
      this._handleError('getAllVersions', packageName, error);
      return [];
    }
  }

  /**
   * Checks if a specific version of a package exists in npm registry.
   *
   * @param {string} packageName - The package name
   * @param {string} version - The version to check (e.g., '1.9.2')
   * @returns {Promise<boolean>} True if the version exists, false otherwise
   * @example
   * const npm = new NpmRegistry();
   * const exists = await npm.versionExists('gsd-opencode', '1.9.2');
   * console.log(exists); // true
   */
  async versionExists(packageName, version) {
    if (!this._validatePackageName(packageName)) {
      this.logger.error(`Invalid package name: ${packageName}`);
      return false;
    }

    if (!version || typeof version !== 'string') {
      this.logger.error(`Invalid version: ${version}`);
      return false;
    }

    const escapedName = this._escapePackageName(packageName);
    const escapedVersion = version.replace(/[^0-9.a-zA-Z-]/g, '');

    try {
      // Try to view the specific version - if it exists, npm returns the version
      await execAsync(`npm view ${escapedName}@${escapedVersion} version`);
      return true;
    } catch (error) {
      // Version doesn't exist or other error
      return false;
    }
  }

  /**
   * Compares two semantic version strings.
   *
   * Supports standard semver (e.g., '1.9.2') and pre-release versions
   * (e.g., '1.9.2-dev-8a05'). Pre-release versions are considered
   * lower than their release counterparts.
   *
   * @param {string} v1 - First version string
   * @param {string} v2 - Second version string
   * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   * @example
   * const npm = new NpmRegistry();
   * npm.compareVersions('1.9.2', '1.9.1'); // 1
   * npm.compareVersions('1.9.2-dev-8a05', '1.9.2'); // -1
   * npm.compareVersions('1.9.2', '1.9.2'); // 0
   */
  compareVersions(v1, v2) {
    if (!v1 || !v2) {
      return 0;
    }

    // Parse version strings into components
    const parseVersion = (v) => {
      // Remove 'v' prefix if present
      const clean = v.replace(/^v/, '');

      // Split into main version and pre-release parts
      const [main, prerelease] = clean.split('-');
      const parts = main.split('.').map(Number);

      return {
        parts: parts.length >= 3 ? parts : [...parts, 0, 0, 0].slice(0, 3),
        prerelease: prerelease || null,
        hasPrerelease: !!prerelease
      };
    };

    const v1Parsed = parseVersion(v1);
    const v2Parsed = parseVersion(v2);

    // Compare main version parts
    for (let i = 0; i < 3; i++) {
      const p1 = v1Parsed.parts[i] || 0;
      const p2 = v2Parsed.parts[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    // Main versions are equal, check pre-release status
    // A version without pre-release is greater than one with pre-release
    if (!v1Parsed.hasPrerelease && v2Parsed.hasPrerelease) return 1;
    if (v1Parsed.hasPrerelease && !v2Parsed.hasPrerelease) return -1;

    // Both have pre-release, compare lexicographically
    if (v1Parsed.hasPrerelease && v2Parsed.hasPrerelease) {
      if (v1Parsed.prerelease > v2Parsed.prerelease) return 1;
      if (v1Parsed.prerelease < v2Parsed.prerelease) return -1;
    }

    return 0;
  }

  /**
   * Handles errors from npm commands with appropriate logging.
   *
   * @param {string} operation - The operation that failed
   * @param {string} packageName - The package being queried
   * @param {Error} error - The error object
   * @private
   */
  _handleError(operation, packageName, error) {
    const errorMessage = error.message || '';

    if (errorMessage.includes('E404') || errorMessage.includes('not found')) {
      this.logger.error(`Package not found: ${packageName}`);
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
      this.logger.error(`Network error: Unable to reach npm registry`);
    } else if (errorMessage.includes('npm ERR!') && errorMessage.includes('not in the npm registry')) {
      this.logger.error(`Package not in npm registry: ${packageName}`);
    } else {
      this.logger.error(`Failed to ${operation} for ${packageName}: ${errorMessage}`);
    }
  }
}

/**
 * Default export of NpmRegistry class.
 * @type {typeof NpmRegistry}
 */
export default NpmRegistry;
