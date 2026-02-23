/**
 * SyncService - Orchestrates file copy operations from original to gsd-opencode
 *
 * Handles:
 * - Directory mapping (original → gsd-opencode)
 * - Dry-run mode for safe previewing
 * - Force mode to bypass divergence warnings
 * - File diffs before syncing
 * - Diverged file detection and warnings
 * - Binary file skipping
 * - Backup creation before overwriting
 * - Atomic operations using temp-then-move pattern
 * - Orphaned file reporting
 *
 * IMPORTANT: This service does NOT perform transformations.
 * The gsd-opencode/ folder should be processed by translate.js later.
 */

import { copyFile, mkdir, rm, rename, access, readdir, stat, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative, resolve, basename } from 'path';
import { tmpdir } from 'os';
import { computeHash, filesAreEqual, getFileDiff } from '../utils/file-diff.js';
import { createBackup } from '../utils/backup.js';
import { isBinary } from '../utils/binary-check.js';

/**
 * Directory mapping from original to gsd-opencode
 * Key: path prefix in original/get-shit-done/
 * Value: corresponding path prefix in gsd-opencode/
 */
const DIRECTORY_MAPPING = {
  'agents/': 'gsd-opencode/agents/',
  'commands/gsd/': 'gsd-opencode/commands/gsd/',
  'get-shit-done/references/': 'gsd-opencode/get-shit-done/references/',
  'get-shit-done/templates/': 'gsd-opencode/get-shit-done/templates/',
  'get-shit-done/workflows/': 'gsd-opencode/get-shit-done/workflows/'
};

/**
 * @typedef {Object} SyncOptions
 * @property {boolean} [dryRun=false] - Preview changes without applying
 * @property {boolean} [force=false] - Bypass divergence warnings
 * @property {boolean} [showDiff=false] - Show diffs before syncing
 */

/**
 * @typedef {Object} SyncResult
 * @property {string[]} copied - Files that were copied
 * @property {string[]} skipped - Files that were skipped (binary, unchanged)
 * @property {string[]} warnings - Warning messages
 * @property {string[]} orphans - Files in gsd-opencode not in original
 * @property {Object<string, string>} diffs - File diffs by path
 * @property {Object<string, string>} divergences - Divergent file messages by path
 */

/**
 * @typedef {Object} DivergenceInfo
 * @property {boolean} diverged - Whether the file has diverged
 * @property {string|null} message - Divergence message
 * @property {string|null} destHash - Hash of destination file
 * @property {string|null} lastSyncHash - Hash from last sync (if available)
 */

/**
 * Error class for sync-related errors
 */
export class SyncError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
    this.details = details;
  }
}

/**
 * SyncService class for orchestrating copy operations
 */
export class SyncService {
  /**
   * @param {Object} options - Configuration options
   * @param {Object} options.submoduleService - SubmoduleService instance
   * @param {Object} options.syncManifest - SyncManifest instance
   * @param {string} [options.projectRoot] - Project root directory
   * @param {string} [options.originalPath] - Path to original submodule
   * @param {string} [options.targetPath] - Path to gsd-opencode directory
   */
  constructor(options) {
    if (!options.submoduleService) {
      throw new SyncError('submoduleService is required', 'MISSING_DEPENDENCY');
    }
    if (!options.syncManifest) {
      throw new SyncError('syncManifest is required', 'MISSING_DEPENDENCY');
    }

    this.submoduleService = options.submoduleService;
    this.syncManifest = options.syncManifest;
    this.projectRoot = resolve(options.projectRoot || process.cwd());
    this.originalPath = resolve(options.originalPath || './original/get-shit-done');
    this.targetPath = resolve(options.targetPath || './gsd-opencode');
  }

  /**
   * Get the target path for a source file using directory mapping
   * @param {string} sourcePath - Relative path from original submodule root
   * @returns {string|null} Target path relative to project root, or null if not mapped
   */
  getTargetPath(sourcePath) {
    for (const [from, to] of Object.entries(DIRECTORY_MAPPING)) {
      if (sourcePath.startsWith(from)) {
        return sourcePath.replace(from, to);
      }
    }
    return null;
  }

  /**
   * Get the source path from a target file (reverse mapping)
   * @param {string} targetPath - Relative path in gsd-opencode
   * @returns {string|null} Source path relative to original, or null if not mapped
   */
  getSourcePath(targetPath) {
    for (const [from, to] of Object.entries(DIRECTORY_MAPPING)) {
      if (targetPath.startsWith(to)) {
        return targetPath.replace(to, from);
      }
    }
    return null;
  }

  /**
   * Check if a source path is in the mapping
   * @param {string} sourcePath - Relative path from original submodule root
   * @returns {boolean} True if path is mapped for sync
   */
  isMapped(sourcePath) {
    return this.getTargetPath(sourcePath) !== null;
  }

  /**
   * Get all mapped files from the original directory
   * @returns {Promise<string[]>} List of mapped source file paths
   */
  async getAllMappedFiles() {
    const mappedFiles = [];

    for (const from of Object.keys(DIRECTORY_MAPPING)) {
      const sourceDir = join(this.originalPath, from);
      if (!existsSync(sourceDir)) {
        continue;
      }

      const files = await this.findFiles(sourceDir);
      for (const file of files) {
        const fullSourcePath = join(from, file);
        mappedFiles.push(fullSourcePath);
      }
    }

    return mappedFiles;
  }

  /**
   * Find diverged files by comparing current source to destination
   * @returns {Promise<{hasChanges: boolean, files: string[], divergences: Object}>} Changed files and divergences
   */
  async findDivergedFiles() {
    const mappedFiles = await this.getAllMappedFiles();
    const divergedFiles = [];
    const divergences = {};

    for (const sourcePath of mappedFiles) {
      const targetPath = this.getTargetPath(sourcePath);
      if (!targetPath) continue;

      // originalPath is already resolved to absolute path in constructor
      const sourceFullPath = join(this.originalPath, sourcePath);
      const destFullPath = join(this.projectRoot, targetPath);

      // Skip if source doesn't exist
      if (!existsSync(sourceFullPath)) continue;

      // If destination doesn't exist, it's a new file
      if (!existsSync(destFullPath)) {
        divergedFiles.push(sourcePath);
        continue;
      }

      // Check if files differ
      const sourceHash = await computeHash(sourceFullPath);
      const destHash = await computeHash(destFullPath);

      if (sourceHash !== destHash) {
        divergedFiles.push(sourcePath);
        // Get file status from manifest
        const fileStatus = await this.syncManifest.getFileStatus(targetPath);
        if (fileStatus && fileStatus.destHash !== destHash) {
          divergences[sourcePath] = 'Local modifications detected';
        }
      }
    }

    return {
      hasChanges: divergedFiles.length > 0,
      files: divergedFiles,
      divergences
    };
  }

  /**
   * Find all files in a directory recursively
   * @param {string} dir - Directory to scan
   * @param {string} baseDir - Base directory for relative paths
   * @returns {Promise<string[]>} List of relative file paths
   */
  async findFiles(dir, baseDir = dir) {
    const files = [];

    if (!existsSync(dir)) {
      return files;
    }

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        // Skip hidden directories and common ignore patterns
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        const subFiles = await this.findFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }

    return files;
  }

  /**
   * Find orphaned files in gsd-opencode that are not in original
   * @returns {Promise<string[]>} List of orphaned file paths
   */
  async findOrphanedFiles() {
    const orphaned = [];

    // Get all files in target directories
    for (const to of Object.values(DIRECTORY_MAPPING)) {
      const targetDir = join(this.projectRoot, to);
      if (!existsSync(targetDir)) {
        continue;
      }

      const targetFiles = await this.findFiles(targetDir);

      for (const file of targetFiles) {
        const targetRelPath = join(to, file);
        const sourcePath = this.getSourcePath(targetRelPath);

        if (sourcePath === null) {
          // This target path isn't mapped from any source
          orphaned.push(targetRelPath);
          continue;
        }

        // Check if source file exists
        const sourceFullPath = join(this.originalPath, sourcePath);
        if (!existsSync(sourceFullPath)) {
          orphaned.push(targetRelPath);
        }
      }
    }

    return orphaned;
  }

  /**
   * Detect divergence between source and destination files
   * Divergence occurs when:
   * 1. Destination file exists and has been modified since last sync
   * 2. Destination hash differs from last sync hash AND from source hash
   *
   * @param {string} sourcePath - Relative path to source file
   * @param {string} destPath - Relative path to destination file
   * @returns {Promise<DivergenceInfo>}
   */
  async detectDivergence(sourcePath, destPath) {
    const sourceFullPath = join(this.originalPath, sourcePath);
    const destFullPath = join(this.projectRoot, destPath);

    // Check if destination exists
    try {
      await access(destFullPath);
    } catch {
      // Destination doesn't exist, no divergence
      return { diverged: false, message: null, destHash: null, lastSyncHash: null };
    }

    // Get destination hash
    const destHash = await computeHash(destFullPath);

    // Get last sync hash from manifest
    const lastSync = await this.syncManifest.getFileStatus(destPath);
    const lastSyncHash = lastSync?.destHash || null;

    // If no previous sync, check if destination differs from source
    if (!lastSyncHash) {
      const sourceHash = await computeHash(sourceFullPath);
      if (destHash !== sourceHash) {
        return {
          diverged: true,
          message: 'Destination file exists and differs from source (no previous sync record)',
          destHash,
          lastSyncHash: null
        };
      }
      return { diverged: false, message: null, destHash, lastSyncHash: null };
    }

    // Check if destination has been modified since last sync
    if (destHash !== lastSyncHash) {
      // Destination has changed - check if source also changed
      const sourceHash = await computeHash(sourceFullPath);
      if (sourceHash !== lastSyncHash) {
        // Both source and destination have changed - true divergence
        return {
          diverged: true,
          message: 'Both source and destination have been modified since last sync',
          destHash,
          lastSyncHash
        };
      }
      // Only destination changed
      return {
        diverged: true,
        message: 'Destination file has been modified since last sync',
        destHash,
        lastSyncHash
      };
    }

    // Destination matches last sync
    return { diverged: false, message: null, destHash, lastSyncHash };
  }

  /**
   * Perform the sync operation
   * @param {SyncOptions} options - Sync options
   * @returns {Promise<SyncResult>}
   */
  async sync(options = {}) {
    const { dryRun = false, force = false, showDiff = false, files = null } = options;

    const result = {
      copied: [],
      skipped: [],
      warnings: [],
      orphans: [],
      diffs: {},
      divergences: {}
    };

    // Verify submodule is initialized
    await this.submoduleService.verifySubmodule();

    let mappedFiles;

    if (files && files.length > 0) {
      // Use provided files (resync mode)
      mappedFiles = files.filter(f => this.isMapped(f));
    } else {
      // Get changed files from submodule
      const lastSync = await this.syncManifest.getLastSync();
      const changes = await this.submoduleService.detectChanges(lastSync?.commit || null);

      if (!changes.hasChanges && lastSync) {
        result.warnings.push('Already up to date - no changes since last sync');
        return result;
      }

      // Filter to only mapped files
      mappedFiles = changes.files.filter(f => this.isMapped(f));
    }

    if (mappedFiles.length === 0) {
      result.warnings.push('No mapped files to sync');
      return result;
    }

    // Create temp directory for atomic operations
    const tempDir = await mkdtemp(join(tmpdir(), 'gsd-sync-'));

    // Track files staged for sync
    const stagedFiles = [];
    const backupPaths = [];

    try {
      // Process each file
      for (const sourcePath of mappedFiles) {
        const targetPath = this.getTargetPath(sourcePath);
        const sourceFullPath = join(this.originalPath, sourcePath);
        const destFullPath = join(this.projectRoot, targetPath);

        // Check if file exists in source
        if (!existsSync(sourceFullPath)) {
          result.warnings.push(`Source file not found: ${sourcePath}`);
          continue;
        }

        // Check if binary
        if (await isBinary(sourceFullPath)) {
          result.skipped.push({ path: sourcePath, reason: 'binary' });
          continue;
        }

        // Check for divergence
        const divergence = await this.detectDivergence(sourcePath, targetPath);
        if (divergence.diverged && !force) {
          result.divergences[targetPath] = divergence.message;
          result.warnings.push(`Divergence detected: ${targetPath} - ${divergence.message}`);
          result.skipped.push({ path: sourcePath, reason: 'diverged' });
          continue;
        }

        // Show diff if requested
        if (showDiff && existsSync(destFullPath)) {
          try {
            const diff = await getFileDiff(sourceFullPath, destFullPath);
            if (diff.trim()) {
              result.diffs[targetPath] = diff;
            }
          } catch (e) {
            result.warnings.push(`Could not generate diff for ${targetPath}: ${e.message}`);
          }
        }

        // Stage file for sync
        const tempFilePath = join(tempDir, targetPath);
        await mkdir(dirname(tempFilePath), { recursive: true });
        await copyFile(sourceFullPath, tempFilePath);
        stagedFiles.push({ sourcePath, targetPath, destFullPath, tempFilePath });

        // Track for backup (only if destination exists and we're not in dry run)
        if (existsSync(destFullPath) && !dryRun) {
          backupPaths.push({ targetPath, destFullPath });
        }
      }

      // If dry run, return what would happen (including orphans)
      if (dryRun) {
        result.copied = stagedFiles.map(f => f.targetPath);
        result.warnings.push(`DRY RUN: Would sync ${stagedFiles.length} file(s)`);
        result.warnings.push(`DRY RUN: Would skip ${result.skipped.length} file(s)`);
        
        // Find orphaned files even in dry-run
        result.orphans = await this.findOrphanedFiles();
        if (result.orphans.length > 0) {
          result.warnings.push(`Found ${result.orphans.length} orphaned file(s) in gsd-opencode`);
        }
        
        return result;
      }

      // Create backups before syncing
      for (const { targetPath, destFullPath } of backupPaths) {
        try {
          await createBackup(destFullPath, this.projectRoot);
        } catch (e) {
          result.warnings.push(`Backup failed for ${targetPath}: ${e.message}`);
        }
      }

      // Apply all changes atomically
      for (const { sourcePath, targetPath, destFullPath, tempFilePath } of stagedFiles) {
        try {
          // Ensure destination directory exists
          await mkdir(dirname(destFullPath), { recursive: true });

          // Move from temp to destination
          await rename(tempFilePath, destFullPath);

          // Update manifest
          const sourceHash = await computeHash(join(this.originalPath, sourcePath));
          const destHash = await computeHash(destFullPath);
          await this.syncManifest.updateFile(targetPath, {
            sourceHash,
            destHash,
            transformed: false
          });

          result.copied.push(targetPath);
        } catch (e) {
          result.warnings.push(`Failed to sync ${targetPath}: ${e.message}`);
          result.skipped.push({ path: sourcePath, reason: 'error' });
        }
      }

      // Update last sync info
      const commitInfo = await this.submoduleService.getCommitInfo();
      await this.syncManifest.setLastSync({
        commit: commitInfo.hash,
        version: commitInfo.version
      });

      // Find orphaned files
      result.orphans = await this.findOrphanedFiles();
      if (result.orphans.length > 0) {
        result.warnings.push(`Found ${result.orphans.length} orphaned file(s) in gsd-opencode`);
      }

    } finally {
      // Cleanup temp directory
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }

    return result;
  }

  /**
   * Preview sync without making changes (always dry run)
   * @returns {Promise<SyncResult>}
   */
  async preview() {
    return this.sync({ dryRun: true, showDiff: true });
  }

  /**
   * Force sync all mapped files, bypassing divergence checks
   * @param {SyncOptions} options - Sync options
   * @returns {Promise<SyncResult>}
   */
  async forceSync(options = {}) {
    return this.sync({ ...options, force: true });
  }

  /**
   * Get statistics about sync state
   * @returns {Promise<Object>}
   */
  async getStats() {
    const lastSync = await this.syncManifest.getLastSync();
    const trackedFiles = await this.syncManifest.getTrackedFiles();
    const orphans = await this.findOrphanedFiles();

    return {
      lastSync,
      trackedFileCount: trackedFiles.length,
      orphanCount: orphans.length,
      orphans
    };
  }

  /**
   * Check if sync is needed (source has changes)
   * @returns {Promise<boolean>}
   */
  async needsSync() {
    const lastSync = await this.syncManifest.getLastSync();
    if (!lastSync) {
      return true;
    }

    const changes = await this.submoduleService.detectChanges(lastSync.commit);
    return changes.hasChanges;
  }
}

export default SyncService;
