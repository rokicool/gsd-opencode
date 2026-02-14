/**
 * Path resolver utility with security-focused traversal protection.
 * 
 * This module provides safe path resolution functions that prevent directory
 * traversal attacks. All functions normalize paths and validate that resolved
 * paths remain within allowed directory boundaries.
 * 
 * SECURITY NOTE: Always validate paths before using them in file operations.
 * The validatePath() function throws descriptive errors for traversal attempts.
 * 
 * @module path-resolver
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Expand a path string, resolving ~ to home directory and relative paths.
 * 
 * @param {string} pathStr - Path string to expand (may contain ~ or relative segments)
 * @returns {string} Absolute, normalized path
 * @throws {Error} If path contains null bytes (potential injection attack)
 * 
 * @example
 * expandPath('~/.config/opencode')
 * // Returns: '/Users/username/.config/opencode' (macOS)
 * 
 * expandPath('./relative/path')
 * // Returns: '/absolute/path/to/relative/path'
 */
export function expandPath(pathStr) {
  if (typeof pathStr !== 'string') {
    throw new Error('Path must be a string');
  }

  // Security: Reject null bytes which could be used for injection attacks
  if (pathStr.includes('\0')) {
    throw new Error('Path contains null bytes');
  }

  let expanded = pathStr;

  // Expand ~ to home directory
  if (expanded.startsWith('~')) {
    expanded = expanded.replace('~', os.homedir());
  }

  // Resolve to absolute path
  const resolved = path.resolve(expanded);

  // Normalize to handle .. and . segments consistently
  return normalizePath(resolved);
}

/**
 * Normalize a path consistently across platforms.
 * 
 * @param {string} pathStr - Path to normalize
 * @returns {string} Normalized path with consistent separators
 */
export function normalizePath(pathStr) {
  if (typeof pathStr !== 'string') {
    throw new Error('Path must be a string');
  }

  // Use path.normalize() to resolve .. and . segments
  // This ensures consistent path representation across platforms
  return path.normalize(pathStr);
}

/**
 * Check if a child path is within a parent path.
 * 
 * @param {string} childPath - Path to check (child candidate)
 * @param {string} parentPath - Parent directory path
 * @returns {boolean} True if child is within or equal to parent
 * 
 * @example
 * isSubPath('/home/user/.config', '/home/user')  // true
 * isSubPath('/home/user', '/home/user')           // true
 * isSubPath('/etc/passwd', '/home/user')          // false
 */
export function isSubPath(childPath, parentPath) {
  if (typeof childPath !== 'string' || typeof parentPath !== 'string') {
    throw new Error('Paths must be strings');
  }

  // Normalize both paths to ensure consistent comparison
  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentPath);

  // Get relative path from parent to child
  const relative = path.relative(normalizedParent, normalizedChild);

  // If relative path starts with '..', child is outside parent
  // Empty string means same path
  // Path starting without '..' means child is inside or equal to parent
  if (relative === '') {
    return true; // Same path
  }

  // On Windows, relative paths don't use .. for same-level directories
  // Check if relative path contains '..' at the start
  return !relative.startsWith('..');
}

/**
 * Validate that a target path does not escape an allowed base directory.
 * 
 * SECURITY CRITICAL: This function must be called before any file operation
 * that uses user-provided paths. It prevents directory traversal attacks
 * where malicious input like '../../../etc/passwd' attempts to access
 * files outside the intended directory.
 * 
 * @param {string} targetPath - Path to validate
 * @param {string} allowedBasePath - Base directory the target must remain within
 * @returns {string} The resolved, validated absolute path
 * @throws {Error} If path escapes allowed base directory (traversal detected)
 * @throws {Error} If path contains null bytes
 * 
 * @example
 * validatePath('/home/user/.config/opencode', '/home/user')  // OK
 * validatePath('/etc/passwd', '/home/user')                   // Throws error
 * 
 * // Handles symlink resolution
 * const realTarget = fs.realpathSync(targetPath);
 * validatePath(realTarget, allowedBasePath);
 */
export function validatePath(targetPath, allowedBasePath) {
  if (typeof targetPath !== 'string' || typeof allowedBasePath !== 'string') {
    throw new Error('Paths must be strings');
  }

  // Security: Reject null bytes
  if (targetPath.includes('\0')) {
    throw new Error('Path contains null bytes');
  }

  // Expand and normalize both paths
  const resolvedTarget = expandPath(targetPath);
  const resolvedBase = expandPath(allowedBasePath);

  // Check if target is within allowed base
  if (!isSubPath(resolvedTarget, resolvedBase)) {
    throw new Error(
      'Path traversal detected. Use absolute or relative paths within allowed directories.'
    );
  }

  return resolvedTarget;
}

/**
 * Validate a path after resolving symlinks.
 * 
 * Symlinks can be used to bypass directory restrictions by pointing to
 * locations outside the allowed base. This function resolves symlinks
 * before validation to ensure the actual file location is checked.
 * 
 * @param {string} targetPath - Path to validate (may contain symlinks)
 * @param {string} allowedBasePath - Base directory the target must remain within
 * @returns {Promise<string>} The real, resolved absolute path
 * @throws {Error} If path escapes allowed base directory after symlink resolution
 * 
 * @example
 * // If ~/.config is a symlink to /etc/config:
 * await validatePathSafe('~/.config/opencode', os.homedir());
 * // Throws error because resolved path is outside homedir
 */
export async function validatePathSafe(targetPath, allowedBasePath) {
  const expandedTarget = expandPath(targetPath);
  
  try {
    // Resolve symlinks to get the real path
    const realTarget = await fs.promises.realpath(expandedTarget);
    
    // Now validate the resolved path
    return validatePath(realTarget, allowedBasePath);
  } catch (error) {
    // If realpath fails (file doesn't exist), validate the non-resolved path
    // This allows validation of paths that will be created
    if (error.code === 'ENOENT') {
      return validatePath(expandedTarget, allowedBasePath);
    }
    throw error;
  }
}

/**
 * Synchronous version of validatePathSafe.
 * 
 * @param {string} targetPath - Path to validate (may contain symlinks)
 * @param {string} allowedBasePath - Base directory the target must remain within
 * @returns {string} The real, resolved absolute path
 * @throws {Error} If path escapes allowed base directory after symlink resolution
 */
export function validatePathSafeSync(targetPath, allowedBasePath) {
  const expandedTarget = expandPath(targetPath);
  
  try {
    // Resolve symlinks synchronously
    const realTarget = fs.realpathSync(expandedTarget);
    
    // Now validate the resolved path
    return validatePath(realTarget, allowedBasePath);
  } catch (error) {
    // If realpath fails (file doesn't exist), validate the non-resolved path
    if (error.code === 'ENOENT') {
      return validatePath(expandedTarget, allowedBasePath);
    }
    throw error;
  }
}

/**
 * Default export combining all path resolver functions.
 */
export default {
  expandPath,
  normalizePath,
  isSubPath,
  validatePath,
  validatePathSafe,
  validatePathSafeSync
};
