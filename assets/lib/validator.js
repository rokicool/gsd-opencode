/**
 * Validator - Post-translation validation for forbidden strings
 *
 * Features:
 * - Detect remaining "gsd" references after translation
 * - Exclude false positives (gsd-opencode is correct)
 * - Line/column reporting for violations
 * - Configurable forbidden patterns
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * @typedef {Object} ValidationRule
 * @property {string|RegExp} pattern - Pattern to check for
 * @property {string} message - Error message for this violation
 * @property {string[]} [exceptions] - Patterns that are allowed
 */

/**
 * @typedef {Object} Violation
 * @property {number} line - Line number (1-indexed)
 * @property {number} column - Column number (1-indexed)
 * @property {string} match - The matched text
 * @property {string} suggestion - Suggested replacement
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {Violation[]} violations - List of violations found
 * @property {number} violationCount - Total number of violations
 * @property {string|null} error - Error message if validation failed
 */

/**
 * Default forbidden patterns for gsd -> gsd-opencode translation
 */
const DEFAULT_FORBIDDEN_PATTERNS = [
  {
    pattern: /\bgsd\b/gi,
    message: 'Found standalone "gsd" reference',
    suggestion: 'gsd-opencode',
    exceptions: [\n      /gsd-opencode/gi,
      /gsd-ops/gi,
      /gsd-tools/gi,
      /gsd-utils/gi
    ]
  },
  {
    pattern: /get-shit-done/gi,
    message: 'Found "get-shit-done" reference',
    suggestion: 'gsd-opencode',
    exceptions: []
  }
];

/**
 * Class for validating translated content
 */
export class Validator {
  /**
   * @param {Object} config
   * @param {ValidationRule[]} [config.forbiddenPatterns] - Custom forbidden patterns
   * @param {boolean} [config.ignoreGsdOpencode=true] - Ignore "gsd-opencode" (it's correct)
   */
  constructor(config = {}) {
    this.forbiddenPatterns = config.forbiddenPatterns || DEFAULT_FORBIDDEN_PATTERNS;
    this.ignoreGsdOpencode = config.ignoreGsdOpencode !== false;
  }

  /**
   * Validate content string
   * @param {string} content - Content to validate
   * @returns {ValidationResult}
   */
  validateContent(content) {
    const violations = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const rule of this.forbiddenPatterns) {
        const lineViolations = this.checkLine(line, lineNum, rule);
        violations.push(...lineViolations);
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      violationCount: violations.length,
      error: null
    };
  }

  /**
   * Check a single line for violations of a rule
   * @param {string} line - Line content
   * @param {number} lineNum - Line number
   * @param {Object} rule - Validation rule
   * @returns {Violation[]}
   */
  checkLine(line, lineNum, rule) {
    const violations = [];
    const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'gi');

    // Create a copy of the regex for iteration
    const matches = [...line.matchAll(regex)];

    for (const match of matches) {
      const matchText = match[0];
      const column = (match.index || 0) + 1;

      // Check exceptions
      if (this.isException(matchText, rule.exceptions)) {
        continue;
      }

      // Skip "gsd-opencode" if configured
      if (this.ignoreGsdOpencode && /gsd-opencode/i.test(matchText)) {
        continue;
      }

      violations.push({
        line: lineNum,
        column,
        match: matchText,
        suggestion: rule.suggestion || 'Check translation'
      });
    }

    return violations;
  }

  /**
   * Check if a match is an exception
   * @param {string} matchText
   * @param {Array<string|RegExp>} exceptions
   * @returns {boolean}
   */
  isException(matchText, exceptions) {
    if (!exceptions || exceptions.length === 0) {
      return false;
    }

    for (const exception of exceptions) {
      if (exception instanceof RegExp) {
        if (exception.test(matchText)) {
          return true;
        }
      } else if (typeof exception === 'string') {
        if (matchText.toLowerCase() === exception.toLowerCase()) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<ValidationResult>}
   */
  async validateFile(filePath) {
    const resolvedPath = resolve(filePath);

    try {
      const content = await readFile(resolvedPath, 'utf-8');
      return this.validateContent(content);
    } catch (error) {
      return {
        valid: false,
        violations: [],
        violationCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Format validation results for display
   * @param {string} filePath
   * @param {ValidationResult} result
   * @returns {string}
   */
  formatReport(filePath, result) {
    if (result.error) {
      return `Error validating ${filePath}: ${result.error}`;
    }

    if (result.valid) {
      return `  ✓ ${filePath}: No violations found`;
    }

    const lines = [];
    lines.push(`  ✗ ${filePath}: ${result.violationCount} violation(s) found`);

    for (const violation of result.violations.slice(0, 10)) { // Show first 10
      lines.push(`      Line ${violation.line}, Col ${violation.column}: "${violation.match}" -> "${violation.suggestion}"`);
    }

    if (result.violations.length > 10) {
      lines.push(`      ... and ${result.violations.length - 10} more`);
    }

    return lines.join('\n');
  }

  /**
   * Format a summary report for multiple files
   * @param {Object[]} results - Array of {filePath, result} objects
   * @returns {string}
   */
  formatSummaryReport(results) {
    const lines = [];
    const violations = results.filter(r => !r.result.valid && !r.result.error);
    const errors = results.filter(r => r.result.error);
    const valid = results.filter(r => r.result.valid);

    lines.push('');
    lines.push('═'.repeat(70));
    lines.push('  Validation Report');
    lines.push('═'.repeat(70));
    lines.push('');

    // Files with violations
    if (violations.length > 0) {
      lines.push(`  Files with violations: ${violations.length}`);
      for (const { filePath, result } of violations) {
        lines.push(`    ✗ ${filePath} (${result.violationCount} violation(s))`);
      }
      lines.push('');
    }

    // Files with errors
    if (errors.length > 0) {
      lines.push(`  Files with errors: ${errors.length}`);
      for (const { filePath, result } of errors) {
        lines.push(`    ⚠ ${filePath}: ${result.error}`);
      }
      lines.push('');
    }

    // Valid files
    if (valid.length > 0) {
      lines.push(`  Valid files: ${valid.length}`);
      lines.push('');
    }

    // Summary
    const totalViolations = results.reduce((sum, r) => sum + r.result.violationCount, 0);
    lines.push('─'.repeat(70));
    lines.push(`  Total violations: ${totalViolations}`);
    lines.push('═'.repeat(70));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Check if content still contains any "gsd" (not "gsd-opencode")
   * Quick check for common patterns
   * @param {string} content
   * @returns {boolean}
   */
  hasRemainingGsd(content) {
    // Match "gsd" but not when part of "gsd-opencode", "gsd-ops", etc.
    const regex = /\bgsd\b/gi;
    const matches = [...content.matchAll(regex)];

    for (const match of matches) {
      const matchText = match[0];
      const pos = match.index || 0;
      const afterMatch = content.substring(pos + matchText.length, pos + matchText.length + 10);

      // Skip if followed by "-opencode" or other allowed suffixes
      if (/^-(opencode|ops|tools|utils)/i.test(afterMatch)) {
        continue;
      }

      return true;
    }

    return false;
  }
}

export default Validator;
