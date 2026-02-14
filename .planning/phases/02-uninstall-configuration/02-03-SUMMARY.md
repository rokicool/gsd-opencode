---
phase: 02-uninstall-configuration
plan: 03
name: Config Command and CLI Registration
type: execute
completed: 2026-02-10

dependencies:
  requires:
    - phase-01-complete
    - 02-01-settings-manager
    - 02-02-uninstall-command
  provides:
    - config-command
    - config-subcommands
    - cli-registration
  affects:
    - phase-03-health-verification
    - phase-04-self-healing

metrics:
  duration: 15m
  tasks_completed: 2/2
  files_created: 1
  files_modified: 1
  lines_added: 421

success_criteria:
  - Config command with get/set/reset/list subcommands
  - Value auto-parsing (boolean, number, JSON, string)
  - Settings persist across invocations
  - Human-readable and JSON output modes
  - Uninstall command registered and functional
  - All commands appear in --help
  - Proper exit codes throughout
---

# Phase 2 Plan 3 Summary: Config Command and CLI Registration

## Overview

Created the `config` command with four subcommands (get, set, reset, list) for user configuration management, and registered both `config` and `uninstall` commands in the CLI entry point. This completes Phase 2 of the project.

## What Was Built

### 1. Config Command (`src/commands/config.js`)

A comprehensive configuration management command with 337 lines implementing:

**Subcommands:**
- `config get <key>` - Retrieve configuration values by dot-notation key
- `config set <key> <value>` - Set values with intelligent auto-parsing
- `config reset [key]` - Reset specific key or use `--all` for everything
- `config list` - Display all settings (human-readable or `--json`)

**Features:**
- **Value auto-parsing**: Automatically converts 'true'/'false' to booleans, numeric strings to numbers, JSON strings to objects/arrays, and keeps everything else as strings
- **Dot-notation access**: Keys like `ui.colors` map to nested objects
- **Dual output modes**: Human-readable table with aligned columns, or JSON for scripting
- **Settings persistence**: All changes saved to `~/.config/gsd-opencode/settings.json`
- **Default value handling**: Merges user settings with built-in defaults
- **Proper error handling**: Returns appropriate exit codes (0, 1, 130)

### 2. CLI Registration (`bin/gsd.js`)

Updated the main CLI entry point:

- **Added imports** for `uninstallCommand` and all four config subcommands
- **Registered uninstall command** with options: `-g/--global`, `-l/--local`, `-f/--force`
- **Registered config command** as a command group with four subcommands
- **Updated legacy command detection** to recognize `uninstall` and `config`
- **Proper option passing**: Global `--verbose` flag flows to all commands

## Verification Results

All verification checks passed:

| Check | Result |
|-------|--------|
| File exists with 180+ lines | 337 lines ✓ |
| bin/gsd.js imports both commands | 5 import statements ✓ |
| Help shows new commands | uninstall, config listed ✓ |
| Config subcommands available | get, set, reset, list ✓ |
| Value parsing works | boolean, number, JSON, string ✓ |
| Exit codes correct | 0 success, 1 error ✓ |

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `src/commands/config.js` | +337 | Created |
| `bin/gsd.js` | +84/-1 | Modified |

## Commits

1. `487650e` - feat(02-03): create config command with four subcommands
2. `a2be3ea` - feat(02-03): register config and uninstall commands in CLI

## Decisions Made

1. **Console.log for scriptable output**: Used `console.log` (not logger) for `get` and `list --json` to ensure clean stdout for piping
2. **Flattened display**: List command flattens nested objects for aligned column display
3. **Parent.parent.opts()**: For config subcommands, global options accessed via `command.parent.parent.opts()` due to nested command structure
4. **Known commands list**: Updated to include `uninstall` and `config` for legacy argument detection

## Phase 2 Completion

This plan completes Phase 2 (Uninstall & Configuration):

| Requirement | Status |
|-------------|--------|
| CLI-02: Uninstall command | ✓ Complete |
| CLI-07: Config command | ✓ Complete |
| UNIN-01 through UNIN-05 | ✓ Complete |
| CONFIG-01 through CONFIG-04 | ✓ Complete |

## Next Steps

Phase 2 is now complete. Ready to proceed to:
- **Phase 3: Health Verification** - Check command for installation integrity
- **Phase 4: Self-Healing** - Repair command for fixing issues

## Usage Examples

```bash
# Get a configuration value
gsd-opencode config get ui.colors

# Set a configuration value (auto-parsed)
gsd-opencode config set ui.colors false
gsd-opencode config set output.timeout 30
gsd-opencode config set user.name "John Doe"

# List all settings
gsd-opencode config list
gsd-opencode config list --json

# Reset to defaults
gsd-opencode config reset ui.colors
gsd-opencode config reset --all

# Uninstall
gsd-opencode uninstall --global
gsd-opencode uninstall --force
```
