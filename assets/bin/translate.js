#!/usr/bin/env node

/**
 * translate.js - CLI entry point for GSD text translation
 *
 * Usage: node translate.js <config-file> [options]
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
    configFile: null,
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
    } else if (!arg.startsWith('--') && !result.configFile) {
      result.configFile = arg;
    }
  }

  return result;
}

/**
 * Load and validate config file
 * @param {string} configPath
 * @returns {Promise<Object>}
 */
async function loadConfig(configPath) {
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

  // Validate required fields
  if (!config.rules || !Array.isArray(config.rules)) {
    throw new Error('Config must have a "rules" array');
  }

  if (config.rules.length === 0) {
    throw new Error('Config must have at least one rule');
  }

  // Validate each rule
  for (let i = 0; i < config.rules.length; i++) {
    const rule = config.rules[i];
    if (!rule.pattern) {
      throw new Error(`Rule ${i + 1} must have a "pattern"`);
    }
    if (typeof rule.replacement !== 'string') {
      throw new Error(`Rule ${i + 1} must have a "replacement" string`);
    }
  }

  // Set defaults
  config.patterns = config.patterns || ['**/*'];
  config.include = config.include || [];
  config.exclude = config.exclude || ['node_modules/**', '.git/**', '.translate-backups/**'];
  config.maxFileSize = config.maxFileSize || 10 * 1024 * 1024;

  // Validate include option if present
  if (config.include.length > 0) {
    if (!Array.isArray(config.include)) {
      throw new Error('Config "include" must be an array of strings');
    }
    for (let i = 0; i < config.include.length; i++) {
      if (typeof config.include[i] !== 'string') {
        throw new Error(`Config "include" item ${i + 1} must be a string`);
      }
    }
  }

  return config;
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
  if (args.help || (!args.configFile && process.argv.length <= 2)) {
    console.log(formatter.formatHelp());
    process.exit(EXIT_SUCCESS);
  }

  // Validate config file argument
  if (!args.configFile) {
    console.error(formatter.formatError('Config file is required'));
    console.log(formatter.formatHelp());
    process.exit(EXIT_VALIDATION_ERROR);
  }

  // Load config
  let config;
  try {
    config = await loadConfig(args.configFile);
  } catch (error) {
    console.error(formatter.formatError(error.message));
    process.exit(EXIT_VALIDATION_ERROR);
  }

  // Initialize services
  const translator = new TextTranslator(config);
  const backupManager = new BackupManager();
  const gitChecker = new GitChecker();
  const validator = new Validator();

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
