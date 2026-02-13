/**
 * Manifest manager service for tracking installed files.
 *
 * This module provides safe tracking of all files installed by gsd-opencode,
 * with strict namespace protection to ensure ONLY files in allowed namespaces
 * are eligible for deletion during uninstall.
 *
 * Safety Principles:
 * - Track ALL files touched during installation (complete audit trail)
 * - Only allow deletion of files in allowed namespaces (gsd-*)
 * - Never delete files outside allowed namespaces even if tracked
 * - Preserve directories containing non-gsd-opencode files
 *
 * @module manifest-manager
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { MANIFEST_FILENAME, ALLOWED_NAMESPACES } from '../../lib/constants.js';

/**
 * Represents a tracked file in the manifest.
 *
 * @typedef {Object} ManifestEntry
 * @property {string} path - Full absolute path to file
 * @property {string} relativePath - Path relative to installation root
 * @property {number} size - File size in bytes
 * @property {string} hash - SHA256 hash of file content (prefixed with 'sha256:')
 */

/**
 * Manages the manifest of installed files for safe uninstallation.
 *
 * The ManifestManager tracks all files installed by gsd-opencode and provides
 * namespace-based filtering to ensure only files in allowed namespaces can be
 * removed during uninstall.
 *
 * @class ManifestManager
 * @example
 * const manifestManager = new ManifestManager('/home/user/.config/opencode');
 *
 * // Add files during installation
 * manifestManager.addFile('/home/user/.config/opencode/agents/gsd-debugger/SKILL.md', 'agents/gsd-debugger/SKILL.md', 2847, 'sha256:a1b2c3...');
 *
 * // Save manifest
 * await manifestManager.save();
 *
 * // Load existing manifest
 * const entries = await manifestManager.load();
 *
 * // Get files in allowed namespaces only
 * const safeToRemove = manifestManager.getFilesInNamespaces(ALLOWED_NAMESPACES);
 */
export class ManifestManager {
  /**
   * Creates a new ManifestManager instance.
   *
   * @param {string} installPath - Root installation directory path
   * @throws {Error} If installPath is not provided
   *
   * @example
   * const manifestManager = new ManifestManager('/home/user/.config/opencode');
   */
  constructor(installPath) {
    if (!installPath) {
      throw new Error('installPath is required');
    }

    this._installPath = installPath;
    this._manifestPath = path.join(installPath, MANIFEST_FILENAME);
    /**
     * @type {ManifestEntry[]}
     * @private
     */
    this._entries = [];
  }

  /**
   * Adds a file to the manifest.
   *
   * Records file metadata including path, size, and hash for tracking.
   * This does not write to disk - call save() to persist.
   *
   * @param {string} absolutePath - Full absolute path to the file
   * @param {string} relativePath - Path relative to installation root
   * @param {number} size - File size in bytes
   * @param {string} hash - SHA256 hash (should include 'sha256:' prefix)
   * @returns {ManifestEntry} The created manifest entry
   *
   * @example
   * manifestManager.addFile(
   *   '/home/user/.config/opencode/agents/gsd-debugger/SKILL.md',
   *   'agents/gsd-debugger/SKILL.md',
   *   2847,
   *   'sha256:a1b2c3...'
   * );
   */
  addFile(absolutePath, relativePath, size, hash) {
    const entry = {
      path: absolutePath,
      relativePath,
      size,
      hash
    };

    this._entries.push(entry);
    return entry;
  }

  /**
   * Calculates SHA256 hash of file content.
   *
   * Convenience method for generating hashes during installation.
   *
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} SHA256 hash with 'sha256:' prefix
   * @throws {Error} If file cannot be read
   *
   * @example
   * const hash = await ManifestManager.calculateHash('/path/to/file.md');
   * // Returns: 'sha256:a1b2c3d4e5f6...'
   */
  static async calculateHash(filePath) {
    const content = await fs.readFile(filePath);
    const hash = createHash('sha256').update(content).digest('hex');
    return `sha256:${hash}`;
  }

  /**
   * Saves the manifest to INSTALLED_FILES.json.
   *
   * Writes all tracked entries to disk in JSON format.
   *
   * @returns {Promise<string>} Path to saved manifest file
   * @throws {Error} If write fails
   *
   * @example
   * const manifestPath = await manifestManager.save();
   * console.log(`Manifest saved to: ${manifestPath}`);
   */
  async save() {
    const data = JSON.stringify(this._entries, null, 2);
    // Ensure parent directory exists (for get-shit-done/INSTALLED_FILES.json)
    const parentDir = path.dirname(this._manifestPath);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(this._manifestPath, data, 'utf-8');
    return this._manifestPath;
  }

  /**
   * Loads the manifest from INSTALLED_FILES.json.
   *
   * Reads and parses the manifest file. Returns null if manifest doesn't exist.
   *
   * @returns {Promise<ManifestEntry[]|null>} Array of manifest entries, or null if not found
   * @throws {Error} If file exists but cannot be parsed
   *
   * @example
   * const entries = await manifestManager.load();
   * if (entries === null) {
   *   console.log('No manifest found - using fallback mode');
   * } else {
   *   console.log(`Found ${entries.length} tracked files`);
   * }
   */
  async load() {
    try {
      const data = await fs.readFile(this._manifestPath, 'utf-8');
      this._entries = JSON.parse(data);
      return this._entries;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Manifest doesn't exist - return null for fallback mode
        this._entries = [];
        return null;
      }
      throw error;
    }
  }

  /**
   * Gets all tracked entries.
   *
   * Returns a copy of the internal entries array.
   *
   * @returns {ManifestEntry[]} Array of all manifest entries
   *
   * @example
   * const allFiles = manifestManager.getAllEntries();
   * console.log(`Total tracked files: ${allFiles.length}`);
   */
  getAllEntries() {
    return [...this._entries];
  }

  /**
   * Filters entries by allowed namespaces.
   *
   * Returns only entries whose relativePath matches at least one
   * of the provided namespace patterns.
   *
   * @param {RegExp[]} namespaces - Array of regex patterns for allowed namespaces
   * @returns {ManifestEntry[]} Entries in allowed namespaces
   *
   * @example
   * const safeFiles = manifestManager.getFilesInNamespaces(ALLOWED_NAMESPACES);
   * // Returns only files in agents/gsd-*, command/gsd/*, skills/gsd-*, get-shit-done/*
   */
  getFilesInNamespaces(namespaces) {
    return this._entries.filter(entry =>
      this.isInAllowedNamespace(entry.relativePath, namespaces)
    );
  }

  /**
   * Checks if a path is in an allowed namespace.
   *
   * Tests the path against all provided namespace patterns.
   * Returns true if the path matches at least one pattern.
   *
   * @param {string} filePath - File path to check (relative or absolute)
   * @param {RegExp[]} namespaces - Array of regex patterns for allowed namespaces
   * @returns {boolean} True if path is in an allowed namespace
   *
   * @example
   * const isSafe = manifestManager.isInAllowedNamespace(
   *   'agents/gsd-debugger/SKILL.md',
   *   ALLOWED_NAMESPACES
   * );
   * // Returns: true
   *
   * const isSafe2 = manifestManager.isInAllowedNamespace(
   *   'agents/user-custom-agent/SKILL.md',
   *   ALLOWED_NAMESPACES
   * );
   * // Returns: false
   */
  isInAllowedNamespace(filePath, namespaces) {
    // Normalize to relative path if absolute
    const relativePath = filePath.startsWith(this._installPath)
      ? path.relative(this._installPath, filePath)
      : filePath;

    // Normalize path separators for cross-platform compatibility
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // Check against all namespace patterns
    return namespaces.some(pattern => pattern.test(normalizedPath));
  }

  /**
   * Clears all tracked entries.
   *
   * Removes all entries from memory. Does not affect saved manifest file.
   *
   * @example
   * manifestManager.clear();
   * console.log(`Entries cleared: ${manifestManager.getAllEntries().length}`);
   */
  clear() {
    this._entries = [];
  }

  /**
   * Gets the manifest file path.
   *
   * @returns {string} Full path to INSTALLED_FILES.json
   *
   * @example
   * const manifestPath = manifestManager.getManifestPath();
   * // Returns: '/home/user/.config/opencode/INSTALLED_FILES.json'
   */
  getManifestPath() {
    return this._manifestPath;
  }

  /**
   * Gets the installation root path.
   *
   * @returns {string} Installation directory path
   *
   * @example
   * const installPath = manifestManager.getInstallPath();
   * // Returns: '/home/user/.config/opencode'
   */
  getInstallPath() {
    return this._installPath;
  }
}

/**
 * Default export for the manifest-manager module.
 *
 * @example
 * import { ManifestManager } from './services/manifest-manager.js';
 * const manifestManager = new ManifestManager('/home/user/.config/opencode');
 */
export default {
  ManifestManager
};
