---
name: gsd-set-profile
description: Switch between model profiles with confirmation workflow
argument-hint: "[quality|balanced|budget]"
tools:
  question: true
---

<role>
You are executing the `/gsd-set-profile` command. Switch the project's active model profile (quality/balanced/budget) with a clear before/after preview and confirmation workflow.

This command reads/writes two files:
- `.planning/config.json` — profile state (active_profile, presets, custom_overrides)
- `opencode.json` — agent model assignments (OpenCode's native config)

Do NOT modify agent .md files. Profile switching updates `opencode.json` in the project root.
</role>

<context>
**Invocation styles:**

1. No args (interactive picker): `/gsd-set-profile`
2. Positional: `/gsd-set-profile quality` or `balanced` or `budget`
3. Flags: `--quality` or `-q`, `--balanced` or `-b`, `--budget` or `-u`

Precedence: Positional > Flags > Interactive picker

**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

**Profile presets:**

| Profile  | Planning                   | Execution                    | Verification               |
|----------|----------------------------|------------------------------|----------------------------|
| quality  | opencode/glm-4.7-free      | opencode/glm-4.7-free        | opencode/glm-4.7-free      |
| balanced | opencode/glm-4.7-free      | opencode/minimax-m2.1-free   | opencode/glm-4.7-free      |
| budget   | opencode/minimax-m2.1-free | opencode/grok-code           | opencode/minimax-m2.1-free |
</context>

<behavior>

## Step 1: Read config file and migrate if needed

Read `.planning/config.json`. Handle these cases:

**Case A: File missing or invalid**
- Use defaults (see below)
- Write the defaults to `.planning/config.json`
- Print: `Created .planning/config.json with default profile settings`

**Case B: File exists but missing `profiles` key (legacy config)**
- This is an older GSD project that needs migration
- Preserve all existing keys (`mode`, `depth`, `parallelization`, etc.)
- Add the `profiles` structure with defaults
- Write the merged config to `.planning/config.json`
- Print: `Migrated config.json to support model profiles (GSD update)`

**Case C: File exists with `profiles` key**
- Use as-is, no migration needed

**Also check `opencode.json`:**
- If missing, it will be created when changes are saved
- If exists, it will be merged (preserve non-agent keys)

**Default profiles structure:**

```json
{
  "profiles": {
    "active_profile": "balanced",
    "presets": {
      "quality": {
        "planning": "opencode/glm-4.7-free",
        "execution": "opencode/glm-4.7-free",
        "verification": "opencode/glm-4.7-free"
      },
      "balanced": {
        "planning": "opencode/glm-4.7-free",
        "execution": "opencode/minimax-m2.1-free",
        "verification": "opencode/glm-4.7-free"
      },
      "budget": {
        "planning": "opencode/minimax-m2.1-free",
        "execution": "opencode/grok-code",
        "verification": "opencode/minimax-m2.1-free"
      }
    },
    "custom_overrides": {}
  }
}
```

## Step 2: Compute effective models for current profile

1. Get `currentProfile` = `config.profiles.active_profile` (default: "balanced")
2. Get `preset` = `config.profiles.presets[currentProfile]`
3. Get `overrides` = `config.profiles.custom_overrides[currentProfile]` (may be undefined)
4. Compute effective models:
   - `planning` = overrides?.planning || preset.planning
   - `execution` = overrides?.execution || preset.execution
   - `verification` = overrides?.verification || preset.verification

## Step 3: Display current state

Print:

```
Active profile: {currentProfile}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {current.planning} |
| execution    | {current.execution} |
| verification | {current.verification} |
```

## Step 4: Determine requested profile

**A) Check for positional argument:**
- If user typed `/gsd-set-profile quality` (or balanced/budget), use that as `newProfile`

**B) Check for flags:**
- `--quality` or `-q` → quality
- `--balanced` or `-b` → balanced
- `--budget` or `-u` → budget

**C) Interactive picker (no args/flags):**

Use Question tool:
```
header: "Model profile"
question: "Select a profile"
options:
  - label: "quality"
    description: "All stages use opencode/glm-4.7-free"
  - label: "balanced"
    description: "Planning/verification use glm-4.7-free, execution uses minimax-m2.1-free"
  - label: "budget"
    description: "Planning/verification use minimax-m2.1-free, execution uses grok-code"
  - label: "Cancel"
    description: "Exit without changes"
```

**D) Invalid profile handling:**

If an invalid profile name is provided:
- Print: `Unknown profile '{name}'. Valid options: quality, balanced, budget`
- Fall back to interactive picker

## Step 5: Handle edge cases

**If user selected Cancel:**
```
Profile change cancelled. Current profile: {currentProfile}
```
Stop.

**If newProfile === currentProfile:**
```
Profile '{currentProfile}' is already active.
```
Re-print current configuration table and stop.

## Step 6: Show preview and confirm

Get effective models for the new profile (same logic as Step 2 but for `newProfile`).

Print:
```
Profile change: {currentProfile} → {newProfile}

| Stage        | Current Model              | New Model                  |
|--------------|----------------------------|----------------------------|
| planning     | {current.planning}         | {new.planning}             |
| execution    | {current.execution}        | {new.execution}            |
| verification | {current.verification}     | {new.verification}         |

This will update `opencode.json` with new agent model assignments.

Note: OpenCode loads `opencode.json` at startup and does not hot-reload model/agent assignments. Fully quit and relaunch OpenCode to apply this profile change.
```

Use Question tool:
```
header: "Confirm profile change"
question: "Apply this profile change?"
options:
  - label: "Confirm"
    description: "Apply changes to config and opencode.json"
  - label: "Cancel"
    description: "Exit without changes"
```

## Step 7: Handle confirmation

**If "Cancel":**
```
Profile change cancelled. Current profile: {currentProfile}
```
Stop.

**If "Confirm":**
Continue to Step 8.

## Step 8: Apply changes

1. **Update .planning/config.json:**
   - Set `config.profiles.active_profile` to `newProfile`
   - Write the config file (preserve all other keys)

2. **Update opencode.json:**

Build agent config from effective stage models for `newProfile`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "gsd-planner": { "model": "{new.planning}" },
    "gsd-plan-checker": { "model": "{new.planning}" },
    "gsd-phase-researcher": { "model": "{new.planning}" },
    "gsd-roadmapper": { "model": "{new.planning}" },
    "gsd-project-researcher": { "model": "{new.planning}" },
    "gsd-research-synthesizer": { "model": "{new.planning}" },
    "gsd-codebase-mapper": { "model": "{new.planning}" },
    "gsd-executor": { "model": "{new.execution}" },
    "gsd-debugger": { "model": "{new.execution}" },
    "gsd-verifier": { "model": "{new.verification}" },
    "gsd-integration-checker": { "model": "{new.verification}" }
  }
}
```

If `opencode.json` already exists, merge the `agent` key (preserve other top-level keys).

3. **Report success:**

```
✓ Active profile set to: {newProfile}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {new.planning} |
| execution    | {new.execution} |
| verification | {new.verification} |

Note: OpenCode loads `opencode.json` at startup and does not hot-reload model/agent assignments. Fully quit and relaunch OpenCode to apply this profile change.
```

</behavior>

<notes>
- Use the Question tool for ALL user input (never ask user to type numbers)
- Always show full model IDs (e.g., `opencode/glm-4.7-free`)
- Preserve all other config.json keys when writing (deep merge)
- Do NOT rewrite agent .md files — only update opencode.json
- If opencode.json doesn't exist, create it
- Overrides are scoped per profile at `profiles.custom_overrides.{profile}.{stage}`
- **Source of truth:** `config.json` stores profiles/presets/overrides; `opencode.json` is **derived** from the effective models
- When regenerating `opencode.json`, read the new profile from `config.json`, compute effective models (preset + overrides), then write the agent mappings
</notes>
