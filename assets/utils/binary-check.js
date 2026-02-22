/**
 * Binary file detection utilities
 * @module utils/binary-check
 */

import { open } from 'fs/promises';
import { Buffer } from 'buffer';

/**
 * Check if a file is binary by examining its first bytes
 * A file is considered binary if it contains null bytes in the first 512 bytes
 * @param {string} filePath - Path to the file to check
 * @param {number} [bytesToCheck=512] - Number of bytes to examine
 * @returns {Promise<boolean>} True if the file appears to be binary
 */
export async function isBinaryFile(filePath, bytesToCheck = 512) {
  let fileHandle;
  
  try {
    fileHandle = await open(filePath, 'r');
    const buffer = Buffer.alloc(bytesToCheck);
    const { bytesRead } = await fileHandle.read(buffer, 0, bytesToCheck, 0);
    
    // Check for null bytes in the read portion
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // If file doesn't exist or can't be read, treat as non-binary
    // (this will be caught elsewhere in the sync process)
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

/**
 * Common binary file extensions for quick lookup
 * Files with these extensions are treated as binary without reading
 */
const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg', '.tiff', '.tif',
  // Audio/Video
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.ogg',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.app', '.dmg',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Database
  '.db', '.sqlite', '.sqlite3',
  // Other
  '.bin', '.iso', '.img'
]);

/**
 * Quick check if a file is binary based on extension
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if extension suggests binary file
 */
export function hasBinaryExtension(filePath) {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if a file is binary using both extension and content
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if the file is binary
 */
export async function isBinary(filePath) {
  // Quick check by extension first
  if (hasBinaryExtension(filePath)) {
    return true;
  }
  
  // Fall back to content inspection
  return isBinaryFile(filePath);
}

export default {
  isBinaryFile,
  hasBinaryExtension,
  isBinary
};
