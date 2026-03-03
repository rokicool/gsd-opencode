/**
 * oc-config.cjs — Profile configuration operations for gsd-oc-tools CLI
 *
 * Provides functions for loading profile config and applying model assignments to opencode.json.
 * Follows gsd-tools.cjs architecture pattern.
 */

const fs = require('fs');
const path = require('path');

/**
 * Valid profile types whitelist
 */
const VALID_PROFILES = ['simple', 'smart', 'genius'];

/**
 * Profile to agent mapping
 * Maps profile keys to opencode.json agent names
 */
const PROFILE_AGENT_MAPPING = {
  // Planning agents
  planning: [
    'gsd-planner',
    'gsd-plan-checker',
    'gsd-phase-researcher',
    'gsd-roadmapper',
    'gsd-project-researcher',
    'gsd-research-synthesizer',
    'gsd-codebase-mapper'
  ],
  // Execution agents
  execution: [
    'gsd-executor',
    'gsd-debugger'
  ],
  // Verification agents
  verification: [
    'gsd-verifier',
    'gsd-integration-checker'
  ]
};

/**
 * Load profile configuration from .planning/config.json
 *
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Parsed config object or null on error
 */
function loadProfileConfig(cwd) {
  try {
    const configPath = path.join(cwd, '.planning', 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    const content = fs.readFileSync(configPath, 'utf8');
    let config = JSON.parse(content);
    
    // Auto-migrate old key name: current_os_profile → current_oc_profile
    if (config.current_os_profile && !config.current_oc_profile) {
      config.current_oc_profile = config.current_os_profile;
      delete config.current_os_profile;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    }
    
    return config;
  } catch (err) {
    return null;
  }
}

/**
 * Apply profile configuration to opencode.json
 * Updates agent model assignments based on profile
 *
 * @param {string} opencodePath - Path to opencode.json
 * @param {string} configPath - Path to .planning/config.json
 * @param {string} [profileName] - Optional profile name to use (overrides current_oc_profile)
 * @returns {Object} {success: true, updated: [agentNames]} or {success: false, error: {code, message}}
 */
function applyProfileToOpencode(opencodePath, configPath, profileName = null) {
  try {
    // Load profile config
    let config;
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content);
    } else {
      return {
        success: false,
        error: {
          code: 'CONFIG_NOT_FOUND',
          message: `.planning/config.json not found at ${configPath}`
        }
      };
    }
    
    // Determine which profile to use
    const targetProfile = profileName || config.current_oc_profile;
    
    if (!targetProfile) {
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'current_oc_profile not found in config.json. Run set-profile with a profile name first.'
        }
      };
    }
    
    // Validate profile exists in profiles.presets
    const presets = config.profiles?.presets;
    if (!presets || !presets[targetProfile]) {
      const availableProfiles = presets ? Object.keys(presets).join(', ') : 'none';
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: `Profile "${targetProfile}" not found in profiles.presets. Available profiles: ${availableProfiles}`
        }
      };
    }
    
    // Load or create opencode.json
    let opencodeData;
    if (!fs.existsSync(opencodePath)) {
      // Create initial opencode.json structure
      opencodeData = {
        "$schema": "https://opencode.ai/config.json",
        "agent": {}
      };
    } else {
      // Load existing opencode.json
      const opencodeContent = fs.readFileSync(opencodePath, 'utf8');
      opencodeData = JSON.parse(opencodeContent);
      
      // Ensure agent object exists
      if (!opencodeData.agent) {
        opencodeData.agent = {};
      }
    }
    
    // Get model assignments from profiles.presets.{profile_name}.models
    const profileModels = presets[targetProfile];
    
    if (!profileModels.planning && !profileModels.execution && !profileModels.verification) {
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: `No model assignments found for profile "${targetProfile}"`
        }
      };
    }
    
    // Apply model assignments to agents (MERGE - preserve non-gsd agents)
    const updatedAgents = [];
    
    // Initialize agent object if it doesn't exist
    if (!opencodeData.agent) {
      opencodeData.agent = {};
    }
    
    // Apply each profile category - ONLY update gsd-* agents
    for (const [category, agentNames] of Object.entries(PROFILE_AGENT_MAPPING)) {
      const modelId = profileModels[category];
      
      if (modelId) {
        for (const agentName of agentNames) {
          // Only update gsd-* agents, preserve all others
          if (typeof opencodeData.agent[agentName] === 'object' && opencodeData.agent[agentName] !== null) {
            opencodeData.agent[agentName].model = modelId;
          } else {
            opencodeData.agent[agentName] = { model: modelId };
          }
          updatedAgents.push({ agent: agentName, model: modelId });
        }
      }
    }
    
    // write updated opencode.json
    fs.writeFileSync(opencodePath, JSON.stringify(opencodeData, null, 2) + '\n', 'utf8');
    
    return {
      success: true,
      updated: updatedAgents
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: `Failed to apply profile: ${err.message}`
      }
    };
  }
}

module.exports = {
  loadProfileConfig,
  applyProfileToOpencode,
  VALID_PROFILES,
  PROFILE_AGENT_MAPPING
};
