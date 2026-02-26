/**
 * SyncManifest - JSON manifest for sync state tracking
 *
 * Persists synchronization state to a JSON file, tracking:
 * - Last sync metadata (commit, date, version)
 * - Per-file sync status (hashes, timestamps, transformation status)
 *
 * Uses atomic write pattern (temp-then-move) for safety.
 */

import { readFile, writeFile, rename, unlink, access, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

/**
 * Default manifest path
 */
const DEFAULT_MANIFEST_PATH = '.planning/sync-manifest.json';

/**
 * Current manifest version
 */
const MANIFEST_VERSION = '1.0.0';

/**
 * @typedef {Object} FileSyncStatus
 * @property {string} syncedAt - ISO timestamp of last sync
 * @property {string} sourceHash - SHA-256 hash of source file
 * @property {string} destHash - SHA-256 hash of destination file after sync
 * @property {boolean} transformed - Whether the file was transformed during sync
 */

/**
 * @typedef {Object} LastSyncInfo
 * @property {string} commit - Commit hash that was synced
 * @property {string} date - ISO timestamp of the sync
 * @property {string|null} version - Version tag if available
 */

/**
 * @typedef {Object} SyncManifestData
 * @property {string} version - Manifest schema version
 * @property {LastSyncInfo|null} lastSync - Last sync metadata
 * @property {Object<string, FileSyncStatus>} files - Per-file sync status
 */

/**
 * Class for managing sync manifest persistence
 */
export class SyncManifest {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.manifestPath] - Path to the manifest file
   */
  constructor(options = {}) {
    this.manifestPath = resolve(options.manifestPath || DEFAULT_MANIFEST_PATH);
  }

  /**
   * Get the default manifest structure
   * @returns {SyncManifestData}
   */
  getDefaultManifest() {
    return {
      version: MANIFEST_VERSION,
      lastSync: null,
      files: {}
    };
  }

  /**
   * Check if the manifest file exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    try {
      await access(this.manifestPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the manifest directory exists
   * @returns {Promise<void>}
   */
  async ensureDirectory() {
    const dir = dirname(this.manifestPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Compute SHA-256 hash of content
   * @param {string|Buffer} content - Content to hash
   * @returns {string} Hex-encoded hash
   */
  computeHash(content) {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load manifest from file, return default if not found
   * @returns {Promise<SyncManifestData>}
   */
  async load() {
    try {
      const content = await readFile(this.manifestPath, 'utf-8');
      const data = JSON.parse(content);

      // Validate and migrate if needed
      return this.validateAndMigrate(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default
        return this.getDefaultManifest();
      }
      // If JSON is corrupt, start fresh
      if (error instanceof SyntaxError) {
        console.warn('Sync manifest is corrupt, starting fresh');
        return this.getDefaultManifest();
      }
      throw error;
    }
  }

  /**
   * Validate manifest structure and migrate if needed
   * @param {Object} data - Parsed manifest data
   * @returns {SyncManifestData}
   */
  validateAndMigrate(data) {
    // Ensure required fields exist
    const manifest = {
      version: data.version || MANIFEST_VERSION,
      lastSync: data.lastSync || null,
      files: data.files || {}
    };

    // Validate lastSync structure
    if (manifest.lastSync) {
      if (!manifest.lastSync.commit || !manifest.lastSync.date) {
        manifest.lastSync = null;
      }
    }

    // Validate files structure
    for (const [filePath, status] of Object.entries(manifest.files)) {
      if (!status.syncedAt || !status.sourceHash) {
        // Invalid entry, remove it
        delete manifest.files[filePath];
      }
    }

    return manifest;
  }

  /**
   * Write data to a temp file first, then atomically move to final location
   * @param {SyncManifestData} manifest - Manifest data to save
   * @returns {Promise<void>}
   */
  async save(manifest) {
    await this.ensureDirectory();

    const content = JSON.stringify(manifest, null, 2);

    // Create temp file in the same directory for atomic rename
    const tempFile = join(
      dirname(this.manifestPath),
      `.sync-manifest-${Date.now()}.tmp`
    );

    try {
      // Write to temp file
      await writeFile(tempFile, content, 'utf-8');

      // Atomic rename (same filesystem guaranteed)
      await rename(tempFile, this.manifestPath);
    } catch (error) {
      // Clean up temp file on failure
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Update a single file entry in the manifest
   * @param {string} filePath - Relative path to the file
   * @param {Object} options - Update options
   * @param {string} options.sourceHash - Hash of source file
   * @param {string} [options.destHash] - Hash of destination file
   * @param {boolean} [options.transformed=false] - Whether file was transformed
   * @returns {Promise<FileSyncStatus>}
   */
  async updateFile(filePath, options) {
    const manifest = await this.load();

    const status = {
      syncedAt: new Date().toISOString(),
      sourceHash: options.sourceHash,
      destHash: options.destHash || options.sourceHash,
      transformed: options.transformed || false
    };

    manifest.files[filePath] = status;
    await this.save(manifest);

    return status;
  }

  /**
   * Get sync status for a specific file
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<{syncedAt: string, sourceHash: string, destHash: string, exists: boolean}|null>}
   */
  async getFileStatus(filePath) {
    const manifest = await this.load();
    const status = manifest.files[filePath];

    if (!status) {
      return null;
    }

    return {
      syncedAt: status.syncedAt,
      sourceHash: status.sourceHash,
      destHash: status.destHash,
      exists: true
    };
  }

  /**
   * Get last sync metadata
   * @returns {Promise<{commit: string, date: string, version: string|null}|null>}
   */
  async getLastSync() {
    const manifest = await this.load();
    return manifest.lastSync;
  }

  /**
   * Set last sync metadata
   * @param {Object} options - Sync info
   * @param {string} options.commit - Commit hash
   * @param {string} [options.date] - ISO timestamp (defaults to now)
   * @param {string|null} [options.version] - Version tag
   * @returns {Promise<LastSyncInfo>}
   */
  async setLastSync(options) {
    const manifest = await this.load();

    manifest.lastSync = {
      commit: options.commit,
      date: options.date || new Date().toISOString(),
      version: options.version || null
    };

    await this.save(manifest);
    return manifest.lastSync;
  }

  /**
   * Check if a file has been synced before
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<boolean>}
   */
  async hasFile(filePath) {
    const manifest = await this.load();
    return filePath in manifest.files;
  }

  /**
   * Remove a file entry from the manifest
   * @param {string} filePath - Relative path to the file
   * @returns {Promise<boolean>} True if file was removed
   */
  async removeFile(filePath) {
    const manifest = await this.load();

    if (filePath in manifest.files) {
      delete manifest.files[filePath];
      await this.save(manifest);
      return true;
    }

    return false;
  }

  /**
   * Get all tracked files
   * @returns {Promise<string[]>}
   */
  async getTrackedFiles() {
    const manifest = await this.load();
    return Object.keys(manifest.files);
  }

  /**
   * Get count of tracked files
   * @returns {Promise<number>}
   */
  async getFileCount() {
    const manifest = await this.load();
    return Object.keys(manifest.files).length;
  }

  /**
   * Clear all file entries (keep lastSync)
   * @returns {Promise<void>}
   */
  async clearFiles() {
    const manifest = await this.load();
    manifest.files = {};
    await this.save(manifest);
  }

  /**
   * Reset the entire manifest
   * @returns {Promise<void>}
   */
  async reset() {
    await this.save(this.getDefaultManifest());
  }

  /**
   * Check if source file has changed since last sync
   * @param {string} filePath - Relative path to the file
   * @param {string} currentHash - Current hash of the source file
   * @returns {Promise<{changed: boolean, lastHash: string|null}>}
   */
  async hasSourceChanged(filePath, currentHash) {
    const status = await this.getFileStatus(filePath);

    if (!status) {
      return { changed: true, lastHash: null };
    }

    return {
      changed: status.sourceHash !== currentHash,
      lastHash: status.sourceHash
    };
  }

  /**
   * Get files that need to be synced based on provided file list
   * @param {string[]} sourceFiles - List of source files to check
   * @param {Function} hashFn - Async function to compute hash for a file
   * @returns {Promise<{needsSync: string[], unchanged: string[], new: string[]}>}
   */
  async getSyncStatus(sourceFiles, hashFn) {
    const manifest = await this.load();

    const needsSync = [];
    const unchanged = [];
    const newFiles = [];

    for (const filePath of sourceFiles) {
      const status = manifest.files[filePath];

      if (!status) {
        newFiles.push(filePath);
        needsSync.push(filePath);
        continue;
      }

      // Check if source has changed
      try {
        const currentHash = await hashFn(filePath);
        if (currentHash !== status.sourceHash) {
          needsSync.push(filePath);
        } else {
          unchanged.push(filePath);
        }
      } catch {
        // Can't compute hash, assume needs sync
        needsSync.push(filePath);
      }
    }

    return { needsSync, unchanged, newFiles };
  }

  /**
   * Import manifest data from another source (for migration)
   * @param {SyncManifestData} data - Manifest data to import
   * @param {boolean} [merge=false] - Merge with existing data
   * @returns {Promise<void>}
   */
  async import(data, merge = false) {
    if (merge) {
      const existing = await this.load();
      const imported = this.validateAndMigrate(data);

      // Merge files
      existing.files = { ...existing.files, ...imported.files };

      // Keep the later lastSync
      if (imported.lastSync) {
        if (!existing.lastSync ||
            new Date(imported.lastSync.date) > new Date(existing.lastSync.date)) {
          existing.lastSync = imported.lastSync;
        }
      }

      await this.save(existing);
    } else {
      await this.save(this.validateAndMigrate(data));
    }
  }
}

export default SyncManifest;
