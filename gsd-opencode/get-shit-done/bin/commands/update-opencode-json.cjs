/**
 * update-opencode-json.cjs — Update opencode.json agent models from profile config
 *
 * Command module that updates opencode.json model assignments based on profile configuration.
 * Creates timestamped backup before modifications.
 * Outputs JSON envelope format with update results.
 *
 * Usage: node update-opencode-json.cjs [cwd] [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { output, error, createBackup } = require('../lib/oc-core.cjs');
const { applyProfileToOpencode, VALID_PROFILES } = require('../lib/oc-config.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function updateOpencodeJson(cwd, args) {
  const verbose = args.includes('--verbose');
  const dryRun = args.includes('--dry-run');
  
  const opencodePath = path.join(cwd, 'opencode.json');
  const configPath = path.join(cwd, '.planning', 'config.json');
  
  // Check if opencode.json exists
  if (!fs.existsSync(opencodePath)) {
    error('opencode.json not found in current directory', 'CONFIG_NOT_FOUND');
  }
  
  // Check if .planning/config.json exists
  if (!fs.existsSync(configPath)) {
    error('.planning/config.json not found', 'CONFIG_NOT_FOUND');
  }
  
  if (verbose) {
    console.error(`[verbose] opencode.json: ${opencodePath}`);
    console.error(`[verbose] config.json: ${configPath}`);
    console.error(`[verbose] dry-run: ${dryRun}`);
  }
  
  // Load and validate profile config
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    error('Failed to parse .planning/config.json', 'INVALID_JSON');
  }
  
  // Validate profile_type
  const profileType = config.profile_type || config.profiles?.profile_type;
  if (!profileType) {
    error('profile_type not found in config.json', 'PROFILE_NOT_FOUND');
  }
  
  if (!VALID_PROFILES.includes(profileType)) {
    error(`Invalid profile_type: "${profileType}". Valid profiles: ${VALID_PROFILES.join(', ')}`, 'INVALID_PROFILE');
  }
  
  if (verbose) {
    console.error(`[verbose] Profile type: ${profileType}`);
  }
  
  // Dry-run mode: preview changes without modifying
  if (dryRun) {
    if (verbose) {
      console.error('[verbose] Dry-run mode - no changes will be made');
    }
    
    // Simulate what would be updated
    try {
      const opencodeContent = fs.readFileSync(opencodePath, 'utf8');
      const opencodeData = JSON.parse(opencodeContent);
      
      const profiles = config.profiles || {};
      // Support both structures: profiles.models or direct profile.{type}
      let profileModels;
      if (profiles.models && typeof profiles.models === 'object') {
        profileModels = profiles.models;
      } else {
        profileModels = profiles[profileType] || {};
      }
      
      // Determine which agents would be updated
      const wouldUpdate = [];
      
      const PROFILE_AGENT_MAPPING = {
        planning: [
          'gsd-planner', 'gsd-plan-checker', 'gsd-phase-researcher',
          'gsd-roadmapper', 'gsd-project-researcher', 'gsd-research-synthesizer',
          'gsd-codebase-mapper'
        ],
        execution: ['gsd-executor', 'gsd-debugger'],
        verification: ['gsd-verifier', 'gsd-integration-checker']
      };
      
      for (const [category, agentNames] of Object.entries(PROFILE_AGENT_MAPPING)) {
        const modelId = profileModels[category];
        if (modelId) {
          for (const agentName of agentNames) {
            const currentModel = typeof opencodeData.agent[agentName] === 'string'
              ? opencodeData.agent[agentName]
              : opencodeData.agent[agentName]?.model;
            
            if (currentModel !== modelId) {
              wouldUpdate.push({
                agent: agentName,
                from: currentModel || '(not set)',
                to: modelId
              });
            }
          }
        }
      }
      
      const result = {
        success: true,
        data: {
          backup: null,
          updated: wouldUpdate.map(u => u.agent),
          dryRun: true,
          changes: wouldUpdate
        }
      };
      
      if (verbose) {
        console.error(`[verbose] Would update ${wouldUpdate.length} agent(s)`);
      }
      
      output(result);
      process.exit(0);
    } catch (err) {
      error(`Failed to preview changes: ${err.message}`, 'PREVIEW_FAILED');
    }
  }
  
  // Actual update mode
  if (verbose) {
    console.error('[verbose] Creating backup...');
  }
  
  // Create timestamped backup
  const backupPath = createBackup(opencodePath);
  if (!backupPath) {
    error('Failed to create backup of opencode.json', 'BACKUP_FAILED');
  }
  
  if (verbose) {
    console.error(`[verbose] Backup created: ${backupPath}`);
  }
  
  // Apply profile to opencode.json
  if (verbose) {
    console.error('[verbose] Applying profile to opencode.json...');
  }
  
  const result = applyProfileToOpencode(opencodePath, configPath);
  
  if (!result.success) {
    // Restore backup on failure
    if (verbose) {
      console.error('[verbose] Update failed, restoring backup...');
    }
    try {
      fs.copyFileSync(backupPath, opencodePath);
    } catch (err) {
      // Best effort restore
    }
    error(result.error.message, result.error.code);
  }
  
  if (verbose) {
    console.error(`[verbose] Updated ${result.updated.length} agent(s)`);
    for (const agentName of result.updated) {
      console.error(`[verbose]   - ${agentName}`);
    }
  }
  
  const outputResult = {
    success: true,
    data: {
      backup: backupPath,
      updated: result.updated,
      dryRun: false
    }
  };
  
  output(outputResult);
  process.exit(0);
}

// Export for use by main router
module.exports = updateOpencodeJson;
