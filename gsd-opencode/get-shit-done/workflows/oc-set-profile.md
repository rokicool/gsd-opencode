
<role>
You are executing the `/gsd-set-profile` command. Switch the project's active model profile (simple/smart/genius) with optional model reuse.

This command reads/writes:
- `.planning/config.json` — profile state (profile_type, models)
- `opencode.json` — agent model assignments (derived from profile)

Do NOT modify agent .md files. Profile switching updates `opencode.json` in the project root.
</role>

<context>
**Invocation styles:**

1. No args (interactive wizard): `/gsd-set-profile`
2. Positional with type: `/gsd-set-profile simple|smart|genius`
3. With reuse flag: `/gsd-set-profile smart --reuse`

**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

**Profile types:**

- **Simple**: 1 model total — all stages use same model
- **Smart**: 2 models — planning+execution share model, verification uses different
- **Genius**: 3 models — each stage can have different model

**Migration:** Old configs with `model_profile: quality / balanced / budget` are auto-migrated to genius profile.
</context>

<behavior>

## Step 1: Load config and check for migration

Run migrate-config to handle legacy configs:

```bash
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs migrate-config --verbose
```

Parse the JSON output:

**If migration occurred:**
```json
{
  "success": true,
  "data": {
    "migrated": true,
    "from": "quality",
    "to": "genius",
    "backup": ".opencode-backups/..."
  }
}
```

Store migration info for final report.

**If already current format:**
```json
{
  "success": true,
  "data": {
    "migrated": false,
    "reason": "Config already uses current format"
  }
}
```

Proceed to Step 2.

**If config missing:**
```json
{
  "success": false,
  "error": { "code": "CONFIG_NOT_FOUND", "message": "..." }
}
```
- Print: `Error: No GSD project found. Run /gsd-new-project first.`
- Stop.

## Step 2: Read current profile state

Read `.planning/config.json` to get current profile state:

```json
{
  "profiles": {
    "profile_type": "smart",
    "models": {
      "planning": "opencode/glm-4.7",
      "execution": "opencode/glm-4.7",
      "verification": "opencode/cheaper-model"
    }
  }
}
```

## Step 3: Display current state

If profile exists:

```
Active profile: {profile_type}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {models.planning} |
| execution    | {models.execution} |
| verification | {models.verification} |
```

## Step 4: Determine requested profile

**A) Check for positional argument:**
- If user typed `/gsd-set-profile simple|smart|genius`, use that as `newProfileType`

**B) Interactive picker (no args):**

Run set-profile command without profile argument:

```bash
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile --raw
```

Parse the output and use question tool:

```json
{
  "header": "Profile Type",
  "question": "Select a profile type for model configuration",
  "options": [
    { "label": "Simple", "description": "1 model for all gsd stages (easiest setup)" },
    { "label": "Smart", "description": "2 models: advanced for planning & execution, cheaper for verification stages" },
    { "label": "Genius", "description": "3 models: different model for planning, execution, or verification stages" },
    { "label": "Cancel", "description": "Exit without changes" }
  ]
}
```

If Cancel selected, print cancellation message and stop.

**C) Invalid profile handling:**

If invalid profile name:
- Print: `Unknown profile type '{name}'. Valid options: simple, smart, genius`
- Fall back to interactive picker

## Step 5: Handle --reuse flag

If `--reuse` flag present:

```bash
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs analyze-reuse {newProfileType}
```

Parse the reuse analysis:

```json
{
  "success": true,
  "data": {
    "currentProfile": "smart",
    "targetProfile": "genius",
    "currentModels": {
      "planning": "opencode/glm-4.7",
      "execution": "opencode/glm-4.7",
      "verification": "opencode/cheaper-model"
    },
    "reuseAnalysis": {
      "planning": { "currentModel": "opencode/glm-4.7", "canReuse": true },
      "execution": { "currentModel": "opencode/glm-4.7", "canReuse": true },
      "verification": { "currentModel": "opencode/cheaper-model", "canReuse": true }
    },
    "suggestions": {
      "planning": { "suggested": "opencode/glm-4.7", "reason": "Reusing current planning model" },
      "execution": { "suggested": "opencode/glm-4.7", "reason": "Reusing current execution model" },
      "verification": { "suggested": "opencode/cheaper-model", "reason": "Reusing current verification model" }
    }
  }
}
```

Present to user:

```
Model Reuse Analysis for {newProfileType} profile:

Current models:
- Planning: {current.planning}
- Execution: {current.execution}
- Verification: {current.verification}

Suggested reuse:
{reuse analysis from tool}

Use these suggestions? (yes/no)
```

If yes, proceed with suggested models.
If no, run full model selection wizard.

## Step 6: Model selection wizard

Run set-profile command to get model selection prompts:

```bash
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile {newProfileType}
```

Parse the output and use gsd-oc-select-model skill for each required stage.

### Simple Profile (1 model)

Parse the prompt for stage "all":

```json
{
  "context": "Simple Profile - One model to rule them all",
  "current": "opencode/glm-4.7"
}
```

Using question tool ask user if they want to use current model.

If yes, store the selected model and go to **Step 7**.

If no, use gsd-oc-select-model skill to select model for "Simple Profile - One model to rule them all".

### Smart Profile (2 models)

Parse the prompts for stages "planning_execution" and "verification":

**First model** (planning + execution):

Use gsd-oc-select-model skill to select model for "Smart Profile - Planning & Execution"

**Second model** (verification):

Use gsd-oc-select-model skill to select model for "Smart Profile - Verification"

### Genius Profile (3 models)

Parse the prompts for stages "planning", "execution", "verification":

**First model** (planning):

Use gsd-oc-select-model skill to select model for "Genius Profile - Planning"

**Second model** (execution):

Use gsd-oc-select-model skill to select model for "Genius Profile - Execution"

**Third model** (verification):

Use gsd-oc-select-model skill to select model for "Genius Profile - Verification"

## Step 7: Validate selected models

Before writing files, validate models exist:

```bash
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs validate-models {model1} {model2} {model3}
```

Parse the output:

```json
{
  "success": true,
  "data": {
    "total": 3,
    "valid": 3,
    "invalid": 0,
    "models": [
      { "model": "opencode/glm-4.7", "valid": true },
      { "model": "opencode/other", "valid": true },
      { "model": "opencode/third", "valid": true }
    ]
  }
}
```

If any model invalid (success: false):
- Print error with list of missing models
- Stop. Do NOT write config files.

## Step 8: Apply changes

Run update-opencode-json to apply profile changes:

```bash
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs update-opencode-json --verbose
```

This command:
1. Reads `.planning/config.json` (already updated with new models)
2. Creates timestamped backup of `opencode.json`
3. Updates agent model assignments based on profile
4. Outputs results:

```json
{
  "success": true,
  "data": {
    "backup": ".opencode-backups/20250101-120000-000-opencode.json",
    "updated": ["gsd-planner", "gsd-executor", ...],
    "dryRun": false,
    "details": [...]
  }
}
```

**If update fails:**
- Error is output with code and message
- Restore from backup if possible
- Print error and stop

## Step 9: Check for changes

Compare old and new models. If no changes were made:
```
No changes made to {targetProfile} profile.
```
Stop.

## Step 10: Report success

```text
✓ Updated {targetProfile} profile:

| Stage        | Model |
|--------------|-------|
| planning     | {newPreset.planning} |
| execution    | {newPreset.execution} |
| verification | {newPreset.verification} |
```

If migration occurred:
```
⚡ Auto-migrated from {old_profile} to genius profile
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
- Use question tool for ALL user input
- Always show full model IDs (e.g., `opencode/glm-4.7-free`)
- Use gsd-oc-tools.cjs for validation and file operations
- Backup files are created automatically by update-opencode-json and migrate-config
- **Source of truth:** `config.json` stores profile_type and models; `opencode.json` is derived
- Model selection uses gsd-oc-select-model skill via the set-profile command
- Commands support --verbose for debug output and --raw for machine-readable output
</notes>
