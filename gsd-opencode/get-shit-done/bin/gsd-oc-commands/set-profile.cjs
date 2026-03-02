/**
 * set-profile.cjs — Switch profile with interactive model selection
 *
 * Command module that handles the full profile switching workflow:
 * 1. Load and validate config
 * 2. Display current state
 * 3. Determine target profile (arg or interactive)
 * 4. Handle --reuse flag with analyze-reuse
 * 5. Model selection wizard
 * 6. Validate selected models
 * 7. Apply changes (config.json + opencode.json)
 * 8. Report success
 *
 * Usage: node set-profile.cjs [simple|smart|genius] [--reuse] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { output, error, createBackup } = require('../gsd-oc-lib/oc-core.cjs');
const { applyProfileToOpencode, VALID_PROFILES, PROFILE_AGENT_MAPPING } = require('../gsd-oc-lib/oc-config.cjs');
const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');

const LEGACY_PROFILE_MAP = {
  quality: 'genius',
  balanced: 'smart',
  budget: 'simple'
};

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

  // Check for legacy config and auto-migrate
  let migrationOccurred = false;
  let oldProfile = null;
  if (config.model_profile && !config.profiles?.profile_type) {
    oldProfile = config.model_profile;
    const newProfileType = LEGACY_PROFILE_MAP[oldProfile] || 'genius';
    
    config.profiles = config.profiles || {};
    config.profiles.profile_type = newProfileType;
    config.profiles.models = {
      planning: 'opencode/default',
      execution: 'opencode/default',
      verification: 'opencode/default'
    };
    migrationOccurred = true;
    
    if (verbose) {
      console.error(`[verbose] Auto-migrated from ${oldProfile} to ${newProfileType}`);
    }
  }

  const profiles = config.profiles || {};
  const currentProfileType = profiles.profile_type || config.profile_type;
  const currentModels = profiles.models || {};

  // Get target profile from args or mark for interactive
  let targetProfile = args.find(arg => VALID_PROFILES.includes(arg));
  const isInteractive = !targetProfile;

  // Step 3: Display current state (output for workflow to display)
  const currentState = {
    hasProfile: !!currentProfileType,
    profileType: currentProfileType,
    models: {
      planning: currentModels.planning || '(not set)',
      execution: currentModels.execution || '(not set)',
      verification: currentModels.verification || '(not set)'
    }
  };

  // Step 6: Model selection wizard output
  const requiredStages = getRequiredStages(targetProfile);
  const modelSelectionPrompt = {
    mode: 'model_selection',
    targetProfile,
    stages: requiredStages,
    currentModels: {
      planning: currentModels.planning,
      execution: currentModels.execution,
      verification: currentModels.verification
    },
    prompt: buildModelSelectionPrompts(targetProfile, currentModels)
  };

  if (raw) {
    output(modelSelectionPrompt, true, JSON.stringify(modelSelectionPrompt.prompt));
  } else {
    output({ success: true, data: modelSelectionPrompt });
  }

  process.exit(0);
}

/**
 * Get required stages for profile type
 */
function getRequiredStages(profileType) {
  switch (profileType) {
    case 'simple':
      return ['planning'];
    case 'smart':
      return ['planning', 'verification'];
    case 'genius':
      return ['planning', 'execution', 'verification'];
    default:
      return [];
  }
}

/**
 * Build model selection prompts based on profile type
 */
function buildModelSelectionPrompts(profileType, currentModels) {
  const prompts = [];

  if (profileType === 'simple') {
    prompts.push({
      stage: 'all',
      context: 'Simple Profile - One model to rule them all',
      current: currentModels.planning
    });
  } else if (profileType === 'smart') {
    prompts.push({
      stage: 'planning_execution',
      context: 'Smart Profile - Planning & Execution',
      current: currentModels.planning
    });
    prompts.push({
      stage: 'verification',
      context: 'Smart Profile - Verification',
      current: currentModels.verification
    });
  } else if (profileType === 'genius') {
    prompts.push({
      stage: 'planning',
      context: 'Genius Profile - Planning',
      current: currentModels.planning
    });
    prompts.push({
      stage: 'execution',
      context: 'Genius Profile - Execution',
      current: currentModels.execution
    });
    prompts.push({
      stage: 'verification',
      context: 'Genius Profile - Verification',
      current: currentModels.verification
    });
  }

  return prompts;
}

/**
 * Apply profile changes to config files (called after model selection)
 */
function applyProfileChanges(cwd, targetProfile, models, verbose = false) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const opencodePath = path.join(cwd, 'opencode.json');

  // Validate models
  const catalogResult = getModelCatalog();
  if (!catalogResult.success) {
    return {
      success: false,
      error: { code: 'FETCH_FAILED', message: catalogResult.error.message }
    };
  }

  const validModels = catalogResult.models;
  const invalidModels = [];

  for (const modelId of Object.values(models)) {
    if (!validModels.includes(modelId)) {
      invalidModels.push(modelId);
    }
  }

  if (invalidModels.length > 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_MODELS',
        message: `Invalid model IDs: ${invalidModels.join(', ')}`
      }
    };
  }

  // Create backups
  const configBackup = createBackup(configPath);
  const opencodeBackup = fs.existsSync(opencodePath) ? createBackup(opencodePath) : null;

  if (verbose) {
    console.error(`[verbose] Config backup: ${configBackup}`);
    if (opencodeBackup) {
      console.error(`[verbose] Opencode backup: ${opencodeBackup}`);
    }
  }

  // Update config.json
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    return {
      success: false,
      error: { code: 'INVALID_JSON', message: 'Failed to parse config.json' }
    };
  }

  config.profiles = config.profiles || {};
  config.profiles.profile_type = targetProfile;
  config.profiles.models = {
    planning: models.planning,
    execution: models.execution || models.planning,
    verification: models.verification || models.planning
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  } catch (err) {
    return {
      success: false,
      error: { code: 'WRITE_FAILED', message: `Failed to write config.json: ${err.message}` }
    };
  }

  // Update opencode.json if exists
  let updatedAgents = [];
  if (fs.existsSync(opencodePath)) {
    const applyResult = applyProfileToOpencode(opencodePath, configPath);
    if (!applyResult.success) {
      return applyResult;
    }
    updatedAgents = applyResult.updated;
  }

  return {
    success: true,
    data: {
      profileType: targetProfile,
      models: config.profiles.models,
      configBackup,
      opencodeBackup,
      updated: updatedAgents.map(u => u.agent)
    }
  };
}

module.exports = setProfile;
