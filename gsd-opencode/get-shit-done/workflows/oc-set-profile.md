
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


**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

**Profile names:**

- **Simple**: 1 model total — all stages use same model
- **Smart**: 2 models — planning+execution share model, verification uses different
- **Genius**: 3 models — each stage can have different model

</context>

<behavior>

## Step 1: Load config

Run set-profile without args to get current state:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs get-profile
```

Parse the JSON output:

**If config missing:**
```json
{
  "success": false,
  "error": { "code": "CONFIG_NOT_FOUND", "message": "..." }
}
```
- Go to **Step 3**

**Success returns current state for interactive mode:**
```json
{
  "success": true,
  "data": {
    "simple": {
      "planning": "bailian-coding-plan/qwen3-coder-plus",
      "execution": "bailian-coding-plan/qwen3-coder-plus",
      "verification": "bailian-coding-plan/qwen3-coder-plus"
    }
  }
}
```

## Step 2: Display current state

If profile exists:

``` markdown
Active profile: **{profile_name}**

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {models.planning} |
| execution    | {models.execution} |
| verification | {models.verification} |
```

## Step 3: Determine requested profile

**A) Check for positional argument:**
- If user typed `/gsd-set-profile simple|smart|genius`, use that as `newProfileType`

Execute:
```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile {newProfileType}
```
Parse the JSON output:

If error and there is no such a profile:
```json
{
  "success": false,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "No model assignments found for profile \"simple\""
  }
}
```
Go to **B) Interactive picker (no args):**

If success: 

```json
{
  "success": true,
  "data": {
    "profile": "smart",
    "models": {
      "planning": "bailian-coding-plan/qwen3-coder-plus",
      "execution": "bailian-coding-plan/qwen3-coder-plus",
      "verification": "bailian-coding-plan/qwen3-coder-plus"
    },
    "backup": ".planning/backups/20260303035841-oc_config.json",
    "updated": [
      {
        "agent": "gsd-planner",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-plan-checker",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-phase-researcher",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-roadmapper",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-project-researcher",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-research-synthesizer",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-codebase-mapper",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-executor",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-debugger",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-verifier",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      },
      {
        "agent": "gsd-integration-checker",
        "model": "bailian-coding-plan/qwen3-coder-plus"
      }
    ],
    "configPath": ".planning/oc_config.json"
  }
}
```
- Show the current config in this format:

Active profile: {profile_name}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {models.planning} |
| execution    | {models.execution} |
| verification | {models.verification} |

- Print: ' */gsd-set-profile* (without parameter) if you need to change models assigned to stages'
- Stop.

**B) Interactive picker (no args):**

Use question tool:

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

## Step 4: Model selection wizard


### Simple Profile (1 model)

Using question tool ask user if they want to use the current model.

If yes, store the selected model and go to **Step 5**.

If no, use gsd-oc-select-model skill to select model for "Simple Profile - One model to rule them all".

### Smart Profile (2 models)


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


## Step 5: Apply changes

- Prepare

{profile_name}
{model_for_planning_stage}
{model_for_execution_stage}
{model_for_verification_stage}

from the previous answers.

- Execute the next command and substitue {profile_name}, {model_for_planning_stage}, {model_for_execution_stage}, {model_for_verification_stage} with values:
```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile '{profile_name}:{"planning": "{model_for_planning_stage}", "execution": "{model_for_execution_stage}", "verification": "{model_for_verification_stage}"'
```

## Step 7: Check for changes

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
