
<role>
You are executing the `/gsd-set-profile` command. Switch the project's active model profile (simple/smart/genius) with optional model reuse.

This command reads/writes:
- `.planning/config.json` — profile state (profile_type, models)
- `opencode.json` — agent model assignments (derived from profile)

Do NOT modify agent .md files. Profile switching updates `opencode.json` in the project root.
</role>

<context>
## Command Invocation Styles

1. **Interactive wizard (no args)**: `/gsd-set-profile`
2. **Direct assignment (positional arg)**: `/gsd-set-profile simple|smart|genius`

## Agent Profile Mapping

- **Planning stage** agents (7): gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper
- **Execution stage** agents (2): gsd-executor, gsd-debugger
- **Verification stage** agents (2): gsd-verifier, gsd-integration-checker

## Profile Types

- **Simple**: 1 model total — all stages use same model
- **Smart**: 2 models — planning+execution share model, verification uses different
- **Genius**: 3 models — each stage uses different model
</context>

<behavior>

## Step 1: Load Current Configuration

Get the current profile state:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs get-profile
```

Process JSON output:
- **Config not found**: Proceed to Step 3
```json
{
  "success": false,
  "error": { "code": "CONFIG_NOT_FOUND", "message": "..." }
}
```

- **Config exists**: Extract current profile information
```json
{
  "success": true,
  "data": {
    "simple": {
      "planning": "model-id",
      "execution": "model-id", 
      "verification": "model-id"
    }
  }
}
```

## Step 2: Display Current State

Show current profile and configuration:
```markdown
Active profile: **{profile_name}**

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {models.planning} |
| execution    | {models.execution} |
| verification | {models.verification} |
```

## Step 3: Determine Target Profile

### A) Handle Positional Argument
If user provided `/gsd-set-profile simple|smart|genius`:
- Use specified argument as `newProfileType`
- Execute: `node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile {newProfileType}`

**Handle errors**: If profile doesn't exist, proceed to interactive picker (step 3B)

**Handle success**: Show updated configuration and exit with instruction to use `/gsd-set-profile` (without parameter) to change models in existing profile

### B) Interactive Profile Selection (no args)
Prompt user with:
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

### C) Error Handling
If user provides invalid profile name:
- Print: `Unknown profile type '{name}'. Valid options: simple, smart, genius`
- Fall back to interactive picker

## Step 4: Collect Model Selections Based on Profile Type

### Simple Profile (unified model):
- Ask if user wants to keep current model using question tool
- If yes: proceed with current model, else use gsd-oc-select-model skill

### Smart Profile (shared planning/execution model):
1. Planning & Execution model: Use gsd-oc-select-model for "Smart Profile - Planning & Execution"
2. Verification model: Use gsd-oc-select-model for "Smart Profile - Verification"

### Genius Profile (distinct models):
1. Planning model: Use gsd-oc-select-model for "Genius Profile - Planning"
2. Execution model: Use gsd-oc-select-model for "Genius Profile - Execution"  
3. Verification model: Use gsd-oc-select-model for "Genius Profile - Verification"

## Step 5: Apply Profile Configuration Changes

Prepare the payload using collected values:
- `{profile_name}`
- `{model_for_planning_stage}`
- `{model_for_execution_stage}`
- `{model_for_verification_stage}`

Execute:
```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile '{profile_name}:{"planning": "{model_for_planning_stage}", "execution": "{model_for_execution_stage}", "verification": "{model_for_verification_stage}"'
```

## Step 6: Verification and Response

Validate successful update with formatted output:
```text
✓ Updated {targetProfile} profile:

| Stage        | Model |
|--------------|-------|
| planning     | {newPreset.planning} |
| execution    | {newPreset.execution} |
| verification | {newPreset.verification} |
```

</behavior>

<notes>
- Use question tool for ALL user input
- Always show full model IDs (e.g., `opencode/glm-4.7-free`)
- Use gsd-oc-tools.cjs for validation and file operations
- Backup files are created automatically by update-opencode-json
- **Source of truth:** `oc-config.json` stores profile_type and models; `opencode.json` is derived
- Model selection uses gsd-oc-select-model skill via the set-profile command
- Commands support --verbose for debug output and --raw for machine-readable output
</notes>
