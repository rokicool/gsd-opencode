/**
 * set-profile.cjs — Switch profile in oc_config.json with three operation modes
 *
 * Command module for managing OpenCode profiles using .planning/oc_config.json:
 * 1. Mode 1 (no profile name): Validate and apply current profile
 * 2. Mode 2 (profile name): Switch to specified profile
 * 3. Mode 3 (inline JSON): Create new profile from definition
 *
 * Features:
 * - Pre-flight validation BEFORE any file modifications
 * - Atomic transaction with rollback on failure
 * - Dry-run mode for previewing changes
 * - Structured JSON output
 *
 * Usage:
 *   node set-profile.cjs                      # Mode 1: validate current
 *   node set-profile.cjs genius               # Mode 2: switch to profile
 *   node set-profile.cjs 'custom:{...}'       # Mode 3: create profile
 *   node set-profile.cjs --dry-run genius     # Preview changes
 */

const fs = require('fs');
const path = require('path');
const { output, error, createBackup } = require('../gsd-oc-lib/oc-core.cjs');
const { applyProfileWithValidation } = require('../gsd-oc-lib/oc-profile-config.cjs');
const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');
const { applyProfileToOpencode } = require('../gsd-oc-lib/oc-config.cjs');

/**
 * Error codes for set-profile operations
 */
const ERROR_CODES = {
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_SYNTAX: 'INVALID_SYNTAX',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_EXISTS: 'PROFILE_EXISTS',
  INVALID_MODELS: 'INVALID_MODELS',
  INCOMPLETE_PROFILE: 'INCOMPLETE_PROFILE',
  WRITE_FAILED: 'WRITE_FAILED',
  APPLY_FAILED: 'APPLY_FAILED',
  ROLLBACK_FAILED: 'ROLLBACK_FAILED',
  MISSING_CURRENT_PROFILE: 'MISSING_CURRENT_PROFILE',
  INVALID_ARGS: 'INVALID_ARGS'
};

/**
 * Parse inline profile definition from argument
 * Expected format: profileName:{"planning":"...", "execution":"...", "verification":"..."}
 *
 * @param {string} arg - Argument string
 * @returns {Object|null} {name, profile} or null if invalid
 */
function parseInlineProfile(arg) {
  const match = arg.match(/^([^:]+):(.+)$/);
  if (!match) {
    return null;
  }

  const [, profileName, profileJson] = match;

  try {
    const profile = JSON.parse(profileJson);
    return { name: profileName, profile };
  } catch (err) {
    return null;
  }
}

/**
 * Validate inline profile definition has all required keys
 *
 * @param {Object} profile - Profile object to validate
 * @returns {Object} {valid: boolean, missingKeys: string[]}
 */
function validateInlineProfile(profile) {
  const requiredKeys = ['planning', 'execution', 'verification'];
  const missingKeys = requiredKeys.filter(key => !profile[key]);

  return {
    valid: missingKeys.length === 0,
    missingKeys
  };
}

/**
 * Validate models against whitelist
 *
 * @param {Object} profile - Profile with planning/execution/verification
 * @param {string[]} validModels - Array of valid model IDs
 * @returns {Object} {valid: boolean, invalidModels: string[]}
 */
function validateProfileModels(profile, validModels) {
  const modelsToCheck = [profile.planning, profile.execution, profile.verification].filter(Boolean);
  const invalidModels = modelsToCheck.filter(model => !validModels.includes(model));

  return {
    valid: invalidModels.length === 0,
    invalidModels
  };
}

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function setProfilePhase16(cwd, args) {
  const verbose = args.includes('--verbose');
  const dryRun = args.includes('--dry-run');
  const raw = args.includes('--raw');

  const log = verbose ? (...args) => console.error('[set-profile]', ...args) : () => {};
  const configPath = path.join(cwd, '.planning', 'oc_config.json');
  const opencodePath = path.join(cwd, 'opencode.json');
  const backupsDir = path.join(cwd, '.planning', 'backups');

  log('Starting set-profile command');

  // Filter flags to get profile argument
  const profileArgs = args.filter(arg => !arg.startsWith('--'));

  // Check for too many arguments
  if (profileArgs.length > 1) {
    error('Too many arguments. Usage: set-profile [profile-name | profileName:JSON] [--dry-run]', 'INVALID_ARGS');
  }

  const profileArg = profileArgs.length > 0 ? profileArgs[0] : null;

  // ========== MODE 3: Inline profile definition ==========
  if (profileArg && profileArg.includes(':')) {
    const parsed = parseInlineProfile(profileArg);

    if (!parsed) {
      error(
        'Invalid profile syntax. Use: profileName:{"planning":"...", "execution":"...", "verification":"..."}',
        'INVALID_SYNTAX'
      );
    }

    const { name: profileName, profile } = parsed;
    log(`Mode 3: Creating inline profile "${profileName}"`);

    // Validate complete profile definition
    const validation = validateInlineProfile(profile);
    if (!validation.valid) {
      error(
        `Profile definition missing required keys: ${validation.missingKeys.join(', ')}`,
        'INCOMPLETE_PROFILE'
      );
    }

    // Get model catalog for validation
    const catalogResult = getModelCatalog();
    if (!catalogResult.success) {
      error(catalogResult.error.message, catalogResult.error.code);
    }

    // Validate models against whitelist
    const modelValidation = validateProfileModels(profile, catalogResult.models);
    if (!modelValidation.valid) {
      error(
        `Invalid models: ${modelValidation.invalidModels.join(', ')}`,
        'INVALID_MODELS'
      );
    }

    log('Inline profile validation passed');

    // Dry-run mode
    if (dryRun) {
      output({
        success: true,
        data: {
          dryRun: true,
          action: 'create_profile',
          profile: profileName,
          models: profile
        }
      });
      process.exit(0);
    }

    // Load or create oc_config.json
    let config = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (err) {
        error(`Failed to parse oc_config.json: ${err.message}`, 'INVALID_JSON');
      }
    }

    // Create backup
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const backupPath = createBackup(configPath, backupsDir);

    // Initialize structure if needed
    if (!config.profiles) config.profiles = {};
    if (!config.profiles.presets) config.profiles.presets = {};

    // Add profile and set as current
    config.profiles.presets[profileName] = profile;
    config.current_oc_profile = profileName;

    // write oc_config.json
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
      log('Updated oc_config.json');
    } catch (err) {
      error(`Failed to write oc_config.json: ${err.message}`, 'WRITE_FAILED');
    }

    // Apply to opencode.json
    const applyResult = applyProfileToOpencode(opencodePath, configPath, profileName);
    if (!applyResult.success) {
      // Rollback
      try {
        if (backupPath) {
          fs.copyFileSync(backupPath, configPath);
        }
      } catch (rollbackErr) {
        error(
          `Failed to apply profile AND failed to rollback: ${rollbackErr.message}`,
          'ROLLBACK_FAILED'
        );
      }
      error(`Failed to apply profile to opencode.json: ${applyResult.error.message}`, 'APPLY_FAILED');
    }

    output({
      success: true,
      data: {
        profile: profileName,
        models: profile,
        backup: backupPath,
        configPath
      }
    });
    process.exit(0);
  }

  // ========== MODE 1 & 2: Use applyProfileWithValidation ==========
  // Load oc_config.json first to determine mode
  let config;
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      error(`Failed to parse oc_config.json: ${err.message}`, 'INVALID_JSON');
    }
  } else {
    error('.planning/oc_config.json not found. Create it with an inline profile definition first.', 'CONFIG_NOT_FOUND');
  }

  const presets = config.profiles?.presets || {};
  const currentProfile = config.current_oc_profile;

  // ========== MODE 2: Profile name provided ==========
  if (profileArg) {
    log(`Mode 2: Switching to profile "${profileArg}"`);

    // Check profile exists
    if (!presets[profileArg]) {
      const available = Object.keys(presets).join(', ') || 'none';
      error(`Profile "${profileArg}" not found. Available profiles: ${available}`, 'PROFILE_NOT_FOUND');
    }

    // Use applyProfileWithValidation for Mode 2
    const result = applyProfileWithValidation(cwd, profileArg, { dryRun, verbose });

    if (!result.success) {
      error(result.error.message, result.error.code || 'UNKNOWN_ERROR');
    }

    if (result.dryRun) {
      output({
        success: true,
        data: {
          dryRun: true,
          action: 'switch_profile',
          profile: profileArg,
          models: result.preview.models,
          changes: result.preview.changes
        }
      });
    } else {
      output({
        success: true,
        data: {
          profile: profileArg,
          models: result.data.models,
          backup: result.data.backup,
          updated: result.data.updated,
          configPath: result.data.configPath
        }
      });
    }
    process.exit(0);
  }

  // ========== MODE 1: No profile name - validate current profile ==========
  log('Mode 1: Validating current profile');

  if (!currentProfile) {
    const available = Object.keys(presets).join(', ') || 'none';
    error(
      `current_oc_profile not set. Available profiles: ${available}`,
      'MISSING_CURRENT_PROFILE'
    );
  }

  if (!presets[currentProfile]) {
    error(
      `Current profile "${currentProfile}" not found in profiles.presets`,
      'PROFILE_NOT_FOUND'
    );
  }

  // Use applyProfileWithValidation for Mode 1
  const result = applyProfileWithValidation(cwd, currentProfile, { dryRun, verbose });

  if (!result.success) {
    error(result.error.message, result.error.code || 'UNKNOWN_ERROR');
  }

  if (result.dryRun) {
    output({
      success: true,
      data: {
        dryRun: true,
        action: 'validate_current',
        profile: currentProfile,
        models: result.preview.models,
        changes: result.preview.changes
      }
    });
  } else {
    output({
      success: true,
      data: {
        profile: currentProfile,
        models: result.data.models,
        backup: result.data.backup,
        updated: result.data.updated,
        configPath: result.data.configPath
      }
    });
  }
  process.exit(0);
}

module.exports = setProfilePhase16;
