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

This command reads/writes two files:

- `.planning/config.json` — profile state (active_profile, presets, custom_overrides) and workflow toggles
- `opencode.json` — agent model assignments (OpenCode's native config)

Do NOT modify agent .md files. Profile switching updates `opencode.json` in the project root.
</role>

<context>
**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

**Profile presets (hardcoded):**

| Profile  | Planning                   | Execution                    | Verification               |
|----------|----------------------------|------------------------------|----------------------------|
| quality  | opencode/glm-4.7-free      | opencode/glm-4.7-free        | opencode/glm-4.7-free      |
| balanced | opencode/glm-4.7-free      | opencode/minimax-m2.1-free   | opencode/glm-4.7-free      |
| budget   | opencode/minimax-m2.1-free | opencode/grok-code           | opencode/minimax-m2.1-free |
</context>

<behavior>

## Step 1: Validate Environment

First, confirm this directory is a GSD project.

```bash
ls .planning/ 2>/dev/null
```

**If not found:**

```
Error: No GSD project found.
Run /gsd-new-project first to initialize a project.
```

Stop.

Now read `.planning/config.json` and migrate/create it if needed.

```bash
cat .planning/config.json 2>/dev/null
```

Read `.planning/config.json` (if it exists) and handle these cases:

- If `.planning/` exists but `config.json` is missing, treat that as **Case A** (create defaults).
- If `config.json` exists but is not valid JSON, treat that as **Case A** (reset to defaults).

**Case A: config.json missing or invalid**

- Use defaults (see below)
- Write the defaults to `.planning/config.json`
- Print: `Created .planning/config.json with default profile settings`

**Case B: File exists but missing `profiles` key (legacy config)**
- This is an older GSD project that needs migration
- Preserve all existing keys (`mode`, `depth`, `parallelization`, etc.)
- Add the `profiles` structure with defaults
- Write the merged config to `.planning/config.json`
- Print: `Migrated config.json to support model profiles (GSD update)`

**Workflow toggles (new):**

Ensure config has `workflow` section (defaults shown):

```json
{
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```

Preserve existing values if present.

Also keep `model_profile` in sync for orchestrators that read it:

- `config.model_profile` should mirror `config.profiles.active_profile`.

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

## Step 2: Compute effective models

1. Get `activeProfile` = `config.profiles.active_profile` (default: "balanced")
2. Get `preset` = `config.profiles.presets[activeProfile]`
3. Get `overrides` = `config.profiles.custom_overrides[activeProfile]` (may be undefined)
4. Compute effective models:
   - `planning` = overrides?.planning || preset.planning
   - `execution` = overrides?.execution || preset.execution
   - `verification` = overrides?.verification || preset.verification
5. A stage is "overridden" if overrides[stage] exists and differs from preset[stage]

## Step 3: Display current state

Print this output (substitute actual values):

```
Active profile: {activeProfile}

| Stage        | Model |
|--------------|-------|
| planning     | {effective.planning}{* if overridden} |
| execution    | {effective.execution}{* if overridden} |
| verification | {effective.verification}{* if overridden} |

* = overridden

Config: .planning/config.json (editable)

Workflow:
| Toggle | Value |
|--------|-------|
| research | {workflow.research} |
| plan_check | {workflow.plan_check} |
| verifier | {workflow.verifier} |
```

The `* = overridden` legend MUST always be printed, even if no stages are overridden.

## Step 4: Show action menu

Use the Question tool:

```
header: "GSD Settings"
question: "Choose an action"
options:
  - label: "Quick settings"
    description: "Update profile and toggles in one screen"
  - label: "Change active profile"
    description: "Switch between quality/balanced/budget"
  - label: "Edit stage override"
    description: "Override a stage model for this profile"
  - label: "Clear stage override"
    description: "Remove an override"
  - label: "Exit"
    description: "Quit settings"
```

Important:
- Do NOT print a plain-text list of options (no "Choose an action..." bullets).
- The Question tool call IS the menu UI.
- After the user selects an option, continue execution based on the selected label.

Input rules:
- OpenCode's Question UI may display a "Type your own answer" option.
- For this command, custom/freeform answers are NOT allowed.
- If the user's selection is not exactly one of the option labels, print an error and re-run the same Question prompt.

## Step 5: Handle selected action

### If "Quick settings (profile + workflow)":

Use a single multi-question call (recommended UX):

```
question([
  {
    question: "Which model profile for agents?",
    header: "Model",
    multiSelect: false,
    options: [
      { label: "Quality", description: "All stages use opencode/glm-4.7-free" },
      { label: "Balanced (Recommended)", description: "Execution uses opencode/minimax-m2.1-free" },
      { label: "Budget", description: "Execution uses opencode/grok-code" }
    ]
  },
  {
    question: "Spawn Plan Researcher? (researches domain before planning)",
    header: "Research",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Research phase goals before planning" },
      { label: "No", description: "Skip research, plan directly" }
    ]
  },
  {
    question: "Spawn Plan Checker? (verifies plans before execution)",
    header: "Plan Check",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Verify plans meet phase goals" },
      { label: "No", description: "Skip plan verification" }
    ]
  },
  {
    question: "Spawn Execution Verifier? (verifies phase completion)",
    header: "Verifier",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Verify must-haves after execution" },
      { label: "No", description: "Skip post-execution verification" }
    ]
  }
])
```

After collecting answers, validate that every answer exactly matches one of the provided labels for that question.
If any answer is custom/freeform (not an exact label match), print:

`Error: Please select one of the provided options (custom answers are disabled for /gsd-settings).`

Then re-run the same multi-question prompt.

Pre-select based on current config values.

Apply immediately (no extra confirm prompt):

- Map model choice:
  - "Quality" → `quality`
  - "Balanced (Recommended)" → `balanced`
  - "Budget" → `budget`
- Set:
  - `config.profiles.active_profile` = selected
  - `config.model_profile` = selected
  - `config.workflow.research` = Yes/No
  - `config.workflow.plan_check` = Yes/No
  - `config.workflow.verifier` = Yes/No
- Write `.planning/config.json`
- Update `opencode.json`
- Print the confirmation banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting              | Value |
|----------------------|-------|
| Model Profile        | {quality|balanced|budget} |
| Plan Researcher      | {On/Off} |
| Plan Checker         | {On/Off} |
| Execution Verifier   | {On/Off} |

These settings apply to future /gsd-plan-phase and /gsd-execute-phase runs.

Quick commands:
- /gsd-set-profile <profile> — switch model profile
- /gsd-plan-phase --research — force research
- /gsd-plan-phase --skip-research — skip research
- /gsd-plan-phase --skip-verify — skip plan check
```

Where:
- Model Profile is the selected profile (quality/balanced/budget)
- Plan Researcher maps to `config.workflow.research`
- Plan Checker maps to `config.workflow.plan_check`
- Execution Verifier maps to `config.workflow.verifier`
- Return to Step 3

### If "Change active profile":

1. Use Question tool to pick: quality / balanced / budget / Cancel
2. If Cancel, return to Step 3
3. Apply the change immediately (no preview table, no extra confirm prompt):
  - Update `config.profiles.active_profile` to the selected profile
  - Also set `config.model_profile` to the selected profile
  - Write `.planning/config.json`
  - Update `opencode.json` (see Agent Config Update section)
  - Print the same confirmation banner as in "Quick settings (profile + workflow)", using the current workflow toggle values.
4. Return to Step 3 (show updated state and menu)

Important:
- Use the Question tool for the profile picker.
- Do NOT ask the user to type the option text manually.
- After saving, immediately show the action menu again using the Question tool. Do NOT print "Next: choose an action" text.

### If "Edit stage override":

1. Use Question tool to pick stage: planning / execution / verification / Cancel
2. If Cancel, return to Step 3
3. Show current value for that stage
4. Fetch the list of valid models from OpenCode, then let the user pick from that list (no freeform entry).

   Run:

   ```bash
   opencode models
   ```

   Parse the output and extract model identifiers in `provider/model` format (examples: `opencode/glm-4.7-free`, `github-copilot/gpt-5`).

  If the command fails or yields no models, print:

  ```text
   Error: Unable to load available models from OpenCode.
   Run `opencode models` in your terminal to confirm OpenCode is installed and providers are configured.
   ```

   Stop (do not allow manual model entry).

   Otherwise, use Question tool:

   ```text
   header: "Stage override"
   question: "Select a model for {stage}"
   options:
     - label: "{model1}"
       description: ""
     - label: "{model2}"
       description: ""
     - label: "{model3}"
       description: ""
     - label: "Cancel"
       description: "Return without changes"
   ```

  If Cancel, return to Step 3.

Apply immediately (no extra confirm prompt):

- Set `config.profiles.custom_overrides[activeProfile][stage]` = selected model id
- Write `.planning/config.json`
- Update `opencode.json`
- Print "Saved"

Return to Step 3.

Important:
- Use the Question tool for stage selection and model selection.
- Do NOT print a bullet list and ask the user to type the choice.

### If "Clear stage override":

1. Use Question tool to pick stage: planning / execution / verification / Cancel
2. If Cancel, return to Step 3
3. Apply immediately (no extra confirm prompt):
    - Delete `config.profiles.custom_overrides[activeProfile][stage]`
    - Write `.planning/config.json`
    - Update `opencode.json`
    - Print "Saved"
4. Return to Step 3

Important:
- Use the Question tool for stage selection.
- Do NOT print a bullet list and ask the user to type the choice.

### If "Exit":

Print "Settings saved." and stop.

## Agent Config Update

After any confirmed change, update `opencode.json` in the project root.

Build the agent config from effective stage models:

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
    "gsd-integration-checker": { "model": "{effective.verification}" }
  }
}
```

If `opencode.json` already exists, merge the `agent` key (preserve other top-level keys).

</behavior>

<notes>
- This is a menu loop — keep showing the menu until user selects Exit
- Use the Question tool for ALL user input (never ask user to type numbers)
- The `* = overridden` legend is REQUIRED output
- Persist changes immediately after each confirmation (don't batch)
- Do NOT rewrite agent .md files — only update opencode.json
- Overrides are scoped per profile at `profiles.custom_overrides.{profile}.{stage}`
- **Source of truth:** `config.json` stores profiles/presets/overrides; `opencode.json` is **derived** from the effective models
- When regenerating `opencode.json`, read the active profile from `config.json`, compute effective models (preset + overrides), then write the agent mappings
</notes>
