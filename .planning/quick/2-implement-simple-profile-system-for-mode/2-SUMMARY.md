---
phase: quick
plan: 2
subsystem: simple-profiles-system
tags: [profile, simple, model-selection, configuration, migration]
dependencies:
  requires: []
  provides: [PROF-01, PROF-02, PROF-03]
  affects: []
tech-stack:
  added: []
  patterns: [class-based-profile, config-persistence, auto-migration]
key-files:
  created:
    - .planning/phases/12-simple-profiles-system/lib/simple-profile.js
    - .planning/phases/12-simple-profiles-system/config/profile-config.js
    - .planning/phases/12-simple-profiles-system/commands/gsd-set-profile.js
  modified: []
decisions:
  - "Simple profile uses single model for all three stages (planning, execution, verification)"
  - "Profile config stored at ~/.config/gsd-opencode/profiles.json"
  - "Auto-migrate old budget/balanced/quality configs to new simple/custom format"
  - "Migration preserves model assignments and logs metadata"
  - "First-run detection triggers setup wizard automatically"
metrics:
  duration: 6
  tasks: 3
  files: 3
  lines-added: 707
  lines-removed: 0
---

# Quick Task 2: Implement Simple Profile System for Model Assignment

## Summary

Implemented the Simple Profile system for model assignment, allowing users to configure a single model that handles all three stages (Planning, Execution, Verification). The system includes profile persistence, automatic migration from old config formats, and a CLI command for profile management.

## Files Created

### 1. `lib/simple-profile.js` (116 lines)

**SimpleProfile class** with the following features:

- **Constructor**: Accepts model configuration with `default` model ID
- **getModelForStage(stage)**: Returns the same model for all stages ('planning', 'execution', 'verification')
- **isComplete()**: Checks if a model is configured
- **validate()**: Validates profile configuration with error details
- **getDisplayInfo()**: Returns formatted profile info for CLI output
- **toJSON() / fromJSON()**: Serialization support
- **fromOldConfig()**: Migration from old format configs

**Usage:**
```javascript
const { SimpleProfile } = require('./lib/simple-profile');

// Create new profile
const profile = new SimpleProfile({ default: 'anthropic/claude-3-5-sonnet' });

// Get model for any stage (all return the same)
profile.getModelForStage('planning');    // 'anthropic/claude-3-5-sonnet'
profile.getModelForStage('execution');   // 'anthropic/claude-3-5-sonnet'
profile.getModelForStage('verification'); // 'anthropic/claude-3-5-sonnet'

// Check if complete
profile.isComplete(); // true

// Get display info
profile.getDisplayInfo(); // Returns formatted object for CLI
```

### 2. `config/profile-config.js` (204 lines)

**Profile configuration management** with exports:

- **getProfile()**: Loads current profile (auto-migrates old configs)
- **setProfile(type, modelConfig)**: Saves profile to disk
- **getModelForStage(stage)**: Gets model for specific stage
- **isFirstRun()**: Detects first-time setup
- **migrateOldConfig(oldConfig)**: Converts old format to new
- **getConfigPath()**: Returns config file location
- **getReusableModel()**: Gets existing model for reuse during switching
- **PROFILE_TYPES**: Constant ['simple', 'smart', 'custom']

**Configuration Location:**
```
~/.config/gsd-opencode/profiles.json
```

**Profile JSON Structure:**
```json
{
  "version": "1.0",
  "profile_type": "simple",
  "models": {
    "default": "anthropic/claude-3-5-sonnet"
  },
  "updated_at": "2026-02-23T02:57:48.936Z"
}
```

### 3. `commands/gsd-set-profile.js` (269 lines)

**CLI command** `/gsd-set-profile` with features:

- **Direct mode**: `/gsd-set-profile simple` - immediately sets simple profile
- **Interactive mode**: `/gsd-set-profile` - shows profile picker
- **Model reuse**: Offers to reuse existing model when switching profiles
- **First-run wizard**: Auto-triggers on initial setup
- **Confirmation display**: Shows profile type, model, and stage assignments

**Usage Examples:**

```bash
# Set simple profile directly
/gsd-set-profile simple

# Show interactive picker
/gsd-set-profile

# Output:
# ✅ Profile set successfully!
# 
# Profile Type: Simple
# Model: anthropic/claude-3-5-sonnet
#
# 📊 Stage Assignments:
#   Planning:     anthropic/claude-3-5-sonnet
#   Execution:    anthropic/claude-3-5-sonnet
#   Verification: anthropic/claude-3-5-sonnet
```

## Migration Logic

### Old Format → New Format

The system automatically detects and migrates old configuration formats:

| Old Profile | New Profile | Model Handling |
|-------------|-------------|----------------|
| `budget` | `simple` | Single model (budget) |
| `balanced` | `custom` | Three models preserved |
| `quality` | `custom` | Three models preserved |

**Migration preserves:**
- Existing model assignments
- Timestamps (creates migration log)
- Adds migration metadata

**Migration Log Format:**
```json
{
  "migration": {
    "migrated_from": "budget",
    "migrated_at": "2026-02-23T02:59:51.234Z",
    "version": "1.0"
  }
}
```

## Usage Examples

### Setting Up Simple Profile

```bash
# First time setup - triggers wizard automatically
/gsd-set-profile

# Direct setup
/gsd-set-profile simple

# Output:
🔄 Setting up Simple Profile...
This profile uses 1 model for all stages.

✅ Profile set successfully!

Profile Type: Simple
Model: anthropic/claude-3-5-sonnet

📊 Stage Assignments:
  Planning:     anthropic/claude-3-5-sonnet
  Execution:    anthropic/claude-3-5-sonnet
  Verification: anthropic/claude-3-5-sonnet

💾 Configuration saved to: ~/.config/gsd-opencode/profiles.json
```

### Using Profile in Code

```javascript
const { getProfile, getModelForStage } = require('./config/profile-config');

// Get current profile
const profile = getProfile();

// Get model for specific stage
const planningModel = getModelForStage('planning');
const executionModel = getModelForStage('execution');
const verificationModel = getModelForStage('verification');

// All return the same model in simple profile
console.log(planningModel === executionModel); // true
console.log(executionModel === verificationModel); // true
```

### Checking Profile Status

```javascript
const profile = getProfile();
if (profile) {
  const info = profile.getDisplayInfo();
  console.log(`Profile: ${info.profileType}`);
  console.log(`Status: ${info.status}`);
  console.log(`Model: ${info.model}`);
  console.log(`Valid: ${info.isValid}`);
}
```

## Verification Results

All verification tests passed:

✅ **Task 1**: SimpleProfile class created with getModelForStage returning same model for all stages
✅ **Task 2**: gsd-set-profile command works in direct and interactive modes
✅ **Task 3**: First-run detection and migration working correctly

### Test Results

```
✓ SimpleProfile.getModelForStage() returns same model for planning/execution/verification
✓ Profile config module exports all required functions
✓ First-run detection returns true when no config exists
✓ Old configs auto-migrate (budget→simple, balanced→custom, quality→custom)
✓ Migration preserves existing model assignments
✓ Profile switching offers model reuse option
✅ All integration tests passed!
```

## Deviations from Plan

**None** - Plan executed exactly as written.

All requirements from the plan were implemented:
- ✅ Simple profile can be set via `/gsd-set-profile simple`
- ✅ Single model assigned to all three stages
- ✅ Profile configuration persists to disk
- ✅ Old configs auto-migrate to new format
- ✅ First-run wizard triggers automatically
- ✅ Profile switching offers model reuse option

## Commits

| Commit | Description |
|--------|-------------|
| `64694ab` | feat(quick-2): create simple profile configuration module |
| `3d9dbb2` | feat(quick-2): create gsd-set-profile command |
| (Task 3 functionality included in Task 1) | First-run detection and migration |

## Future Enhancements

- Implement Smart profile (2 models: planning vs execution/verification)
- Implement Custom profile (3 models: one per stage)
- Add `/gsd-get-profile` command to display current profile
- Add profile validation warnings in UI
- Support for model capability detection
