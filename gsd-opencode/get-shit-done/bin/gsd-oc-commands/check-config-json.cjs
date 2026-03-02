/**
 * check-config-json.cjs — Validate profile configuration in .planning/config.json
 *
 * Command module that validates .planning/config.json profile configuration.
 * Validates:
 * - current_oc_profile field exists and is one of: simple|smart|genius
 * - profiles.profile_type is one of: simple|smart|genius
 * - profiles.models contains planning, execution, verification keys
 * - All model IDs exist in opencode models catalog
 * Outputs JSON envelope format with validation results.
 *
 * Usage: node check-config-json.cjs [cwd]
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('../gsd-oc-lib/oc-core.cjs');
const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');

const VALID_PROFILES = ['simple', 'smart', 'genius'];

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function checkConfigJson(cwd, args) {
  const verbose = args.includes('--verbose');
  const configPath = path.join(cwd, '.planning', 'config.json');

  // Check if config.json exists
  if (!fs.existsSync(configPath)) {
    error('.planning/config.json not found', 'CONFIG_NOT_FOUND');
  }

  // Read and parse config
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      error('.planning/config.json is not valid JSON', 'INVALID_JSON');
    }
    error(`Failed to read config: ${err.message}`, 'READ_FAILED');
  }

  const issues = [];

  // Validate current_oc_profile field (required, must be valid profile name)
  if (config.current_oc_profile === undefined) {
    issues.push({
      field: 'current_oc_profile',
      value: '(missing)',
      reason: 'current_oc_profile field is required'
    });
  } else if (!VALID_PROFILES.includes(config.current_oc_profile)) {
    issues.push({
      field: 'current_oc_profile',
      value: config.current_oc_profile,
      reason: `Must be one of: ${VALID_PROFILES.join(', ')}`
    });
  }

  // Validate profiles section exists
  if (!config.profiles || typeof config.profiles !== 'object') {
    issues.push({
      field: 'profiles',
      value: '(missing or invalid)',
      reason: 'profiles section is required'
    });
    const result = {
      success: false,
      data: {
        passed: false,
        current_oc_profile: config.current_oc_profile || null,
        issues
      },
      error: {
        code: 'INVALID_PROFILE',
        message: `${issues.length} invalid profile configuration(s) found`
      }
    };
    output(result);
    process.exit(1);
  }

  // Validate profiles.profile_type (must be valid profile name)
  if (config.profiles.profile_type === undefined) {
    issues.push({
      field: 'profiles.profile_type',
      value: '(missing)',
      reason: 'profile_type is required'
    });
  } else if (!VALID_PROFILES.includes(config.profiles.profile_type)) {
    issues.push({
      field: 'profiles.profile_type',
      value: config.profiles.profile_type,
      reason: `Must be one of: ${VALID_PROFILES.join(', ')}`
    });
  }

  // Validate profiles.models structure exists
  if (!config.profiles.models || typeof config.profiles.models !== 'object') {
    issues.push({
      field: 'profiles.models',
      value: '(missing)',
      reason: 'profiles.models section is required'
    });
  } else {
    // Validate models for current_oc_profile stages
    const currentProfile = config.current_oc_profile;
    const models = config.profiles.models;

    // Get required stages based on current profile
    const requiredStages = getRequiredStages(currentProfile);

    // Check if required stage models are defined
    for (const stage of requiredStages) {
      if (models[stage] === undefined) {
        issues.push({
          field: `profiles.models.${stage}`,
          value: '(missing)',
          reason: `${stage} model is required for ${currentProfile} profile`
        });
      }
    }

    // Validate model IDs against catalog
    if (verbose) {
      console.error('[verbose] Fetching model catalog...');
    }

    const catalogResult = getModelCatalog();
    if (!catalogResult.success) {
      error(catalogResult.error.message, catalogResult.error.code);
    }

    const validModels = catalogResult.models;

    if (verbose) {
      console.error(`[verbose] Found ${validModels.length} models in catalog`);
      console.error('[verbose] Validating profile model IDs...');
    }

    for (const stage of requiredStages) {
      const modelId = models[stage];
      if (modelId && typeof modelId === 'string') {
        if (!validModels.includes(modelId)) {
          issues.push({
            field: `profiles.models.${stage}`,
            value: modelId,
            reason: `Model ID not found in opencode models catalog`
          });
        } else if (verbose) {
          console.error(`[verbose] ✓ profiles.models.${stage}: ${modelId} (valid)`);
        }
      }
    }
  }

  const passed = issues.length === 0;

  const result = {
    success: passed,
    data: {
      passed,
      current_oc_profile: config.current_oc_profile || null,
      profile_type: config.profiles.profile_type || null,
      issues
    }
  };

  if (!passed) {
    result.error = {
      code: 'INVALID_PROFILE',
      message: `${issues.length} invalid profile configuration(s) found`
    };
  }

  output(result);
  process.exit(passed ? 0 : 1);
}

function getRequiredStages(profileType) {
  if (!VALID_PROFILES.includes(profileType)) {
    return [];
  }
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

module.exports = checkConfigJson;
