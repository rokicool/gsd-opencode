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
    const config = JSON.parse(content);
    
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
 * @returns {Object} {success: true, updated: [agentNames]} or {success: false, error: {code, message}}
 */
function applyProfileToOpencode(opencodePath, configPath) {
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
    
    // Validate profile_type
    const profileType = config.profile_type || config.profiles?.profile_type;
    if (!profileType) {
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'profile_type not found in config.json'
        }
      };
    }
    
    if (!VALID_PROFILES.includes(profileType)) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROFILE',
          message: `Invalid profile_type: "${profileType}". Valid profiles: ${VALID_PROFILES.join(', ')}`
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
    
    // Get model assignments from profile
    // Support both structures: profiles.planning or profiles.models.planning
    const profiles = config.profiles || {};
    let profileModels;
    
    // Try new structure first: profiles.models.{planning|execution|verification}
    if (profiles.models && typeof profiles.models === 'object') {
      profileModels = profiles.models;
    } else {
      // Fallback to old structure: profiles.{planning|execution|verification}
      profileModels = profiles[profileType] || {};
    }
    
    if (!profileModels.planning && !profileModels.execution && !profileModels.verification) {
      return {
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: `No model assignments found for profile "${profileType}"`
        }
      };
    }
    
    // Apply model assignments to agents
    const updatedAgents = [];
    
    // Initialize agent object if it doesn't exist
    if (!opencodeData.agent) {
      opencodeData.agent = {};
    }
    
    // Apply each profile category
    for (const [category, agentNames] of Object.entries(PROFILE_AGENT_MAPPING)) {
      const modelId = profileModels[category];
      
      if (modelId) {
        for (const agentName of agentNames) {
          // Handle both string and object agent configurations
          if (typeof opencodeData.agent[agentName] === 'string') {
            opencodeData.agent[agentName] = modelId;
          } else if (typeof opencodeData.agent[agentName] === 'object' && opencodeData.agent[agentName] !== null) {
            opencodeData.agent[agentName].model = modelId;
          } else {
            opencodeData.agent[agentName] = modelId;
          }
          updatedAgents.push({ agent: agentName, model: modelId });
        }
      }
    }
    
    // Write updated opencode.json
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
