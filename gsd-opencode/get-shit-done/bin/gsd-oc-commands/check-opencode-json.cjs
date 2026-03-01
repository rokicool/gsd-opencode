/**
 * check-opencode-json.cjs — Validate model IDs in opencode.json
 *
 * Command module that validates opencode.json model IDs against the opencode models catalog.
 * Outputs JSON envelope format with validation results.
 *
 * Usage: node check-opencode-json.cjs [cwd] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('../gsd-oc-lib/oc-core.cjs');
const { getModelCatalog, validateModelIds } = require('../gsd-oc-lib/oc-models.cjs');

/**
 * Main command function
 *
 * @param {string} cwd - Current working directory
 * @param {string[]} args - Command line arguments
 */
function checkOpencodeJson(cwd, args) {
  const verbose = args.includes('--verbose');
  const opencodePath = path.join(cwd, 'opencode.json');

  // Check if opencode.json exists
  if (!fs.existsSync(opencodePath)) {
    error('opencode.json not found in current directory', 'CONFIG_NOT_FOUND');
  }

  if (verbose) {
    console.error(`[verbose] Validating: ${opencodePath}`);
  }

  // Fetch model catalog
  if (verbose) {
    console.error('[verbose] Fetching model catalog from opencode models...');
  }

  const catalogResult = getModelCatalog();
  if (!catalogResult.success) {
    error(catalogResult.error.message, catalogResult.error.code);
  }

  if (verbose) {
    console.error(`[verbose] Found ${catalogResult.models.length} models in catalog`);
  }

  // Validate model IDs
  if (verbose) {
    console.error('[verbose] Validating model IDs...');
  }

  try {
    const validationResult = validateModelIds(opencodePath, catalogResult.models);

    const result = {
      success: true,
      data: validationResult
    };

    // Exit code based on validation result
    if (validationResult.valid) {
      output(result);
      process.exit(0);
    } else {
      // Add error details for invalid models
      result.error = {
        code: 'INVALID_MODEL_ID',
        message: `${validationResult.invalidCount} invalid model ID(s) found`
      };
      output(result);
      process.exit(1);
    }
  } catch (err) {
    if (err.message === 'CONFIG_NOT_FOUND') {
      error('opencode.json not found', 'CONFIG_NOT_FOUND');
    } else if (err.message === 'INVALID_JSON') {
      error('opencode.json is not valid JSON', 'INVALID_JSON');
    } else {
      error(err.message, 'VALIDATION_FAILED');
    }
  }
}

// Export for use by main router
module.exports = checkOpencodeJson;
