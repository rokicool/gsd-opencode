/**
 * oc-profile-config.cjs — Profile configuration operations for oc_config.json
 *
 * Provides functions for loading, validating, and applying profiles from .planning/oc_config.json.
 * Uses separate oc_config.json file (NOT config.json from Phase 15).
 * Follows validate-then-modify pattern with atomic transactions.
 */

const fs = require('fs');
const path = require('path');
const { output, error: outputError, createBackup } = require('./oc-core.cjs');
const { getModelCatalog } = require('./oc-models.cjs');
const { applyProfileToOpencode } = require('./oc-config.cjs');

/**
 * Error codes for oc_config.json operations
 */
const ERROR_CODES = {
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_JSON: 'INVALID_JSON',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  INVALID_MODELS: 'INVALID_MODELS',
  INCOMPLETE_PROFILE: 'INCOMPLETE_PROFILE',
  WRITE_FAILED: 'WRITE_FAILED',
  APPLY_FAILED: 'APPLY_FAILED',
  ROLLBACK_FAILED: 'ROLLBACK_FAILED'
};

/**
 * Load oc_config.json from .planning directory
 *
 * @param {string} cwd - Current working directory
 * @returns {Object} {success: true, config, configPath} or {success: false, error: {code, message}}
 */
function loadOcProfileConfig(cwd) {
  try {
    const configPath = path.join(cwd, '.planning', 'oc_config.json');

    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.CONFIG_NOT_FOUND,
          message: `.planning/oc_config.json not found at ${configPath}`
        }
      };
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);

    return {
      success: true,
      config,
      configPath
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.INVALID_JSON,
          message: `Invalid JSON in oc_config.json: ${err.message}`
        }
      };
    }
    return {
      success: false,
      error: {
        code: ERROR_CODES.CONFIG_NOT_FOUND,
        message: `Failed to read oc_config.json: ${err.message}`
      }
    };
  }
}

/**
 * Validate a profile definition against model whitelist and completeness requirements
 *
 * @param {Object} config - oc_config.json config object
 * @param {string} profileName - Name of profile to validate
 * @param {string[]} validModels - Array of valid model IDs (from getModelCatalog)
 * @returns {Object} {valid: boolean, errors: [{code, message, field}]}
 */
function validateProfile(config, profileName, validModels) {
  const errors = [];

  // Check if profile exists in presets
  const presets = config.profiles?.presets;
  if (!presets || !presets[profileName]) {
    errors.push({
      code: ERROR_CODES.PROFILE_NOT_FOUND,
      message: `Profile "${profileName}" not found in profiles.presets`,
      field: 'profiles.presets'
    });
    return { valid: false, errors };
  }

  const profile = presets[profileName];

  // Check for complete profile definition (all three keys required)
  const requiredKeys = ['planning', 'execution', 'verification'];
  const missingKeys = requiredKeys.filter(key => !profile[key]);

  if (missingKeys.length > 0) {
    errors.push({
      code: ERROR_CODES.INCOMPLETE_PROFILE,
      message: `Profile "${profileName}" is missing required keys: ${missingKeys.join(', ')}`,
      field: 'profiles.presets.' + profileName,
      missingKeys
    });
    // Return early - can't validate models if profile is incomplete
    return { valid: false, errors };
  }

  // Validate all models against whitelist
  const invalidModels = [];
  for (const key of requiredKeys) {
    const modelId = profile[key];
    if (!validModels.includes(modelId)) {
      invalidModels.push({
        key,
        model: modelId,
        reason: 'Model ID not found in opencode models catalog'
      });
    }
  }

  if (invalidModels.length > 0) {
    errors.push({
      code: ERROR_CODES.INVALID_MODELS,
      message: `Profile "${profileName}" contains ${invalidModels.length} invalid model ID(s)`,
      field: 'profiles.presets.' + profileName,
      invalidModels
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply profile with full validation, backup, and atomic transaction
 *
 * @param {string} cwd - Current working directory
 * @param {string} profileName - Name of profile to apply
 * @param {Object} options - Options object
 * @param {boolean} options.dryRun - If true, preview changes without modifications
 * @param {boolean} options.verbose - If true, output progress to console.error
 * @param {Object} options.inlineProfile - Optional inline profile definition to create/update
 * @returns {Object} {success: true, data: {profile, models, backup, updated}} or {success: false, error}
 */
function applyProfileWithValidation(cwd, profileName, options = {}) {
  const { dryRun = false, verbose = false, inlineProfile = null } = options;
  const log = verbose ? (...args) => console.error('[oc-profile-config]', ...args) : () => {};

  // Step 1: Load oc_config.json
  const loadResult = loadOcProfileConfig(cwd);
  if (!loadResult.success) {
    return { success: false, error: loadResult.error };
  }

  const { config, configPath } = loadResult;
  let targetProfileName = profileName;
  let profileToUpdate;

  // Step 2: Handle inline profile definition (Mode 3)
  if (inlineProfile) {
    log('Processing inline profile definition');

    // Check if profile already exists
    const presets = config.profiles?.presets || {};
    if (presets[profileName] && !dryRun) {
      return {
        success: false,
        error: {
          code: 'PROFILE_EXISTS',
          message: `Profile "${profileName}" already exists. Use a different name or remove --inline flag.`
        }
      };
    }

    // Validate inline profile has all required keys
    const requiredKeys = ['planning', 'execution', 'verification'];
    const missingKeys = requiredKeys.filter(key => !inlineProfile[key]);

    if (missingKeys.length > 0) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.INCOMPLETE_PROFILE,
          message: `Inline profile is missing required keys: ${missingKeys.join(', ')}`,
          missingKeys
        }
      };
    }

    profileToUpdate = inlineProfile;
  } else {
    // Step 2: Use existing profile from config
    const presets = config.profiles?.presets;
    if (!presets || !presets[profileName]) {
      const availableProfiles = presets ? Object.keys(presets).join(', ') : 'none';
      return {
        success: false,
        error: {
          code: ERROR_CODES.PROFILE_NOT_FOUND,
          message: `Profile "${profileName}" not found in profiles.presets. Available profiles: ${availableProfiles}`
        }
      };
    }
    profileToUpdate = presets[profileName];
  }

  // Step 3: Get model catalog for validation
  const catalogResult = getModelCatalog();
  if (!catalogResult.success) {
    return { success: false, error: catalogResult.error };
  }
  const validModels = catalogResult.models;

  // Step 4: Validate profile models
  const validation = validateProfile(
    { profiles: { presets: { [targetProfileName]: profileToUpdate } } },
    targetProfileName,
    validModels
  );

  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: validation.errors[0].code,
        message: validation.errors[0].message,
        details: validation.errors
      }
    };
  }

  log('Profile validation passed');

  // Step 5: Dry-run mode - return preview without modifications
  if (dryRun) {
    const opencodePath = path.join(cwd, 'opencode.json');
    return {
      success: true,
      dryRun: true,
      preview: {
        profile: targetProfileName,
        models: {
          planning: profileToUpdate.planning,
          execution: profileToUpdate.execution,
          verification: profileToUpdate.verification
        },
        changes: {
          oc_config: {
            path: configPath,
            updates: {
              current_oc_profile: targetProfileName,
              ...(inlineProfile ? { 'profiles.presets': { [targetProfileName]: profileToUpdate } } : {})
            }
          },
          opencode: {
            path: opencodePath,
            action: fs.existsSync(opencodePath) ? 'update' : 'create',
            agentsToUpdate: getAgentsForProfile(profileToUpdate)
          }
        }
      }
    };
  }

  // Step 6: Create backup of oc_config.json
  log('Creating backup of oc_config.json');
  const backupPath = createBackup(configPath, path.join(cwd, '.planning', 'backups'));
  if (!backupPath) {
    return {
      success: false,
      error: {
        code: 'BACKUP_FAILED',
        message: 'Failed to create backup of oc_config.json'
      }
    };
  }

  // Step 7: Update oc_config.json (atomic transaction start)
  try {
    // Update current_oc_profile
    config.current_oc_profile = targetProfileName;

    // Add inline profile if provided
    if (inlineProfile) {
      if (!config.profiles) config.profiles = {};
      if (!config.profiles.presets) config.profiles.presets = {};
      config.profiles.presets[targetProfileName] = inlineProfile;
    }

    // write updated oc_config.json
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    log('Updated oc_config.json');
  } catch (err) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.WRITE_FAILED,
        message: `Failed to write oc_config.json: ${err.message}`
      }
    };
  }

  // Step 8: Apply to opencode.json
  const opencodePath = path.join(cwd, 'opencode.json');
  const applyResult = applyProfileToOpencode(opencodePath, configPath, targetProfileName);

  if (!applyResult.success) {
    // Step 9: Rollback oc_config.json on failure
    log('Applying to opencode.json failed, rolling back');
    try {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(configPath, backupContent, 'utf8');
      return {
        success: false,
        error: {
          code: ERROR_CODES.APPLY_FAILED,
          message: applyResult.error.message,
          rolledBack: true,
          backupPath
        }
      };
    } catch (rollbackErr) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.ROLLBACK_FAILED,
          message: `Failed to apply profile AND failed to rollback: ${rollbackErr.message}`,
          originalError: applyResult.error,
          backupPath
        }
      };
    }
  }

  log('Successfully applied profile');

  // Step 10: Return success with details
  return {
    success: true,
    data: {
      profile: targetProfileName,
      models: {
        planning: profileToUpdate.planning,
        execution: profileToUpdate.execution,
        verification: profileToUpdate.verification
      },
      backup: backupPath,
      updated: applyResult.updated,
      configPath
    }
  };
}

/**
 * Get list of agent names that should be updated for a profile
 * Helper function for dry-run preview
 *
 * @param {Object} profile - Profile object with planning/execution/verification
 * @returns {Array} Array of {agent, model} objects
 */
function getAgentsForProfile(profile) {
  const PROFILE_AGENT_MAPPING = {
    planning: [
      'gsd-planner',
      'gsd-plan-checker',
      'gsd-phase-researcher',
      'gsd-roadmapper',
      'gsd-project-researcher',
      'gsd-research-synthesizer',
      'gsd-codebase-mapper'
    ],
    execution: [
      'gsd-executor',
      'gsd-debugger'
    ],
    verification: [
      'gsd-verifier',
      'gsd-integration-checker'
    ]
  };

  const agents = [];
  for (const [category, agentNames] of Object.entries(PROFILE_AGENT_MAPPING)) {
    if (profile[category]) {
      for (const agentName of agentNames) {
        agents.push({ agent: agentName, model: profile[category] });
      }
    }
  }
  return agents;
}

module.exports = {
  loadOcProfileConfig,
  validateProfile,
  applyProfileWithValidation,
  getAgentsForProfile,
  ERROR_CODES
};
