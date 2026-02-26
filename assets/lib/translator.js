/**
 * TextTranslator - Core translation engine for gsd to gsd-opencode conversion
 *
 * Handles regex-based text replacement with:
 * - Word boundary matching (no partial matches)
 * - Case preservation (GSD -> GSD-OPENCODE)
 * - Binary file detection (null byte check)
 * - Max file size enforcement
 * - Detailed change tracking
 */

import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @typedef {Object} TranslationRule
 * @property {string|RegExp} pattern - Pattern to match
 * @property {string} replacement - Replacement string
 * @property {boolean} [caseSensitive=false] - Whether matching is case sensitive
 * @property {string} [flags='g'] - Regex flags for string patterns
 */

/**
 * @typedef {Object} ChangeDetail
 * @property {number} line - Line number (1-indexed)
 * @property {number} column - Column number (1-indexed)
 * @property {string} before - Original text snippet
 * @property {string} after - Translated text snippet
 */

/**
 * @typedef {Object} TranslationResult
 * @property {string} original - Original file content
 * @property {string} translated - Translated content
 * @property {number} changeCount - Total number of replacements
 * @property {ChangeDetail[]} changes - Detailed change records
 * @property {boolean} wasModified - Whether any changes were made
 * @property {string|null} error - Error message if translation failed
 */

/**
 * Default max file size (10MB)
 */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Binary file detection buffer size (512 bytes)
 */
const BINARY_CHECK_BYTES = 512;

/**
 * Class for translating text content from "gsd" to "gsd-opencode"
 */
export class TextTranslator {
  /**
   * @param {Object} config - Configuration object
   * @param {TranslationRule[]} config.rules - Array of translation rules
   * @param {number} [config.maxFileSize=10485760] - Maximum file size in bytes
   * @param {string[]} [config.exclude=[]] - Glob patterns to exclude
   */
  constructor(config = {}) {
    this.rules = config.rules || [];
    this.maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    this.exclude = config.exclude || [];

    // Pre-compile regex patterns for performance
    this.compiledRules = this.rules.map(rule => this.compileRule(rule));
  }

  /**
   * Compile a rule into a RegExp
   * @param {TranslationRule} rule
   * @returns {Object} Compiled rule with regex and replacement
   */
  compileRule(rule) {
    let regex;

    if (rule.pattern instanceof RegExp) {
      // Use provided regex directly
      regex = rule.pattern;
    } else if (typeof rule.pattern === 'string') {
      // Convert string to regex
      const flags = rule.flags || (rule.caseSensitive ? 'gm' : 'gmi');

      if (rule.isRegex) {
        // Use pattern as raw regex (no escaping, no word boundaries)
        regex = new RegExp(rule.pattern, flags);
      } else {
        // Escape and add word boundaries for literal string matching
        const escaped = this.escapeRegex(rule.pattern);

        // Only use word boundaries if pattern starts/ends with word characters
        // Word boundaries \b only work with [a-zA-Z0-9_]
        const startsWithWord = /^[a-zA-Z0-9_]/.test(rule.pattern);
        const endsWithWord = /[a-zA-Z0-9_]$/.test(rule.pattern);

        let patternStr = escaped;
        if (startsWithWord) {
          patternStr = '\\b' + patternStr;
        }
        if (endsWithWord) {
          patternStr = patternStr + '\\b';
        }

        regex = new RegExp(patternStr, flags);
      }
    } else {
      throw new Error(`Invalid pattern type: ${typeof rule.pattern}`);
    }

    return {
      regex,
      replacement: rule.replacement,
      caseSensitive: rule.caseSensitive || false,
      transform: rule.transform || null
    };
  }

  /**
   * Escape special regex characters in a string
   * @param {string} str
   * @returns {string}
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if a file appears to be binary by looking for null bytes
   * @param {string} filePath
   * @returns {Promise<boolean>}
   */
  async isBinaryFile(filePath) {
    try {
      const stream = createReadStream(filePath, { start: 0, end: BINARY_CHECK_BYTES - 1 });
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      // Check for null bytes in the sample
      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If we can't read the file, assume it's not binary and let it fail later
      return false;
    }
  }

  /**
   * Check if file exceeds max file size
   * @param {string} filePath
   * @returns {Promise<{valid: boolean, size: number}>}
   */
  async checkFileSize(filePath) {
    try {
      const stats = await stat(filePath);
      return {
        valid: stats.size <= this.maxFileSize,
        size: stats.size
      };
    } catch (error) {
      return { valid: false, size: 0, error: error.message };
    }
  }

  /**
   * Translate content string
   * @param {string} content - Content to translate
   * @returns {TranslationResult}
   */
  translateContent(content) {
    let translated = content;
    const allChanges = [];
    let totalChanges = 0;

    // Apply each rule in sequence
    for (const rule of this.compiledRules) {
      const result = this.applyRule(translated, rule);
      translated = result.content;
      totalChanges += result.changes.length;
      allChanges.push(...result.changes);
    }

    return {
      original: content,
      translated,
      changeCount: totalChanges,
      changes: allChanges,
      wasModified: content !== translated,
      error: null
    };
  }

  /**
   * Process escape sequences in a string (\n -> newline, \t -> tab, etc.)
   * @param {string} str
   * @returns {string}
   */
  processEscapes(str) {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Apply a single translation rule
   * @param {string} content
   * @param {Object} rule
   * @returns {Object} {content, changes}
   */
  applyRule(content, rule) {
    const changes = [];
    const lines = content.split('\n');
    let result = content;

    // Process escape sequences in the replacement string
    const processedReplacement = this.processEscapes(rule.replacement);

    // Track position changes as we modify the content
    let offset = 0;

    // Find all matches
    const matches = [...content.matchAll(rule.regex)];

    for (const match of matches) {
      const matchText = match[0];
      const position = match.index;

      // Calculate line and column
      const textBeforeMatch = content.slice(0, position);
      const lineNumber = (textBeforeMatch.match(/\n/g) || []).length + 1;
      const lastNewline = textBeforeMatch.lastIndexOf('\n');
      const columnNumber = position - (lastNewline === -1 ? 0 : lastNewline + 1) + 1;

      // Preserve case if possible (using processed replacement)
      let replacement = processedReplacement;
      if (!rule.caseSensitive && matchText === matchText.toUpperCase() && matchText !== matchText.toLowerCase()) {
        replacement = processedReplacement.toUpperCase();
      } else if (!rule.caseSensitive && matchText[0] === matchText[0].toUpperCase()) {
        replacement = processedReplacement.charAt(0).toUpperCase() + processedReplacement.slice(1);
      }

      // Record the change
      changes.push({
        line: lineNumber,
        column: columnNumber,
        before: matchText,
        after: replacement
      });
    }

    // Apply the replacement with case preservation
    result = content.replace(rule.regex, (match, ...args) => {
      // Handle special transforms
      if (rule.transform === 'tools_list_to_yaml') {
        // args[0] is the captured group (the tools list)
        const toolsList = args[0];
        const tools = toolsList.split(',').map(t => t.trim()).filter(t => t);
        return 'tools:\n' + tools.map(t => `  ${t}: true`).join('\n');
      }

      if (rule.caseSensitive) {
        return processedReplacement;
      }
      // All uppercase: GSD -> GSD-OPENCODE
      if (match === match.toUpperCase() && match !== match.toLowerCase()) {
        return processedReplacement.toUpperCase();
      }
      // Title case (first letter uppercase): Gsd -> Gsd-opencode
      if (match[0] === match[0].toUpperCase()) {
        return processedReplacement.charAt(0).toUpperCase() + processedReplacement.slice(1);
      }
      // Default (lowercase): gsd -> gsd-opencode
      return processedReplacement;
    });

    return { content: result, changes };
  }

  /**
   * Translate a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<TranslationResult>}
   */
  async translateFile(filePath) {
    const resolvedPath = resolve(filePath);

    try {
      // Check file size first
      const sizeCheck = await this.checkFileSize(resolvedPath);
      if (!sizeCheck.valid) {
        if (sizeCheck.error) {
          return {
            original: '',
            translated: '',
            changeCount: 0,
            changes: [],
            wasModified: false,
            error: sizeCheck.error
          };
        }
        return {
          original: '',
          translated: '',
          changeCount: 0,
          changes: [],
          wasModified: false,
          error: `File exceeds max size (${sizeCheck.size} > ${this.maxFileSize} bytes)`
        };
      }

      // Check if binary
      if (await this.isBinaryFile(resolvedPath)) {
        return {
          original: '',
          translated: '',
          changeCount: 0,
          changes: [],
          wasModified: false,
          error: 'Binary file (skipped)'
        };
      }

      // Read file content
      const content = await readFile(resolvedPath, 'utf-8');

      // Translate the content
      return this.translateContent(content);
    } catch (error) {
      return {
        original: '',
        translated: '',
        changeCount: 0,
        changes: [],
        wasModified: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a path matches any exclude pattern
   * @param {string} filePath
   * @returns {boolean}
   */
  isExcluded(filePath) {
    for (const pattern of this.exclude) {
      // Simple glob matching (can be enhanced with minimatch if needed)
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '<<<DOUBLESTAR>>>').replace(/\*/g, '[^/]*').replace(/<<<DOUBLESTAR>>>/g, '.*').replace(/\?/g, '.') + '$'
      );
      if (regex.test(filePath)) {
        return true;
      }
    }
    return false;
  }
}

export default TextTranslator;
