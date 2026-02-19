/**
 * Unit tests for TextTranslator
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { TextTranslator } from '../lib/translator.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('TextTranslator', () => {
  describe('translateContent', () => {
    it('should translate "gsd" to "gsd-opencode" with word boundaries', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('gsd is great');
      expect(result.translated).toBe('gsd-opencode is great');
      expect(result.changeCount).toBe(1);
    });

    it('should not match partial words', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('mygsdpackage');
      expect(result.translated).toBe('mygsdpackage');
      expect(result.changeCount).toBe(0);
    });

    it('should handle multiple occurrences', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('gsd and gsd are the same');
      expect(result.translated).toBe('gsd-opencode and gsd-opencode are the same');
      expect(result.changeCount).toBe(2);
    });

    it('should preserve case: lowercase gsd -> gsd-opencode', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('use gsd for productivity');
      expect(result.translated).toBe('use gsd-opencode for productivity');
    });

    it('should preserve case: uppercase GSD -> GSD-OPENCODE', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('GSD is awesome');
      expect(result.translated).toBe('GSD-OPENCODE is awesome');
    });

    it('should preserve case: Title Case Gsd -> Gsd-opencode', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('Gsd is the tool');
      // Only first letter is capitalized for title case
      expect(result.translated).toBe('Gsd-opencode is the tool');
    });

    it('should handle "gsd-opencode" - word boundaries match before hyphen', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('gsd-opencode is the new name');
      // "gsd" within "gsd-opencode" matches because hyphen creates word boundary
      expect(result.translated).toBe('gsd-opencode-opencode is the new name');
      expect(result.changeCount).toBe(1);
    });

    it('should translate "get-shit-done" to "gsd-opencode"', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'get-shit-done', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('use get-shit-done tool');
      expect(result.translated).toBe('use gsd-opencode tool');
    });

    it('should translate "get-shit-done" case insensitively', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'get-shit-done', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('GET-SHIT-DONE');
      expect(result.translated).toBe('GSD-OPENCODE');
    });

    it('should apply multiple rules in sequence', () => {
      const translator = new TextTranslator({
        rules: [
          { pattern: 'gsd', replacement: 'gsd-opencode' },
          { pattern: 'get-shit-done', replacement: 'gsd-opencode' }
        ]
      });

      const result = translator.translateContent('gsd and get-shit-done');
      expect(result.translated).toBe('gsd-opencode and gsd-opencode');
      expect(result.changeCount).toBe(2);
    });

    it('should handle regex patterns', () => {
      const translator = new TextTranslator({
        rules: [
          { pattern: /\bgsd\b/gi, replacement: 'gsd-opencode' }
        ]
      });

      const result = translator.translateContent('gsd is great');
      expect(result.translated).toBe('gsd-opencode is great');
    });

    it('should track line numbers correctly', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const content = 'line one\ngsd here\nline three';
      const result = translator.translateContent(content);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].line).toBe(2);
    });

    it('should track column numbers correctly', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const content = 'use gsd tool';
      const result = translator.translateContent(content);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].column).toBe(5);
    });

    it('should handle empty content', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('');
      expect(result.translated).toBe('');
      expect(result.changeCount).toBe(0);
    });

    it('should handle content with no matches', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = translator.translateContent('hello world');
      expect(result.translated).toBe('hello world');
      expect(result.changeCount).toBe(0);
      expect(result.wasModified).toBe(false);
    });
  });

  describe('translateFile', () => {
    const testDir = join(tmpdir(), 'translator-test-' + Date.now());

    beforeEach(async () => {
      if (!existsSync(testDir)) {
        await mkdir(testDir, { recursive: true });
      }
    });

    it('should translate a file with gsd references', async () => {
      const filePath = join(testDir, 'test.txt');
      await writeFile(filePath, 'gsd is great\n', 'utf-8');

      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = await translator.translateFile(filePath);

      expect(result.wasModified).toBe(true);
      expect(result.translated).toBe('gsd-opencode is great\n');
    });

    it('should skip binary files', async () => {
      const filePath = join(testDir, 'binary.bin');
      // Write a buffer with null bytes (binary indicator)
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x00]);
      await writeFile(filePath, binaryContent);

      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = await translator.translateFile(filePath);

      expect(result.error).toBe('Binary file (skipped)');
      expect(result.wasModified).toBe(false);
    });

    it('should handle file size limit', async () => {
      const filePath = join(testDir, 'large.txt');
      // Write a file larger than max size
      const largeContent = 'x'.repeat(100);
      await writeFile(filePath, largeContent, 'utf-8');

      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }],
        maxFileSize: 10 // 10 bytes max
      });

      const result = await translator.translateFile(filePath);

      expect(result.error).toContain('File exceeds max size');
    });

    it('should handle missing files', async () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      const result = await translator.translateFile(join(testDir, 'nonexistent.txt'));

      expect(result.error).toContain('ENOENT');
      expect(result.wasModified).toBe(false);
    });

    // Cleanup
    afterAll(async () => {
      if (existsSync(testDir)) {
        await rm(testDir, { recursive: true });
      }
    });
  });

  describe('compileRule', () => {
    it('should compile string patterns with word boundaries', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: 'gsd', replacement: 'gsd-opencode' }]
      });

      expect(translator.compiledRules).toHaveLength(1);
      expect(translator.compiledRules[0].regex).toBeInstanceOf(RegExp);
      expect(translator.compiledRules[0].regex.source).toContain('gsd');
    });

    it('should use provided regex patterns directly', () => {
      const translator = new TextTranslator({
        rules: [{ pattern: /\bgsd\b/gi, replacement: 'gsd-opencode' }]
      });

      expect(translator.compiledRules[0].regex).toBeInstanceOf(RegExp);
      expect(translator.compiledRules[0].regex.flags).toBe('gi');
    });

    it('should throw for invalid pattern types', () => {
      expect(() => {
        new TextTranslator({
          rules: [{ pattern: 123, replacement: 'test' }]
        });
      }).toThrow('Invalid pattern type');
    });
  });

  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      const translator = new TextTranslator({ rules: [] });

      expect(translator.escapeRegex('a.b')).toBe('a\\.b');
      expect(translator.escapeRegex('a+b')).toBe('a\\+b');
      expect(translator.escapeRegex('a*b')).toBe('a\\*b');
      expect(translator.escapeRegex('a?b')).toBe('a\\?b');
      expect(translator.escapeRegex('a^b')).toBe('a\\^b');
      expect(translator.escapeRegex('a$b')).toBe('a\\$b');
      expect(translator.escapeRegex('a|b')).toBe('a\\|b');
    });
  });

  describe('isExcluded', () => {
    it('should match exclude patterns', () => {
      const translator = new TextTranslator({
        rules: [],
        exclude: ['node_modules/**', '*.log']
      });

      expect(translator.isExcluded('node_modules/test.js')).toBe(true);
      expect(translator.isExcluded('debug.log')).toBe(true);
      expect(translator.isExcluded('src/index.js')).toBe(false);
    });
  });
});
