
<role>
You are executing the `/gsd-set-profile` command. Switch the project's active model profile (simple/smart/custom) with optional model reuse.

This command reads/writes:
- `.planning/config.json` — profile state (profile_type, models)
- `opencode.json` — agent model assignments (derived from profile)

Do NOT modify agent .md files. Profile switching updates `opencode.json` in the project root.
</role>

<context>
**Invocation styles:**

1. No args (interactive wizard): `/gsd-set-profile`
2. Positional with type: `/gsd-set-profile simple|smart|custom`
3. With reuse flag: `/gsd-set-profile smart --reuse`

**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model |

**Profile types:**

- **Simple**: 1 model total — all stages use same model
- **Smart**: 2 models — planning+execution share model, verification uses different
- **Custom**: 3 models — each stage can have different model

**Migration:** Old configs with `model_profile: quality / balanced / budget` are auto-migrated to Custom profile.
</context>

<behavior>

## Step 1: Load and validate config

Read `.planning/config.json`. Handle these cases:

**Case A: File missing or invalid**
- Print: `Error: No GSD project found. Run /gsd-new-project first.`
- Stop.

**Case B: Legacy config (has model_profile but no profiles.profile_type)**
- Auto-migrate to Custom profile
- Use OLD_PROFILE_MODEL_MAP to convert quality/balanced/budget → Custom

**Case C: Current config**
- Use `profiles.profile_type` and `profiles.models`

**Also check `opencode.json`:**
- If missing, it will be created
- If exists, merge agent assignments (preserve other keys)

## Step 2: Check for migration

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs set-profile --status --raw
```

Parse JSON. If `needs_wizard: true` or `has_old_config: true`:
- Run migration first
- Then continue to profile selection

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
- If user typed `/gsd-set-profile simple|smart|custom`, use that as `newProfileType`

**B) Interactive picker (no args):**

Use Question tool:

```
header: "Profile Type"
question: "Select a profile type for model configuration"
options:
  - label: "Simple"
    description: "1 model for all stages (easiest setup)"
  - label: "Smart"
    description: "2 models: advanced for planning+execution, cheaper for verification"
  - label: "Custom"
    description: "3 models: full control with different model per stage"
  - label: "Cancel"
    description: "Exit without changes"
```

If Cancel selected, print cancellation message and stop.

**C) Invalid profile handling:**

If invalid profile name:
- Print: `Unknown profile type '{name}'. Valid options: simple, smart, custom`
- Fall back to interactive picker

## Step 5: Handle --reuse flag

If `--reuse` flag present and current profile exists:

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs profile-switch {newProfileType} --reuse --raw
```

Parse the reuse analysis:
- Shows which stages can reuse existing models
- Displays suggestions for each stage

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

Based on profile type, prompt for models:

### Simple Profile (1 model)

Use gsd-oc-select-model skill to select model for "Simple Profile - One model to rule them all".

Store selected model. All stages will use this model.

### Smart Profile (2 models)

Use gsd-oc-select-model skill twice.

**First model** (planning + execution):

Use gsd-oc-select-model skill to select model for "Smart Profile - Planning & Execution"

**Second model** (verification):

Use gsd-oc-select-model skill to select model for "Smart Profile - Verification"

Store selected models. 

Planning + Execution will use First model selected.
Verification will use Second model selected.


### Custom Profile (3 models)

Use gsd-oc-select-model skill


**First model** (planning):

Use gsd-oc-select-model skill to select model for "Custom Profile - Planning"

**Second model** (execution)

Use gsd-oc-select-model skill to select model for "Custom Profile - Execution"

**Thrid model** (verification):

Use gsd-oc-select-model skill to select model for "Custom Profile - Verification"

Store selected models. 

Planning will use First model selected.
Execution will use Second model selected.
Verification will use Third model selected.



## Step 7: Validate selected models

Before writing files, validate models exist:

```bash
opencode models | grep -q "^{model}$" && echo "valid" || echo "invalid"
```

If any model invalid:
- Print error with list of missing models
- Stop. Do NOT write config files.

## Step 8: Apply changes

### Save config.json

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs profile-switch {profile_type} --complete '{"stage":"model",...}' --raw
```

Or build and save manually:

```json
{
  "profiles": {
    "profile_type": "{simple|smart|custom}",
    "models": {
      "planning": "{model}",
      "execution": "{model}",
      "verification": "{model}"
    }
  }
}
```

### Generate and save opencode.json

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs derive-opencode-json --raw
```

Parse output and write to `opencode.json`, merging with existing content.

## Step 9: Report success

```
✓ Active profile set to: {profile_type}

Configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {models.planning} |
| execution    | {models.execution} |
| verification | {models.verification} |

Note: Quit and relaunch OpenCode to apply model changes.
```

If migration occurred:
```
⚡ Auto-migrated from {old_profile} to custom profile
```

</behavior>

<notes>
- Use Question tool for ALL user input
- Always show full model IDs (e.g., `opencode/glm-4.7-free`)
- Preserve all other config.json keys when writing
- Do NOT rewrite agent .md files — only update opencode.json
- If opencode.json doesn't exist, create it
- **Source of truth:** `config.json` stores profile_type and models; `opencode.json` is derived
- When migrating, preserve old model_profile field for backward compat during transition
- Model selection uses gsd-oc-select-model skill 
</notes>
