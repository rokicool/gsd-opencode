/**
 * set-profile.cjs — Switch profile with validation and two operation modes
 *
 * Command module that handles profile switching with comprehensive validation:
 * 1. Validate config.json exists
 * 2. Support two operation modes:
 *    - Mode 1 (no profile name): Validate current profile and apply
 *    - Mode 2 (profile name provided): Validate and apply specified profile
 * 3. Model validation BEFORE any file modifications
 * 4. Create backups before modifications
 * 5. Apply changes atomically
 * 6. Output structured JSON
 *
 * Usage: node set-profile.cjs [profile-name] [--raw] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { output, error, createBackup } = require('../gsd-oc-lib/oc-core.cjs');
const { applyProfileToOpencode, VALID_PROFILES, PROFILE_AGENT_MAPPING } = require('../gsd-oc-lib/oc-config.cjs');
const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function setProfile(cwd, args) {
  const verbose = args.includes('--verbose');
  const raw = args.includes('--raw');
  
  const configPath = path.join(cwd, '.planning', 'config.json');
  const opencodePath = path.join(cwd, 'opencode.json');
  const backupsDir = path.join(cwd, '.planning', 'backups');

  // Step 1: Load and validate config
  if (!fs.existsSync(configPath)) {
    error('No GSD project found. Run /gsd-new-project first.', 'CONFIG_NOT_FOUND');
  }

  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    error('Failed to parse .planning/config.json', 'INVALID_JSON');
  }

  // Ensure profiles.presets exists
  if (!config.profiles || !config.profiles.presets) {
    error('config.json missing profiles.presets structure', 'INVALID_CONFIG');
  }

  const presets = config.profiles.presets;
  const currentProfileName = config.current_oc_profile;
  
  // Filter out flags to get profile name argument
  const profileArgs = args.filter(arg => !arg.startsWith('--'));
  
  // Check for unknown profile arguments
  if (profileArgs.length > 1) {
    error(`Too many arguments. Usage: set-profile [profile-name]`, 'INVALID_ARGS');
  }
  
  const targetProfile = profileArgs.length > 0 ? profileArgs[0] : null;
  
  // Validate profile argument if provided
  if (targetProfile && !presets[targetProfile]) {
    const availableProfiles = Object.keys(presets).join(', ');
    error(`Profile "${targetProfile}" not found. Available profiles: ${availableProfiles}`, 'PROFILE_NOT_FOUND');
  }

  // ========== MODE 2: Profile name provided ==========
  if (targetProfile) {
    if (verbose) {
      console.error(`[verbose] Mode 2: Setting profile to "${targetProfile}"`);
    }
    
    const result = applyProfileWithValidation(cwd, targetProfile, config, presets, verbose);
    
    if (!result.success) {
      error(result.error.message, result.error.code);
    }
    
    if (raw) {
      output(result.data, true, JSON.stringify(result.data, null, 2));
    } else {
      output({ success: true, data: result.data });
    }
    process.exit(0);
  }

  // ========== MODE 1: No profile name - validate current profile ==========
  if (!currentProfileName) {
    error(
      `No current profile set. Run set-profile with a profile name first.\nAvailable profiles: ${Object.keys(presets).join(', ')}`,
      'MISSING_CURRENT_PROFILE'
    );
  }
  
  if (!presets[currentProfileName]) {
    error(
      `Current profile "${currentProfileName}" not found in profiles.presets.\nAvailable profiles: ${Object.keys(presets).join(', ')}`,
      'PROFILE_NOT_FOUND'
    );
  }
  
  if (verbose) {
    console.error(`[verbose] Mode 1: Validating current profile "${currentProfileName}"`);
  }
  
  const result = applyProfileWithValidation(cwd, currentProfileName, config, presets, verbose);
  
  if (!result.success) {
    error(result.error.message, result.error.code);
  }
  
  if (raw) {
    output(result.data, true, JSON.stringify(result.data, null, 2));
  } else {
    output({ success: true, data: result.data });
  }
  process.exit(0);
}

/**
 * Apply profile with comprehensive validation
 * Validates models BEFORE any file modifications
 *
 * @param {string} cwd - Current working directory
 * @param {string} profileName - Profile name to apply
 * @param {Object} config - Parsed config.json
 * @param {Object} presets - profiles.presets object
 * @param {boolean} verbose - Verbose output
 * @returns {Object} {success, data, error}
 */
function applyProfileWithValidation(cwd, profileName, config, presets, verbose = false) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const opencodePath = path.join(cwd, 'opencode.json');
  const backupsDir = path.join(cwd, '.planning', 'backups');

  // Step 1: Validate ALL models BEFORE any modifications
  const profileModels = presets[profileName];
  const modelIdsToValidate = [
    profileModels.planning,
    profileModels.execution,
    profileModels.verification
  ].filter(Boolean);

  const catalogResult = getModelCatalog();
  if (!catalogResult.success) {
    return {
      success: false,
      error: { code: 'FETCH_FAILED', message: catalogResult.error.message }
    };
  }

  const validModels = catalogResult.models;
  const invalidModels = [];

  for (const modelId of modelIdsToValidate) {
    if (!validModels.includes(modelId)) {
      invalidModels.push(modelId);
    }
  }

  if (invalidModels.length > 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_MODELS',
        message: `Profile '${profileName}' contains invalid models: ${invalidModels.join(', ')}`
      }
    };
  }

  if (verbose) {
    console.error(`[verbose] Model validation passed for profile "${profileName}"`);
  }

  // Step 2: Create backups directory
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Step 3: Create backups BEFORE modifications
  const configBackup = createBackup(configPath, backupsDir);
  const opencodeBackup = fs.existsSync(opencodePath) ? createBackup(opencodePath, backupsDir) : null;

  if (verbose) {
    console.error(`[verbose] Config backup: ${configBackup}`);
    if (opencodeBackup) {
      console.error(`[verbose] Opencode backup: ${opencodeBackup}`);
    }
  }

  // Step 4: Update config.json with current_oc_profile
  config.current_oc_profile = profileName;
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  } catch (err) {
    return {
      success: false,
      error: { code: 'WRITE_FAILED', message: `Failed to write config.json: ${err.message}` }
    };
  }

  // Step 5: Update opencode.json with profile models
  const applyResult = applyProfileToOpencode(opencodePath, configPath, profileName);
  if (!applyResult.success) {
    return applyResult;
  }

  return {
    success: true,
    data: {
      profile: profileName,
      models: {
        planning: profileModels.planning,
        execution: profileModels.execution,
        verification: profileModels.verification
      },
      updated: applyResult.updated.map(u => u.agent),
      backups: {
        config: configBackup,
        opencode: opencodeBackup
      }
    }
  };
}

module.exports = setProfile;
