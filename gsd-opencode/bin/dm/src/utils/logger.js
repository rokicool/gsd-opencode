/**
 * Logger utility for consistent terminal output styling.
 * 
 * Uses chalk for color support and automatically respects NO_COLOR environment variable.
 * All output goes to stderr to avoid polluting piped output.
 * 
 * @module logger
 */

import chalk from 'chalk';

/**
 * Module-level verbose flag.
 * When true, debug messages and full stack traces are shown.
 * @type {boolean}
 */
let verboseMode = false;

/**
 * Set verbose mode for debug output.
 * @param {boolean} enabled - Whether to enable verbose output
 */
export function setVerbose(enabled) {
  verboseMode = Boolean(enabled);
}

/**
 * Get current verbose mode status.
 * @returns {boolean} Current verbose mode
 */
export function isVerbose() {
  return verboseMode;
}

/**
 * Logger object with styled output methods.
 * All methods output to stderr to avoid breaking piped output.
 */
export const logger = {
  /**
   * Print blue info message with ℹ symbol.
   * @param {string} message - Message to display
   */
  info(message) {
    console.error(chalk.blue('ℹ'), message);
  },

  /**
   * Print green success message with ✓ symbol.
   * @param {string} message - Message to display
   */
  success(message) {
    console.error(chalk.green('✓'), message);
  },

  /**
   * Print yellow warning message with ⚠ symbol.
   * @param {string} message - Message to display
   */
  warning(message) {
    console.error(chalk.yellow('⚠'), message);
  },

  /**
   * Print red error message with ✗ symbol.
   * In verbose mode, includes full stack trace if error object provided.
   * @param {string} message - Error message to display
   * @param {Error} [error] - Optional error object for stack trace
   */
  error(message, error) {
    console.error(chalk.red('✗'), message);
    
    if (verboseMode && error?.stack) {
      console.error(chalk.dim(error.stack));
    }
  },

  /**
   * Print gray debug message (only shown in verbose mode).
   * @param {string} message - Debug message to display
   */
  debug(message) {
    if (verboseMode) {
      console.error(chalk.gray('[debug]'), message);
    }
  },

  /**
   * Print bold white heading for sections.
   * @param {string} text - Heading text
   */
  heading(text) {
    console.error(chalk.bold.white(text));
  },

  /**
   * Print dimmed text for secondary information.
   * @param {string} text - Text to dim
   */
  dim(text) {
    console.error(chalk.dim(text));
  },

  /**
   * Print cyan inline code formatting.
   * @param {string} text - Code text to format
   */
  code(text) {
    console.error(chalk.cyan(text));
  }
};

/**
 * Colorize utility for inline color formatting.
 * Returns chalk instance for flexible color usage.
 * @type {object}
 */
export const colorize = chalk;

/**
 * Default export combining logger and utilities.
 */
export default {
  logger,
  colorize,
  setVerbose,
  isVerbose
};
