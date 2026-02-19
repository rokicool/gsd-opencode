# Translation Utility Documentation

A standalone Node.js script for translating/replacing text patterns in files. Primarily designed for migrating from "gsd" naming to "gsd-opencode" across codebases.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
- [Command Line Options](#command-line-options)
- [Real-World Examples](#real-world-examples)
- [Safety Features](#safety-features)
- [Exit Codes](#exit-codes)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Overview

The translation utility (`assets/bin/translate.js`) provides:

- **Pattern-based text replacement** using regex with word boundaries
- **Case preservation** (GSD → GSD-OPENCODE, gsd → gsd-opencode)
- **Dry-run mode** (default) for safe previewing
- **Automatic backups** before modifications
- **Git integration** with uncommitted change warnings
- **Post-translation validation** to detect remaining patterns
- **Binary file detection** to skip non-text files
- **Include option** for whitelist filtering (v1.1.0+)

## Installation

The script is included in the `assets/` directory. No global installation required:

```bash
cd assets
npm install  # Install tinyglobby dependency
```

## Quick Start

### 1. Create a Configuration File

**Basic config** (`config.json`):
```json
{
  "patterns": ["**/*.md", "**/*.js"],
  "exclude": ["node_modules/**", ".git/**"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"},
    {"pattern": "get-shit-done", "replacement": "gsd-opencode"}
  ]
}
```

**Config with include** (`selective-config.json`) - only process specific files:
```json
{
  "include": ["src/**/*.js", "docs/**/*.md"],
  "exclude": ["**/*.test.js"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"}
  ]
}
```

### 2. Preview Changes (Dry-Run)

```bash
node bin/translate.js config.json
```

### 3. Apply Changes

```bash
node bin/translate.js config.json --apply
```

## Configuration File

The configuration file is a JSON file with the following structure:

```json
{
  "patterns": ["**/*.md", "**/*.js", "**/*.json"],
  "include": [],
  "exclude": ["node_modules/**", ".git/**", ".translate-backups/**"],
  "rules": [
    {
      "pattern": "gsd",
      "replacement": "gsd-opencode"
    },
    {
      "pattern": "get-shit-done",
      "replacement": "gsd-opencode"
    }
  ],
  "maxFileSize": 10485760
}
```

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `patterns` | `string[]` | No | `["**/*"]` | Glob patterns for files to process. Ignored if `include` is specified. |
| `include` | `string[]` | No | `[]` | Glob patterns to explicitly include (whitelist). Processed before `exclude`. |
| `exclude` | `string[]` | No | `["node_modules/**", ".git/**"]` | Glob patterns to exclude |
| `rules` | `Rule[]` | Yes | - | Array of translation rules |
| `maxFileSize` | `number` | No | `10485760` (10MB) | Maximum file size in bytes |

### Rule Object

```json
{
  "pattern": "gsd",
  "replacement": "gsd-opencode",
  "caseSensitive": false,
  "flags": "gi"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `pattern` | `string` | Yes | - | Pattern to match (automatic word boundaries applied) |
| `replacement` | `string` | Yes | - | Replacement text |
| `caseSensitive` | `boolean` | No | `false` | Whether matching is case-sensitive |
| `flags` | `string` | No | `"gi"` | Regex flags (only for string patterns) |

## Command Line Options

```bash
node translate.js <config-file> [options]
```

| Option | Description |
|--------|-------------|
| `--apply` | Apply changes in-place (default is dry-run) |
| `--show-diff` | Display full unified diffs for each modified file |
| `--no-color` | Disable ANSI color codes in output |
| `--help`, `-h` | Show help message |

### Examples

```bash
# Dry-run (preview changes)
node bin/translate.js config.json

# Apply changes with backup
node bin/translate.js config.json --apply

# Show detailed diffs
node bin/translate.js config.json --show-diff

# No colors (for piping to other tools)
node bin/translate.js config.json --no-color
```

## Real-World Examples

### Example 1: Basic GSD to GSD-OpenCode Migration

**Task:** Migrate a project from "gsd" to "gsd-opencode" naming.

**Config file** (`migration-config.json`):
```json
{
  "patterns": ["**/*"],
  "exclude": [
    "node_modules/**",
    ".git/**",
    ".translate-backups/**",
    "*.png",
    "*.jpg",
    "*.gif"
  ],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"},
    {"pattern": "get-shit-done", "replacement": "gsd-opencode"}
  ]
}
```

**Step 1: Preview**
```bash
node bin/translate.js migration-config.json
```

**Output:**
```
Found 45 file(s) to process

╔══════════════════════════════════════════════════════════════════════╗
║  Translation Summary                                                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  File                                    Changes  Status             ║
╠══════════════════════════════════════════════════════════════════════╣
║  README.md                                    12  ✓ Modified         ║
║  package.json                                  3  ✓ Modified         ║
║  src/index.js                                  8  ✓ Modified         ║
║  src/utils.js                                  5  ✓ Modified         ║
║  docs/API.md                                  15  ✓ Modified         ║
║  assets/logo.png                               0  ○ Skipped (binary) ║
╚══════════════════════════════════════════════════════════════════════╝

  Total: 43 changes in 5 files

⚠ This was a dry-run. Use --apply to make changes.
```

**Step 2: Review diffs**
```bash
node bin/translate.js migration-config.json --show-diff
```

**Step 3: Apply**
```bash
node bin/translate.js migration-config.json --apply
```

### Example 2: Selective File Processing

**Task:** Only process markdown documentation files.

**Using patterns (blacklist approach):**
```json
{
  "patterns": ["docs/**/*.md", "**/*.md"],
  "exclude": ["node_modules/**"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"}
  ]
}
```

**Using include (whitelist approach):**
```json
{
  "include": ["docs/**/*.md"],
  "exclude": ["node_modules/**"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"}
  ]
}
```

```bash
node bin/translate.js docs-only.json --apply
```

### Example 3: Case-Sensitive Replacement

**Task:** Replace only uppercase "GSD" references.

**Config file** (`uppercase-only.json`):
```json
{
  "patterns": ["**/*"],
  "exclude": ["node_modules/**", ".git/**"],
  "rules": [
    {"pattern": "GSD", "replacement": "GSD-OPENCODE", "caseSensitive": true}
  ]
}
```

### Example 4: Multiple Rule Sets

**Task:** Replace both "gsd" and legacy "get-shit-done" references.

**Config file** (`comprehensive.json`):
```json
{
  "patterns": ["**/*"],
  "exclude": ["node_modules/**", ".git/**", "*.lock"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"},
    {"pattern": "get-shit-done", "replacement": "gsd-opencode"},
    {"pattern": "GSD", "replacement": "GSD-OPENCODE"},
    {"pattern": "Get-Shit-Done", "replacement": "GSD-OpenCode"}
  ],
  "maxFileSize": 5242880
}
```

## Safety Features

### 1. Automatic Backups

Before modifying any file, the script creates a backup in `.translate-backups/`:

```
.translate-backups/
├── README.md.2026-02-19T10-30-00.000Z.bak
├── src/index.js.2026-02-19T10-30-01.500Z.bak
└── package.json.2026-02-19T10-30-01.750Z.bak
```

**To restore a backup:**
```bash
cp .translate-backups/README.md.2026-02-19T10-30-00.000Z.bak README.md
```

### 2. Git Warnings

If uncommitted changes exist, the script displays a warning:

```
⚠ Git Warning: The following files have uncommitted changes:
  - src/index.js
  - docs/API.md

Consider committing your changes before running translation.
```

### 3. Word Boundary Matching

The script uses regex word boundaries (`\b`) to prevent partial matches:

| Input | Pattern | Replacement | Output | Match? |
|-------|---------|-------------|--------|--------|
| `gsd` | `gsd` | `gsd-opencode` | `gsd-opencode` | ✓ Yes |
| `GSD` | `gsd` | `gsd-opencode` | `GSD-OPENCODE` | ✓ Yes |
| `mygsd` | `gsd` | `gsd-opencode` | `mygsd` | ✗ No (partial) |
| `gsd-opencode` | `gsd` | `gsd-opencode` | `gsd-opencode` | ✓ Yes* |

\* Special handling prevents double-replacement.

### 4. Binary File Detection

Files containing null bytes in the first 512 bytes are skipped:

```
assets/logo.png                               0  ○ Skipped (binary)
```

### 5. Post-Translation Validation

After applying changes, the script validates that no forbidden patterns remain:

```
Running post-translation validation...

╔══════════════════════════════════════════════════════════════════════╗
║  Validation Summary                                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  File                    Violations  Status                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  README.md                        0  ✓ Valid                         ║
║  src/index.js                     2  ✗ Violations found              ║
╚══════════════════════════════════════════════════════════════════════╝

❌ Post-translation validation failed. Review violations above.
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation error (invalid config, validation failures) |
| `2` | Runtime error (file I/O, permissions) |

Use exit codes in CI/CD pipelines:

```bash
node bin/translate.js config.json --apply
if [ $? -eq 0 ]; then
  echo "Translation successful"
else
  echo "Translation failed"
  exit 1
fi
```

## Advanced Usage

### Include Option

The `include` option acts as a whitelist, allowing you to specify exactly which files should be considered for translation. When `include` is specified, the `patterns` option is ignored.

**Processing order:** `include` (whitelist) -> `exclude` (blacklist) -> translate

**When to use `include` vs `patterns`:**

| Approach | Use When | Example |
|----------|----------|---------|
| `patterns` + `exclude` | Most files should be processed, with a few exceptions | Translate all source files except tests |
| `include` + `exclude` | Only specific files should be processed | Translate only docs and src, exclude internal docs |

#### Example: Only process specific directories

**Config file** (`selective-include.json`):
```json
{
  "include": ["src/**/*.js", "docs/**/*.md"],
  "exclude": ["**/*.test.js", "docs/internal/**"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"}
  ]
}
```

This config will:
1. First include only `.js` files in `src/` and `.md` files in `docs/`
2. Then exclude test files (`*.test.js`) and internal docs
3. Apply translation rules to the remaining files

#### Example: Include with exclude patterns

**Task:** Process all markdown files except those in specific directories.

```json
{
  "include": ["**/*.md"],
  "exclude": ["node_modules/**", "vendor/**", "CHANGELOG.md"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"}
  ]
}
```

#### Behavior summary

| `include` value | Behavior |
|-----------------|----------|
| `[]` or not specified | Use `patterns` with `exclude` (default behavior) |
| `["**/*.md"]` | Only process files matching include patterns, then apply `exclude` |

### Programmatic API

You can use the translation modules directly in your code:

```javascript
import { TextTranslator } from './lib/translator.js';

const config = {
  rules: [
    { pattern: 'gsd', replacement: 'gsd-opencode' }
  ]
};

const translator = new TextTranslator(config);

// Translate a string
const result = translator.translateContent('Use gsd for project management');
console.log(result.translated); // "Use gsd-opencode for project management"
console.log(result.changeCount); // 1

// Translate a file
const fileResult = await translator.translateFile('README.md');
console.log(fileResult.wasModified); // true
console.log(fileResult.changes);
// [{ line: 5, column: 10, before: 'gsd', after: 'gsd-opencode' }]
```

### Backup Management

```javascript
import { BackupManager } from './lib/backup-manager.js';

const backupManager = new BackupManager({
  backupDir: '.translate-backups',
  maxAgeDays: 30
});

// Create backup
const backup = await backupManager.createBackup('src/index.js');
console.log(backup.backupPath);

// Restore backup
await backupManager.restoreBackup('src/index.js');

// Clean old backups
await backupManager.cleanupOldBackups();
```

### Git Checking

```javascript
import { GitChecker } from './lib/git-checker.js';

const gitChecker = new GitChecker();

// Check for uncommitted changes
const changedFiles = await gitChecker.checkUncommittedChanges([
  'src/index.js',
  'README.md'
]);

if (changedFiles.length > 0) {
  console.log('Warning: Uncommitted changes detected');
}
```

## Troubleshooting

### "Config file not found"

```bash
# Wrong: Relative path from wrong directory
node bin/translate.js config.json

# Right: Use absolute or correct relative path
node bin/translate.js ./config.json
node bin/translate.js /full/path/to/config.json
```

### "tinyglobby not available"

```bash
cd assets
npm install
```

### "File exceeds max size"

Increase the max file size in config:

```json
{
  "maxFileSize": 52428800,
  "rules": [...]
}
```

Or exclude large files:

```json
{
  "exclude": ["node_modules/**", "*.bundle.js", "dist/**"],
  "rules": [...]
}
```

### Partial matches not working

Word boundaries prevent partial matches by design. If you need to match partial words, modify the source code to remove `\b` from the regex construction in `translator.js`:

```javascript
// Current (with word boundaries)
regex = new RegExp(`\\b${escaped}\\b`, flags);

// Modified (without word boundaries)
regex = new RegExp(escaped, flags);
```

### Restoring from backup

If something goes wrong, restore from the backup directory:

```bash
# List available backups
ls -la .translate-backups/

# Restore specific file
cp .translate-backups/README.md.2026-02-19T10-30-00.000Z.bak README.md

# Restore all files (be careful!)
for backup in .translate-backups/*.bak; do
  original=$(basename "$backup" | sed 's/\.[0-9T:-]*\.bak$//')
  cp "$backup" "$original"
done
```

---

## Reference: File Structure

```
assets/
├── bin/
│   └── translate.js          # CLI entry point
├── lib/
│   ├── translator.js         # Core translation engine
│   ├── cli.js                # Output formatting
│   ├── backup-manager.js     # Backup creation/management
│   ├── git-checker.js        # Git integration
│   └── validator.js          # Post-translation validation
├── tests/
│   ├── translator.test.js    # Unit tests for translator
│   ├── backup-manager.test.js
│   ├── validator.test.js
│   └── translate.test.js     # Integration tests
└── package.json
```

## Reference: Test Suite

Run tests to verify functionality:

```bash
cd assets
npm test
```

Test coverage:
- **94 tests** covering all modules
- Unit tests for each service
- Integration tests for CLI workflow
- Edge case handling (binary files, permissions, etc.)
- Include/exclude filtering tests
