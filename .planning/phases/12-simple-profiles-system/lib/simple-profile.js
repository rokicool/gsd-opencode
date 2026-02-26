/**
 * Simple Profile - Single model for all stages
 * 
 * Provides a simple profile configuration where one model handles
 * all three stages: Planning, Execution, and Verification.
 */

/**
 * SimpleProfile class
 * Manages a single model configuration that applies to all stages.
 */
class SimpleProfile {
  /**
   * Create a new SimpleProfile instance
   * @param {Object} modelConfig - Model configuration
   * @param {string} modelConfig.default - The model ID to use for all stages
   * @param {string} [profileType='simple'] - Profile type identifier
   */
  constructor(modelConfig = {}, profileType = 'simple') {
    this.profileType = profileType;
    this.models = {
      default: modelConfig.default || null
    };
    this.updatedAt = modelConfig.updatedAt || new Date().toISOString();
  }

  /**
   * Get the model for a specific stage
   * In Simple profile, all stages use the same model
   * @param {string} stage - Stage name ('planning', 'execution', 'verification')
   * @returns {string|null} The model ID or null if not configured
   */
  getModelForStage(stage) {
    // Validate stage
    const validStages = ['planning', 'execution', 'verification'];
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}. Must be one of: ${validStages.join(', ')}`);
    }

    // Simple profile uses the same model for all stages
    return this.models.default;
  }

  /**
   * Check if the profile is complete (has a model configured)
   * @returns {boolean} True if a model is configured
   */
  isComplete() {
    return this.models.default !== null && this.models.default !== undefined;
  }

  /**
   * Validate the profile configuration
   * @returns {Object} Validation result with isValid and errors
   */
  validate() {
    const errors = [];

    if (!this.models.default) {
      errors.push('No default model configured');
    }

    if (!this.profileType) {
      errors.push('Profile type not set');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get display information for CLI output
   * @returns {Object} Formatted profile information
   */
  getDisplayInfo() {
    const validation = this.validate();
    
    return {
      profileType: this.profileType,
      status: this.isComplete() ? 'configured' : 'incomplete',
      model: this.models.default || 'Not configured',
      stages: {
        planning: this.models.default || 'Not configured',
        execution: this.models.default || 'Not configured',
        verification: this.models.default || 'Not configured'
      },
      updatedAt: this.updatedAt,
      isValid: validation.isValid,
      errors: validation.errors
    };
  }

  /**
   * Serialize to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      version: '1.0',
      profile_type: this.profileType,
      models: this.models,
      updated_at: this.updatedAt
    };
  }

  /**
   * Create a SimpleProfile from JSON data
   * @param {Object} json - JSON data
   * @returns {SimpleProfile} New SimpleProfile instance
   */
  static fromJSON(json) {
    if (!json) {
      return new SimpleProfile();
    }

    const modelConfig = {
      default: json.models?.default || json.default,
      updatedAt: json.updated_at || json.updatedAt
    };

    return new SimpleProfile(modelConfig, json.profile_type || 'simple');
  }

  /**
   * Create a SimpleProfile from old config format
   * @param {Object} oldConfig - Old format config {active_profile, models}
   * @returns {SimpleProfile} New SimpleProfile instance
   */
  static fromOldConfig(oldConfig) {
    if (!oldConfig) {
      return new SimpleProfile();
    }

    // Handle old 'budget' profile type (single model)
    if (oldConfig.active_profile === 'budget') {
      const model = oldConfig.models?.budget || oldConfig.models?.default;
      return new SimpleProfile({ default: model });
    }

    // For other old types, use the first available model
    const firstModel = Object.values(oldConfig.models || {})[0];
    return new SimpleProfile({ default: firstModel });
  }

  /**
   * Update the model configuration
   * @param {string} model - New model ID
   */
  setModel(model) {
    this.models.default = model;
    this.updatedAt = new Date().toISOString();
  }
}

module.exports = { SimpleProfile };
