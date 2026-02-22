/**
 * Hash utility for file integrity checking.
 *
 * This module provides SHA-256 hashing functions for verifying file integrity
 * during installation health checks. Uses Node.js built-in crypto module.
 *
 * @module hash
 */

import crypto from 'crypto';
import fs from 'fs/promises';

/**
 * Generates SHA-256 hash of a file's contents.
 *
 * Reads the file at the specified path and returns its SHA-256 hash.
 * Returns null if the file doesn't exist or can't be read.
 *
 * @param {string} filePath - Absolute or relative path to the file
 * @returns {Promise<string|null>} Hex-encoded SHA-256 hash, or null if file can't be read
 *
 * @example
 * const hash = await hashFile('/path/to/file.txt');
 * if (hash) {
 *   console.log(`File hash: ${hash}`);
 * } else {
 *   console.log('File not found or unreadable');
 * }
 */
export async function hashFile(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    // Return null for any error (file not found, permission denied, etc.)
    return null;
  }
}

/**
 * Generates SHA-256 hash of a string.
 *
 * Useful for comparing expected content hashes or generating
 * checksums for verification purposes.
 *
 * @param {string} str - String to hash
 * @returns {string} Hex-encoded SHA-256 hash
 *
 * @example
 * const hash = hashString('hello world');
 * console.log(hash); // 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
 */
export function hashString(str) {
  if (typeof str !== 'string') {
    throw new TypeError('Input must be a string');
  }
  return crypto.createHash('sha256').update(str, 'utf-8').digest('hex');
}

/**
 * Default export for the hash module.
 *
 * @example
 * import { hashFile, hashString } from './utils/hash.js';
 * const fileHash = await hashFile('/path/to/file.txt');
 * const strHash = hashString('test content');
 */
export default {
  hashFile,
  hashString
};
