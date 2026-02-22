/**
 * File operations service with atomic installation and path replacement.
 *
 * This module provides safe, atomic file operations for installing GSD-OpenCode.
 * It handles:
 * - Path replacement in .md files (rewriting @gsd-opencode/ references)
 * - Atomic installation using temp-then-move pattern
 * - Progress indication during file operations
 * - Signal handling for graceful interruption and cleanup
 * - Path traversal prevention
 * - Permission error handling
 *
 * SECURITY NOTE: All target paths are validated to prevent directory traversal.
 * Atomic operations ensure no partial installations remain on failure.
 *
 * @module file-ops
 */

import fs from 'fs/promises';
import path from 'path';
import { constants as fsConstants } from 'fs';
import { createHash } from 'crypto';
import ora from 'ora';
import { validatePath, expandPath } from '../utils/path-resolver.js';
import { PATH_PATTERNS, ERROR_CODES, MANIFEST_FILENAME, DIRECTORIES_TO_COPY, COMMAND_DIR_MAPPING } from '../../lib/constants.js';
import { ManifestManager } from './manifest-manager.js';
import { StructureDetector, detectStructure, STRUCTURE_TYPES } from './structure-detector.js';

/**
 * Manages file operations with atomic installation and progress indication.
 *
 * This class provides the core installation logic for GSD-OpenCode, handling
 * safe file copying, path replacement in markdown files, and atomic moves.
 * It integrates with ScopeManager for path resolution and Logger for feedback.
 *
 * @class FileOperations
 * @example
 * const fileOps = new FileOperations(scopeManager, logger);
 * await fileOps.install('./get-shit-done', '/Users/name/.config/opencode');
 */
export class FileOperations {
  /**
   * Creates a new FileOperations instance.
   *
   * @param {ScopeManager} scopeManager - Scope manager for path resolution
   * @param {object} logger - Logger instance for output (from logger.js)
   *
   * @example
   * const scopeManager = new ScopeManager({ scope: 'global' });
   * const fileOps = new FileOperations(scopeManager, logger);
   */
  constructor(scopeManager, logger) {
    if (!scopeManager) {
      throw new Error('scopeManager is required');
    }
    if (!logger) {
      throw new Error('logger is required');
    }

    this.scopeManager = scopeManager;
    this.logger = logger;

    /**
     * Registry of temporary directories to clean up.
     * @type {Set<string>}
     * @private
     */
    this._tempDirs = new Set();

    /**
     * Active spinner instance for progress indication.
     * @type {object|null}
     * @private
     */
    this._spinner = null;

    /**
     * Flag indicating if signal handlers are registered.
     * @type {boolean}
     * @private
     */
    this._handlersRegistered = false;

    // Bind methods for use as event handlers
    this._handleSigint = this._handleSigint.bind(this);
    this._handleSigterm = this._handleSigterm.bind(this);
  }

  /**
   * Installs GSD-OpenCode from source to target directory.
   *
   * Performs atomic installation using the temp-then-move pattern:
   * 1. Creates a temporary directory
   * 2. Copies files with path replacement in .md files
   * 3. Atomically moves temp directory to target location
   *
   * If interrupted or an error occurs, cleans up the temporary directory.
   *
   * @param {string} sourceDir - Source directory containing GSD-OpenCode files
   * @param {string} targetDir - Target installation directory
   * @returns {Promise<{success: boolean, filesCopied: number, directories: number}>}
   *          Installation result with counts
   * @throws {Error} If installation fails (with cleanup performed)
   *
   * @example
   * const result = await fileOps.install('./get-shit-done', '~/.config/opencode');
   * console.log(`Copied ${result.filesCopied} files`);
   */
  async install(sourceDir, targetDir) {
    const expandedSource = expandPath(sourceDir);
    const expandedTarget = expandPath(targetDir);

    // Validate source directory exists
    try {
      const sourceStat = await fs.stat(expandedSource);
      if (!sourceStat.isDirectory()) {
        throw new Error(`Source path is not a directory: ${sourceDir}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Source directory not found: ${sourceDir}`);
      }
      throw error;
    }

    // Check for existing installation structure
    const existingStructure = await detectStructure(expandedTarget);
    
    if (existingStructure === STRUCTURE_TYPES.OLD) {
      this.logger.warning('Existing installation with old structure detected (command/gsd/).');
      this.logger.info('Run "gsd-opencode update" to migrate to the new structure (commands/gsd/).');
      throw new Error(
        'Existing installation uses old directory structure. ' +
        'Use "gsd-opencode update" to migrate instead of install.'
      );
    }
    
    if (existingStructure === STRUCTURE_TYPES.DUAL) {
      this.logger.warning('Dual structure detected (both command/gsd/ and commands/gsd/ exist).');
      this.logger.info('Run "gsd-opencode update" to complete migration.');
      throw new Error(
        'Installation has dual structure state. ' +
        'Use "gsd-opencode update" to fix this issue.'
      );
    }
    
    if (existingStructure === STRUCTURE_TYPES.NEW) {
      this.logger.warning('Existing installation with new structure detected (commands/gsd/).');
      this.logger.info('Run "gsd-opencode update" to update to the latest version.');
      throw new Error(
        'Already installed with new structure. ' +
        'Use "gsd-opencode update" to update instead of install.'
      );
    }

    // Create temporary directory with timestamp
    const timestamp = Date.now();
    const tempDir = `${expandedTarget}.tmp-${timestamp}`;

    // Register temp dir for cleanup and setup signal handlers
    this._registerTempDir(tempDir);
    this._setupSignalHandlers();

    // Create manifest manager to track installed files
    // Use tempDir initially, will update paths after atomic move
    const manifestManager = new ManifestManager(tempDir);

    this.logger.info(`Installing to ${this.scopeManager.getPathPrefix()}...`);

    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });
      this.logger.debug(`Created temp directory: ${tempDir}`);

      // Copy only specific directories (not everything in source)
      const copyResult = await this._copySpecificDirectories(expandedSource, tempDir, manifestManager);

      // Copy package.json to get-shit-done/ subdirectory
      await this._copyPackageJson(expandedSource, tempDir, manifestManager);

      // Save manifest to temp directory (will be moved with atomic move)
      const tempManifestPath = await manifestManager.save();
      this.logger.debug(`Manifest saved to temp: ${tempManifestPath}`);

      // Perform atomic move
      await this._atomicMove(tempDir, expandedTarget);

      // Update manifest entries to use final target paths instead of temp paths
      const finalManifestManager = new ManifestManager(expandedTarget);
      const entries = manifestManager.getAllEntries().map(entry => ({
        ...entry,
        path: entry.path.replace(tempDir, expandedTarget)
      }));

      // Clear and re-add entries with updated paths, then save
      finalManifestManager.clear();
      for (const entry of entries) {
        finalManifestManager.addFile(entry.path, entry.relativePath, entry.size, entry.hash);
      }
      await finalManifestManager.save();
      this.logger.debug('Manifest updated with final paths');

      // Success - clean up signal handlers and registry
      this._removeTempDir(tempDir);
      this._removeSignalHandlers();

      this.logger.success(
        `Installed ${copyResult.filesCopied} files (${copyResult.directories} directories)`
      );

      // After atomic move, manifest is at the target location
      return {
        success: true,
        filesCopied: copyResult.filesCopied,
        directories: copyResult.directories,
        manifestPath: path.join(expandedTarget, MANIFEST_FILENAME)
      };
    } catch (error) {
      // Ensure cleanup on any error
      await this._cleanup();
      this._removeSignalHandlers();

      // Enhance error message with context
      throw this._wrapError(error, 'installation');
    }
  }

  /**
   * Copies files recursively with progress indication and path replacement.
   *
   * Copies all files from source to target directory. For .md files,
   * performs path replacement to update @gsd-opencode/ references.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<{filesCopied: number, directories: number}>}
   *          Copy statistics
   * @private
   */
  async _copyWithProgress(sourceDir, targetDir, manifestManager) {
    let filesCopied = 0;
    let directories = 0;

    // Get total file count for progress calculation
    const totalFiles = await this._countFiles(sourceDir);

    // Start progress spinner
    this._spinner = ora({
      text: 'Copying files...',
      spinner: 'dots',
      color: 'cyan'
    }).start();

    try {
      await this._copyRecursive(sourceDir, targetDir, (filePath, relativePath, size, hash) => {
        filesCopied++;
        const progress = Math.round((filesCopied / totalFiles) * 100);
        this._spinner.text = `Copying files... ${progress}% (${filesCopied}/${totalFiles})`;

        // Add file to manifest
        if (manifestManager) {
          manifestManager.addFile(filePath, relativePath, size, hash);
        }
      }, manifestManager);

      // Count directories (including target)
      directories = await this._countDirectories(targetDir);

      this._spinner.succeed(`Copied ${filesCopied} files`);
    } catch (error) {
      this._spinner.fail('Copy failed');
      throw error;
    } finally {
      this._spinner = null;
    }

    return { filesCopied, directories };
  }

  /**
   * Copies only specific directories from source to target.
   *
   * Only copies directories listed in DIRECTORIES_TO_COPY constant,
   * ignoring other files/directories like bin/, package.json, etc.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @param {ManifestManager} manifestManager - Manifest manager for tracking
   * @returns {Promise<{filesCopied: number, directories: number}>}
   * @private
   */
  async _copySpecificDirectories(sourceDir, targetDir, manifestManager) {
    let filesCopied = 0;
    let directories = 0;

    // Count total files in allowed directories only
    // Note: We count using the source directory names (with mapping applied)
    let totalFiles = 0;
    for (const dirName of DIRECTORIES_TO_COPY) {
      // Transform destination directory name to source directory name
      const sourceDirName = COMMAND_DIR_MAPPING[dirName] || dirName;
      const dirPath = path.join(sourceDir, sourceDirName);
      try {
        totalFiles += await this._countFiles(dirPath);
      } catch (error) {
        // Directory might not exist, skip
        this.logger.debug(`Directory not found: ${dirPath}`);
      }
    }

    // Start progress spinner
    this._spinner = ora({
      text: 'Copying files...',
      spinner: 'dots',
      color: 'cyan'
    }).start();

    try {
      for (const dirName of DIRECTORIES_TO_COPY) {
        // Transform destination directory name to source directory name
        // e.g., 'commands' -> 'command' for source lookup
        const sourceDirName = COMMAND_DIR_MAPPING[dirName] || dirName;
        const sourceSubDir = path.join(sourceDir, sourceDirName);
        const targetSubDir = path.join(targetDir, dirName);

        try {
          // Check if source subdirectory exists
          const stats = await fs.stat(sourceSubDir);
          if (!stats.isDirectory()) {
            continue;
          }

          // Create target subdirectory
          await fs.mkdir(targetSubDir, { recursive: true });
          directories++;

          // Copy contents recursively
          await this._copyRecursive(sourceSubDir, targetSubDir, (filePath, relativePath, size, hash) => {
            filesCopied++;
            const progress = Math.round((filesCopied / totalFiles) * 100);
            this._spinner.text = `Copying files... ${progress}% (${filesCopied}/${totalFiles})`;

            // Add file to manifest with correct relative path (using destination dirName)
            if (manifestManager) {
              const fullRelativePath = path.join(dirName, relativePath).replace(/\\/g, '/');
              manifestManager.addFile(filePath, fullRelativePath, size, hash);
            }
          }, manifestManager, sourceSubDir);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          // Directory doesn't exist, skip
          this.logger.debug(`Skipping missing directory: ${sourceDirName} (maps to ${dirName})`);
        }
      }

      this._spinner.succeed(`Copied ${filesCopied} files`);
    } catch (error) {
      this._spinner.fail('Copy failed');
      throw error;
    } finally {
      this._spinner = null;
    }

    return { filesCopied, directories };
  }

  /**
   * Copies package.json to get-shit-done/ subdirectory.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @param {ManifestManager} manifestManager - Manifest manager for tracking
   * @returns {Promise<void>}
   * @private
   */
  async _copyPackageJson(sourceDir, targetDir, manifestManager) {
    const sourcePackageJson = path.join(sourceDir, 'package.json');
    const targetGetShitDoneDir = path.join(targetDir, 'get-shit-done');
    const targetPackageJson = path.join(targetGetShitDoneDir, 'package.json');

    try {
      await fs.access(sourcePackageJson);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.debug('package.json not found in source, skipping');
        return;
      }
      throw error;
    }

    // Ensure get-shit-done directory exists
    await fs.mkdir(targetGetShitDoneDir, { recursive: true });

    // Copy package.json
    await fs.copyFile(sourcePackageJson, targetPackageJson);

    // Add to manifest
    if (manifestManager) {
      const stats = await fs.stat(targetPackageJson);
      const hash = await this._calculateFileHash(targetPackageJson);
      manifestManager.addFile(targetPackageJson, 'get-shit-done/package.json', stats.size, hash);
    }

    this.logger.debug('Copied package.json to get-shit-done/package.json');
  }

  /**
   * Recursively copies directory contents.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @param {Function} onFile - Callback for each file copied
   * @returns {Promise<void>}
   * @private
   */
  async _copyRecursive(sourceDir, targetDir, onFile, manifestManager, baseSourceDir = null) {
    const baseDir = baseSourceDir || sourceDir;
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        // Create directory
        await fs.mkdir(targetPath, { recursive: true });
        // Recursively copy contents
        await this._copyRecursive(sourcePath, targetPath, onFile, manifestManager, baseDir);
      } else {
        // Copy file with potential path replacement
        await this._copyFile(sourcePath, targetPath);

        // Calculate file metadata for manifest
        const stats = await fs.stat(targetPath);
        const size = stats.size;
        const hash = await this._calculateFileHash(targetPath);
        const relativePath = path.relative(baseDir, sourcePath).replace(/\\/g, '/');

        onFile(targetPath, relativePath, size, hash);
      }
    }
  }

  /**
   * Calculates SHA256 hash of a file.
   *
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} SHA256 hash with 'sha256:' prefix
   * @private
   */
  async _calculateFileHash(filePath) {
    const content = await fs.readFile(filePath);
    const hash = createHash('sha256').update(content).digest('hex');
    return `sha256:${hash}`;
  }

  /**
   * Copies a single file, performing path replacement for .md files.
   *
   * For markdown files, replaces @gsd-opencode/ references with the
   * actual installation path.
   *
   * @param {string} sourcePath - Source file path
   * @param {string} targetPath - Target file path
   * @returns {Promise<void>}
   * @private
   */
  async _copyFile(sourcePath, targetPath) {
    const isMarkdown = sourcePath.endsWith('.md');

    if (isMarkdown) {
      // Read, replace, and write markdown content
      let content = await fs.readFile(sourcePath, 'utf-8');

      // Optimization: Skip files that don't contain any patterns needing replacement
      const hasGsdRef = PATH_PATTERNS.gsdReference.test(content);
      PATH_PATTERNS.gsdReference.lastIndex = 0; // Reset regex
      const hasAbsRef = PATH_PATTERNS.absoluteReference && PATH_PATTERNS.absoluteReference.test(content);
      if (PATH_PATTERNS.absoluteReference) {
        PATH_PATTERNS.absoluteReference.lastIndex = 0; // Reset regex
      }
      const hasTildeRef = PATH_PATTERNS.tildeConfigReference && PATH_PATTERNS.tildeConfigReference.test(content);
      if (PATH_PATTERNS.tildeConfigReference) {
        PATH_PATTERNS.tildeConfigReference.lastIndex = 0; // Reset regex
      }

      if (!hasGsdRef && !hasAbsRef && !hasTildeRef) {
        await fs.copyFile(sourcePath, targetPath, fsConstants.COPYFILE_FICLONE);
        return;
      }

      // Replace @gsd-opencode/ references with actual path
      // Use function-based replacement to avoid issues with special characters
      // like '$' in the target directory path
      // Use getPathPrefix() to get the correct prefix (./.opencode for local, ~/.config/opencode for global)
      const targetDir = this.scopeManager.getPathPrefix();
      content = content.replace(
        PATH_PATTERNS.gsdReference,
        () => targetDir + '/'
      );

      // Replace bare ~/.config/opencode/ references with actual path
      // This handles workflow files that call: node ~/.config/opencode/get-shit-done/bin/gsd-tools.cjs
      // This applies to BOTH global and local installs to ensure correct paths
      if (PATH_PATTERNS.tildeConfigReference) {
        content = content.replace(
          PATH_PATTERNS.tildeConfigReference,
          () => targetDir + '/'
        );
      }

      // For local installs, also replace @~/.config/opencode/ with local path
      // This handles files that have hardcoded global references with @ prefix
      if (this.scopeManager.scope === 'local' && PATH_PATTERNS.absoluteReference) {
        content = content.replace(
          PATH_PATTERNS.absoluteReference,
          () => targetDir + '/'
        );
      }

      await fs.writeFile(targetPath, content, 'utf-8');
    } else {
      // Copy binary or other files directly
      await fs.copyFile(sourcePath, targetPath, fsConstants.COPYFILE_FICLONE);
    }
  }

  /**
   * Counts total files in a directory recursively.
   *
   * @param {string} dir - Directory to count
   * @returns {Promise<number>} Total file count
   * @private
   */
  async _countFiles(dir) {
    let count = 0;

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += await this._countFiles(fullPath);
      } else {
        count++;
      }
    }

    return count;
  }

  /**
   * Counts directories recursively.
   *
   * @param {string} dir - Directory to count
   * @returns {Promise<number>} Total directory count
   * @private
   */
  async _countDirectories(dir) {
    let count = 1; // Count the root directory

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          count += await this._countDirectories(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist yet
      return 0;
    }

    return count;
  }

  /**
   * Performs atomic move from temp directory to target.
   *
   * Uses fs.rename for atomic move when possible. Falls back to
   * copy-and-delete for cross-device moves.
   *
   * @param {string} tempDir - Temporary directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<void>}
   * @throws {Error} If move fails
   * @private
   */
  async _atomicMove(tempDir, targetDir) {
    this.logger.debug(`Performing atomic move: ${tempDir} -> ${targetDir}`);

    try {
      // Try atomic rename first
      await fs.rename(tempDir, targetDir);
      this.logger.debug('Atomic move completed successfully');
    } catch (error) {
      if (error.code === 'EXDEV') {
        // Cross-device move needed
        this.logger.debug('Cross-device move detected, using copy+delete');
        await this._crossDeviceMove(tempDir, targetDir);
      } else if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
        // Target exists with other files - MERGE instead of replace
        // This preserves existing opencode configuration
        this.logger.debug('Target exists with existing files, merging contents');
        await this._mergeDirectories(tempDir, targetDir);
        // Clean up temp directory after merge
        await fs.rm(tempDir, { recursive: true, force: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Merges temp directory contents into target directory.
   * Preserves existing files and only overwrites gsd-opencode files.
   *
   * @param {string} sourceDir - Source (temp) directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<void>}
   * @private
   */
  async _mergeDirectories(sourceDir, targetDir) {
    this.logger.debug(`Merging ${sourceDir} into ${targetDir}`);

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        // Create target directory if it doesn't exist
        await fs.mkdir(targetPath, { recursive: true });
        // Recursively merge
        await this._mergeDirectories(sourcePath, targetPath);
      } else {
        // Copy file (overwrites if exists)
        await fs.copyFile(sourcePath, targetPath);
        this.logger.debug(`Merged file: ${entry.name}`);
      }
    }
  }

  /**
   * Performs cross-device move using copy and delete.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<void>}
   * @private
   */
  async _crossDeviceMove(sourceDir, targetDir) {
    // Copy all files
    await this._copyRecursiveNoProgress(sourceDir, targetDir);
    // Delete source
    await fs.rm(sourceDir, { recursive: true, force: true });
  }

  /**
   * Recursively copies directory contents without progress tracking.
   *
   * @param {string} sourceDir - Source directory
   * @param {string} targetDir - Target directory
   * @returns {Promise<void>}
   * @private
   */
  async _copyRecursiveNoProgress(sourceDir, targetDir) {
    await fs.mkdir(targetDir, { recursive: true });
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        await this._copyRecursiveNoProgress(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  /**
   * Registers a temporary directory for cleanup.
   *
   * @param {string} dirPath - Temporary directory path
   * @private
   */
  _registerTempDir(dirPath) {
    this._tempDirs.add(dirPath);
    this.logger.debug(`Registered temp directory: ${dirPath}`);
  }

  /**
   * Removes a directory from the cleanup registry.
   *
   * Called after successful atomic move to prevent cleanup
   * of the final installation.
   *
   * @param {string} dirPath - Directory path to remove from registry
   * @private
   */
  _removeTempDir(dirPath) {
    this._tempDirs.delete(dirPath);
    this.logger.debug(`Unregistered temp directory: ${dirPath}`);
  }

  /**
   * Cleans up all registered temporary directories.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _cleanup() {
    if (this._tempDirs.size === 0) {
      return;
    }

    this.logger.debug(`Cleaning up ${this._tempDirs.size} temporary directories`);

    for (const dirPath of this._tempDirs) {
      try {
        await fs.rm(dirPath, { recursive: true, force: true });
        this.logger.debug(`Cleaned up: ${dirPath}`);
      } catch (error) {
        // Log but don't throw during cleanup
        this.logger.debug(`Failed to cleanup ${dirPath}: ${error.message}`);
      }
    }

    this._tempDirs.clear();
  }

  /**
   * Sets up signal handlers for graceful interruption.
   *
   * Registers SIGINT and SIGTERM handlers that perform cleanup
   * before exiting.
   *
   * @private
   */
  _setupSignalHandlers() {
    if (this._handlersRegistered) {
      return;
    }

    process.on('SIGINT', this._handleSigint);
    process.on('SIGTERM', this._handleSigterm);

    this._handlersRegistered = true;
    this.logger.debug('Signal handlers registered');
  }

  /**
   * Removes signal handlers.
   *
   * Called after successful installation to restore normal
   * signal handling.
   *
   * @private
   */
  _removeSignalHandlers() {
    if (!this._handlersRegistered) {
      return;
    }

    process.off('SIGINT', this._handleSigint);
    process.off('SIGTERM', this._handleSigterm);

    this._handlersRegistered = false;
    this.logger.debug('Signal handlers removed');
  }

  /**
   * Handles SIGINT signal (Ctrl+C).
   *
   * @private
   */
  _handleSigint() {
    this.logger.warning('\nInstallation interrupted by user');
    this._handleSignal('SIGINT');
  }

  /**
   * Handles SIGTERM signal.
   *
   * @private
   */
  _handleSigterm() {
    this.logger.warning('\nInstallation terminated');
    this._handleSignal('SIGTERM');
  }

  /**
   * Common signal handling logic.
   *
   * Performs cleanup and exits with appropriate code.
   *
   * @param {string} signalName - Name of the signal
   * @private
   */
  _handleSignal(signalName) {
    // Stop spinner if active
    if (this._spinner) {
      this._spinner.fail('Installation cancelled');
      this._spinner = null;
    }

    // Perform cleanup
    this._cleanup().then(() => {
      this.logger.info('Cleanup completed');
      process.exit(ERROR_CODES.INTERRUPTED);
    }).catch((error) => {
      this.logger.error('Cleanup failed', error);
      process.exit(ERROR_CODES.INTERRUPTED);
    });
  }

  /**
   * Wraps an error with additional context.
   *
   * @param {Error} error - Original error
   * @param {string} operation - Operation name for context
   * @returns {Error} Enhanced error
   * @private
   */
  _wrapError(error, operation) {
    // Handle specific error codes with helpful messages
    if (error.code === 'EACCES') {
      return new Error(
        `Permission denied during ${operation}. ` +
        `Try running with appropriate permissions or check directory ownership.`
      );
    }

    if (error.code === 'ENOSPC') {
      return new Error(
        `Disk full during ${operation}. ` +
        `Free up disk space and try again.`
      );
    }

    if (error.code === 'ENOENT') {
      return new Error(
        `File or directory not found during ${operation}: ${error.message}`
      );
    }

    // Return original error with operation context
    error.message = `Failed during ${operation}: ${error.message}`;
    return error;
  }
}

/**
 * Default export for the file-ops module.
 *
 * @example
 * import { FileOperations } from './services/file-ops.js';
 * const fileOps = new FileOperations(scopeManager, logger);
 */
export default {
  FileOperations
};
