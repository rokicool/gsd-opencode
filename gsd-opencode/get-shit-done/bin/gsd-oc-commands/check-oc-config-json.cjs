/**
 * check-oc-config-json.cjs — Validate profile configuration in .planning/oc_config.json
 *
 * Command module that validates .planning/oc_config.json profile configuration.
 * Validates:
 * - current_oc_profile field exists and refers to a profile in profiles.presets
 * - profiles.presets.{current_oc_profile} contains required keys: planning, execution, verification
 * - All model IDs exist in opencode models catalog
 * Outputs JSON envelope format with validation results.
 *
 * Usage: node check-oc-config-json.cjs [cwd]
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('../gsd-oc-lib/oc-core.cjs');
const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function checkOcConfigJson(cwd, args) {
  const verbose = args.includes('--verbose');
  const configPath = path.join(cwd, '.planning', 'oc_config.json');

  // Check if oc_config.json exists
  if (!fs.existsSync(configPath)) {
    error('.planning/oc_config.json not found', 'CONFIG_NOT_FOUND');
  }

  // read and parse config
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      error('.planning/oc_config.json is not valid JSON', 'INVALID_JSON');
    }
    error(`Failed to read config: ${err.message}`, 'READ_FAILED');
  }

  const issues = [];

  // Extract profile information
  const currentOcProfile = config.current_oc_profile;
  const presets = config.profiles?.presets;

  // Validate current_oc_profile field (required)
  if (currentOcProfile === undefined) {
    issues.push({
      field: 'current_oc_profile',
      value: '(missing)',
      reason: 'current_oc_profile field is required'
    });
  } else if (presets && typeof presets === 'object' && !presets[currentOcProfile]) {
    const availableProfiles = presets ? Object.keys(presets).join(', ') : 'none';
    issues.push({
      field: 'current_oc_profile',
      value: currentOcProfile,
      reason: `Profile "${currentOcProfile}" not found in profiles.presets. Available: ${availableProfiles}`
    });
  }

  // Validate profiles.presets section exists
  if (!presets || typeof presets !== 'object') {
    issues.push({
      field: 'profiles.presets',
      value: '(missing or invalid)',
      reason: 'profiles.presets section is required'
    });
    const result = {
      success: false,
      data: {
        passed: false,
        current_oc_profile: currentOcProfile || null,
        profile_data: null,
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

  // Validate profile structure if current profile exists
  if (currentOcProfile && presets[currentOcProfile]) {
    const profile = presets[currentOcProfile];

    // Validate that profile has required keys: planning, execution, verification
    const requiredKeys = ['planning', 'execution', 'verification'];
    for (const key of requiredKeys) {
      if (profile[key] === undefined) {
        issues.push({
          field: `profiles.presets.${currentOcProfile}.${key}`,
          value: '(missing)',
          reason: `${key} model is required for ${currentOcProfile} profile`
        });
      } else if (typeof profile[key] !== 'string') {
        issues.push({
          field: `profiles.presets.${currentOcProfile}.${key}`,
          value: profile[key],
          reason: `${key} must be a string model ID`
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

    for (const key of requiredKeys) {
      if (profile[key] && typeof profile[key] === 'string') {
        if (!validModels.includes(profile[key])) {
          issues.push({
            field: `profiles.presets.${currentOcProfile}.${key}`,
            value: profile[key],
            reason: `Model ID not found in opencode models catalog`
          });
        } else if (verbose) {
          console.error(`[verbose] ✓ profiles.presets.${currentOcProfile}.${key}: ${profile[key]} (valid)`);
        }
      }
    }
  }

  const passed = issues.length === 0;

  const result = {
    success: passed,
    data: {
      passed,
      current_oc_profile: currentOcProfile || null,
      profile_data: currentOcProfile && presets ? presets[currentOcProfile] : null,
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

module.exports = checkOcConfigJson;
