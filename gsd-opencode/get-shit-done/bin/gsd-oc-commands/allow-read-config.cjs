/**
 * allow-read-config.cjs — Add external_directory permission to read GSD config folder
 *
 * Creates or updates local opencode.json with permission to access:
 * ~/.config/opencode/get-shit-done/
 *
 * This allows gsd-opencode commands to read workflow files, templates, and
 * configuration from the global GSD installation directory.
 *
 * Usage:
 *   node allow-read-config.cjs                    # Add read permission
 *   node allow-read-config.cjs --dry-run          # Preview changes
 *   node allow-read-config.cjs --verbose          # Verbose output
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { output, error, createBackup } = require('../gsd-oc-lib/oc-core.cjs');

/**
 * Error codes for allow-read-config operations
 */
const ERROR_CODES = {
  WRITE_FAILED: 'WRITE_FAILED',
  APPLY_FAILED: 'APPLY_FAILED',
  ROLLBACK_FAILED: 'ROLLBACK_FAILED',
  INVALID_ARGS: 'INVALID_ARGS'
};

/**
 * Get the GSD config directory path
 * Uses environment variable if set, otherwise defaults to ~/.config/opencode/get-shit-done
 *
 * @returns {string} GSD config directory path
 */
function getGsdConfigDir() {
  const envDir = process.env.OPENCODE_CONFIG_DIR;
  if (envDir) {
    return envDir;
  }
  
  const homeDir = os.homedir();
  return path.join(homeDir, '.config', 'opencode', 'get-shit-done');
}

/**
 * Build the external_directory permission pattern
 *
 * @param {string} gsdDir - GSD config directory
 * @returns {string} Permission pattern with wildcard
 */
function buildPermissionPattern(gsdDir) {
  // Use ** for recursive matching (all subdirectories and files)
  return `${gsdDir}/**`;
}

/**
 * Check if permission already exists in opencode.json
 *
 * @param {Object} opencodeData - Parsed opencode.json content
 * @param {string} pattern - Permission pattern to check
 * @returns {boolean} True if permission exists
 */
function permissionExists(opencodeData, pattern) {
  const permissions = opencodeData.permission;
  
  if (!permissions) {
    return false;
  }
  
  const externalDirPerms = permissions.external_directory;
  if (!externalDirPerms || typeof externalDirPerms !== 'object') {
    return false;
  }
  
  // Check if the pattern exists and is set to "allow"
  return externalDirPerms[pattern] === 'allow';
}

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function allowReadConfig(cwd, args) {
  const verbose = args.includes('--verbose');
  const dryRun = args.includes('--dry-run');
  const raw = args.includes('--raw');
  
  const log = verbose ? (...args) => console.error('[allow-read-config]', ...args) : () => {};
  
  const opencodePath = path.join(cwd, 'opencode.json');
  const backupsDir = path.join(cwd, '.planning', 'backups');
  const gsdConfigDir = getGsdConfigDir();
  const permissionPattern = buildPermissionPattern(gsdConfigDir);
  
  log('Starting allow-read-config command');
  log(`GSD config directory: ${gsdConfigDir}`);
  log(`Permission pattern: ${permissionPattern}`);
  
  // Check for invalid arguments
  const validFlags = ['--verbose', '--dry-run', '--raw'];
  const invalidArgs = args.filter(arg => 
    arg.startsWith('--') && !validFlags.includes(arg)
  );
  
  if (invalidArgs.length > 0) {
    error(`Unknown arguments: ${invalidArgs.join(', ')}`, 'INVALID_ARGS');
  }
  
  // Load or create opencode.json
  let opencodeData;
  let fileExisted = false;
  
  if (fs.existsSync(opencodePath)) {
    try {
      const content = fs.readFileSync(opencodePath, 'utf8');
      opencodeData = JSON.parse(content);
      fileExisted = true;
      log('Loaded existing opencode.json');
    } catch (err) {
      error(`Failed to parse opencode.json: ${err.message}`, 'INVALID_JSON');
    }
  } else {
    // Create initial opencode.json structure
    opencodeData = {
      "$schema": "https://opencode.ai/config.json"
    };
    log('Creating new opencode.json');
  }
  
  // Check if permission already exists
  const exists = permissionExists(opencodeData, permissionPattern);
  
  if (exists) {
    log('Permission already exists');
    output({
      success: true,
      data: {
        dryRun: dryRun,
        action: 'permission_exists',
        pattern: permissionPattern,
        message: 'Permission already configured'
      }
    });
    process.exit(0);
  }
  
  // Dry-run mode - preview changes
  if (dryRun) {
    log('Dry-run mode - no changes will be made');
    
    const changes = [];
    if (!fileExisted) {
      changes.push('Create opencode.json');
    }
    changes.push(`Add external_directory permission: ${permissionPattern}`);
    
    output({
      success: true,
      data: {
        dryRun: true,
        action: 'add_permission',
        pattern: permissionPattern,
        gsdConfigDir: gsdConfigDir,
        changes: changes,
        message: fileExisted ? 'Would update opencode.json' : 'Would create opencode.json'
      }
    });
    process.exit(0);
  }
  
  // Create backup if file exists
  let backupPath = null;
  if (fileExisted) {
    // Ensure backup directory exists
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    backupPath = createBackup(opencodePath, backupsDir);
    log(`Backup created: ${backupPath}`);
  }
  
  // Initialize permission structure if needed
  if (!opencodeData.permission) {
    opencodeData.permission = {};
  }
  
  if (!opencodeData.permission.external_directory) {
    opencodeData.permission.external_directory = {};
  }
  
  // Add the permission
  opencodeData.permission.external_directory[permissionPattern] = 'allow';
  
  log('Permission added to opencode.json');
  
  // Write updated opencode.json
  try {
    fs.writeFileSync(opencodePath, JSON.stringify(opencodeData, null, 2) + '\n', 'utf8');
    log('Updated opencode.json');
  } catch (err) {
    // Rollback if backup exists
    if (backupPath) {
      try {
        fs.copyFileSync(backupPath, opencodePath);
      } catch (rollbackErr) {
        error(
          `Failed to write opencode.json AND failed to rollback: ${rollbackErr.message}`,
          'ROLLBACK_FAILED'
        );
      }
    }
    error(`Failed to write opencode.json: ${err.message}`, 'WRITE_FAILED');
  }
  
  output({
    success: true,
    data: {
      action: 'add_permission',
      pattern: permissionPattern,
      gsdConfigDir: gsdConfigDir,
      opencodePath: opencodePath,
      backup: backupPath,
      created: !fileExisted,
      message: fileExisted ? 'opencode.json updated' : 'opencode.json created'
    }
  });
  process.exit(0);
}

module.exports = allowReadConfig;
