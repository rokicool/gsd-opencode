/**
 * analyze-reuse.cjs — Analyze model reuse opportunities for profile switching
 *
 * Command module that analyzes which existing models can be reused when switching profiles.
 * Compares current profile models against target profile requirements.
 * Outputs JSON envelope format with reuse analysis and suggestions.
 *
 * Usage: node analyze-reuse.cjs <target-profile> [--raw]
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('../gsd-oc-lib/oc-core.cjs');
const { VALID_PROFILES } = require('../gsd-oc-lib/oc-config.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function analyzeReuse(cwd, args) {
  const raw = args.includes('--raw');
  const targetProfile = args.find(arg => !arg.startsWith('--'));

  if (!targetProfile) {
    error('Target profile required. Usage: analyze-reuse <simple|smart|genius>', 'INVALID_USAGE');
  }

  if (!VALID_PROFILES.includes(targetProfile)) {
    error(`Invalid profile type: "${targetProfile}". Valid profiles: ${VALID_PROFILES.join(', ')}`, 'INVALID_PROFILE');
  }

  const configPath = path.join(cwd, '.planning', 'config.json');

  if (!fs.existsSync(configPath)) {
    error('.planning/config.json not found. Run /gsd-new-project first.', 'CONFIG_NOT_FOUND');
  }

  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    error('Failed to parse .planning/config.json', 'INVALID_JSON');
  }

  const profiles = config.profiles || {};
  const currentProfileType = profiles.profile_type || config.profile_type;
  const currentModels = profiles.models || {};

  if (!currentProfileType || !currentModels.planning || !currentModels.execution || !currentModels.verification) {
    error('No current profile configuration found', 'PROFILE_NOT_FOUND');
  }

  const result = {
    success: true,
    data: {
      currentProfile: currentProfileType,
      targetProfile: targetProfile,
      currentModels: {
        planning: currentModels.planning,
        execution: currentModels.execution,
        verification: currentModels.verification
      },
      requiredStages: getRequiredStages(targetProfile),
      reuseAnalysis: analyzeReuseOpportunities(currentModels, targetProfile),
      suggestions: generateSuggestions(currentModels, targetProfile)
    }
  };

  if (raw) {
    output(result, true, JSON.stringify(result.data.suggestions));
  } else {
    output(result);
  }

  process.exit(0);
}

/**
 * Get required stages for a profile type
 */
function getRequiredStages(profileType) {
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

/**
 * Analyze which models can be reused for target profile
 */
function analyzeReuseOpportunities(currentModels, targetProfile) {
  const analysis = {};
  const requiredStages = getRequiredStages(targetProfile);

  for (const stage of requiredStages) {
    const currentModel = currentModels[stage];
    analysis[stage] = {
      currentModel: currentModel || null,
      canReuse: true,
      reason: currentModel ? 'Existing model can be reused' : 'No existing model for this stage'
    };
  }

  // For simple profile, check if all stages use the same model
  if (targetProfile === 'simple') {
    const uniqueModels = new Set([
      currentModels.planning,
      currentModels.execution,
      currentModels.verification
    ].filter(Boolean));

    if (uniqueModels.size > 1) {
      analysis.planning.canReuse = false;
      analysis.planning.reason = `Multiple models in use (${uniqueModels.size}), need to select one for all stages`;
    }
  }

  // For smart profile, planning and execution share the same model
  if (targetProfile === 'smart') {
    if (currentModels.planning !== currentModels.execution) {
      analysis.planning.canReuse = false;
      analysis.planning.reason = 'Planning and execution models differ, need to select one for both stages';
    }
  }

  return analysis;
}

/**
 * Generate model suggestions for each stage
 */
function generateSuggestions(currentModels, targetProfile) {
  const suggestions = {};
  const requiredStages = getRequiredStages(targetProfile);

  for (const stage of requiredStages) {
    const currentModel = currentModels[stage];
    
    if (targetProfile === 'simple') {
      // For simple, suggest the most powerful model from all stages
      suggestions[stage] = {
        suggested: currentModels.planning,
        source: 'planning',
        reason: 'Using planning stage model (typically most capable)'
      };
    } else if (targetProfile === 'smart' && stage === 'execution') {
      // For smart, execution shares planning model
      suggestions[stage] = {
        suggested: currentModels.planning,
        source: 'planning',
        reason: 'Smart profile: execution shares model with planning'
      };
    } else {
      // Default: suggest current model
      suggestions[stage] = {
        suggested: currentModel,
        source: stage,
        reason: `Reusing current ${stage} model`
      };
    }
  }

  return suggestions;
}

module.exports = analyzeReuse;
