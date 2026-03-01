/**
 * validate-models.cjs — Validate model IDs against opencode models catalog
 *
 * Command module that validates one or more model IDs exist in the opencode catalog.
 * Outputs JSON envelope format with validation results.
 *
 * Usage: node validate-models.cjs <model1> [model2...] [--raw]
 */

const { output, error } = require('../gsd-oc-lib/oc-core.cjs');
const { getModelCatalog } = require('../gsd-oc-lib/oc-models.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments (model IDs)
 */
function validateModels(cwd, args) {
  const raw = args.includes('--raw');
  const modelIds = args.filter(arg => !arg.startsWith('--'));

  if (modelIds.length === 0) {
    error('No model IDs provided. Usage: validate-models <model1> [model2...]', 'INVALID_USAGE');
  }

  // Fetch model catalog
  const catalogResult = getModelCatalog();
  if (!catalogResult.success) {
    error(catalogResult.error.message, catalogResult.error.code);
  }

  const validModels = catalogResult.models;
  const results = [];

  for (const modelId of modelIds) {
    const isValid = validModels.includes(modelId);
    results.push({
      model: modelId,
      valid: isValid,
      reason: isValid ? 'Model found in catalog' : 'Model not found in catalog'
    });
  }

  const allValid = results.every(r => r.valid);
  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.filter(r => !r.valid).length;

  const result = {
    success: allValid,
    data: {
      total: modelIds.length,
      valid: validCount,
      invalid: invalidCount,
      models: results
    }
  };

  if (!allValid) {
    result.error = {
      code: 'INVALID_MODELS',
      message: `${invalidCount} model(s) not found in catalog`
    };
  }

  if (raw) {
    output(result, true, allValid ? 'valid' : 'invalid');
  } else {
    output(result);
  }

  process.exit(allValid ? 0 : 1);
}

module.exports = validateModels;
