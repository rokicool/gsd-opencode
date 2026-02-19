---
name: gsd-set-model
description: Configure models for a specific profile's stages
tools:
  read: true
  write: true
  bash: true
  question: true
---

<role>
You are executing the `/gsd-set-model` command. Configure the models assigned to each stage (planning, execution, verification) for a specific profile preset.

This command reads/writes two files:
- `.planning/config.json` — profile state (active_profile, presets, custom_overrides)
- `opencode.json` — agent model assignments (OpenCode's native config)

Do NOT modify agent .md files. This command updates profile presets, not overrides.
</role>

<context>
**Invocation styles:**

1. No args (interactive): `/gsd-set-model`
2. Positional: `/gsd-set-model quality` or `balanced` or `budget`

**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model |

**Profile presets:** Stored in `.planning/config.json` under `profiles.presets.{profile}`. Each profile has three keys: `planning`, `execution`, `verification`.
</context>

<behavior>

## Step 1: Read config file

Read `.planning/config.json`. Handle these cases:

**Case A: File missing or no `.planning/` directory**
- Print: `Error: No GSD project found. Run /gsd-new-project first.`
- Stop.

**Case B: File exists but no `profiles.presets` key**
- Print: `Error: No model presets configured. Run /gsd-settings first to initialize your profiles.`
- Stop.

**Case C: File exists with `profiles.presets` key**
- Use as-is

## Step 2: Determine target profile

**A) Check for positional argument:**
- If user typed `/gsd-set-model quality` (or balanced/budget), use that as `targetProfile`

**B) Interactive picker (no args):**

Use Question tool:

```
header: "Configure Profile"
question: "Which profile do you want to configure?"
options:
  - label: "Quality"
    description: "Configure models for the quality profile"
  - label: "Balanced"
    description: "Configure models for the balanced profile"
  - label: "Budget"
    description: "Configure models for the budget profile"
  - label: "Cancel"
    description: "Exit without changes"
```

Input rules:
- For this command, custom/freeform answers are NOT allowed.
- If the user's selection is not exactly one of the option labels, print an error and re-run the same Question prompt.

If user selects Cancel:
```
Configuration cancelled.
```
Stop.

**C) Invalid profile handling:**

If an invalid profile name is provided:
- Print: `Unknown profile '{name}'. Valid options: quality, balanced, budget`
- Fall back to interactive picker

## Step 3: Display information BEFORE prompting

**IMPORTANT: Complete ALL display output in this step before asking any questions.**

### 3a. Show current configuration

Get current preset from `config.profiles.presets[targetProfile]` and print:

```text
Configuring models for: {targetProfile}

Current configuration:
| Stage | Model |
|-------|-------|
| planning | {preset.planning} |
| execution | {preset.execution} |
| verification | {preset.verification} |
```

### 3b. Discover and display available models

Run:

```bash
opencode models 2>/dev/null
```

Parse the output to extract model IDs in `provider/model` format. Store these in a list for validation.

If command fails or returns no models:
```text
Error: Could not fetch available models. Check your OpenCode installation.
```
Stop.

**Print** the tip below after running opencode models:

```text
Tip: Models prefixed with "opencode/" require an OpenCode Zen subscription.
     To see only one provider's models: opencode models <provider>
```

### 3c. Print input instructions

```text
Enter model selection for each stage (you may press Enter to keep the current value).
```

**Do NOT proceed to Step 4 until all of the above is printed.**

## Step 4: Prompt for model selection

Now prompt the user for each stage. Ask one question at a time.

### Planning Stage

Use Question tool with free-form input allowed:

```
header: "{targetProfile} Profile - Planning"
question: "Enter model ID for planning agents (or press Enter to keep current)"
placeholder: "{preset.planning}"
allowFreeform: true
options:
  - label: "Keep current"
    description: "{preset.planning}"
```

### Execution Stage

```
header: "{targetProfile} Profile - Execution"  
question: "Enter model ID for execution agents (or press Enter to keep current)"
placeholder: "{preset.execution}"
allowFreeform: true
options:
  - label: "Keep current"
    description: "{preset.execution}"
```

### Verification Stage

```
header: "{targetProfile} Profile - Verification"
question: "Enter model ID for verification agents (or press Enter to keep current)"
placeholder: "{preset.verification}"
allowFreeform: true
options:
  - label: "Keep current"
    description: "{preset.verification}"
```

**Input handling for each stage:**

1. If user selects "Keep current" or enters empty/blank input, retain the existing value
2. If user enters a model ID:
   - Validate it exists in the available models list
   - If invalid, print error and re-prompt:
     ```
     Invalid model ID: '{input}'. Please enter a valid model from the list above.
     ```
   - If valid, use the entered model ID

## Step 5: Check for changes

If no changes were made (all stages selected "Keep current"):
```
No changes made to {targetProfile} profile.
```
Stop.

## Step 6: Save changes

Use the **write tool directly** to update files. Do NOT use bash, python, or other scripts—use native file writing.

1. **Update .planning/config.json:**

    - Set `config.profiles.presets[targetProfile].planning` to selected value
    - Set `config.profiles.presets[targetProfile].execution` to selected value
    - Set `config.profiles.presets[targetProfile].verification` to selected value
    - Write the config file (preserve all other keys)

2. **Update opencode.json (only if targetProfile is active):**

Check if `config.profiles.active_profile === targetProfile`. If so, regenerate `opencode.json` with the new effective models.

Compute effective models (preset + overrides):
```
overrides = config.profiles.custom_overrides[targetProfile] || {}
effective.planning = overrides.planning || newPreset.planning
effective.execution = overrides.execution || newPreset.execution
effective.verification = overrides.verification || newPreset.verification
```

Build agent config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "gsd-planner": { "model": "{effective.planning}" },
    "gsd-plan-checker": { "model": "{effective.planning}" },
    "gsd-phase-researcher": { "model": "{effective.planning}" },
    "gsd-roadmapper": { "model": "{effective.planning}" },
    "gsd-project-researcher": { "model": "{effective.planning}" },
    "gsd-research-synthesizer": { "model": "{effective.planning}" },
    "gsd-codebase-mapper": { "model": "{effective.planning}" },
    "gsd-executor": { "model": "{effective.execution}" },
    "gsd-debugger": { "model": "{effective.execution}" },
    "gsd-verifier": { "model": "{effective.verification}" },
    "gsd-integration-checker": { "model": "{effective.verification}" },
    "gsd-set-profile": { "model": "{effective.verification}" },
    "gsd-settings": { "model": "{effective.verification}" },
    "gsd-set-model": { "model": "{effective.verification}" }
  }
}
```

If `opencode.json` already exists, merge the `agent` key (preserve other top-level keys).

3. **Report success:**

```text
✓ Updated {targetProfile} profile:

| Stage        | Model |
|--------------|-------|
| planning     | {newPreset.planning} |
| execution    | {newPreset.execution} |
| verification | {newPreset.verification} |
```

If `targetProfile` is the active profile:
```text
Note: This is your active profile. Quit and relaunch OpenCode to apply model changes.
```

If `targetProfile` is NOT the active profile:
```text
To use this profile, run: /gsd-set-profile {targetProfile}
```

</behavior>

<notes>
- Display available models first, then accept free-form input for model selection
- Validate entered model IDs against the available models list
- Always show full model IDs (e.g., `opencode/claude-sonnet-4`)
- Preserve all other config.json keys when writing (deep merge)
- Do NOT rewrite agent .md files — only update config.json and opencode.json
- This command modifies **presets**, not overrides. Use `/gsd-settings` for per-stage overrides.
- **Source of truth:** `config.json` stores profiles/presets/overrides; `opencode.json` is **derived** from the effective models
- OpenCode shows all available models regardless of subscription status. Users without Zen can filter with `opencode models github-copilot`
</notes>