/**
 * check-config-json.cjs — Validate profile configuration in .planning/config.json
 *
 * Command module that validates .planning/config.json profile configuration.
 * Validates profile names against whitelist (simple|smart|genius).
 * Outputs JSON envelope format with validation results.
 *
 * Usage: node check-config-json.cjs [cwd]
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('../lib/oc-core.cjs');

// Whitelist of valid profile names
const VALID_PROFILES = ['simple', 'smart', 'genius'];

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function checkConfigJson(cwd, args) {
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

  // Validate profile_type field if present
  if (config.profile_type !== undefined) {
    if (!VALID_PROFILES.includes(config.profile_type)) {
      issues.push({
        field: 'profile_type',
        value: config.profile_type,
        reason: `Profile type must be one of: ${VALID_PROFILES.join(', ')}`
      });
    }
  }

  // Validate profile names (direct keys under profiles that look like profile definitions)
  // Skip reserved keys: profile_type, models
  if (config.profiles && typeof config.profiles === 'object') {
    const reservedKeys = ['profile_type', 'models'];
    const profileKeys = Object.keys(config.profiles).filter(k => !reservedKeys.includes(k));

    for (const key of profileKeys) {
      if (!VALID_PROFILES.includes(key)) {
        issues.push({
          field: `profiles.${key}`,
          value: key,
          reason: `Profile name must be one of: ${VALID_PROFILES.join(', ')}`
        });
      }
    }
  }

  const passed = issues.length === 0;

  const result = {
    success: true,
    data: {
      passed,
      profile_type: config.profile_type || null,
      issues
    }
  };

  // Add error details if failed
  if (!passed) {
    result.error = {
      code: 'INVALID_PROFILE',
      message: `${issues.length} invalid profile configuration(s) found`
    };
  }

  output(result);
  process.exit(passed ? 0 : 1);
}

// Export for use by main router
module.exports = checkConfigJson;
