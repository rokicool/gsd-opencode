#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple TOML parser for basic key-value pairs and arrays
 */
function parseTOML(content) {
  const result = {};
  let currentSection = null;
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // Section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.includes('=')) {
      currentSection = trimmed.slice(1, -1);
      result[currentSection] = {};
      i++;
      continue;
    }

    // Key-value pair (might be multi-line for arrays)
    const keyMatch = trimmed.match(/^([^=]+)=\s*(.+)$/);
    if (keyMatch) {
      const key = keyMatch[1].trim();
      let value = keyMatch[2].trim();

      // Handle multi-line arrays
      if (value.startsWith('[')) {
        const arrayLines = [value];
        // Collect lines until we find the closing bracket
        while (!value.endsWith(']') && i < lines.length - 1) {
          i++;
          line = lines[i];
          arrayLines.push(line);
          value = arrayLines.join('\n');
        }

        // Parse the array content
        const arrayContent = arrayLines.join('');
        value = parseArray(arrayContent);
      } else if ((value.startsWith('"') && value.endsWith('"')) ||
                 (value.startsWith("'") && value.endsWith("'"))) {
        // Single-line string
        value = value.slice(1, -1);
      }

      if (currentSection) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
    }

    i++;
  }

  return result;
}

/**
 * Parse a TOML array string
 * @param {string} arrayStr - String like '["a", "b", "c"]'
 * @returns {string[]}
 */
function parseArray(arrayStr) {
  const items = [];
  const content = arrayStr.trim();

  if (!content.startsWith('[') || !content.endsWith(']')) {
    return items;
  }

  // Remove brackets and split by comma
  const inner = content.slice(1, -1);

  // Parse values respecting quotes
  let current = '';
  let inQuotes = false;
  let quoteChar = null;

  for (const char of inner) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = null;
      current += char;
    } else if (char === ',' && !inQuotes) {
      // End of item
      const trimmed = current.trim();
      if (trimmed) {
        items.push(stripQuotes(trimmed));
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last item
  const trimmed = current.trim();
  if (trimmed) {
    items.push(stripQuotes(trimmed));
  }

  return items;
}

/**
 * Strip quotes from a string value
 * @param {string} str
 * @returns {string}
 */
function stripQuotes(str) {
  str = str.trim();
  if ((str.startsWith('"') && str.endsWith('"')) ||
      (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Find files matching pattern in directory recursively
 */
function findFiles(dir, pattern, excludeDirs) {
  const files = [];
  const patternRegex = new RegExp(pattern.replace('*', '.*'));

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (excludeDirs.includes(item)) continue;
        traverse(itemPath);
      } else if (stat.isFile() && patternRegex.test(item)) {
        files.push(itemPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Main function to check forbidden strings
 */
function main() {
  try {
    // Get TOML path from command line args or use default
    const args = process.argv.slice(2);
    let tomlPath = path.join(__dirname, '../antipatterns.toml');

    // Check if first argument is a file path (not a flag)
    if (args.length > 0 && !args[0].startsWith('--')) {
      tomlPath = path.resolve(args[0]);
    }

    if (!fs.existsSync(tomlPath)) {
      console.error(`❌ TOML file not found: ${tomlPath}`);
      process.exit(1);
    }

    // Read and parse TOML file
    const tomlContent = fs.readFileSync(tomlPath, 'utf8');
    const config = parseTOML(tomlContent);

    // Extract configuration from parsed TOML
    const checklist = config.checklist;
    if (!checklist) {
      console.error('❌ No [checklist] section found in antipatterns.toml');
      process.exit(1);
    }

    const folder = checklist.folder || './gsd-opencode/';
    const filePattern = checklist.file || '*.md';
    const excludeDirs = checklist.exclude_dir ?
      (Array.isArray(checklist.exclude_dir) ?
        checklist.exclude_dir :
        checklist.exclude_dir.split(',').map(d => d.trim()).filter(d => d)) :
      [];
    const forbiddenStrings = checklist.forbidden_strings || [];

    console.log('🔍 Checking forbidden strings from antipatterns.toml...');
    console.log(`📁 Scanning folder: ${folder}`);
    console.log(`📄 File pattern: ${filePattern}`);
    console.log(`🚫 Exclude dirs: ${excludeDirs.join(', ') || 'none'}`);
    console.log(`⚠️  Forbidden strings: ${forbiddenStrings.length} strings to check`);
    console.log('');

    const files = findFiles(folder, filePattern, excludeDirs);
    console.log(`📋 Found ${files.length} files to check`);
    console.log('');

    let violationsFound = false;
    const violations = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        for (const forbiddenString of forbiddenStrings) {
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(forbiddenString)) {
              violations.push({
                file: file,
                line: i + 1,
                string: forbiddenString,
                content: lines[i].trim()
              });
              violationsFound = true;
            }
          }
        }
      } catch (error) {
        console.error(`⚠️  Could not read file ${file}: ${error.message}`);
      }
    }

    // Report violations
    if (violations.length > 0) {
      console.log('❌ Forbidden strings detected:');
      console.log('');

      for (const violation of violations) {
        console.log(`❌ Found "${violation.string}" in ${violation.file}:${violation.line}`);
        console.log(`   Line ${violation.line}: ${violation.content}`);
        console.log('');
      }

      console.log(`💥 Total violations: ${violations.length}`);
      console.log('❌ Pipeline failed - remove forbidden strings to continue');
      process.exit(1);
    } else {
      console.log('✅ No forbidden strings found');
      console.log('🎉 All files passed check!');
    }

  } catch (error) {
    console.error('❌ Error during check:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node check-forbidden-strings.js [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version information

Description:
  This utility checks for forbidden strings in files as defined in assets/antipatterns.toml.
  It scans the specified folder and file patterns, excluding configured directories,
  and reports any violations found.

Examples:
  node check-forbidden-strings.js
  node check-forbidden-strings.js --help
`);
  process.exit(0);
}

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log('check-forbidden-strings v1.0.0');
  process.exit(0);
}

// Run the main function
main();
