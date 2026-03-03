/**
 * pivot-profile.cjs — Alias for set-profile-phase16.cjs
 *
 * Alternative name for profile switching functionality.
 * "pivot" may be more intuitive for profile switching operations.
 *
 * Usage: node pivot-profile.cjs [profile-name | profileName:JSON] [--dry-run]
 */

const setProfilePhase16 = require('./set-profile-phase16.cjs');

/**
 * Main command function - thin wrapper for setProfilePhase16
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function pivotProfile(cwd, args) {
  setProfilePhase16(cwd, args);
}

module.exports = pivotProfile;
