---
name: gsd-settings
description: Interactive settings for model profiles (simple/smart/custom) and workflow settings
tools:
  - read: true
  - write: true
  - bash: true
  - question: true
---

<role>
You are executing the `/gsd-settings` command. Display current profile settings and provide an interactive menu to manage them.

Files managed:

- `.planning/config.json` — profile state and workflow toggles (source of truth)
- `opencode.json` — agent model assignments (derived from config.json)

Do NOT modify agent .md files.
</role>

<context>
**Profile Types:**

- **Simple**: 1 model for all stages (planning, execution, verification)
- **Smart**: 2 models (planning+execution share model, verification uses different)
- **Custom**: 3 models (each stage can have different model)

**Stage-to-agent mapping:**

- **Planning:** gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper
- **Execution:** gsd-executor, gsd-debugger
- **Verification:** gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model

**Model discovery:** Query `opencode models` to discover available models.

**Model ID structure:** Models use 2-level (provider/model) or 3-level (provider/subprovider/model) format:
- 2-level: `opencode/glm-4.7-free`, `xai/grok-3`
- 3-level: `openrouter/anthropic/claude-3.5-haiku`, `synthetic/hf:deepseek-ai/DeepSeek-R1`

**Migration:** Old configs with `model_profile: quality/balanced/budget` are auto-migrated to Custom profile.
</context>

<rules>
**UI Rules:**

- Always use the Question tool for user input
- Custom/freeform answers are not allowed; re-prompt on invalid selection
- Apply changes immediately without extra confirmation prompts
- After any action except Exit, return to the main menu

**Config Rules:**

- New profile system uses `profiles.profile_type` and `profiles.models`
- Old configs are auto-migrated on first run
- Merge into existing `opencode.json` (preserve non-agent keys)
</rules>

<behavior>

## Step 1: Load Config

```bash
ls .planning/ 2>/dev/null
```

If `.planning/` not found: print `Error: No GSD project found. Run /gsd-new-project first.` and stop.

```bash
cat .planning/config.json 2>/dev/null
```

Handle config state:

- **Missing/invalid:** Print error and stop
- **Legacy (has model_profile but no profiles.profile_type):** Auto-migrate using gsd-tools
- **Current:** Use as-is

**Check for migration:**

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs set-profile --migrate --raw 2>/dev/null
```

If migration occurred, print:
```
⚡ Auto-migrated from {old_profile} to custom profile
```

**Ensure workflow section exists** (defaults: `research: true`, `plan_check: true`, `verifier: true`).

## Step 2: Compute Effective Models

Read current profile:

```javascript
profileType = config.profiles?.profile_type || 'custom'
models = config.profiles?.models || {
  planning: 'opencode/glm-4.7-free',
  execution: 'opencode/minimax-m2.1-free',
  verification: 'opencode/glm-4.7-free'
}
```

## Step 3: Display State

**Print this as text output:**

```
Active profile: {profileType}

Configuration:
| Stage        | Model                                    |
|--------------|------------------------------------------|
| planning     | {models.planning}                        |
| execution    | {models.execution}                       |
| verification | {models.verification}                    |

Workflow:
| Toggle     | Value                  |
|------------|------------------------|
| research   | {workflow.research}    |
| plan_check | {workflow.plan_check}  |
| verifier   | {workflow.verifier}    |
```

## Step 4: Show Menu

Use Question tool:

```
header: "GSD Settings"
question: "Choose an action"
options:
  - label: "Switch profile"
    description: "Change to Simple, Smart, or Custom profile"
  - label: "Change models"
    description: "Update models for current profile"
  - label: "Toggle workflow"
    description: "Update research/plan_check/verifier settings"
  - label: "Exit"
    description: "Save and quit"
```

## Step 5: Handle Actions

### Switch profile

Use Question tool:

```
header: "Switch Profile"
question: "Select new profile type"
options:
  - label: "Simple"
    description: "1 model for all stages"
  - label: "Smart"
    description: "2 models: planning+execution share, verification different"
  - label: "Custom"
    description: "3 models: full control per stage"
  - label: "Cancel"
    description: "Return to menu"
```

If Cancel, return to menu.

**Check for model reuse:**

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs profile-switch {new_type} --reuse --raw
```

If can reuse models:
```
You can reuse existing models:
- Planning: {current.planning}
- Execution: {current.execution}
- Verification: {current.verification}

For {new_type} profile, suggested configuration:
{reuse analysis from tool}

Reuse existing models where possible?
```

If yes, use suggested models.
If no, run model selection wizard.

**Run model selection:**

Call `/gsd-set-profile {new_type}` to run the wizard, then return to menu.

### Change models

Run model selection for current profile type:

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs set-profile {current_type} --wizard --raw
```

Follow the wizard prompts, then return to menu.

### Toggle workflow

Use multi-question:

```json
[
  {
    "header": "Research",
    "question": "Spawn Plan Researcher?",
    "options": ["Yes", "No"]
  },
  {
    "header": "Plan Check",
    "question": "Spawn Plan Checker?",
    "options": ["Yes", "No"]
  },
  {
    "header": "Verifier",
    "question": "Spawn Execution Verifier?",
    "options": ["Yes", "No"]
  }
]
```

Update `config.workflow.*` accordingly.

Save and print confirmation:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting            | Value                     |
|--------------------|---------------------------|
| Model Profile      | {profile_type}            |
| Plan Researcher    | {On/Off}                  |
| Plan Checker       | {On/Off}                  |
| Execution Verifier | {On/Off}                  |

Note: Quit and relaunch OpenCode to apply model changes.

Quick commands:
- /gsd-set-profile <type>
- /gsd-plan-phase --research | --skip-research | --skip-verify
```

Return to menu.

### Exit

Print "Settings saved." and stop.

## Save Changes

After any change, update both files:

1. Write `.planning/config.json` with updated config
2. Generate and write `opencode.json`:

```bash
node gsd-opencode/get-shit-done/bin/gsd-tools.cjs derive-opencode-json --raw
```

Merge agent mappings into existing opencode.json (preserve other keys).

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "gsd-planner": { "model": "{models.planning}" },
    "gsd-plan-checker": { "model": "{models.planning}" },
    "gsd-phase-researcher": { "model": "{models.planning}" },
    "gsd-roadmapper": { "model": "{models.planning}" },
    "gsd-project-researcher": { "model": "{models.planning}" },
    "gsd-research-synthesizer": { "model": "{models.planning}" },
    "gsd-codebase-mapper": { "model": "{models.planning}" },
    "gsd-executor": { "model": "{models.execution}" },
    "gsd-debugger": { "model": "{models.execution}" },
    "gsd-verifier": { "model": "{models.verification}" },
    "gsd-integration-checker": { "model": "{models.verification}" },
    "gsd-set-profile": { "model": "{models.verification}" },
    "gsd-settings": { "model": "{models.verification}" },
    "gsd-set-model": { "model": "{models.verification}" }
  }
}
```

</behavior>

<notes>
- Menu loop until Exit
- Source of truth: `config.json` with profiles.profile_type and profiles.models
- `opencode.json` is derived via gsd-tools derive-opencode-json command
- OpenCode does not hot-reload model assignments; user must quit and relaunch
- Migration happens automatically on first run if old config detected
- Model selection delegated to /gsd-set-profile command (which uses gsd-oc-select-model skill)
- Keep interface simple: 3 actions (switch profile, change models, toggle workflow)
</notes>
