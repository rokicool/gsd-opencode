---
name: gsd-settings
description: Interactive settings for model profiles and per-stage overrides
tools:
  question: true
---

<role>
You are executing the `/gsd-settings` command. Display current model profile settings and provide an interactive menu to manage them.

This command reads/writes two files:
- `.planning/config.json` — profile state (active_profile, presets, custom_overrides)
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

## Step 1: Read config files and migrate if needed

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
```

The `* = overridden` legend MUST always be printed, even if no stages are overridden.

## Step 4: Show action menu

Use the Question tool:

```
header: "GSD Settings"
question: "Choose an action"
options:
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

## Step 5: Handle selected action

### If "Change active profile":

1. Use Question tool to pick: quality / balanced / budget / Cancel
2. If Cancel, return to Step 3
3. Show preview table comparing current vs new effective models
4. Use Question tool: Confirm / Cancel
5. If confirmed:
    - Update `config.profiles.active_profile` to the new profile
    - Write `.planning/config.json`
    - Update `opencode.json` (see Agent Config Update section)
    - Print "Saved"
4. Return to Step 3 (show updated state and menu)

Important:
- Use the Question tool for the profile picker and confirm/cancel.
- Do NOT ask the user to type the option text manually.
- After saving, immediately show the action menu again using the Question tool. Do NOT print "Next: choose an action" text.

### If "Edit stage override":

1. Use Question tool to pick stage: planning / execution / verification / Cancel
2. If Cancel, return to Step 3
3. Show current value for that stage
4. Use Question tool to pick a model from known models (or type custom):
   - opencode/glm-4.7-free
   - opencode/minimax-m2.1-free
   - opencode/grok-code
5. Show old vs new, use Question tool: Confirm / Cancel
6. If confirmed:
   - Set `config.profiles.custom_overrides[activeProfile][stage]` = new model
   - Write `.planning/config.json`
   - Update `opencode.json`
   - Print "Saved"
7. Return to Step 3

Important:
- Use the Question tool for stage selection, model selection, and confirm/cancel.
- Do NOT print a bullet list and ask the user to type the choice.

### If "Clear stage override":

1. Use Question tool to pick stage: planning / execution / verification / Cancel
2. If Cancel, return to Step 3
3. Show what will change (override removed, reverts to preset)
4. Use Question tool: Confirm / Cancel
5. If confirmed:
   - Delete `config.profiles.custom_overrides[activeProfile][stage]`
   - Write `.planning/config.json`
   - Update `opencode.json`
   - Print "Saved"
6. Return to Step 3

Important:
- Use the Question tool for stage selection and confirm/cancel.
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
