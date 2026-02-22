# Phase 12: Simple Profiles System - Changes & Integration Guide

**Date:** 2026-02-22  
**Phase:** 12 - Simple Profiles System  
**Goal:** Replace quality/balanced/budget profiles with Simple/Smart/Custom profile types

---

## Overview

Phase 12 introduces a new profile system that replaces the old `quality/balanced/budget` model profiles with three intuitive profile types:

- **Simple**: 1 model for all stages (easiest setup)
- **Smart**: 2 models (advanced for planning+execution, cheaper for verification)
- **Custom**: 3 models (full control with different model per stage)

This simplifies model configuration while maintaining flexibility for power users.

---

## What Changed

### 1. Config Structure

**Old format (before Phase 12):**
```json
{
  "model_profile": "balanced",
  "profiles": {
    "active_profile": "balanced",
    "presets": {
      "quality": { "planning": "...", "execution": "...", "verification": "..." },
      "balanced": { "planning": "...", "execution": "...", "verification": "..." },
      "budget": { "planning": "...", "execution": "...", "verification": "..." }
    },
    "custom_overrides": { ... }
  }
}
```

**New format (Phase 12):**
```json
{
  "profiles": {
    "profile_type": "simple|smart|custom",
    "models": {
      "planning": "opencode/glm-4.7-free",
      "execution": "opencode/glm-4.7-free",
      "verification": "opencode/glm-4.7-free"
    }
  }
}
```

### 2. Updated Files

| File | Purpose | Changes |
|------|---------|---------|
| `gsd-opencode/get-shit-done/bin/gsd-tools.cjs` | Backend CLI | Added profile schema, migration, derivation functions |
| `commands/gsd/set-profile.md` | User command | Updated for Simple/Smart/Custom |
| `agents/gsd-set-profile.md` | Agent implementation | Complete rewrite with model reuse |
| `agents/gsd-settings.md` | Settings agent | Simplified from 9-model wizard to 3 actions |
| `commands/gsd/new-project.md` | Project init | Updated config template |

### 3. New CLI Commands in gsd-tools.cjs

```bash
# Profile management
node gsd-tools.cjs set-profile --status              # Show current profile
node gsd-tools.cjs set-profile simple                # Switch to Simple profile
node gsd-tools.cjs set-profile --migrate             # Migrate old config
node gsd-tools.cjs profile-switch smart --reuse      # Switch with model reuse
node gsd-tools.cjs profile-switch custom --complete '{"planning":"...",...}'

# Model resolution
node gsd-tools.cjs resolve-model gsd-planner         # Get model for agent
node gsd-tools.cjs derive-opencode-json              # Generate opencode.json

# Wizard helpers
node gsd-tools.cjs wizard-model-select --providers   # List available providers
node gsd-tools.cjs wizard-model-select --provider "opencode"  # Get models
```

---

## How to Use

### For New Projects

When running `/gsd-new-project`:

1. Answer workflow questions (mode, depth, parallelization, etc.)
2. Select profile type:
   - **Simple**: Choose 1 model for everything
   - **Smart**: Choose 2 models (planning+execution, verification)
   - **Custom**: Choose 3 models (one per stage)
3. Use `/gsd-set-profile {type}` to configure models interactively

The wizard will guide you through model selection using the `gsd-oc-select-model` skill.

### For Existing Projects

**Option 1: Let the system auto-migrate**

Simply run `/gsd-set-profile` or `/gsd-settings`. The system will:
1. Detect your old `quality/balanced/budget` config
2. Convert it to Custom profile with equivalent models
3. Preserve your settings

**Option 2: Switch to a new profile type**

```bash
/gsd-set-profile simple    # 1 model for all stages
/gsd-set-profile smart     # 2 models
/gsd-set-profile custom    # 3 models (default after migration)
```

You can also reuse existing models:
```bash
/gsd-set-profile smart --reuse
```

### Managing Settings

Use `/gsd-settings` to:
- **Switch profile**: Change between Simple/Smart/Custom
- **Change models**: Update models for current profile
- **Toggle workflow**: Enable/disable research, plan_check, verifier

The settings menu is now much simpler - no more configuring 9 different model presets!

---

## Migration Details

### Automatic Migration

When you run `/gsd-set-profile` or `/gsd-settings` on an old config:

| Old Profile | Becomes | Models Mapped |
|-------------|---------|---------------|
| `quality` | `custom` | All stages use your quality preset models |
| `balanced` | `custom` | All stages use your balanced preset models |
| `budget` | `custom` | All stages use your budget preset models |

The migration:
1. Reads your old `profiles.presets.{profile}` configuration
2. Creates new `profiles.models` with those values
3. Sets `profiles.profile_type` to `custom`
4. Preserves old `model_profile` field for backward compatibility

### Migration Safety

- **Non-destructive**: Original config is preserved
- **Reversible**: Can manually revert if needed
- **Transparent**: You'll see a message: "⚡ Auto-migrated from {old} to custom profile"

---

## Integration Guide

### For Agent Developers

When spawning agents, use the new resolution method:

**Old way (before Phase 12):**
```bash
MODEL_PROFILE=$(cat .planning/config.json | grep -o '"model_profile"...')
# Look up in hardcoded table
```

**New way (Phase 12):**
```bash
# Resolve model for specific agent
MODEL=$(node gsd-tools.cjs resolve-model gsd-planner --raw | grep -o '"model":"[^"]*"' | cut -d'"' -f4)

# Or derive complete opencode.json
node gsd-tools.cjs derive-opencode-json --raw > opencode.json
```

The `resolve-model` command:
1. Reads `profiles.models` from config
2. Maps agent to stage (planning/execution/verification)
3. Returns the appropriate model

### Stage-to-Agent Mapping

| Stage | Agents |
|-------|--------|
| **Planning** | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| **Execution** | gsd-executor, gsd-debugger |
| **Verification** | gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model |

### Config File Locations

- **Source of truth**: `.planning/config.json` (contains `profiles.profile_type` and `profiles.models`)
- **Derived config**: `opencode.json` (agent-to-model mapping, auto-generated)

Never edit `opencode.json` manually - use `/gsd-set-profile` or `/gsd-settings` instead.

---

## Backend Functions

The `gsd-tools.cjs` script provides these key functions:

### Profile Schema & Validation
- `STAGE_AGENTS` - Maps stages to agent arrays
- `AGENT_STAGE` - Reverse mapping: agent → stage
- `validateProfileConfig()` - Validates profile_type and models structure
- `getAgentStage()` - Returns stage for any agent type

### Migration
- `detectOldProfileConfig()` - Detects old quality/balanced/budget configs
- `migrateProfileConfig()` - Converts old format to new Custom profile
- `OLD_PROFILE_MODEL_MAP` - Maps old profiles to stage-based models

### Profile Switching
- `analyzeModelReuse()` - Analyzes which models can be reused when switching
- `buildProfileModels()` - Builds models object based on profile type
- `prepareProfileSwitch()` - Prepares switch data for wizard
- `completeProfileSwitch()` - Completes switch and saves config

### Model Resolution
- `cmdResolveModel()` - Returns model for agent based on profile
- `deriveOpencodeJson()` - Generates complete opencode.json
- `getSelectModelSkillDir()` - Locates gsd-oc-select-model skill
- `getProvidersFromSkill()` / `getModelsFromSkill()` - Model discovery

---

## Troubleshooting

### "No profile configured" error

Run `/gsd-set-profile` to configure your profile.

### Models not available

Ensure the model IDs in your config exist in OpenCode:
```bash
opencode models | grep "your-model-name"
```

### Migration didn't work

Force migration:
```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs set-profile --migrate
```

### Changes not taking effect

OpenCode doesn't hot-reload `opencode.json`. **Quit and relaunch** OpenCode after changing profiles.

---

## Benefits

1. **Simpler mental model**: 3 profile types vs 9 preset combinations
2. **Faster setup**: Simple profile needs just 1 model selection
3. **Flexible**: Smart profile balances cost/performance
4. **Powerful**: Custom profile gives full control
5. **Backward compatible**: Old configs auto-migrate
6. **Better UX**: Guided wizard with model reuse suggestions

---

## Files Modified in Phase 12

```
gsd-opencode/
└── get-shit-done/
    └── bin/
        └── gsd-tools.cjs          # Backend functions (Lines 233-350+)

local/gsd-opencode/
├── commands/gsd/
│   ├── set-profile.md              # Updated user-facing command
│   └── new-project.md              # Updated project init
└── agents/
    ├── gsd-set-profile.md          # Rewritten agent implementation
    └── gsd-settings.md             # Simplified settings menu
```

---

## Next Steps

After Phase 12 is complete:
1. Test profile switching: `/gsd-set-profile simple`
2. Verify model resolution: `node gsd-tools.cjs resolve-model gsd-planner --raw`
3. Check opencode.json generation: `node gsd-tools.cjs derive-opencode-json --raw`
4. Restart OpenCode to apply changes

For issues or questions, refer to the agent files in `local/gsd-opencode/agents/` for detailed behavior specifications.
