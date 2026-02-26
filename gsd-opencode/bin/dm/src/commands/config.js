/**
 * Config command for GSD-OpenCode CLI.
 *
 * This module provides configuration management with subcommands for getting,
 * setting, resetting, and listing configuration values. Supports value auto-parsing
 * (booleans, numbers, JSON strings) and multiple output formats (human-readable and JSON).
 *
 * Implements requirements:
 * - CLI-07: User can run gsd-opencode config to manage settings
 * - CONFIG-01: Config get <key> returns value (or error if not set)
 * - CONFIG-02: Config set <key> <value> parses booleans, numbers, JSON
 * - CONFIG-03: Config reset <key> restores default
 * - CONFIG-04: Config reset --all removes entire config
 * - CONFIG-05: Config list shows all settings
 * - CONFIG-06: Config list --json outputs valid JSON
 * - ERROR-03: All commands support --verbose flag for detailed debugging output
 *
 * @module commands/config
 * @description Configuration management command for GSD-OpenCode
 */

import { SettingsManager } from '../services/settings.js';
import { logger, setVerbose } from '../utils/logger.js';
import { ERROR_CODES } from '../../lib/constants.js';

/**
 * Flattens a nested object using dot-notation keys.
 *
 * Recursively traverses an object and creates flat key-value pairs
 * where nested keys are joined with dots (e.g., 'ui.colors').
 *
 * @param {Object} obj - Object to flatten
 * @param {string} [prefix=''] - Key prefix for recursion
 * @param {Object} [result={}] - Result accumulator
 * @returns {Object} Flattened object with dot-notation keys
 * @private
 */
function flattenObject(obj, prefix = '', result = {}) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        flattenObject(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}

/**
 * Formats a value for display.
 *
 * @param {*} value - Value to format
 * @returns {string} Formatted string representation
 * @private
 */
function formatValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Parses a configuration value from string input.
 *
 * @param {string} value - String value to parse
 * @returns {*} Parsed value (boolean, number, object, array, or string)
 * @private
 */
function parseValue(value) {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  if (value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) {
    if (value.includes('.')) {
      return parseFloat(value);
    }
    return parseInt(value, 10);
  }

  if ((value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Gets a configuration value by key.
 *
 * @param {string} key - Configuration key using dot-notation
 * @param {Object} options - Command options
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code
 */
export async function configGetCommand(key, options = {}) {
  setVerbose(options.verbose);

  logger.debug('Starting config get command');
  logger.debug(`Key: ${key}, verbose: ${options.verbose}`);

  try {
    if (!key || typeof key !== 'string') {
      logger.error('Configuration key is required');
      logger.dim('Usage: gsd-opencode config get <key>');
      return ERROR_CODES.GENERAL_ERROR;
    }

    const settings = new SettingsManager();
    const value = await settings.get(key);

    if (value === undefined) {
      logger.error(`Configuration key not found: ${key}`);
      return ERROR_CODES.GENERAL_ERROR;
    }

    if (typeof value === 'object' && value !== null) {
      console.log(JSON.stringify(value));
    } else {
      console.log(String(value));
    }

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('\nCommand cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    logger.error(`Failed to get configuration: ${error.message}`);

    if (options.verbose) {
      logger.debug(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Sets a configuration value by key.
 *
 * @param {string} key - Configuration key using dot-notation
 * @param {string} value - Value to set (will be auto-parsed)
 * @param {Object} options - Command options
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code
 */
export async function configSetCommand(key, value, options = {}) {
  setVerbose(options.verbose);

  logger.debug('Starting config set command');
  logger.debug(`Key: ${key}, value: ${value}, verbose: ${options.verbose}`);

  try {
    if (!key || typeof key !== 'string') {
      logger.error('Configuration key is required');
      logger.dim('Usage: gsd-opencode config set <key> <value>');
      return ERROR_CODES.GENERAL_ERROR;
    }

    if (value === undefined || value === null) {
      logger.error('Configuration value is required');
      logger.dim('Usage: gsd-opencode config set <key> <value>');
      return ERROR_CODES.GENERAL_ERROR;
    }

    const parsedValue = parseValue(String(value));
    logger.debug(`Parsed value: ${JSON.stringify(parsedValue)} (type: ${typeof parsedValue})`);

    const settings = new SettingsManager();
    await settings.set(key, parsedValue);

    logger.success(`Set ${key} = ${JSON.stringify(parsedValue)}`);

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('\nCommand cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    logger.error(`Failed to set configuration: ${error.message}`);

    if (options.verbose) {
      logger.debug(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Resets configuration to defaults.
 *
 * @param {string} [key] - Specific key to reset, or omit to use --all
 * @param {Object} options - Command options
 * @param {boolean} [options.all] - Reset all settings to defaults
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code
 */
export async function configResetCommand(key, options = {}) {
  setVerbose(options.verbose);

  logger.debug('Starting config reset command');
  logger.debug(`Key: ${key}, all: ${options.all}, verbose: ${options.verbose}`);

  try {
    const settings = new SettingsManager();

    if (options.all) {
      await settings.reset();
      logger.success('All configuration reset to defaults');
      return ERROR_CODES.SUCCESS;
    }

    if (key && typeof key === 'string') {
      const currentValue = await settings.get(key);
      if (currentValue === undefined) {
        logger.error(`Configuration key not found: ${key}`);
        return ERROR_CODES.GENERAL_ERROR;
      }

      await settings.reset(key);
      logger.success(`Reset ${key} to default`);
      return ERROR_CODES.SUCCESS;
    }

    logger.error('Specify a configuration key or use --all to reset all settings');
    logger.dim('Usage: gsd-opencode config reset <key>');
    logger.dim('   or: gsd-opencode config reset --all');
    return ERROR_CODES.GENERAL_ERROR;

  } catch (error) {
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('\nCommand cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    logger.error(`Failed to reset configuration: ${error.message}`);

    if (options.verbose) {
      logger.debug(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Lists all configuration settings.
 *
 * @param {Object} options - Command options
 * @param {boolean} [options.json] - Output as JSON
 * @param {boolean} [options.verbose] - Enable verbose output
 * @returns {Promise<number>} Exit code
 */
export async function configListCommand(options = {}) {
  setVerbose(options.verbose);

  logger.debug('Starting config list command');
  logger.debug(`json: ${options.json}, verbose: ${options.verbose}`);

  try {
    const settings = new SettingsManager();
    const config = await settings.list();

    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      logger.heading('Configuration');
      logger.dim(`Source: ${settings.getConfigPath()}`);
      logger.dim('');

      const flatConfig = flattenObject(config);

      if (Object.keys(flatConfig).length === 0) {
        logger.dim('No configuration settings');
      } else {
        const keys = Object.keys(flatConfig);
        const maxKeyLength = Math.max(...keys.map(k => k.length));

        for (const key of keys.sort()) {
          const value = flatConfig[key];
          const paddedKey = key.padEnd(maxKeyLength);
          const formattedValue = formatValue(value);
          logger.dim(`  ${paddedKey}  ${formattedValue}`);
        }
      }
    }

    return ERROR_CODES.SUCCESS;

  } catch (error) {
    if (error.name === 'AbortPromptError' || error.message?.includes('cancel')) {
      logger.info('\nCommand cancelled by user');
      return ERROR_CODES.INTERRUPTED;
    }

    logger.error(`Failed to list configuration: ${error.message}`);

    if (options.verbose) {
      logger.debug(error.stack);
    }

    return ERROR_CODES.GENERAL_ERROR;
  }
}

/**
 * Default export for the config commands.
 */
export default {
  configGetCommand,
  configSetCommand,
  configResetCommand,
  configListCommand
};
