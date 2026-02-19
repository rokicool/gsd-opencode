/**
 * CliFormatter - CLI output formatting utilities
 *
 * Provides formatted output for:
 * - Summary tables of translation results
 * - Unified diffs for previewing changes
 * - Progress indicators during file processing
 */

import { createPatch } from 'diff';

/**
 * @typedef {Object} FileResult
 * @property {string} filePath - Path to the file
 * @property {number} changeCount - Number of changes made
 * @property {boolean} wasModified - Whether file was modified
 * @property {string|null} error - Error message if failed
 */

/**
 * Class for formatting CLI output
 */
export class CliFormatter {
  /**
   * @param {Object} options
   * @param {boolean} [options.useColor=true] - Whether to use ANSI colors
   * @param {boolean} [options.showDiff=false] - Whether to show full diffs
   */
  constructor(options = {}) {
    this.useColor = options.useColor !== false;
    this.showDiff = options.showDiff || false;
  }

  /**
   * ANSI color codes
   */
  colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
  };

  /**
   * Apply color if enabled
   * @param {string} text
   * @param {string} color
   * @returns {string}
   */
  colorize(text, color) {
    if (!this.useColor) return text;
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  /**
   * Format a summary table of translation results
   * @param {FileResult[]} results
   * @returns {string}
   */
  formatSummary(results) {
    const lines = [];

    // Header
    lines.push('');
    lines.push(this.colorize('═'.repeat(70), 'gray'));
    lines.push(`  ${this.colorize('Translation Summary', 'bright')}`);
    lines.push(this.colorize('═'.repeat(70), 'gray'));
    lines.push('');

    // Column headers
    const header = `  ${'File'.padEnd(40)} ${'Changes'.padStart(8)}  Status`;
    lines.push(header);
    lines.push(`  ${'─'.repeat(68)}`);

    // Rows
    for (const result of results) {
      const fileName = this.truncatePath(result.filePath, 38);
      const changes = result.changeCount.toString().padStart(8);

      let status;
      if (result.error) {
        status = this.colorize(result.error.substring(0, 20), 'red');
      } else if (result.changeCount === 0) {
        status = this.colorize('No changes', 'gray');
      } else {
        status = this.colorize(`Modified`, 'green');
      }

      lines.push(`  ${fileName.padEnd(40)} ${changes}  ${status}`);
    }

    lines.push(`  ${'─'.repeat(68)}`);

    // Totals
    const totalFiles = results.length;
    const modifiedFiles = results.filter(r => r.wasModified && !r.error).length;
    const totalChanges = results.reduce((sum, r) => sum + r.changeCount, 0);
    const errors = results.filter(r => r.error).length;

    lines.push('');
    lines.push(`  Total files processed: ${this.colorize(totalFiles.toString(), 'bright')}`);
    lines.push(`  Files with changes:    ${this.colorize(modifiedFiles.toString(), 'green')}`);
    lines.push(`  Total replacements:    ${this.colorize(totalChanges.toString(), 'cyan')}`);

    if (errors > 0) {
      lines.push(`  Errors:                ${this.colorize(errors.toString(), 'red')}`);
    }

    lines.push('');
    lines.push(this.colorize('═'.repeat(70), 'gray'));

    return lines.join('\n');
  }

  /**
   * Format a unified diff for previewing changes
   * @param {string} filePath
   * @param {string} original
   * @param {string} translated
   * @returns {string}
   */
  formatDiff(filePath, original, translated) {
    if (original === translated) {
      return this.colorize(`  No changes in ${filePath}`, 'gray');
    }

    const patch = createPatch(filePath, original, translated, 'original', 'translated');

    // Colorize the diff output
    const lines = patch.split('\n');
    const coloredLines = lines.map(line => {
      if (line.startsWith('+')) {
        return this.colorize(line, 'green');
      } else if (line.startsWith('-')) {
        return this.colorize(line, 'red');
      } else if (line.startsWith('@@')) {
        return this.colorize(line, 'cyan');
      } else if (line.startsWith('Index') || line.startsWith('===') || line.startsWith('---')) {
        return this.colorize(line, 'gray');
      }
      return line;
    });

    return coloredLines.join('\n');
  }

  /**
   * Format a progress indicator
   * @param {number} current - Current file number
   * @param {number} total - Total number of files
   * @param {string} fileName - Current file name
   * @returns {string}
   */
  formatProgress(current, total, fileName) {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((current / total) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const line = `\r  ${this.colorize(bar, 'cyan')} ${percentage}% (${current}/${total}) ${this.truncatePath(fileName, 40)}`;
    return line;
  }

  /**
   * Format a detailed report for a single file
   * @param {string} filePath
   * @param {Object[]} changes - Array of change details
   * @returns {string}
   */
  formatFileDetails(filePath, changes) {
    const lines = [];

    lines.push('');
    lines.push(this.colorize(`  ${filePath}`, 'bright'));
    lines.push(`  ${this.colorize('─'.repeat(66), 'gray')}`);

    for (const change of changes) {
      const line = this.colorize(`${change.line}:${change.column}`.padStart(8), 'gray');
      const before = this.colorize(change.before, 'red');
      const after = this.colorize(change.after, 'green');
      const arrow = this.colorize('→', 'dim');

      lines.push(`  ${line}  ${before} ${arrow} ${after}`);
    }

    return lines.join('\n');
  }

  /**
   * Format an error message
   * @param {string} message
   * @returns {string}
   */
  formatError(message) {
    return `${this.colorize('Error:', 'red')} ${message}`;
  }

  /**
   * Format a warning message
   * @param {string} message
   * @returns {string}
   */
  formatWarning(message) {
    return `${this.colorize('Warning:', 'yellow')} ${message}`;
  }

  /**
   * Format a success message
   * @param {string} message
   * @returns {string}
   */
  formatSuccess(message) {
    return `${this.colorize('Success:', 'green')} ${message}`;
  }

  /**
   * Format usage help text
   * @returns {string}
   */
  formatHelp() {
    const lines = [];

    lines.push('');
    lines.push(this.colorize('Translation Utility', 'bright'));
    lines.push('Translates "gsd" references to "gsd-opencode" in files');
    lines.push('');
    lines.push(this.colorize('Usage:', 'bright'));
    lines.push('  node translate.js <config-file> [options]');
    lines.push('');
    lines.push(this.colorize('Options:', 'bright'));
    lines.push('  --apply          Apply changes in-place (default is dry-run)');
    lines.push('  --show-diff      Show full diffs for each file');
    lines.push('  --no-color       Disable colored output');
    lines.push('  --help           Show this help message');
    lines.push('');
    lines.push(this.colorize('Config file format:', 'bright'));
    lines.push('  {');
    lines.push('    "patterns": ["**/*.md", "**/*.js"],');
    lines.push('    "exclude": ["node_modules/**"],');
    lines.push('    "rules": [');
    lines.push('      {"pattern": "gsd", "replacement": "gsd-opencode"},');
    lines.push('      {"pattern": "get-shit-done", "replacement": "gsd-opencode"}');
    lines.push('    ],');
    lines.push('    "maxFileSize": 10485760');
    lines.push('  }');
    lines.push('');
    lines.push(this.colorize('Exit codes:', 'bright'));
    lines.push('  0  Success');
    lines.push('  1  Validation error (invalid config, no matches found)');
    lines.push('  2  Runtime error (file I/O, permissions)');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Truncate a path to fit within a column width
   * @param {string} path
   * @param {number} maxWidth
   * @returns {string}
   */
  truncatePath(path, maxWidth) {
    if (path.length <= maxWidth) {
      return path;
    }

    // Show beginning and end with ellipsis in middle
    const prefix = '...';
    const available = maxWidth - prefix.length;
    const endLength = Math.floor(available * 0.6);
    const startLength = available - endLength;

    return path.substring(0, startLength) + prefix + path.substring(path.length - endLength);
  }

  /**
   * Clear the current progress line
   * @returns {string}
   */
  clearProgress() {
    return '\r' + ' '.repeat(80) + '\r';
  }
}

export default CliFormatter;
