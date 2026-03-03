/**
 * update-opencode-json.cjs — Update opencode.json agent models from profile config
 *
 * Command module that updates opencode.json model assignments based on oc_config.json structure.
 * Creates timestamped backup before modifications.
 * Outputs JSON envelope format with update results.
 *
 * Usage: node update-opencode-json.cjs [cwd] [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { output, error, createBackup } = require('../gsd-oc-lib/oc-core.cjs');
const { applyProfileToOpencode } = require('../gsd-oc-lib/oc-config.cjs');

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
  const configPath = path.join(cwd, '.planning', 'oc_config.json');
  
  // Check if opencode.json exists
  if (!fs.existsSync(opencodePath)) {
    error('opencode.json not found in current directory', 'CONFIG_NOT_FOUND');
  }
  
  // Check if .planning/oc_config.json exists
  if (!fs.existsSync(configPath)) {
    error('.planning/oc_config.json not found', 'CONFIG_NOT_FOUND');
  }
  
  if (verbose) {
    console.error(`[verbose] opencode.json: ${opencodePath}`);
    console.error(`[verbose] oc_config.json: ${configPath}`);
    console.error(`[verbose] dry-run: ${dryRun}`);
  }
  
  // Load and validate profile config
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    error('Failed to parse .planning/oc_config.json', 'INVALID_JSON');
  }
  
  // Validate current_oc_profile
  const profileName = config.current_oc_profile;
  if (!profileName) {
    error('current_oc_profile not found in oc_config.json', 'PROFILE_NOT_FOUND');
  }
  
  // Validate profile exists in profiles.presets
  const presets = config.profiles?.presets;
  if (!presets || !presets[profileName]) {
    const availableProfiles = presets ? Object.keys(presets).join(', ') : 'none';
    error(`Profile "${profileName}" not found in profiles.presets. Available profiles: ${availableProfiles}`, 'PROFILE_NOT_FOUND');
  }
  
  if (verbose) {
    console.error(`[verbose] Profile name: ${profileName}`);
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
      
      const profileModels = presets[profileName];
      
      if (!profileModels.planning && !profileModels.execution && !profileModels.verification) {
        error(`No model assignments found for profile "${profileName}"`, 'PROFILE_NOT_FOUND');
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
                to: modelId,
                modelId: modelId
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
  
  // Apply profile to opencode.json using the existing function which already supports oc_config.json
  if (verbose) {
    console.error('[verbose] Applying profile to opencode.json...');
  }
  
  const result = applyProfileToOpencode(opencodePath, configPath, profileName);
  
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
    for (const { agent } of result.updated) {
      console.error(`[verbose]   - ${agent}`);
    }
  }
  
  const outputResult = {
    success: true,
    data: {
      backup: backupPath,
      updated: result.updated.map(u => u.agent),
      dryRun: false,
      details: result.updated
    }
  };
  
  output(outputResult);
  process.exit(0);
}

// Export for use by main router
module.exports = updateOpencodeJson;
