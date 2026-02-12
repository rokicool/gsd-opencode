/**
 * Uninstall command for GSD-OpenCode CLI with manifest-based safety.
 *
 * This module provides safe removal of GSD-OpenCode installations with:
 * - Manifest-based tracking (INSTALLED_FILES.json)
 * - Namespace protection (only removes files in gsd-* namespaces)
 * --dry-run mode for previewing what will be removed
 * - Typed confirmation requiring user to type 'uninstall'
 * - Backup creation before deletion
 * - Directory preservation when containing non-gsd-opencode files
 *
 * Safety Principles:
 * - Only delete files in allowed namespaces (agents/gsd-*, command/gsd/*, skills/gsd-*, get-shit-done/*)
 * - Never delete files outside these namespaces, even if tracked in manifest
 * - Preserve directories that would become non-empty after file removal
 * - Create backup before any destructive operation
 * - Require typed confirmation for extra safety
 *
 * @module commands/uninstall
 * @description Safe uninstall command with namespace protection
 */

import { ScopeManager } from '../services/scope-manager.js';
import { BackupManager } from '../services/backup-manager.js';
import { ManifestManager } from '../services/manifest-manager.js';
import { detectStructure, STRUCTURE_TYPES } from '../services/structure-detector.js';
import { logger, setVerbose } from '../utils/logger.js';
import { promptTypedConfirmation } from '../utils/interactive.js';
import { ERROR_CODES, ALLOWED_NAMESPACES, UNINSTALL_BACKUP_DIR } from '../../lib/constants.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main uninstall command function with safety-first design.
 *
 * Orchestrates safe uninstallation with manifest loading, namespace filtering,
 * backup creation, typed confirmation, and directory preservation.
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.global] - Remove global installation
 * @param {boolean} [options.local] - Remove local installation
 * @param {boolean} [options.force] - Skip typed confirmation (still shows summary)
 * @param {boolean} [options.dryRun] - Show preview without removing files
 * @param {boolean} [options.backup=true] - Create backup before removal (use --no-backup to skip)
 * @param {boolean} [options.verbose] - Enable verbose logging
 * @returns {Promise<number>} Exit code (0=success, 1=error, 2=permission, 130=interrupted)
 * @async
 *
 * @example
 * // Remove global installation with typed confirmation
 * const exitCode = await uninstallCommand({ global: true });
 *
 * // Preview what would be removed (dry run)
 * const exitCode = await uninstallCommand({ local: true, dryRun: true });
 *
 * // Remove without backup (user takes responsibility)
 * const exitCode = await uninstallCommand({ global: true, backup: false, force: true });
 */
export async function uninstallCommand(options = {}) {
  // Set verbose mode early for consistent logging
  setVerbose(options.verbose);

  logger.debug('Starting uninstall command');
  logger.debug(`Options: global=${options.global}, local=${options.local}, force=${options.force}, dryRun=${options.dryRun}, backup=${options.backup}, verbose=${options.verbose}`);

  try {
    // Step 1: Determine scope
    const scope = await determineScope(options);
    if (scope === null) {
      return ERROR_CODES.GENERAL_ERROR;
    }

    // Step 2: Create ScopeManager and verify installation exists
    const scopeManager = new ScopeManager({ scope });
    const targetDir = scopeManager.getTargetDir();

    if (!scopeManager.isInstalled()) {
      logger.warning(`No ${scope} installation found at ${scopeManager.getPathPrefix()}`);
      return ERROR_CODES.GENERAL_ERROR;
    }

    // Detect and log structure type
    const structureType = await detectStructure(targetDir);
    logger.debug(`Detected structure: ${structureType}`);

    // Step 3: Load manifest or use fallback mode
    const manifestManager = new ManifestManager(targetDir);
    let manifestEntries = await manifestManager.load();
    const usingFallback = manifestEntries === null;

    if (usingFallback) {
      logger.warning('Manifest not found - using fallback mode (namespace-based detection)');
      manifestEntries = await buildFallbackManifest(targetDir);
    } else {
      logger.debug(`Loaded manifest with ${manifestEntries.length} tracked files`);
    }

    // Step 4: Filter files by allowed namespaces
    const filesToRemove = manifestEntries.filter(entry =>
      isInAllowedNamespace(entry.relativePath)
    );

    logger.debug(`${filesToRemove.length} files in allowed namespaces (out of ${manifestEntries.length} total)`);

    // Step 5: Categorize files and directories
    const categorized = await categorizeItems(filesToRemove, targetDir);

    if (categorized.toRemove.length === 0) {
      logger.warning('No GSD-OpenCode files found to remove (all files outside allowed namespaces)');
      return ERROR_CODES.SUCCESS;
    }

    // Step 6: Display warning and summary
    displayWarningHeader(scope, scopeManager.getPathPrefix());
    displayCategorizedItems(categorized, targetDir);
    displaySafetySummary(categorized, options.backup !== false);

    // Step 7: Dry run mode - exit here without removing
    if (options.dryRun) {
      logger.info('\n📋 Dry run complete - no files were removed');
      return ERROR_CODES.SUCCESS;
    }

    // Step 8: Typed confirmation (unless --force)
    if (!options.force) {
      logger.debug('Requesting typed confirmation...');

      const confirmed = await promptTypedConfirmation(
        '\n⚠️  This will permanently remove the files listed above',
        'yes'
      );

      if (confirmed === null) {
        logger.info('Uninstall cancelled');
        return ERROR_CODES.INTERRUPTED;
      }

      if (!confirmed) {
        logger.info('Uninstall cancelled - confirmation word did not match');
        return ERROR_CODES.SUCCESS;
      }

      logger.debug('User confirmed uninstallation');
    } else {
      logger.debug('--force flag provided, skipping typed confirmation');
    }

    // Step 9: Create backup (unless --no-backup)
    let backupResult = null;
    if (options.backup !== false) {
      backupResult = await createBackup(categorized.toRemove, targetDir, scopeManager);
    }

    // Step 10: Remove files
    logger.info('\n🗑️  Removing files...');
    const removalResult = await removeFiles(categorized.toRemove, targetDir);

    // Step 11: Clean up empty directories
    const dirResult = await cleanupDirectories(categorized, targetDir);

    // Step 12: Success message with recovery instructions
    displaySuccessMessage(removalResult, dirResult, backupResult, targetDir);

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    // Handle Ctrl+C during async operations
    if (error.name === 'AbortPromptError') {
      logger.info('Uninstall cancelled');
      return ERROR_CODES.INTERRUPTED;
    }

    // Handle permission errors (EACCES)
    if (error.code === 'EACCES') {
      logger.error('Permission denied: Cannot remove installation directory');
      logger.dim('');
      logger.dim('Suggestion: Check directory permissions or run with appropriate privileges');
      return ERROR_CODES.PERMISSION_ERROR;
    }

    // Handle all other errors
    logger.error(`Uninstall failed: ${error.message}`);

    if (options.verbose && error.stack) {
      logger.dim(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Determines installation scope based on options.
 *
 * @param {Object} options - Command options
 * @returns {Promise<string|null>} 'global', 'local', or null if error
 * @private
 */
async function determineScope(options) {
  if (options.global) {
    logger.debug('Scope determined by --global flag');
    return 'global';
  }

  if (options.local) {
    logger.debug('Scope determined by --local flag');
    return 'local';
  }

  // Auto-detect: check both global and local installations
  logger.debug('No scope flags provided, auto-detecting...');

  const globalScope = new ScopeManager({ scope: 'global' });
  const localScope = new ScopeManager({ scope: 'local' });

  const globalInstalled = globalScope.isInstalled();
  const localInstalled = localScope.isInstalled();

  logger.debug(`Global installed: ${globalInstalled}, Local installed: ${localInstalled}`);

  // If both exist, user must specify which to remove
  if (globalInstalled && localInstalled) {
    logger.warning('Both global and local installations found');
    logger.info('Use --global or --local to specify which to remove');
    return null;
  }

  // If neither exists, nothing to uninstall
  if (!globalInstalled && !localInstalled) {
    logger.warning('No GSD-OpenCode installation found');
    return null;
  }

  // Use whichever one exists
  const scope = globalInstalled ? 'global' : 'local';
  logger.debug(`Auto-detected scope: ${scope}`);
  return scope;
}

/**
 * Builds a fallback manifest by scanning allowed namespace directories.
 *
 * Used when INSTALLED_FILES.json is missing.
 * Scans both old (command/gsd) and new (commands/gsd) structures.
 *
 * @param {string} targetDir - Installation directory
 * @returns {Promise<Array>} Array of manifest entry objects
 * @private
 */
async function buildFallbackManifest(targetDir) {
  const entries = [];

  // Scan allowed namespace directories - include both old and new command structures
  const dirsToScan = [
    'agents',
    'command/gsd',   // Old structure (singular)
    'commands/gsd',  // New structure (plural)
    'skills',
    'get-shit-done'
  ];

  for (const dir of dirsToScan) {
    const fullPath = path.join(targetDir, dir);
    try {
      await scanDirectory(fullPath, targetDir, entries, dir);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.debug(`Error scanning ${dir}: ${error.message}`);
      }
    }
  }

  return entries;
}

/**
 * Recursively scans a directory and adds files to entries array.
 *
 * @param {string} dirPath - Directory to scan
 * @param {string} baseDir - Base installation directory
 * @param {Array} entries - Array to populate with entries
 * @param {string} relativePrefix - Relative path prefix
 * @private
 */
async function scanDirectory(dirPath, baseDir, entries, relativePrefix) {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return;
    }
  } catch {
    return;
  }

  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);
    const relativePath = path.relative(baseDir, itemPath).replace(/\\/g, '/');

    if (item.isDirectory()) {
      // Only recurse into gsd-* directories (except get-shit-done which is fully owned)
      if (relativePrefix === 'get-shit-done' || item.name.startsWith('gsd-')) {
        await scanDirectory(itemPath, baseDir, entries, relativePath);
      }
    } else {
      // Add file entry
      const fileStats = await fs.stat(itemPath);
      entries.push({
        path: itemPath,
        relativePath: relativePath,
        size: fileStats.size,
        hash: null // Cannot calculate without reading file
      });
    }
  }
}

/**
 * Checks if a relative path is in an allowed namespace.
 *
 * @param {string} relativePath - Path relative to installation root
 * @returns {boolean} True if in allowed namespace
 * @private
 */
function isInAllowedNamespace(relativePath) {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return ALLOWED_NAMESPACES.some(pattern => pattern.test(normalizedPath));
}

/**
 * Categorizes files into toRemove, missing, and preserved.
 *
 * @param {Array} files - Files from manifest
 * @param {string} targetDir - Installation directory
 * @returns {Object} Categorized items
 * @private
 */
async function categorizeItems(files, targetDir) {
  const toRemove = [];
  const missing = [];
  const directories = new Set();

  for (const file of files) {
    // Use the stored path or construct from relativePath
    const filePath = file.path || path.join(targetDir, file.relativePath);

    try {
      await fs.access(filePath);
      toRemove.push({
        ...file,
        path: filePath
      });

      // Track parent directory
      const parentDir = path.dirname(file.relativePath);
      if (parentDir && parentDir !== '.') {
        directories.add(parentDir);
      }
    } catch {
      missing.push(file);
    }
  }

  // Ensure top-level directories in allowed namespaces are tracked for cleanup
  // This includes get-shit-done, agents, command, commands, skills
  // Include both old (command) and new (commands) structures
  const topLevelDirs = ['agents', 'command', 'commands', 'skills', 'get-shit-done'];
  for (const dir of topLevelDirs) {
    try {
      const fullPath = path.join(targetDir, dir);
      await fs.access(fullPath);
      directories.add(dir);
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return { toRemove, missing, directories: Array.from(directories) };
}

/**
 * Displays the warning header.
 *
 * @param {string} scope - Installation scope
 * @param {string} location - Installation location
 * @private
 */
function displayWarningHeader(scope, location) {
  logger.error('╔══════════════════════════════════════════════════════════════╗');
  logger.error('║  ⚠️  WARNING: DESTRUCTIVE OPERATION                           ║');
  logger.error('╚══════════════════════════════════════════════════════════════╝');
  logger.dim('');
  logger.info(`Scope: ${scope}`);
  logger.info(`Location: ${location}`);
  logger.dim('');
  logger.warning('Only removing files in gsd-opencode namespaces (gsd-*)');
  logger.dim('User files in other directories will be preserved');
  logger.dim('');
}

/**
 * Displays categorized items (to remove, missing, preserved directories).
 *
 * @param {Object} categorized - Categorized items
 * @param {string} targetDir - Installation directory
 * @private
 */
function displayCategorizedItems(categorized, targetDir) {
  // Files to remove
  if (categorized.toRemove.length > 0) {
    logger.info(`📋 Files that will be removed (${categorized.toRemove.length}):`);

    const displayCount = Math.min(categorized.toRemove.length, 10);
    for (let i = 0; i < displayCount; i++) {
      const file = categorized.toRemove[i];
      logger.dim(`  ✓ ${file.relativePath}`);
    }

    if (categorized.toRemove.length > 10) {
      logger.dim(`  ... and ${categorized.toRemove.length - 10} more files`);
    }

    logger.dim('');
  }

  // Files already missing
  if (categorized.missing.length > 0) {
    logger.info(`⚠️  Files already missing (${categorized.missing.length}):`);
    const displayCount = Math.min(categorized.missing.length, 5);
    for (let i = 0; i < displayCount; i++) {
      logger.dim(`  - ${categorized.missing[i].relativePath}`);
    }
    if (categorized.missing.length > 5) {
      logger.dim(`  ... and ${categorized.missing.length - 5} more`);
    }
    logger.dim('');
  }
}

/**
 * Displays the safety summary before confirmation.
 *
 * @param {Object} categorized - Categorized items
 * @param {boolean} willCreateBackup - Whether backup will be created
 * @private
 */
function displaySafetySummary(categorized, willCreateBackup) {
  const totalSize = categorized.toRemove.reduce((sum, file) => sum + (file.size || 0), 0);
  const sizeInKB = (totalSize / 1024).toFixed(1);

  logger.info('📊 Safety Summary:');
  logger.info(`  • ${categorized.toRemove.length} files will be removed (${sizeInKB} KB)`);
  logger.info(`  • ${categorized.directories.length} directories will be checked for cleanup`);

  if (categorized.missing.length > 0) {
    logger.info(`  • ${categorized.missing.length} files already missing (will be skipped)`);
  }

  if (willCreateBackup) {
    logger.info(`  • Backup will be created in: ${UNINSTALL_BACKUP_DIR}/`);
  } else {
    logger.warning(`  • ⚠️  No backup will be created (--no-backup specified)`);
  }

  logger.dim('');
}

/**
 * Creates a backup of files before removal.
 *
 * Creates a timestamped backup directory and replicates the folder structure
 * for all files being backed up.
 *
 * @param {Array} files - Files to backup
 * @param {string} targetDir - Installation directory
 * @param {ScopeManager} scopeManager - ScopeManager instance
 * @returns {Promise<Object>} Backup result
 * @private
 */
async function createBackup(files, targetDir, scopeManager) {
  logger.info('\n📦 Creating backup...');

  try {
    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(targetDir, UNINSTALL_BACKUP_DIR, timestamp);
    await fs.mkdir(backupDir, { recursive: true });

    const backedUpFiles = [];
    let totalSize = 0;

    for (const file of files) {
      try {
        // Determine backup path with replicated structure
        const relativePath = file.relativePath;
        const backupFilePath = path.join(backupDir, relativePath);
        const backupFileDir = path.dirname(backupFilePath);

        // Ensure the directory structure exists in backup
        await fs.mkdir(backupFileDir, { recursive: true });

        // Copy file to backup location
        await fs.copyFile(file.path, backupFilePath);
        backedUpFiles.push({
          original: file.relativePath,
          backup: path.join(timestamp, relativePath)
        });
        totalSize += file.size || 0;
      } catch (error) {
        logger.debug(`Failed to backup ${file.relativePath}: ${error.message}`);
      }
    }

    logger.info(`✓ Backed up ${backedUpFiles.length} files (${(totalSize / 1024).toFixed(1)} KB)`);
    logger.debug(`Backup location: ${backupDir}`);

    return {
      success: true,
      backupDir,
      timestamp,
      fileCount: backedUpFiles.length,
      totalSize
    };
  } catch (error) {
    logger.warning(`⚠️  Backup creation failed: ${error.message} - continuing without backup`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Removes files one by one.
 *
 * @param {Array} files - Files to remove
 * @param {string} targetDir - Installation directory
 * @returns {Promise<Object>} Removal result
 * @private
 */
async function removeFiles(files, targetDir) {
  let removed = 0;
  let failed = 0;

  for (const file of files) {
    try {
      await fs.unlink(file.path);
      removed++;
      logger.debug(`Removed: ${file.relativePath}`);
    } catch (error) {
      failed++;
      logger.debug(`Failed to remove ${file.relativePath}: ${error.message}`);
    }
  }

  return { removed, failed };
}

/**
 * Cleans up empty directories while preserving non-empty ones.
 * get-shit-done directory is always removed (forcefully).
 *
 * @param {Object} categorized - Categorized items with directories
 * @param {string} targetDir - Installation directory
 * @returns {Promise<Object>} Directory cleanup result
 * @private
 */
async function cleanupDirectories(categorized, targetDir) {
  const removed = [];
  const preserved = [];

  // Sort directories by depth (deepest first) so we remove children before parents
  const sortedDirs = [...categorized.directories].sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    return depthB - depthA;
  });

  for (const dir of sortedDirs) {
    const fullPath = path.join(targetDir, dir);

    try {
      // get-shit-done directory is always forcefully removed
      if (dir === 'get-shit-done' || dir.startsWith('get-shit-done/')) {
        await fs.rm(fullPath, { recursive: true, force: true });
        removed.push(dir);
        logger.debug(`Forcefully removed get-shit-done directory: ${dir}`);
        continue;
      }

      // Check if directory exists and is empty
      const entries = await fs.readdir(fullPath);

      if (entries.length === 0) {
        // Directory is empty, safe to remove
        await fs.rmdir(fullPath);
        removed.push(dir);
        logger.debug(`Removed empty directory: ${dir}`);
      } else {
        // Directory has contents, preserve it
        preserved.push({ dir, entryCount: entries.length });
        logger.dim(`📁 Preserved: ${dir} (contains ${entries.length} non-gsd-opencode files)`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory already gone
        removed.push(dir);
      } else {
        logger.debug(`Could not process directory ${dir}: ${error.message}`);
        preserved.push({ dir, error: error.message });
      }
    }
  }

  return { removed, preserved };
}

/**
 * Displays success message with recovery instructions.
 *
 * @param {Object} removalResult - File removal result
 * @param {Object} dirResult - Directory cleanup result
 * @param {Object} backupResult - Backup creation result
 * @param {string} targetDir - Target directory where files were installed
 * @private
 */
function displaySuccessMessage(removalResult, dirResult, backupResult, targetDir) {
  logger.dim('');
  logger.success('✓ GSD-OpenCode has been successfully uninstalled');
  logger.dim('');

  // Summary
  logger.info('Summary:');
  logger.info(`  • ${removalResult.removed} files removed`);
  if (removalResult.failed > 0) {
    logger.warning(`  • ${removalResult.failed} files could not be removed`);
  }
  logger.info(`  • ${dirResult.removed.length} directories removed`);
  logger.info(`  • ${dirResult.preserved.length} directories preserved`);

  logger.dim('');

  // Backup info
  if (backupResult && backupResult.success) {
    logger.info('📦 Backup Information:');
    logger.info(`  • Location: ${backupResult.backupDir}`);
    logger.info(`  • Timestamp: ${backupResult.timestamp}`);
    logger.info(`  • Files: ${backupResult.fileCount} (${(backupResult.totalSize / 1024).toFixed(1)} KB)`);
    logger.dim('');
    logger.dim('Recovery:');
    logger.dim(`  cp -r "${backupResult.backupDir}/." ${targetDir}/`);
    logger.dim('');
  }
}

/**
 * Default export for the uninstall command.
 *
 * @example
 * import uninstallCommand from './commands/uninstall.js';
 * const exitCode = await uninstallCommand({ global: true, force: true });
 */
export default uninstallCommand;
