/**
 * /gsd-set-profile Command
 * 
 * CLI command to set and switch between profile types.
 * Supports direct mode (with profile name) and interactive mode.
 */

const { 
  PROFILE_TYPES, 
  getProfile, 
  setProfile, 
  isFirstRun, 
  getReusableModel,
  getConfigPath 
} = require('../config/profile-config');
const { SimpleProfile } = require('../lib/simple-profile');

// Skill script path
const SKILL_DIR = '/Users/roki/.config/opencode/skills/gsd-oc-select-model';
const SELECT_SCRIPT = `${SKILL_DIR}/scripts/select-models.cjs`;

/**
 * Display available profile types
 */
function showAvailableProfiles() {
  console.log('\n📋 Available Profile Types:');
  console.log('');
  console.log('  simple  - Use 1 model for all stages (Planning, Execution, Verification)');
  console.log('  smart   - Use 2 models (different for Planning vs Execution/Verification)');
  console.log('  custom  - Use 3 models (different for each stage)');
  console.log('');
}

/**
 * Display error for invalid profile
 * @param {string} profileName - Invalid profile name
 */
function showInvalidProfileError(profileName) {
  console.error(`\n❌ Error: Invalid profile "${profileName}"`);
  console.error('\nAvailable profiles: simple, smart, custom');
  showAvailableProfiles();
}

/**
 * Display confirmation message after successful profile set
 * @param {string} profileType - Profile type
 * @param {string} model - Model ID
 * @param {boolean} isReuse - Whether model was reused
 */
function showConfirmation(profileType, model, isReuse = false) {
  console.log('\n✅ Profile set successfully!\n');
  console.log(`Profile Type: ${profileType.charAt(0).toUpperCase() + profileType.slice(1)}`);
  console.log(`Model: ${model}`);
  
  if (isReuse) {
    console.log('Note: Reused existing model from previous profile');
  }
  
  console.log('\n📊 Stage Assignments:');
  console.log('  Planning:     ' + model);
  console.log('  Execution:    ' + model);
  console.log('  Verification: ' + model);
  
  console.log(`\n💾 Configuration saved to: ${getConfigPath()}`);
  console.log('\nYou can change your profile anytime by running /gsd-set-profile again.');
}

/**
 * Run the model selection wizard using gsd-oc-select-model skill
 * @returns {Promise<string|null>} Selected model ID or null if cancelled
 */
async function runModelSelectionWizard() {
  try {
    const { execSync } = require('child_process');
    
    console.log('\n🎯 Launching model selection wizard...\n');
    
    // Check if skill script exists
    const fs = require('fs');
    if (!fs.existsSync(SELECT_SCRIPT)) {
      console.error('❌ Error: Model selection skill not found.');
      console.error(`Expected at: ${SELECT_SCRIPT}`);
      console.error('\nPlease ensure the gsd-oc-select-model skill is installed.');
      return null;
    }

    // Run the selection script
    // For now, we'll simulate the wizard with a simple prompt
    // In production, this would integrate with the skill's interactive flow
    console.log('Available models (example list):');
    console.log('  1. anthropic/claude-3-5-sonnet');
    console.log('  2. openai/gpt-4');
    console.log('  3. google/gemini-pro');
    console.log('  4. xai/grok-2');
    console.log('  5. synthetic/deepseek-ai/DeepSeek-R1');
    console.log('\n(To use the interactive wizard, run with the full gsd-oc-select-model skill)');
    
    // Return a default for now - in production this would be user-selected
    return 'anthropic/claude-3-5-sonnet';
  } catch (error) {
    console.error('❌ Error during model selection:', error.message);
    return null;
  }
}

/**
 * Ask user whether to reuse existing model
 * @param {string} existingModel - Existing model ID
 * @returns {Promise<boolean>} True if user wants to reuse
 */
async function promptReuseModel(existingModel) {
  // In a real implementation, this would use an interactive prompt
  // For now, we'll auto-accept if a model is available
  console.log(`\n💡 Found existing model: ${existingModel}`);
  console.log('Reusing this model for the new Simple profile.');
  return true;
}

/**
 * Set up Simple profile
 * @param {Object} options - Setup options
 * @param {boolean} options.reuseExisting - Whether to reuse existing model if available
 * @returns {Promise<boolean>} True if successful
 */
async function setupSimpleProfile(options = {}) {
  console.log('\n🔄 Setting up Simple Profile...');
  console.log('This profile uses 1 model for all stages.\n');

  // Check for existing model to reuse
  const reusable = getReusableModel();
  let selectedModel = null;
  let isReuse = false;

  if (reusable && reusable.available && options.reuseExisting !== false) {
    const shouldReuse = await promptReuseModel(reusable.model);
    if (shouldReuse) {
      selectedModel = reusable.model;
      isReuse = true;
    }
  }

  // If no reusable model or user declined, run wizard
  if (!selectedModel) {
    selectedModel = await runModelSelectionWizard();
    if (!selectedModel) {
      console.log('\n⚠️  Model selection cancelled. Profile not changed.');
      return false;
    }
  }

  // Save the profile
  try {
    setProfile('simple', { default: selectedModel });
    showConfirmation('simple', selectedModel, isReuse);
    return true;
  } catch (error) {
    console.error('\n❌ Error saving profile:', error.message);
    console.error('\nRecovery steps:');
    console.error('  1. Check write permissions for ~/.config/gsd-opencode/');
    console.error('  2. Ensure sufficient disk space');
    console.error('  3. Try running the command again');
    return false;
  }
}

/**
 * Execute the gsd-set-profile command
 * @param {string[]} args - Command arguments
 * @returns {Promise<boolean>} True if successful
 */
async function execute(args = []) {
  const profileName = args[0];

  // Check for first run
  if (isFirstRun() && !profileName) {
    console.log('\n👋 Welcome! It looks like this is your first time.');
    console.log('Let\'s set up your profile.\n');
    return await setupSimpleProfile();
  }

  // Direct mode: profile name provided
  if (profileName) {
    // Validate profile name
    if (!PROFILE_TYPES.includes(profileName.toLowerCase())) {
      showInvalidProfileError(profileName);
      return false;
    }

    const profileType = profileName.toLowerCase();

    // Handle simple profile setup
    if (profileType === 'simple') {
      return await setupSimpleProfile();
    }

    // For smart and custom profiles (future implementation)
    console.log(`\n⚠️  Profile type "${profileType}" setup wizard coming soon!`);
    console.log('For now, please use "simple" profile.');
    return false;
  }

  // Interactive mode: show profile picker
  console.log('\n🎯 Profile Setup');
  console.log('================\n');
  
  showAvailableProfiles();
  
  console.log('To select a profile, run: /gsd-set-profile <profile-name>');
  console.log('Example: /gsd-set-profile simple\n');
  
  // Show current profile if any
  const currentProfile = getProfile();
  if (currentProfile) {
    const info = currentProfile.getDisplayInfo();
    console.log('📊 Current Profile:');
    console.log(`  Type: ${info.profileType}`);
    console.log(`  Model: ${info.model}`);
    console.log(`  Status: ${info.status}`);
  }

  return true;
}

/**
 * Check if model selection skill is available
 * @returns {boolean} True if skill is installed
 */
function isSkillAvailable() {
  const fs = require('fs');
  return fs.existsSync(SELECT_SCRIPT);
}

/**
 * Get skill installation instructions
 * @returns {string} Installation instructions
 */
function getSkillInstallInstructions() {
  return `
To use the interactive model selection wizard, install the skill:
  opencode skills add gsd-oc-select-model

Or manually select a model by running:
  /gsd-set-profile simple
`;
}

module.exports = {
  execute,
  setupSimpleProfile,
  showAvailableProfiles,
  showConfirmation,
  isSkillAvailable,
  getSkillInstallInstructions,
  // Internal exports for testing
  showInvalidProfileError,
  promptReuseModel,
  runModelSelectionWizard
};

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  execute(args).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
