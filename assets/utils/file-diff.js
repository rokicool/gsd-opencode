/**
 * File diff utilities for comparing file contents
 * @module utils/file-diff
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import * as diff from 'diff';

/**
 * Compute SHA256 hash of file content
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} SHA256 hash as hex string
 */
export async function computeHash(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Compare two files for equality using their hashes
 * @param {string} file1 - Path to first file
 * @param {string} file2 - Path to second file
 * @returns {Promise<boolean>} True if files have identical content
 */
export async function filesAreEqual(file1, file2) {
  try {
    const [hash1, hash2] = await Promise.all([
      computeHash(file1),
      computeHash(file2)
    ]);
    return hash1 === hash2;
  } catch (error) {
    // If either file doesn't exist, they're not equal
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Generate unified diff between two files
 * @param {string} original - Path to original file
 * @param {string} modified - Path to modified file
 * @param {Object} options - Diff options
 * @param {number} [options.contextLines=3] - Number of context lines
 * @returns {Promise<string>} Unified diff output
 */
export async function getFileDiff(original, modified, options = {}) {
  const { contextLines = 3 } = options;
  
  const [originalContent, modifiedContent] = await Promise.all([
    readFile(original, 'utf-8').catch(() => ''),
    readFile(modified, 'utf-8').catch(() => '')
  ]);
  
  const patch = diff.createPatch(
    original,
    originalContent,
    modifiedContent,
    'original',
    'modified',
    { context: contextLines }
  );
  
  return patch;
}

export default {
  computeHash,
  filesAreEqual,
  getFileDiff
};
