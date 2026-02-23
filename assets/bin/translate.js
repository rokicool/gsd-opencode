#!/usr/bin/env node

/**
 * translate.js - CLI entry point for GSD text translation
 *
 * Usage: node translate.js <config-file-1> [config-file-2] [...] [options]
 *
 * Multiple configs are merged in order (later files override earlier ones).
 *
 * Options:
 *   --apply          Apply changes in-place (default is dry-run)
 *   --show-diff      Show full diffs for each file
 *   --no-color       Disable colored output
 *   --help           Show help message
 *
 * Exit codes:
 *   0  Success
 *   1  Validation error (invalid config, validation failures)
 *   2  Runtime error (file I/O, permissions)
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use dynamic import for tinyglobby
let glob;
try {
  const tinyglobby = await import('tinyglobby');
  glob = tinyglobby.glob;
} catch (e) {
  // Fallback if tinyglobby isn't available
  glob = async (patterns, options) => {
    console.error('Warning: tinyglobby not available. Install with: npm install tinyglobby');
    return [];
  };
}

// Import our modules
import { TextTranslator } from '../lib/translator.js';
import { CliFormatter } from '../lib/cli.js';
import { BackupManager } from '../lib/backup-manager.js';
import { GitChecker } from '../lib/git-checker.js';
import { Validator } from '../lib/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Exit codes
 */
const EXIT_SUCCESS = 0;
const EXIT_VALIDATION_ERROR = 1;
const EXIT_RUNTIME_ERROR = 2;

/**
 * Parse command line arguments
 * @param {string[]} args
 * @returns {Object}
 */
function parseArgs(args) {
  const result = {
    configFiles: [],
    apply: false,
    showDiff: false,
    useColor: true,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--apply') {
      result.apply = true;
    } else if (arg === '--show-diff') {
      result.showDiff = true;
    } else if (arg === '--no-color') {
      result.useColor = false;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('--')) {
      // Collect all non-option arguments as config file paths
      result.configFiles.push(arg);
    }
  }

  return result;
}

/**
 * Load a single config file (without validation)
 * @param {string} configPath
 * @returns {Promise<Object>}
 */
async function loadSingleConfig(configPath) {
  const resolvedPath = resolve(configPath);

  try {
    await access(resolvedPath);
  } catch (error) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  let content;
  try {
    content = await readFile(resolvedPath, 'utf-8');
  } catch (error) {
    throw new Error(`Cannot read config file: ${error.message}`);
  }

  let config;
  try {
    config = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in config file: ${error.message}`);
  }

  return config;
}

/**
 * Validate a config object
 * @param {Object} config
 * @param {string} configPath - for error messages
 */
function validateConfig(config, configPath) {
  // Validate required fields
  if (!config.rules || !Array.isArray(config.rules)) {
    throw new Error(`Config must have a "rules" array: ${configPath}`);
  }

  if (config.rules.length === 0) {
    throw new Error(`Config must have at least one rule: ${configPath}`);
  }

  // Validate each rule
  for (let i = 0; i < config.rules.length; i++) {
    const rule = config.rules[i];
    if (!rule.pattern) {
      throw new Error(`Rule ${i + 1} must have a "pattern" in ${configPath}`);
    }
    if (typeof rule.replacement !== 'string') {
      throw new Error(`Rule ${i + 1} must have a "replacement" string in ${configPath}`);
    }
  }

  // Validate include option if present
  if (config.include && config.include.length > 0) {
    if (!Array.isArray(config.include)) {
      throw new Error(`Config "include" must be an array of strings: ${configPath}`);
    }
    for (let i = 0; i < config.include.length; i++) {
      if (typeof config.include[i] !== 'string') {
        throw new Error(`Config "include" item ${i + 1} must be a string in ${configPath}`);
      }
    }
  }
}

/**
 * Set defaults for a config object
 * @param {Object} config
 * @returns {Object}
 */
function setConfigDefaults(config) {
  return {
    patterns: config.patterns || ['**/*'],
    include: config.include || [],
    exclude: config.exclude || ['node_modules/**', '.git/**', '.translate-backups/**'],
    maxFileSize: config.maxFileSize || 10 * 1024 * 1024,
    rules: config.rules || [],
    _forbidden_strings_after_translation: config._forbidden_strings_after_translation || [],
    ...config
  };
}

/**
 * Merge multiple config objects into one
 * @param {Object[]} configs - Array of config objects (already parsed and validated)
 * @returns {Object}
 */
function mergeConfigs(configs) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new Error('At least one config is required');
  }

  if (configs.length === 1) {
    return setConfigDefaults(configs[0]);
  }

  // Start with defaults, then apply first config
  const merged = setConfigDefaults(configs[0]);

  // Merge in subsequent configs
  for (let i = 1; i < configs.length; i++) {
    const config = configs[i];

    // Merge rules: concatenate (earlier first)
    if (config.rules && config.rules.length > 0) {
      merged.rules = [...merged.rules, ...config.rules];
    }

    // Merge include: combine and deduplicate
    if (config.include && config.include.length > 0) {
      merged.include = [...new Set([...merged.include, ...config.include])];
    }

    // Merge exclude: combine and deduplicate
    if (config.exclude && config.exclude.length > 0) {
      merged.exclude = [...new Set([...merged.exclude, ...config.exclude])];
    }

    // Merge _forbidden_strings_after_translation: combine and deduplicate
    if (config._forbidden_strings_after_translation && config._forbidden_strings_after_translation.length > 0) {
      merged._forbidden_strings_after_translation = [...new Set([
        ...merged._forbidden_strings_after_translation,
        ...config._forbidden_strings_after_translation
      ])];
    }

    // patterns: use first config's patterns (they're defaults)
    // Keep the first config's patterns

    // maxFileSize: use the largest value from all configs
    if (config.maxFileSize !== undefined) {
      merged.maxFileSize = Math.max(merged.maxFileSize, config.maxFileSize);
    }

    // Any other custom properties: last config wins
    const knownKeys = ['patterns', 'include', 'exclude', 'maxFileSize', 'rules', '_forbidden_strings_after_translation'];
    for (const key of Object.keys(config)) {
      if (!knownKeys.includes(key)) {
        merged[key] = config[key];
      }
    }
  }

  return merged;
}

/**
 * Load and validate multiple config files, merging them in order
 * @param {string[]} configPaths
 * @returns {Promise<Object>}
 */
async function loadConfigs(configPaths) {
  if (!Array.isArray(configPaths) || configPaths.length === 0) {
    throw new Error('At least one config file is required');
  }

  // Load all configs
  const configs = [];
  for (const configPath of configPaths) {
    const config = await loadSingleConfig(configPath);
    validateConfig(config, configPath);
    configs.push(config);
  }

  // Merge them
  return mergeConfigs(configs);
}

/**
 * Load and validate config file (deprecated, use loadConfigs for multiple files)
 * @param {string} configPath
 * @returns {Promise<Object>}
 */
async function loadConfig(configPath) {
  return loadConfigs([configPath]);
}

/**
 * Main execution
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Create formatter
  const formatter = new CliFormatter({
    useColor: args.useColor,
    showDiff: args.showDiff
  });

  // Show help
  if (args.help || (args.configFiles.length === 0 && process.argv.length <= 2)) {
    console.log(formatter.formatHelp());
    process.exit(EXIT_SUCCESS);
  }

  // Validate config file argument
  if (args.configFiles.length === 0) {
    console.error(formatter.formatError('At least one config file is required'));
    console.log(formatter.formatHelp());
    process.exit(EXIT_VALIDATION_ERROR);
  }

  // Load and merge configs
  let config;
  try {
    config = await loadConfigs(args.configFiles);
  } catch (error) {
    console.error(formatter.formatError(error.message));
    process.exit(EXIT_VALIDATION_ERROR);
  }

  // Initialize services
  const translator = new TextTranslator(config);
  const backupManager = new BackupManager();
  const gitChecker = new GitChecker();

  // Build forbidden patterns from config if available
  const forbiddenPatterns = [];
  if (config._forbidden_strings_after_translation) {
    for (const str of config._forbidden_strings_after_translation) {
      // Escape special regex characters for literal matching
      const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      forbiddenPatterns.push({
        pattern: new RegExp(escaped, 'g'),
        message: `Found forbidden string "${str}"`,
        suggestion: 'Check translation rules',
        exceptions: []
      });
    }
  }
  const validator = new Validator({ forbiddenPatterns });

  // Resolve file patterns
  let files;
  try {
    // If include patterns are specified, use them as whitelist first
    // then apply exclude patterns
    if (config.include.length > 0) {
      // Get all files matching include patterns
      const includedFiles = await glob(config.include, {
        onlyFiles: true
      });
      // Apply exclude patterns to the included files
      const excludedSet = new Set(await glob(config.include, {
        ignore: config.exclude,
        onlyFiles: true
      }));
      files = includedFiles.filter(f => excludedSet.has(f));
    } else {
      // Use patterns with exclude (existing behavior)
      files = await glob(config.patterns, {
        ignore: config.exclude,
        onlyFiles: true
      });
    }
  } catch (error) {
    console.error(formatter.formatError(`Failed to resolve patterns: ${error.message}`));
    process.exit(EXIT_RUNTIME_ERROR);
  }

  if (files.length === 0) {
    console.log(formatter.formatWarning('No files found matching the patterns'));
    process.exit(EXIT_VALIDATION_ERROR);
  }

  console.log(`Found ${files.length} file(s) to process`);
  console.log('');

  // Check git status for uncommitted changes
  if (args.apply) {
    const changedFiles = await gitChecker.checkUncommittedChanges(files);
    if (changedFiles.length > 0) {
      console.log(gitChecker.formatWarning(changedFiles));
    }
  }

  // Process files
  const results = [];
  const modifiedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];

    // Show progress
    process.stdout.write(formatter.formatProgress(i + 1, files.length, filePath));

    // Translate the file
    const result = await translator.translateFile(filePath);

    results.push({
      filePath,
      ...result
    });

    if (result.wasModified && !result.error) {
      modifiedFiles.push({
        filePath,
        result
      });
    }
  }

  // Clear progress line
  process.stdout.write(formatter.clearProgress());

  // Show diffs if requested
  if (args.showDiff) {
    console.log('');
    console.log(formatter.colorize('═'.repeat(70), 'gray'));
    console.log(formatter.colorize('  Diffs', 'bright'));
    console.log(formatter.colorize('═'.repeat(70), 'gray'));

    for (const { filePath, result } of modifiedFiles) {
      const diff = formatter.formatDiff(filePath, result.original, result.translated);
      console.log(diff);
    }
  }

  // Show summary
  const summaryResults = results.map(r => ({
    filePath: r.filePath,
    changeCount: r.changeCount,
    wasModified: r.wasModified,
    error: r.error
  }));

  console.log(formatter.formatSummary(summaryResults));

  // Apply changes if requested
  if (args.apply && modifiedFiles.length > 0) {
    console.log(formatter.formatWarning('Applying changes...'));
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (const { filePath, result } of modifiedFiles) {
      // Create backup first
      const backup = await backupManager.createBackup(filePath);
      if (!backup.success) {
        console.error(formatter.formatError(`Failed to backup ${filePath}: ${backup.error}`));
        errorCount++;
        continue;
      }

      // Write translated content
      try {
        await writeFile(filePath, result.translated, 'utf-8');
        console.log(formatter.formatSuccess(`Updated ${filePath}`));
        successCount++;
      } catch (error) {
        console.error(formatter.formatError(`Failed to write ${filePath}: ${error.message}`));
        errorCount++;
      }
    }

    console.log('');
    console.log(`Applied changes to ${successCount} file(s)`);

    if (errorCount > 0) {
      console.error(formatter.formatError(`Failed to update ${errorCount} file(s)`));
    }

    // Run post-translation validation
    console.log('');
    console.log(formatter.colorize('Running post-translation validation...', 'bright'));

    const validationResults = [];
    for (const { filePath } of modifiedFiles) {
      const validation = await validator.validateFile(filePath);
      validationResults.push({ filePath, result: validation });
    }

    const summaryReport = validator.formatSummaryReport(validationResults);
    console.log(summaryReport);

    const hasViolations = validationResults.some(r => !r.result.valid && !r.result.error);

    if (hasViolations) {
      console.error(formatter.formatError('Post-translation validation failed. Review violations above.'));
      process.exit(EXIT_VALIDATION_ERROR);
    }

    if (errorCount > 0) {
      process.exit(EXIT_RUNTIME_ERROR);
    }
  } else if (!args.apply && modifiedFiles.length > 0) {
    console.log(formatter.formatWarning('This was a dry-run. Use --apply to make changes.'));
  }

  console.log('');
  console.log(formatter.formatSuccess('Done!'));
  process.exit(EXIT_SUCCESS);
}

// Run main
main().catch(error => {
  console.error(`\nError: ${error.message}`);
  process.exit(EXIT_RUNTIME_ERROR);
});
