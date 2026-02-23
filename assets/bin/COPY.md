# Copy from Original Documentation

A CLI tool for synchronizing files from the original TÂCHES repository (git submodule) to the OpenCode adaptation.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Command Line Options](#command-line-options)
- [Directory Mapping](#directory-mapping)
- [Safety Features](#safety-features)
- [Exit Codes](#exit-codes)
- [Complete Workflow](#complete-workflow)
- [Troubleshooting](#troubleshooting)

## Overview

The `copy-from-original.js` script syncs files from the original TÂCHES repository (tracked as a git submodule at `original/get-shit-done/`) to the OpenCode adaptation (`gsd-opencode/`).

**Important:** This script does **NOT** apply Claude Code to OpenCode transformations. Transformations are handled separately by `translate.js` (Phase 10). This script only copies files.

**Default behavior:** The script runs in **preview mode** by default. It shows you what files are different but doesn't copy anything. Use `--apply` to actually copy files.

### What it does:

- Scans all mapped files and compares them with the submodule
- Shows which files are different (preview mode)
- Copies files when `--apply` is used
- Tracks sync state in a JSON manifest (`.planning/sync-manifest.json`)
- Creates backups before overwriting files
- Detects diverged files (local modifications) and warns
- Reports orphaned files (files in gsd-opencode not present in original)

## Prerequisites

### 1. Git Submodule Initialized

The script requires the git submodule to be initialized:

```bash
git submodule update --init --recursive
```

If the submodule is not initialized, the script will display:

```
✗ Submodule not initialized

  Error: Submodule not initialized at ./original/get-shit-done
  Suggestion: Run: git submodule update --init --recursive
```

### 2. Node.js Dependencies

Ensure dependencies are installed:

```bash
cd assets
npm install
```

Required packages:
- `commander` - CLI framework
- `ora` - Progress spinners
- `chalk` - Terminal colors
- `diff` - Unified diff output

## Quick Start

### Step 1: Preview Changes (Default)

See what files are different without making changes:

```bash
node bin/copy-from-original.js
```

**Example output:**

```
🔄 Copy from Original (PREVIEW)

✓ Submodule initialized
✓ Submodule at 131f24b (v1.20.5)
✓ Found 108 files with differences

Files to sync:
  - agents/gsd-codebase-mapper.md
  - agents/gsd-debugger.md
  - commands/gsd/execute-phase.md
  ... and 105 more

This is a preview. No files were modified.
Run with --apply to copy files.
```

### Step 2: Apply Changes

After reviewing the preview, copy the files:

```bash
node bin/copy-from-original.js --apply
```

**Example output:**

```
🔄 Copy from Original

✓ Submodule initialized
✓ Submodule at 131f24b (v1.20.5)
✓ Found 108 files with differences
✓ Sync complete

✓ Copied 108 files:
  - agents/gsd-codebase-mapper.md
  - agents/gsd-debugger.md
  ... and 106 more

✓ Sync complete
```

### Filter by Pattern

To sync only specific files, use the `--filter` option:

```bash
# Preview only files matching pattern
node bin/copy-from-original.js --filter "execute*"

# Apply only files starting with "execute"
node bin/copy-from-original.js --apply --filter "execute*"

# Preview files containing "phase"
node bin/copy-from-original.js --filter "*phase*"
```

## Command Line Options

```bash
node copy-from-original.js [options]
```

| Option | Short | Description |
|--------|-------|-------------|
| `--apply` | | Apply changes (copy files) |
| `--force` | `-f` | Overwrite diverged files without warning |
| `--filter <pattern>` | | Filter files by name pattern (e.g., "VALID*") |
| `--verbose` | `-v` | Show detailed output |
| `--help` | `-h` | Show help message |

### Examples

**Preview (default):**
```bash
node bin/copy-from-original.js
```

**Preview with verbose output:**
```bash
node bin/copy-from-original.js --verbose
```

**Apply changes:**
```bash
node bin/copy-from-original.js --apply
```

**Force overwrite diverged files:**
```bash
node bin/copy-from-original.js --apply --force
```

**Filter by pattern:**
```bash
# Preview files starting with "execute"
node bin/copy-from-original.js --filter "execute*"

# Apply only .md files
node bin/copy-from-original.js --apply --filter "*.md"

# Preview files containing "phase"
node bin/copy-from-original.js --filter "*phase*"
```

**Combine options:**
```bash
# Preview filtered files with verbose output
node bin/copy-from-original.js --filter "execute*" --verbose

# Apply filtered files with force
node bin/copy-from-original.js --apply --force --filter "commands/*"
```

## Directory Mapping

Files are copied according to this mapping:

| Original Path | Destination Path |
|---------------|------------------|
| `agents/*` | `gsd-opencode/agents/*` |
| `commands/gsd/*` | `gsd-opencode/commands/gsd/*` |
| `get-shit-done/references/*` | `gsd-opencode/get-shit-done/references/*` |
| `get-shit-done/templates/*` | `gsd-opencode/get-shit-done/templates/*` |
| `get-shit-done/workflows/*` | `gsd-opencode/get-shit-done/workflows/*` |

Files outside these directories are skipped.

## Safety Features

### 1. Preview Mode by Default

The script always shows a preview first. You must explicitly use `--apply` to copy files:

```
🔄 Copy from Original (PREVIEW)

✓ Found 108 files with differences

Files to sync:
  - agents/gsd-codebase-mapper.md
  - commands/gsd/ro-commit.js
  ...

This is a preview. No files were modified.
Run with --apply to copy files.
```

### 2. Divergence Detection

Before overwriting, the script checks if the destination file has local modifications:

```
⚠ 15 diverged files:
  - commands/gsd/ro-commit.js
  - get-shit-done/workflows/execute.md
  ...

  Use --force to overwrite diverged files
```

**To override:** Use `--force` flag with `--apply`

### 3. Binary File Skipping

Binary files (detected by null bytes in first 512 bytes) are automatically skipped:

```
⚠ Skipped 2 files (binary):
```

### 4. Backup Creation

Before overwriting files, backups are created:

```
.planning/backups/
└── 2026-02-22T14-30-00-000Z/
    ├── commands/gsd/ro-commit.js
    └── get-shit-done/references/checkpoints.md
```

**To restore from backup:**
```bash
cp .planning/backups/2026-02-22T14-30-00-000Z/agents/gsd-planner.md gsd-opencode/agents/gsd-planner.md
```

### 5. Atomic Operations

All changes are staged to a temporary directory first, then moved atomically:

1. Files are copied to temp directory
2. Backups are created
3. Files are renamed (atomic move) to final location
4. Manifest is updated

This prevents partial sync state if the process crashes.

### 6. Orphan Reporting

Files in gsd-opencode that do not exist in original are reported:

```
📦 2 orphaned files (in gsd-opencode but not in original):
  - agents/custom-agent.md
  - commands/gsd/local-command.js
```

These are OpenCode-specific additions and are preserved.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (sync complete or already up to date) |
| `1` | Error (submodule not initialized, sync failed, etc.) |
| `2` | Permission error (EACCES) |

Use in scripts:

```bash
node bin/copy-from-original.js
if [ $? -eq 0 ]; then
  echo "Preview successful"
  # Now apply
  node bin/copy-from-original.js --apply
else
  echo "Preview failed"
  exit 1
fi
```

## Complete Workflow

The complete workflow for syncing from upstream:

### Step 1: Update Submodule

```bash
cd original/get-shit-done
git pull origin main
cd ../..
git add original/get-shit-done
git commit -m "chore: update TACHES submodule"
```

### Step 2: Preview Changes

```bash
node assets/bin/copy-from-original.js
```

### Step 3: Apply Changes

```bash
node assets/bin/copy-from-original.js --apply
```

Or apply only specific files:

```bash
node assets/bin/copy-from-original.js --apply --filter "execute*"
```

### Step 4: Apply Transformations

After copying, run `translate.js` to apply Claude Code → OpenCode transformations:

```bash
# Create translate config if needed
cat > translate-config.json << 'EOF'
{
  "patterns": ["gsd-opencode/**/*"],
  "exclude": ["node_modules/**"],
  "rules": [
    {"pattern": "gsd", "replacement": "gsd-opencode"},
    {"pattern": "Claude Code", "replacement": "OpenCode"}
  ]
}
EOF

# Preview transformations
node assets/bin/translate.js translate-config.json

# Apply transformations
node assets/bin/translate.js translate-config.json --apply
```

### Step 5: Verify and Commit

```bash
# Run tests
npm test

# Review changes
git diff gsd-opencode/

# Commit
git add gsd-opencode/
git commit -m "sync: update from TACHES v1.20.5"
```

## Troubleshooting

### "Submodule not initialized"

```
✗ Submodule not initialized

  Error: Submodule not initialized at ./original/get-shit-done
  Suggestion: Run: git submodule update --init --recursive
```

**Fix:**
```bash
git submodule update --init --recursive
```

### "All files are up to date"

If the script shows this but you expect changes:

1. Check if the submodule is at the expected commit:
   ```bash
   cd original/get-shit-done
   git log --oneline -1
   ```

2. Verify files exist in the mapped directories:
   ```bash
   ls original/get-shit-done/get-shit-done/workflows/
   ```

3. Check if files are binary (they're automatically skipped)

### "Diverged files"

```
⚠ 15 diverged files:
  - commands/gsd/ro-commit.js

  Use --force to overwrite diverged files
```

**Options:**
1. Review local changes: `git diff gsd-opencode/commands/gsd/ro-commit.js`
2. Force overwrite: `node bin/copy-from-original.js --apply --force`
3. Preserve local changes: Don't sync, or restore from backup after

### "Forgot --apply"

If you run the script without `--apply` and wonder why files weren't copied:

```
This is a preview. No files were modified.
Run with --apply to copy files.
```

**Fix:**
```bash
# Run again with --apply
node bin/copy-from-original.js --apply
```

### Filter not matching files

The `--filter` option matches against the **filename**, not the full path:

```bash
# Good: Matches files starting with "execute"
--filter "execute*"

# Good: Matches all .md files
--filter "*.md"

# Bad: Filter doesn't support path patterns
--filter "commands/*"  # This won't work as expected
```

To filter by directory, use the normal workflow and manually select files.

### "Permission denied"

```
✗ Sync failed

  Error: EACCES: permission denied, open 'gsd-opencode/...'
```

**Fix:**
```bash
# Check permissions
ls -la gsd-opencode/

# Fix with chmod/chown
chmod -R u+w gsd-opencode/
```

### Restore from Backup

If something goes wrong, restore from backup:

```bash
# List backups
ls -la .planning/backups/

# Restore specific file
cp .planning/backups/2026-02-22T14-30-00-000Z/commands/gsd/ro-commit.js \
   gsd-opencode/commands/gsd/ro-commit.js

# Or restore entire backup
cp -r .planning/backups/2026-02-22T14-30-00-000Z/* gsd-opencode/
```

### View Sync State

Check the sync manifest to see what was last synced:

```bash
cat .planning/sync-manifest.json
```

**Example:**
```json
{
  "version": "1.0.0",
  "lastSync": {
    "commit": "131f24b5cd9014a1e910807565ad522416932053",
    "date": "2026-02-22T14:30:00.000Z",
    "version": "v1.20.5"
  },
  "files": {
    "commands/gsd/ro-commit.js": {
      "syncedAt": "2026-02-22T14:30:00.000Z",
      "sourceHash": "sha256:abc123...",
      "destHash": "sha256:def456...",
      "transformed": false
    }
  }
}
```

---

## Architecture

The script uses a service-based architecture:

```
┌─────────────────────────────────────────┐
│  copy-from-original.js (CLI)           │
│  - Parses arguments                     │
│  - Coordinates services                │
│  - Formats output                      │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌────▼────┐  ┌────▼────┐
│Submodule│   │SyncService│  │SyncManifest│
│Service  │   │          │  │           │
│- Git    │   │- Copy    │  │- JSON     │
│  ops    │   │- Diverge │  │  persistence│
│- Change │   │- Backup  │  │- Hash     │
│  detect │   │- Atomic  │  │  tracking  │
└─────────┘   └─────────┘  └────────────┘
```

## Reference

### Files

- `assets/bin/copy-from-original.js` - CLI entry point
- `assets/copy-services/SubmoduleService.js` - Git operations
- `assets/copy-services/SyncService.js` - File sync orchestration
- `assets/copy-services/SyncManifest.js` - State persistence
- `assets/utils/file-diff.js` - File comparison
- `assets/utils/backup.js` - Backup management
- `assets/utils/binary-check.js` - Binary detection

### Related Documentation

- [TRANSLATION.md](TRANSLATION.md) - Transformation utility docs
- `assets/prompts/TRANSLATION-MAPPING.md` - CC to OC transformation patterns

### Running Tests

```bash
# Unit tests
node --test assets/copy-services/__tests__/*.test.js

# Integration tests
node --test assets/bin/__tests__/copy-from-original.integration.test.js
```

**Test coverage:** 36 tests covering all sync scenarios

---

*Last updated: 2026-02-22*

