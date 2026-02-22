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
  gsdReference: /@gsd-opencode\//g,
  /**
   * Pattern to match @~/.config/opencode/ references in markdown files.
   * These are absolute references to the global config that need to be
   * replaced for local installs.
   */
  absoluteReference: /@~\/\.config\/opencode\//g,
  /**
   * Pattern to match bare ~/.config/opencode/ references (without @ prefix).
   * These appear in workflow files that call gsd-tools.cjs directly.
   * Must be replaced for both global and local installs to ensure correct paths.
   */
  tildeConfigReference: /~\/\.config\/opencode\//g
};

/**
 * Source directories to copy during installation.
 * These directories contain the core GSD-OpenCode assets.
 * 
 * All directories use the 'commands' (plural) structure consistently
 * in both source and destination. The FileOperations service copies
 * files directly from source to target without path transformation.
 * 
 * @type {string[]}
 */
export const DIRECTORIES_TO_COPY = ['agents', 'commands', 'get-shit-done'];

/**
 * Command directory mapping for source-to-destination path transformation.
 * 
 * Since the source package now uses 'commands/' (plural) and the destination
 * also uses 'commands/' (plural), this mapping ensures consistency.
 * This enables future transformations if needed.
 * 
 * @type {Object.<string, string>}
 * @example
 * // During install, files from sourceDir/commands/gsd/ are copied to targetDir/commands/gsd/
 * const sourceDirName = COMMAND_DIR_MAPPING[destDirName]; // 'commands'
 */
export const COMMAND_DIR_MAPPING = {
  'commands': 'commands'  // Both source and destination use 'commands/'
};

/**
 * Name of the manifest file that tracks all installed files.
 * Used for safe uninstallation with namespace protection.
 * Stored in get-shit-done/ directory since it's fully owned by gsd-opencode.
 * @type {string}
 */
export const MANIFEST_FILENAME = 'get-shit-done/INSTALLED_FILES.json';

/**
 * Directory name for uninstall backups.
 * Created within the installation directory to store backups before removal.
 * @type {string}
 */
export const UNINSTALL_BACKUP_DIR = '.backups';

/**
 * Legacy command directory name (singular).
 * Used for detecting and migrating old installations.
 * @type {string}
 */
export const OLD_COMMAND_DIR = 'command';

/**
 * New command directory name (plural).
 * Used as the default for fresh installations.
 * @type {string}
 */
export const NEW_COMMAND_DIR = 'commands';

/**
 * Structure type constants for directory structure detection.
 * Used to identify which command directory structure is present.
 * @type {Object.<string, string>}
 */
export const STRUCTURE_TYPES = {
  /** Legacy structure: command/gsd/ (singular) */
  OLD: 'old',
  
  /** New structure: commands/gsd/ (plural) */
  NEW: 'new',
  
  /** Both structures exist (dual/migration state) */
  DUAL: 'dual',
  
  /** Neither structure exists (fresh install) */
  NONE: 'none'
};

/**
 * Allowed namespace patterns for safe uninstallation.
 * Files in these namespaces are safe to delete during uninstall.
 * Files outside these namespaces are NEVER deleted, even if tracked.
 *
 * Patterns:
 * - agents/gsd-* (gsd-opencode specific agents)
 * - command/gsd/* (gsd-opencode specific commands - legacy)
 * - commands/gsd/* (gsd-opencode specific commands - new)
 * - skills/gsd-* (gsd-opencode specific skills)
 * - get-shit-done/* (fully owned by gsd-opencode)
 *
 * @type {RegExp[]}
 */
export const ALLOWED_NAMESPACES = [
  /^agents\/gsd-/,      // agents/gsd-* directories
  /^command\/gsd\//,    // command/gsd/* files (legacy structure)
  /^commands\/gsd\//,   // commands/gsd/* files (new structure)
  /^skills\/gsd-/,      // skills/gsd-* directories
  /^get-shit-done\//    // get-shit-done/ directory - fully owned
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
  OLD_COMMAND_DIR,
  NEW_COMMAND_DIR,
  STRUCTURE_TYPES,
  ALLOWED_NAMESPACES,
  ERROR_CODES
};
