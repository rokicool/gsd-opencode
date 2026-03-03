/**
 * get-profile.cjs — Retrieve profile definitions from oc_config.json
 *
 * Command module that exports getProfile(cwd, args) function with two operation modes:
 * 1. No parameters: Returns current profile definition
 * 2. Profile name parameter: Returns specified profile definition
 *
 * Output format: JSON envelope {success: true, data: {profileName: {planning, execution, verification}}}
 * Flags: --raw (output raw JSON without envelope), --verbose (output diagnostics to stderr)
 *
 * Usage: node get-profile.cjs [profile-name] [--raw] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('../gsd-oc-lib/oc-core.cjs');
const { loadOcProfileConfig } = require('../gsd-oc-lib/oc-profile-config.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function getProfile(cwd, args) {
  const verbose = args.includes('--verbose');
  const raw = args.includes('--raw');
  const log = verbose ? (...args) => console.error('[get-profile]', ...args) : () => {};

  // Filter out flags to get profile name argument
  const profileArgs = args.filter(arg => !arg.startsWith('--'));
  
  // Check for too many arguments
  if (profileArgs.length > 1) {
    error('Too many arguments. Usage: get-profile [profile-name]', 'INVALID_ARGS');
  }
  
  const profileName = profileArgs.length > 0 ? profileArgs[0] : null;

  log('Loading oc_config.json');

  // Load oc_config.json
  const loadResult = loadOcProfileConfig(cwd);
  if (!loadResult.success) {
    error(loadResult.error.message, loadResult.error.code);
  }

  const { config, configPath } = loadResult;

  log(`Config loaded from ${configPath}`);

  // ========== MODE 1: No parameters (get current profile) ==========
  if (!profileName) {
    log('Mode 1: Getting current profile');

    // Check current_oc_profile is set
    if (!config.current_oc_profile) {
      error(
        'current_oc_profile not set in oc_config.json. Run set-profile first.',
        'MISSING_CURRENT_PROFILE'
      );
    }

    const currentProfileName = config.current_oc_profile;
    log(`Current profile: ${currentProfileName}`);

    // Check profile exists in profiles.presets
    const presets = config.profiles?.presets;
    if (!presets || !presets[currentProfileName]) {
      const availableProfiles = presets ? Object.keys(presets).join(', ') : 'none';
      error(
        `Current profile "${currentProfileName}" not found in profiles.presets. Available profiles: ${availableProfiles}`,
        'PROFILE_NOT_FOUND'
      );
    }

    const profile = presets[currentProfileName];
    const result = { [currentProfileName]: profile };

    log(`Returning profile definition for "${currentProfileName}"`);

    if (raw) {
      output(result, true, JSON.stringify(result, null, 2));
    } else {
      output({ success: true, data: result });
    }
    process.exit(0);
  }

  // ========== MODE 2: Profile name parameter (get specific profile) ==========
  log(`Mode 2: Getting profile "${profileName}"`);

  // Check profile exists in profiles.presets
  // Note: Does NOT require current_oc_profile to be set
  const presets = config.profiles?.presets;
  if (!presets || !presets[profileName]) {
    const availableProfiles = presets ? Object.keys(presets).join(', ') : 'none';
    error(
      `Profile "${profileName}" not found in profiles.presets. Available profiles: ${availableProfiles}`,
      'PROFILE_NOT_FOUND'
    );
  }

  const profile = presets[profileName];
  const result = { [profileName]: profile };

  log(`Returning profile definition for "${profileName}"`);

  if (raw) {
    output(result, true, JSON.stringify(result, null, 2));
  } else {
    output({ success: true, data: result });
  }
  process.exit(0);
}

module.exports = getProfile;
