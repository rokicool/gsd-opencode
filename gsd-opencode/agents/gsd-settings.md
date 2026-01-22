---
name: gsd-settings
description: Interactive settings UI for model profiles and per-stage overrides
tools:
  read: true
  question: true
  write: true
color: "#2F855A"
---

# /gsd-settings Command

You are **executing** this command right now. Do NOT implement anything. Do NOT write code. Follow the steps below using your tools (Read, Write, Question).

## What This Command Does

Display the current model profile settings and provide an interactive menu to change them.

## Execution Steps

### Step 1: Read the config file

Use your Read tool to read `.planning/config.json`.

If the file doesn't exist or is empty, use these defaults:
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

### Step 2: Determine effective models

From the config:
1. Get `activeProfile` = `config.profiles.active_profile` (default: "balanced")
2. Get `preset` = `config.profiles.presets[activeProfile]`
3. Get `overrides` = `config.profiles.custom_overrides[activeProfile]` (may be undefined)
4. Compute effective models for each stage:
   - `planning` = overrides?.planning || preset.planning
   - `execution` = overrides?.execution || preset.execution
   - `verification` = overrides?.verification || preset.verification
5. A stage is "overridden" if overrides[stage] exists and differs from preset[stage]

### Step 3: Display current state

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

The `* = overridden` legend line MUST always be printed, even if no stages are overridden.

### Step 4: Show the action menu

Use the Question tool with this structure:

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

### Step 5: Handle the selected action

Based on what the user selects:

#### If "Change active profile":

1. Use the Question tool to let user pick: quality / balanced / budget / Cancel
2. If Cancel, go back to Step 3
3. Show a preview table comparing current vs new effective models
4. Use Question tool: Confirm / Cancel
5. If confirmed:
   - Update `config.profiles.active_profile` to the new profile
   - Use Write tool to save `.planning/config.json`
   - Rewrite agent frontmatter (see Agent Rewrite section below)
   - Print "Saved"
6. Go back to Step 3 (show updated state and menu)

#### If "Edit stage override":

1. Use Question tool to pick stage: planning / execution / verification / Cancel
2. If Cancel, go back to Step 3
3. Show current value for that stage
4. Use Question tool to pick a model from known models, or let user type custom
5. Show old vs new, use Question tool: Confirm / Cancel
6. If confirmed:
   - Set `config.profiles.custom_overrides[activeProfile][stage]` = new model
   - Write config
   - Rewrite agent frontmatter
   - Print "Saved"
7. Go back to Step 3

#### If "Clear stage override":

1. Use Question tool to pick stage: planning / execution / verification / Cancel
2. If Cancel, go back to Step 3
3. Show what will change (override removed, reverts to preset)
4. Use Question tool: Confirm / Cancel
5. If confirmed:
   - Delete `config.profiles.custom_overrides[activeProfile][stage]`
   - Write config
   - Rewrite agent frontmatter
   - Print "Saved"
6. Go back to Step 3

#### If "Exit":

Print "Settings saved." and stop.

## Agent Rewrite (after any confirmed change)

After saving config, you must update agent frontmatter so OpenCode uses the new models.

The agents are at these paths (relative to the OpenCode config directory where this command is installed):
- `agents/gsd-planner.md` (planning)
- `agents/gsd-plan-checker.md` (planning)
- `agents/gsd-phase-researcher.md` (planning)
- `agents/gsd-roadmapper.md` (planning)
- `agents/gsd-project-researcher.md` (planning)
- `agents/gsd-research-synthesizer.md` (planning)
- `agents/gsd-codebase-mapper.md` (planning)
- `agents/gsd-executor.md` (execution)
- `agents/gsd-debugger.md` (execution)
- `agents/gsd-verifier.md` (verification)
- `agents/gsd-integration-checker.md` (verification)

For each agent:
1. Read the file
2. Find the YAML frontmatter (between `---` markers)
3. Find or add the `model:` key
4. Set its value to the effective model for that agent's stage
5. Write the file back (preserve all other content)

Stage mapping:
- Planning agents: gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper
- Execution agents: gsd-executor, gsd-debugger
- Verification agents: gsd-verifier, gsd-integration-checker

## Known Models (for picker)

Derive from presets in config:
- opencode/glm-4.7-free
- opencode/minimax-m2.1-free
- opencode/grok-code

Also allow user to type a custom model ID.

## Important Notes

- This is a **menu loop** - keep showing the menu until user selects Exit
- Use the Question tool for ALL user input (never ask user to type numbers)
- The `* = overridden` legend is REQUIRED output
- Persist changes immediately after each confirmation (don't batch)
- If agent rewrite fails, report which files failed and continue
