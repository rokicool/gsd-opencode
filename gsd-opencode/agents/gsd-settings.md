---
name: gsd-settings
description: Interactive settings for model profiles, per-stage overrides, and workflow settings
tools:
  read: true
  write: true
  bash: true
  question: true
---

<role>
You are executing the `/gsd-settings` command. Display current model profile settings and provide an interactive menu to manage them.

Files managed:

- `.planning/config.json` — profile state and workflow toggles (source of truth)
- `opencode.json` — agent model assignments (derived from config.json)

Do NOT modify agent .md files.
</role>

<context>
**Stage-to-agent mapping:**

- **Planning:** gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper
- **Execution:** gsd-executor, gsd-debugger
- **Verification:** gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model

**Model discovery:** Presets are user-defined, not hardcoded. On first run (or reset), query `opencode models` to discover available models and prompt user to configure presets.
</context>

<rules>
**UI Rules (apply throughout):**

- Always use the Question tool for user input — never print menus as text
- Custom/freeform answers are not allowed; re-prompt on invalid selection
- Apply changes immediately without extra confirmation prompts
- After any action except Exit, return to the main menu (Step 3 → Step 4)

**Config Rules:**

- Never overwrite existing presets — only create defaults for new/migrated projects
- Keep `model_profile` in sync with `profiles.active_profile`
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

- **Missing/invalid:** Run **Preset Setup Wizard** (see below), then continue
- **Legacy (no `profiles` key):** Run **Preset Setup Wizard**, preserve other existing keys
- **Current:** Use as-is

Ensure `workflow` section exists (defaults: `research: true`, `plan_check: true`, `verifier: true`).

### Preset Setup Wizard

This wizard runs on first use or when "Reset presets" is selected. It queries available models and lets the user configure all three profiles.

**Step W1: Discover models**

```bash
opencode models 2>/dev/null
```

Parse the output to extract model IDs. If command fails or returns no models, print `Error: Could not fetch available models. Check your OpenCode installation.` and stop.

**Step W2: Configure each profile**

For each profile (quality, balanced, budget), use a multi-question call:

```json
[
  { "header": "{Profile} Profile - Planning", "question": "Which model for planning agents?", "options": ["{model1}", "{model2}", ...] },
  { "header": "{Profile} Profile - Execution", "question": "Which model for execution agents?", "options": ["{model1}", "{model2}", ...] },
  { "header": "{Profile} Profile - Verification", "question": "Which model for verification agents?", "options": ["{model1}", "{model2}", ...] }
]
```

**Step W3: Save config**

Create config with user selections:

```json
{
  "profiles": {
    "active_profile": "balanced",
    "presets": {
      "quality": { "planning": "{user_selection}", "execution": "{user_selection}", "verification": "{user_selection}" },
      "balanced": { "planning": "{user_selection}", "execution": "{user_selection}", "verification": "{user_selection}" },
      "budget": { "planning": "{user_selection}", "execution": "{user_selection}", "verification": "{user_selection}" }
    },
    "custom_overrides": { "quality": {}, "balanced": {}, "budget": {} }
  },
  "workflow": { "research": true, "plan_check": true, "verifier": true }
}
```

Print:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PRESETS CONFIGURED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your model presets have been saved. Use "Reset presets" 
from the settings menu if available models change.

Note: Quit and relaunch OpenCode to apply model changes.
```

## Step 2: Compute Effective Models

```text
activeProfile = config.profiles.active_profile
preset = config.profiles.presets[activeProfile]
overrides = config.profiles.custom_overrides[activeProfile] || {}

effective.planning = overrides.planning || preset.planning
effective.execution = overrides.execution || preset.execution
effective.verification = overrides.verification || preset.verification
```

A stage is "overridden" if `overrides[stage]` exists and differs from `preset[stage]`.

## Step 3: Display State

**Print this as text output (do NOT use Question tool here):**

```text
Active profile: {activeProfile}

| Stage        | Model                                    |
|--------------|------------------------------------------|
| planning     | {effective.planning}{* if overridden}   |
| execution    | {effective.execution}{* if overridden}  |
| verification | {effective.verification}{* if overridden}|

{if any overridden: "* = overridden" else: "No overrides"}

Workflow:
| Toggle     | Value                  |
|------------|------------------------|
| research   | {workflow.research}    |
| plan_check | {workflow.plan_check}  |
| verifier   | {workflow.verifier}    |
```

## Step 4: Show Menu

Use Question tool (single prompt, not multi-question):

```
header: "GSD Settings"
question: "Choose an action"
options:
  - label: "Quick settings"
    description: "Update profile and workflow toggles"
  - label: "Set stage override"
    description: "Set a per-stage model override for the active profile"
  - label: "Clear stage override"
    description: "Remove a per-stage override for the active profile"
  - label: "Reset presets"
    description: "Re-run model discovery and reconfigure all presets (clears overrides)"
  - label: "Exit"
    description: "Save and quit"
```

## Step 5: Handle Actions

### Quick settings

Use multi-question call with pre-selected current values:

```json
[
  { "header": "Model", "question": "Which model profile?", "options": ["Quality", "Balanced", "Budget"] },
  { "header": "Research", "question": "Spawn Plan Researcher?", "options": ["Yes", "No"] },
  { "header": "Plan Check", "question": "Spawn Plan Checker?", "options": ["Yes", "No"] },
  { "header": "Verifier", "question": "Spawn Execution Verifier?", "options": ["Yes", "No"] }
]
```

On selection:

- Map: Quality→`quality`, Balanced→`balanced`, Budget→`budget`
- Set `profiles.active_profile`, `model_profile`, and `workflow.*` accordingly
- Quick settings does NOT modify `presets` or `custom_overrides`
- If nothing changed, print `No changes.` and return to menu
- Otherwise save and print confirmation banner:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting            | Value                     |
|--------------------|---------------------------|
| Model Profile      | {quality|balanced|budget} |
| Plan Researcher    | {On/Off}                  |
| Plan Checker       | {On/Off}                  |
| Execution Verifier | {On/Off}                  |

Note: Quit and relaunch OpenCode to apply model changes.

Quick commands:
- /gsd-set-profile <profile>
- /gsd-plan-phase --research | --skip-research | --skip-verify
```

### Set stage override

1. Pick stage: Planning / Execution / Verification / Cancel
2. If Cancel, return to menu
3. Fetch models via `opencode models` command
4. If command fails: print error and stop
5. Pick model from list (include Cancel option)
6. Set `custom_overrides[activeProfile][stage]` = model
7. Save, print "Saved", return to menu

### Clear stage override

If no overrides exist for current profile, print `No overrides set for {activeProfile} profile.` and return to menu immediately.

Otherwise:

1. Print current overrides:

```text
Current overrides for {activeProfile} profile:
- planning: {model} (or omit if not overridden)
- execution: {model} (or omit if not overridden)
- verification: {model} (or omit if not overridden)
```

2. Pick stage: Planning / Execution / Verification / Cancel (only show stages that have overrides)
3. If Cancel, return to menu
4. Delete `custom_overrides[activeProfile][stage]`
5. Save, print "Cleared {stage} override.", return to menu

### Reset presets

Run the **Preset Setup Wizard** (see Step 1). This re-queries available models and lets the user reconfigure all three profiles from scratch. Existing `custom_overrides` are cleared. After completion, return to menu.

### Exit

Print "Settings saved." and stop.

## Save Changes

After any change, use the **write tool directly** to update both files. Do NOT use bash, python, or other scripts—use native file writing.

1. Read existing `opencode.json` (if it exists) to preserve non-agent keys
2. Write `.planning/config.json` with updated config
3. Write `opencode.json` with merged agent mappings:

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

Preserve existing non-agent keys in `opencode.json`.

</behavior>

<notes>

- Menu loop until Exit — always return to Step 3 after actions
- Overrides are profile-scoped: `custom_overrides.{profile}.{stage}`
- Source of truth: `config.json`; `opencode.json` is derived
- OpenCode does not hot-reload model assignments; user must quit and relaunch to apply changes

</notes>
