/**
 * migrate-config.cjs — Migrate legacy config to current profile format
 *
 * Command module that migrates old config.json format (model_profile: quality/balanced/budget)
 * to new profile format (profiles.profile_type + profiles.models).
 * Creates backup before modifications.
 * Outputs JSON envelope format with migration results.
 *
 * Usage: node migrate-config.cjs [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { output, error, createBackup } = require('../gsd-oc-lib/oc-core.cjs');

/**
 * OLD_PROFILE_MODEL_MAP - Maps legacy profile names to model tiers
 * This is a reference mapping - actual model IDs should be determined by available models
 */
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
function migrateConfig(cwd, args) {
  const verbose = args.includes('--verbose');
  const dryRun = args.includes('--dry-run');

  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!fs.existsSync(configPath)) {
    error('.planning/config.json not found', 'CONFIG_NOT_FOUND');
  }

  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    error('Failed to parse .planning/config.json', 'INVALID_JSON');
  }

  // Check if migration is needed
  const needsMigration = checkNeedsMigration(config);

  if (!needsMigration) {
    const result = {
      success: true,
      data: {
        migrated: false,
        reason: 'Config already uses current format'
      }
    };
    output(result);
    process.exit(0);
  }

  // Perform migration
  const legacyProfile = config.model_profile;
  const newProfileType = LEGACY_PROFILE_MAP[legacyProfile] || 'genius';

  if (verbose) {
    console.error(`[verbose] Migrating from ${legacyProfile} to ${newProfileType} profile`);
  }

  // Get available models for assignment
  const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');
  const catalogResult = getModelCatalog();
  
  let suggestedModels = {
    planning: 'opencode/default',
    execution: 'opencode/default',
    verification: 'opencode/default'
  };

  if (catalogResult.success) {
    const models = catalogResult.models;
    if (models.length > 0) {
      // Use first available model as default
      const defaultModel = models[0];
      suggestedModels = {
        planning: defaultModel,
        execution: defaultModel,
        verification: defaultModel
      };
    }
  }

  // Build migration plan
  const migrationPlan = {
    from: legacyProfile,
    to: newProfileType,
    models: suggestedModels,
    changes: [
      { action: 'add', field: 'profiles.profile_type', value: newProfileType },
      { action: 'add', field: 'profiles.models', value: suggestedModels },
      { action: 'preserve', field: 'model_profile', value: legacyProfile, note: 'kept for backward compat' }
    ]
  };

  if (dryRun) {
    if (verbose) {
      console.error('[verbose] Dry-run mode - no changes will be made');
    }

    const result = {
      success: true,
      data: {
        migrated: false,
        dryRun: true,
        legacyProfile: legacyProfile,
        newProfileType: newProfileType,
        migrationPlan: migrationPlan
      }
    };
    output(result);
    process.exit(0);
  }

  // Create backup
  if (verbose) {
    console.error('[verbose] Creating backup...');
  }

  const backupPath = createBackup(configPath);
  if (!backupPath) {
    error('Failed to create backup of config.json', 'BACKUP_FAILED');
  }

  if (verbose) {
    console.error(`[verbose] Backup created: ${backupPath}`);
  }

  // Apply migration
  config.profiles = config.profiles || {};
  config.profiles.profile_type = newProfileType;
  config.profiles.models = suggestedModels;
  // Preserve model_profile for backward compatibility during transition

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  } catch (err) {
    error(`Failed to write config.json: ${err.message}`, 'WRITE_FAILED');
  }

  const result = {
    success: true,
    data: {
      migrated: true,
      backup: backupPath,
      from: legacyProfile,
      to: newProfileType,
      models: suggestedModels
    }
  };

  output(result);
  process.exit(0);
}

/**
 * Check if config needs migration from legacy format
 */
function checkNeedsMigration(config) {
  // Has legacy model_profile but no new profiles.profile_type
  if (config.model_profile && !config.profiles?.profile_type) {
    return true;
  }

  // Has old-style profile format without profile_type
  if (config.profiles && !config.profiles.profile_type) {
    // Check if it has old-style profile keys
    const reservedKeys = ['profile_type', 'models'];
    const profileKeys = Object.keys(config.profiles).filter(k => !reservedKeys.includes(k));
    
    // If has profile-like keys but no profile_type, may need migration
    if (profileKeys.length > 0 && !config.profiles.models) {
      return true;
    }
  }

  return false;
}

module.exports = migrateConfig;
