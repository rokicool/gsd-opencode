#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

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
    // Check if antipatterns.toml exists
    const tomlPath = path.join(__dirname, '../antipatterns.toml');
    if (!fs.existsSync(tomlPath)) {
      console.error('❌ antipatterns.toml not found in assets directory');
      process.exit(1);
    }

    // Read and parse TOML file using proper parser
    const tomlContent = fs.readFileSync(tomlPath, 'utf8');
    const config = toml.parse(tomlContent);
    
    // Extract configuration from parsed TOML
    const checklist = config.checklist;
    if (!checklist) {
      console.error('❌ No [checklist] section found in antipatterns.toml');
      process.exit(1);
    }

    const folder = checklist.folder || './gsd-opencode/';
    const filePattern = checklist.file || '*.md';
    const excludeDirs = checklist.exclude_dir ? checklist.exclude_dir.split(',').map(d => d.trim()).filter(d => d) : [];
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
      console.log('⚠️  Forbidden strings detected (warnings):');
      console.log('');
      
      for (const violation of violations) {
        console.log(`⚠️  Found "${violation.string}" in ${violation.file}:${violation.line}`);
        console.log(`   Line ${violation.line}: ${violation.content}`);
        console.log('');
      }
      
      console.log(`⚠️  Total violations: ${violations.length}`);
      console.log('ℹ️  Consider removing these forbidden strings from the codebase');
      console.log('✅ Check completed successfully (warnings only)');
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