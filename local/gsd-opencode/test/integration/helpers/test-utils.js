/**
 * Integration test utilities for safety feature testing.
 *
 * This module provides helper functions specifically for testing
 * uninstall safety features including namespace protection,
 * dry-run accuracy, backup integrity, and recovery workflow.
 *
 * @module test-utils
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import os from 'os';

/**
 * Creates a realistic GSD-OpenCode installation with mixed files.
 *
 * Creates both allowed files (gsd-*) and user files (non-gsd) to test
 * namespace protection. Creates proper INSTALLED_FILES.json manifest.
 *
 * @param {string} installDir - Installation directory to create
 * @returns {Promise<Object>} Object with removedFiles and preservedFiles arrays
 * @example
 * const { removedFiles, preservedFiles } = await createMockInstallWithMixedFiles(tempDir);
 */
export async function createMockInstallWithMixedFiles(installDir) {
  // Create directory structure
  const dirs = [
    path.join(installDir, 'agents', 'gsd-debugger'),
    path.join(installDir, 'agents', 'gsd-planner'),
    path.join(installDir, 'agents', 'user-custom'),
    path.join(installDir, 'command', 'gsd'),
    path.join(installDir, 'command', 'other-tool'),
    path.join(installDir, 'get-shit-done', 'workflows'),
    path.join(installDir, 'skills', 'gsd-helper'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Create files - mix of gsd and user files
  const files = {
    // GSD files (should be removed)
    'agents/gsd-debugger/SKILL.md': 'GSD Debugger Skill',
    'agents/gsd-debugger/config.json': '{"enabled": true}',
    'agents/gsd-planner/SKILL.md': 'GSD Planner Skill',
    'command/gsd/install.js': '// Install command',
    'command/gsd/uninstall.js': '// Uninstall command',
    'get-shit-done/workflows/execute.md': 'Workflow content',
    'skills/gsd-helper/SKILL.md': 'Helper skill',
    'get-shit-done/VERSION': '1.0.0',

    // User files (should be preserved)
    'agents/user-custom/config.json': '{"custom": true}',
    'command/other-tool/script.js': '// Other tool',
    'user-config.json': '{"user": true}',
  };

  const manifestEntries = [];
  const removedFiles = [];
  const preservedFiles = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(installDir, relativePath);
    await fs.writeFile(fullPath, content, 'utf-8');

    const hash = await calculateFileHash(fullPath);
    const stats = await fs.stat(fullPath);

    manifestEntries.push({
      path: fullPath,
      relativePath,
      size: stats.size,
      hash
    });

    // Categorize based on namespace
    if (relativePath.startsWith('agents/gsd-') ||
        relativePath.startsWith('command/gsd/') ||
        relativePath.startsWith('skills/gsd-') ||
        relativePath.startsWith('get-shit-done/')) {
      removedFiles.push(relativePath);
    } else {
      preservedFiles.push(relativePath);
    }
  }

  // Create manifest in get-shit-done subdirectory
  const manifestPath = path.join(installDir, 'get-shit-done', 'INSTALLED_FILES.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifestEntries, null, 2), 'utf-8');

  return { removedFiles, preservedFiles, manifestEntries };
}

/**
 * Verifies that namespace protection is working correctly.
 *
 * Checks that only files in allowed namespaces were removed,
 * non-gsd files still exist, and non-empty directories are preserved.
 *
 * @param {string} installDir - Installation directory
 * @param {string[]} removedFiles - Array of files that should have been removed
 * @param {string[]} preservedFiles - Array of files that should still exist
 * @returns {Promise<boolean>} True if all verifications pass
 */
export async function verifyNamespaceProtection(installDir, removedFiles, preservedFiles) {
  let allPassed = true;
  const errors = [];

  // Check removed files don't exist
  for (const file of removedFiles) {
    try {
      await fs.access(path.join(installDir, file));
      errors.push(`File should have been removed but still exists: ${file}`);
      allPassed = false;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        errors.push(`Unexpected error checking removed file ${file}: ${error.message}`);
        allPassed = false;
      }
    }
  }

  // Check preserved files still exist
  for (const file of preservedFiles) {
    try {
      await fs.access(path.join(installDir, file));
    } catch (error) {
      errors.push(`File should have been preserved but was removed: ${file}`);
      allPassed = false;
    }
  }

  // Check non-empty directories are preserved
  const agentsDir = path.join(installDir, 'agents');
  try {
    const entries = await fs.readdir(agentsDir);
    if (!entries.includes('user-custom')) {
      errors.push('agents/ directory should have been preserved (contains user-custom)');
      allPassed = false;
    }
  } catch (error) {
    // agents directory was removed when it shouldn't have been
    if (error.code === 'ENOENT') {
      // This is OK if there are no user files left
    }
  }

  if (errors.length > 0) {
    console.log('Namespace protection verification errors:', errors);
  }

  return allPassed;
}

/**
 * Verifies dry-run output accuracy against actual removal.
 *
 * Parses dry-run output and compares predicted removals with actual removals.
 *
 * @param {string} dryRunOutput - Output from dry-run command
 * @param {string[]} actualRemovedFiles - Array of files actually removed
 * @returns {Promise<Object>} Result with matches boolean and discrepancies array
 */
export async function verifyDryRunAccuracy(dryRunOutput, actualRemovedFiles) {
  const discrepancies = [];

  // Parse "Will Remove" section from output
  const willRemoveMatch = dryRunOutput.match(/Files that will be removed \((\d+)\):/);
  const lines = dryRunOutput.split('\n');

  const predictedRemovals = [];
  let inWillRemoveSection = false;

  for (const line of lines) {
    if (line.includes('Files that will be removed')) {
      inWillRemoveSection = true;
      continue;
    }
    if (line.includes('Will Preserve') || line.includes('Safety Summary')) {
      inWillRemoveSection = false;
      continue;
    }
    if (inWillRemoveSection && line.includes('✓')) {
      // Extract file path from lines like "  ✓ agents/gsd-debugger/SKILL.md"
      const match = line.match(/✓\s+(.+)$/);
      if (match) {
        predictedRemovals.push(match[1].trim());
      }
    }
  }

  // Compare predicted vs actual
  const predictedSet = new Set(predictedRemovals);
  const actualSet = new Set(actualRemovedFiles);

  // Check for files predicted to be removed but weren't
  for (const file of predictedRemovals) {
    if (!actualSet.has(file)) {
      discrepancies.push(`Predicted removal but not removed: ${file}`);
    }
  }

  // Check for files removed but not predicted
  for (const file of actualRemovedFiles) {
    if (!predictedSet.has(file)) {
      discrepancies.push(`Removed but not predicted: ${file}`);
    }
  }

  return {
    matches: discrepancies.length === 0,
    discrepancies,
    predictedCount: predictedRemovals.length,
    actualCount: actualRemovedFiles.length
  };
}

/**
 * Restores files from backup to target directory.
 *
 * Used to test recovery workflow after uninstall.
 *
 * @param {string} backupDir - Backup directory containing files
 * @param {string} targetDir - Target directory to restore files to
 * @returns {Promise<string[]>} List of restored files
 */
export async function restoreFromBackup(backupDir, targetDir) {
  const restoredFiles = [];

  try {
    // Find the timestamped subdirectory within backupDir
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const timestampDirs = entries.filter(entry => entry.isDirectory());
    
    if (timestampDirs.length === 0) {
      throw new Error(`No timestamped backup directory found in ${backupDir}`);
    }
    
    // Use the first (most recent) timestamped directory
    const timestampDir = timestampDirs[0].name;
    const actualBackupDir = path.join(backupDir, timestampDir);

    // Recursively restore files maintaining directory structure
    async function restoreRecursive(currentBackupDir, currentRelativePath = '') {
      const items = await fs.readdir(currentBackupDir, { withFileTypes: true });

      for (const item of items) {
        const backupPath = path.join(currentBackupDir, item.name);
        const relativePath = currentRelativePath 
          ? path.join(currentRelativePath, item.name)
          : item.name;

        if (item.isDirectory()) {
          // Recurse into subdirectory
          await restoreRecursive(backupPath, relativePath);
        } else {
          // Restore file to target location maintaining structure
          const targetPath = path.join(targetDir, relativePath);
          
          // Ensure directory exists
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          
          // Copy file
          await fs.copyFile(backupPath, targetPath);
          restoredFiles.push(relativePath);
        }
      }
    }

    await restoreRecursive(actualBackupDir);
  } catch (error) {
    console.error('Error restoring from backup:', error);
    throw error;
  }

  return restoredFiles;
}

/**
 * Verifies backup integrity by comparing files against originals.
 *
 * Compares backup files against original files by hash.
 *
 * @param {string} backupDir - Backup directory
 * @param {Object[]} originalFiles - Array of original file objects with relativePath
 * @returns {Promise<Object>} Result with matches boolean and differences array
 */
export async function verifyBackupIntegrity(backupDir, originalFiles) {
  const differences = [];
  let matchCount = 0;

  try {
    // Find the timestamped subdirectory within backupDir
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const timestampDirs = entries.filter(entry => entry.isDirectory());
    
    if (timestampDirs.length === 0) {
      return {
        matches: false,
        differences: [`No timestamped backup directory found in ${backupDir}`]
      };
    }
    
    // Use the first (most recent) timestamped directory
    const timestampDir = timestampDirs[0].name;
    const actualBackupDir = path.join(backupDir, timestampDir);

    for (const originalFile of originalFiles) {
      // Backup file path mirrors original structure
      const backupPath = path.join(actualBackupDir, originalFile.relativePath);

      try {
        await fs.access(backupPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          differences.push(`Missing backup for: ${originalFile.relativePath}`);
          continue;
        }
        throw error;
      }

      // Compare hashes if original has hash
      if (originalFile.hash) {
        const backupHash = await calculateFileHash(backupPath);
        if (backupHash !== originalFile.hash) {
          differences.push(`Hash mismatch for: ${originalFile.relativePath}`);
        } else {
          matchCount++;
        }
      } else {
        // Just check file exists and has content
        const stats = await fs.stat(backupPath);
        if (stats.size > 0) {
          matchCount++;
        } else {
          differences.push(`Backup file empty: ${originalFile.relativePath}`);
        }
      }
    }
  } catch (error) {
    return {
      matches: false,
      differences: [`Error verifying backup: ${error.message}`]
    };
  }

  return {
    matches: differences.length === 0,
    differences,
    matchCount
  };
}

/**
 * Creates an INSTALLED_FILES.json manifest with specified files.
 *
 * Calculates hashes and sizes automatically for each file.
 *
 * @param {string} installDir - Installation directory
 * @param {string[]} filePaths - Array of relative file paths
 * @returns {Promise<Object[]>} Manifest entries array
 */
export async function createManifest(installDir, filePaths) {
  const entries = [];

  for (const relativePath of filePaths) {
    const fullPath = path.join(installDir, relativePath);

    try {
      const content = `Content for ${relativePath}`;
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      const hash = await calculateFileHash(fullPath);
      const stats = await fs.stat(fullPath);

      entries.push({
        path: fullPath,
        relativePath,
        size: stats.size,
        hash
      });
    } catch (error) {
      console.error(`Error creating manifest entry for ${relativePath}:`, error);
    }
  }

  // Save manifest in get-shit-done subdirectory
  const manifestPath = path.join(installDir, 'get-shit-done', 'INSTALLED_FILES.json');
  await fs.writeFile(manifestPath, JSON.stringify(entries, null, 2), 'utf-8');

  return entries;
}

/**
 * Calculates directory contents summary.
 *
 * Returns files, directories, and total size for verification.
 *
 * @param {string} dirPath - Directory path to analyze
 * @returns {Promise<Object>} Object with files, directories, and totalSize
 */
export async function calculateDirectoryContents(dirPath) {
  const files = [];
  const directories = [];
  let totalSize = 0;

  async function scan(currentPath, relativePrefix = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = relativePrefix
          ? `${relativePrefix}/${entry.name}`
          : entry.name;
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          directories.push(relativePath);
          await scan(fullPath, relativePath);
        } else {
          files.push(relativePath);
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error scanning ${currentPath}:`, error);
      }
    }
  }

  await scan(dirPath);

  return { files, directories, totalSize };
}

/**
 * Creates a mock function that simulates user typing.
 *
 * For testing typed confirmation in integration tests.
 *
 * @param {string} word - Word to simulate typing
 * @returns {Function} Mock input function
 */
export function simulateTypedInput(word) {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(word);
    }
    return Promise.resolve(word);
  };
}

/**
 * Calculates SHA256 hash of a file.
 *
 * Helper function for integrity verification.
 *
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} SHA256 hash with 'sha256:' prefix
 */
async function calculateFileHash(filePath) {
  const content = await fs.readFile(filePath);
  const hash = createHash('sha256').update(content).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Creates a temporary test directory.
 *
 * @returns {Promise<string>} Path to temp directory
 */
export async function createTempDir() {
  const tempDir = path.join(os.tmpdir(), `gsd-test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Removes a directory recursively.
 *
 * @param {string} dirPath - Directory to remove
 * @returns {Promise<void>}
 */
export async function removeDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Finds all files in a directory recursively.
 *
 * @param {string} dirPath - Directory to search
 * @param {string} [relativeTo] - Base path for relative paths
 * @returns {Promise<string[]>} Array of file paths
 */
export async function findAllFiles(dirPath, relativeTo = dirPath) {
  const files = [];

  async function scan(currentPath, prefix = '') {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Waits for a specified duration.
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default export for test utilities.
 */
export default {
  createMockInstallWithMixedFiles,
  verifyNamespaceProtection,
  verifyDryRunAccuracy,
  restoreFromBackup,
  verifyBackupIntegrity,
  createManifest,
  calculateDirectoryContents,
  simulateTypedInput,
  createTempDir,
  removeDir,
  findAllFiles,
  sleep
};
