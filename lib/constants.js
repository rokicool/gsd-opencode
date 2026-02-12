/**
 * Shared constants for the GSD-OpenCode CLI.
 * 
 * This module centralizes all configuration values, file paths, and error codes
 * used throughout the CLI to ensure consistency and maintainability.
 * 
 * All exports are immutable constants. Do not modify these values at runtime.
 * 
 * @module constants
 */

/**
 * Default global configuration directory path.
 * Resolved relative to user's home directory.
 * @type {string}
 * @example
 * // On macOS/Linux: ~/.config/opencode
 * // On Windows: ~\AppData\Roaming\opencode
 */
export const DEFAULT_CONFIG_DIR = '.config/opencode';

/**
 * Local configuration directory name.
 * Created in the current working directory for project-specific configuration.
 * @type {string}
 * @example
 * // Creates: ./.opencode/ in project root
 */
export const LOCAL_CONFIG_DIR = '.opencode';

/**
 * Name of the version tracking file.
 * Used to store the installed version of GSD-OpenCode.
 * Stored in get-shit-done/ directory since it's fully owned by gsd-opencode.
 * @type {string}
 */
export const VERSION_FILE = 'get-shit-done/VERSION';

/**
 * Regex patterns for path replacement in markdown files.
 * These patterns are used to update internal references during installation.
 * @type {Object.<string, RegExp>}
 */
export const PATH_PATTERNS = {
  /**
   * Pattern to match @gsd-opencode/ references in markdown files.
   * Used for replacing package references with actual paths.
   */
  gsdReference: /@gsd-opencode\//g
};

/**
 * Source directories to copy during installation.
 * These directories contain the core GSD-OpenCode assets.
 * @type {string[]}
 */
export const DIRECTORIES_TO_COPY = ['agents', 'command', 'get-shit-done'];

/**
 * Name of the manifest file that tracks all installed files.
 * Used for safe uninstallation with namespace protection.
 * @type {string}
 */
export const MANIFEST_FILENAME = 'INSTALLED_FILES.json';

/**
 * Directory name for uninstall backups.
 * Created within the installation directory to store backups before removal.
 * @type {string}
 */
export const UNINSTALL_BACKUP_DIR = '.uninstall-backups';

/**
 * Allowed namespace patterns for safe uninstallation.
 * Files in these namespaces are safe to delete during uninstall.
 * Files outside these namespaces are NEVER deleted, even if tracked.
 *
 * Patterns:
 * - agents/gsd-* (gsd-opencode specific agents)
 * - command/gsd/* (gsd-opencode specific commands)
 * - skills/gsd-* (gsd-opencode specific skills)
 * - get-shit-done/* (fully owned by gsd-opencode)
 *
 * @type {RegExp[]}
 */
export const ALLOWED_NAMESPACES = [
  /^agents\/gsd-/,     // agents/gsd-* directories
  /^command\/gsd\//,   // command/gsd/* files
  /^skills\/gsd-/,     // skills/gsd-* directories
  /^get-shit-done\//   // get-shit-done/ directory - fully owned
];

/**
 * Exit codes for different failure modes.
 * Follows Unix convention where 0 = success, non-zero = error.
 * @type {Object.<string, number>}
 */
export const ERROR_CODES = {
  /** Operation completed successfully. */
  SUCCESS: 0,
  
  /** General error occurred (unspecified failure). */
  GENERAL_ERROR: 1,
  
  /** Permission denied (insufficient file system permissions). */
  PERMISSION_ERROR: 2,
  
  /** Path traversal detected (security violation). */
  PATH_TRAVERSAL: 3,
  
  /** Process interrupted by user (SIGINT, Ctrl+C). */
  INTERRUPTED: 130
};

/**
 * Default export combining all constants.
 * Useful for importing all constants at once.
 * 
 * @example
 * import constants from './lib/constants.js';
 * console.log(constants.DEFAULT_CONFIG_DIR);
 */
export default {
  DEFAULT_CONFIG_DIR,
  LOCAL_CONFIG_DIR,
  VERSION_FILE,
  PATH_PATTERNS,
  DIRECTORIES_TO_COPY,
  MANIFEST_FILENAME,
  UNINSTALL_BACKUP_DIR,
  ALLOWED_NAMESPACES,
  ERROR_CODES
};
