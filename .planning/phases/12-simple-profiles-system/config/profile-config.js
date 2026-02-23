/**
 * Profile Configuration Module
 * 
 * Manages profile persistence, retrieval, and model resolution.
 * Supports Simple, Smart, and Custom profile types.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SimpleProfile } = require('../lib/simple-profile');

// Profile types constant
const PROFILE_TYPES = ['simple', 'smart', 'custom'];

// Config file path
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gsd-opencode');
const CONFIG_FILE = path.join(CONFIG_DIR, 'profiles.json');

/**
 * Ensure the config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Check if this is the first run (no config exists)
 * @returns {boolean} True if no profile config exists
 */
function isFirstRun() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return true;
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    return !config.profile_type && !config.active_profile;
  } catch {
    return true;
  }
}

/**
 * Detect if config is in old format
 * @param {Object} config - Config object
 * @returns {boolean} True if old format
 */
function isOldFormat(config) {
  return config && config.active_profile && ['quality', 'balanced', 'budget'].includes(config.active_profile);
}

/**
 * Migrate old config format to new format
 * @param {Object} oldConfig - Old format config
 * @returns {Object} Migrated config in new format
 */
function migrateOldConfig(oldConfig) {
  if (!oldConfig || !isOldFormat(oldConfig)) {
    return oldConfig;
  }

  const migrationLog = {
    migrated_from: oldConfig.active_profile,
    migrated_at: new Date().toISOString(),
    version: '1.0'
  };

  // Map old profile types to new format
  switch (oldConfig.active_profile) {
    case 'budget':
      // Budget becomes Simple profile (single model)
      return {
        version: '1.0',
        profile_type: 'simple',
        models: {
          default: oldConfig.models?.budget || oldConfig.models?.default
        },
        updated_at: new Date().toISOString(),
        migration: migrationLog
      };

    case 'balanced':
    case 'quality':
      // Balanced and Quality become Custom profile (3 models)
      return {
        version: '1.0',
        profile_type: 'custom',
        models: {
          planning: oldConfig.models?.planning || oldConfig.models?.quality || oldConfig.models?.balanced,
          execution: oldConfig.models?.execution || oldConfig.models?.balanced,
          verification: oldConfig.models?.verification || oldConfig.models?.quality
        },
        updated_at: new Date().toISOString(),
        migration: migrationLog
      };

    default:
      return oldConfig;
  }
}

/**
 * Load raw config from disk
 * @returns {Object|null} Raw config object or null
 */
function loadRawConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading profile config:', error.message);
    return null;
  }
}

/**
 * Save config to disk
 * @param {Object} config - Config object to save
 */
function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Get the current profile
 * @returns {SimpleProfile|null} Current profile instance or null
 */
function getProfile() {
  const rawConfig = loadRawConfig();

  if (!rawConfig) {
    return null;
  }

  // Auto-migrate old format
  if (isOldFormat(rawConfig)) {
    const migrated = migrateOldConfig(rawConfig);
    saveConfig(migrated);
    
    if (migrated.profile_type === 'simple') {
      return SimpleProfile.fromJSON(migrated);
    }
    // For custom profiles, we'd need CustomProfile class
    // For now, treat as simple if only one model
    if (migrated.models && !migrated.models.planning) {
      return SimpleProfile.fromJSON(migrated);
    }
    return null;
  }

  // Handle new format
  if (rawConfig.profile_type === 'simple') {
    return SimpleProfile.fromJSON(rawConfig);
  }

  return null;
}

/**
 * Set the active profile
 * @param {string} profileType - Profile type ('simple', 'smart', 'custom')
 * @param {Object} modelConfig - Model configuration
 * @param {string} modelConfig.default - Default model for simple profile
 * @returns {boolean} True if successful
 */
function setProfile(profileType, modelConfig = {}) {
  if (!PROFILE_TYPES.includes(profileType)) {
    throw new Error(`Invalid profile type: ${profileType}. Must be one of: ${PROFILE_TYPES.join(', ')}`);
  }

  const config = {
    version: '1.0',
    profile_type: profileType,
    models: {},
    updated_at: new Date().toISOString()
  };

  if (profileType === 'simple') {
    config.models = {
      default: modelConfig.default
    };
  } else if (profileType === 'custom') {
    config.models = {
      planning: modelConfig.planning,
      execution: modelConfig.execution,
      verification: modelConfig.verification
    };
  }

  saveConfig(config);
  return true;
}

/**
 * Get the model for a specific stage
 * @param {string} stage - Stage name ('planning', 'execution', 'verification')
 * @returns {string|null} Model ID or null
 */
function getModelForStage(stage) {
  const profile = getProfile();
  
  if (!profile) {
    return null;
  }

  return profile.getModelForStage(stage);
}

/**
 * Get profile configuration file path
 * @returns {string} Path to profiles.json
 */
function getConfigPath() {
  return CONFIG_FILE;
}

/**
 * Check if a model can be reused when switching profiles
 * @returns {Object|null} Reusable model info or null
 */
function getReusableModel() {
  const rawConfig = loadRawConfig();
  
  if (!rawConfig || !rawConfig.models) {
    return null;
  }

  // For custom/smart profiles with models, offer the first one
  const models = rawConfig.models;
  
  if (models.planning) {
    return {
      model: models.planning,
      source: 'current profile',
      available: true
    };
  }
  
  if (models.default) {
    return {
      model: models.default,
      source: 'current profile',
      available: true
    };
  }

  // Check for any available model
  const firstModel = Object.values(models)[0];
  if (firstModel) {
    return {
      model: firstModel,
      source: 'current profile',
      available: true
    };
  }

  return null;
}

module.exports = {
  PROFILE_TYPES,
  SimpleProfile,
  getProfile,
  setProfile,
  getModelForStage,
  isFirstRun,
  migrateOldConfig,
  getConfigPath,
  getReusableModel,
  // Internal exports for testing
  loadRawConfig,
  saveConfig,
  isOldFormat
};
