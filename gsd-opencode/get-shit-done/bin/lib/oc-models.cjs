/**
 * oc-models.cjs — Model catalog operations for gsd-oc-tools CLI
 *
 * Provides functions for fetching and validating model IDs against opencode models output.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Fetch model catalog from opencode models command
 *
 * @returns {Object} {success: boolean, models: string[]} or {success: false, error: {...}}
 */
function getModelCatalog() {
  try {
    const output = execSync('opencode models', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Parse output (one model per line)
    const models = output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return {
      success: true,
      models
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: `Failed to fetch model catalog: ${err.message}`
      }
    };
  }
}

/**
 * Validate model IDs in opencode.json against valid models list
 *
 * @param {string} opencodePath - Path to opencode.json file
 * @param {string[]} validModels - Array of valid model IDs
 * @returns {Object} {valid, total, validCount, invalidCount, issues: [{agent, model, reason}]}
 */
function validateModelIds(opencodePath, validModels) {
  const issues = [];
  let total = 0;
  let validCount = 0;
  let invalidCount = 0;

  try {
    const content = fs.readFileSync(opencodePath, 'utf8');
    const opencodeData = JSON.parse(content);

    // Look for agent model assignments
    // Common patterns: agent.model, profiles.*.model, models.*
    const assignments = [];

    // Check for agents at root level
    if (opencodeData.agent && typeof opencodeData.agent === 'object') {
      Object.entries(opencodeData.agent).forEach(([agentName, config]) => {
        if (typeof config === 'string') {
          assignments.push({ agent: `agent.${agentName}`, model: config });
        } else if (config && typeof config === 'object' && config.model) {
          assignments.push({ agent: `agent.${agentName}`, model: config.model });
        }
      });
    }

    // Check for profiles
    if (opencodeData.profiles && typeof opencodeData.profiles === 'object') {
      Object.entries(opencodeData.profiles).forEach(([profileName, config]) => {
        if (config && typeof config === 'object') {
          Object.entries(config).forEach(([key, value]) => {
            if (key.includes('model') && typeof value === 'string') {
              assignments.push({ agent: `profiles.${profileName}.${key}`, model: value });
            }
          });
        }
      });
    }

    // Check for models at root level
    if (opencodeData.models && typeof opencodeData.models === 'object') {
      Object.entries(opencodeData.models).forEach(([modelName, modelId]) => {
        if (typeof modelId === 'string') {
          assignments.push({ agent: `models.${modelName}`, model: modelId });
        }
      });
    }

    // Validate each assignment
    total = assignments.length;
    for (const { agent, model } of assignments) {
      if (validModels.includes(model)) {
        validCount++;
      } else {
        invalidCount++;
        issues.push({
          agent,
          model,
          reason: 'Model ID not found in opencode models catalog'
        });
      }
    }

    return {
      valid: invalidCount === 0,
      total,
      validCount,
      invalidCount,
      issues
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('CONFIG_NOT_FOUND');
    } else if (err instanceof SyntaxError) {
      throw new Error('INVALID_JSON');
    }
    throw err;
  }
}

module.exports = {
  getModelCatalog,
  validateModelIds
};
