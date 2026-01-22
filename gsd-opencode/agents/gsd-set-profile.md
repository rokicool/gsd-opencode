---
name: gsd-set-profile
description: Switch between model profiles with confirmation workflow
tools:
  read: true
  question: true
  write: true
color: "#4169E1"
---

# /gsd-set-profile Command

You are **executing** this command right now. Do NOT implement anything. Do NOT write code. Follow the steps below using your tools (Read, Write, Question).

## What This Command Does

Switch the project's active model profile (quality/balanced/budget) with a clear before/after preview and confirmation workflow.

## Invocation Styles

1. **No args (interactive picker):** `/gsd-set-profile`
2. **Flags:** `/gsd-set-profile --quality` or `-q`, `--balanced` or `-b`, `--budget` or `-u`
3. **Positional:** `/gsd-set-profile quality` or `balanced` or `budget`

**Precedence:** Positional > Flags > Interactive picker

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

### Step 2: Determine effective models for current profile

From the config:
1. Get `currentProfile` = `config.profiles.active_profile` (default: "balanced")
2. Get `preset` = `config.profiles.presets[currentProfile]`
3. Get `overrides` = `config.profiles.custom_overrides[currentProfile]` (may be undefined)
4. Compute effective models for each stage:
   - `planning` = overrides?.planning || preset.planning
   - `execution` = overrides?.execution || preset.execution
   - `verification` = overrides?.verification || preset.verification

### Step 3: Display current state

Print this output (substitute actual values):

```
Active profile: {currentProfile}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {effective.planning} |
| execution    | {effective.execution} |
| verification | {effective.verification} |
```

### Step 4: Determine requested profile

**A) Check for positional argument:**
- If user typed `/gsd-set-profile quality` (or balanced/budget), use that as `newProfile`

**B) Check for flags:**
- `--quality` or `-q` → quality
- `--balanced` or `-b` → balanced
- `--budget` or `-u` → budget

**C) Interactive picker (no args/flags):**

Use Question tool:
```
header: "Model profile"
question: "Select a profile"
options:
  - label: "quality"
  - label: "balanced"
  - label: "budget"
  - label: "Cancel"
```

**D) Invalid profile handling:**

If an invalid profile name is provided:
- Print: `Unknown profile '{name}'. Valid options: quality, balanced, budget`
- Fall back to interactive picker

### Step 5: Handle edge cases

**If user selected Cancel:**
```
Profile change cancelled. Current profile: {currentProfile}
```
Stop.

**If newProfile === currentProfile:**
```
Profile '{currentProfile}' is already active.
```
Re-print the current configuration table and stop.

### Step 6: Show preview and confirm

Get effective models for the new profile (same logic as Step 2 but for `newProfile`).

Print:
```
Profile change: {currentProfile} → {newProfile}

| Stage        | Current Model              | New Model                  |
|--------------|----------------------------|----------------------------|
| planning     | {current.planning}         | {new.planning}             |
| execution    | {current.execution}        | {new.execution}            |
| verification | {current.verification}     | {new.verification}         |

This will update the model: key in all 11 agent files.
```

Use Question tool:
```
header: "Confirm profile change"
question: "What would you like to do?"
options:
  - label: "Confirm change"
    description: "Persist config and rewrite agent frontmatter"
  - label: "Edit proposed stage models"
    description: "Adjust the per-stage model IDs before confirming"
  - label: "Cancel"
    description: "Exit without making changes"
```

### Step 7: Handle confirmation response

**If "Cancel":**
```
Profile change cancelled. Current profile: {currentProfile}
```
Stop.

**If "Edit proposed stage models":**
1. Show: `Editing proposed profile: {newProfile}`
2. For each stage, ask user to provide a model (or press Enter to keep current)
3. Store any changed values in `editedOverrides`
4. Show updated preview table
5. Return to confirmation question (Confirm / Edit / Cancel)

**If "Confirm change":**
Continue to Step 8.

### Step 8: Apply changes

1. **Update config.json:**
   - Set `config.profiles.active_profile` to `newProfile`
   - If user edited models, store changes at `config.profiles.custom_overrides[newProfile][stage]`
   - Use Write tool to save the updated config

2. **Rewrite agent frontmatter:**
   
   The agents are at these paths (relative to where this command is installed):
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

3. **Report success:**

```
✓ Active profile set to: {newProfile}

Agent updates: {modified} modified, {unchanged} unchanged

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {new.planning} |
| execution    | {new.execution} |
| verification | {new.verification} |
```

### Step 9: Error handling

**If agent rewrite fails:**
- Report which agents succeeded and which failed
- Suggest: "You can re-run the command to retry. Git can restore any modified files."
- Stop (do not claim success)

## Stage-to-Agent Mapping

| Stage        | Agents |
|--------------|--------|
| planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| execution    | gsd-executor, gsd-debugger |
| verification | gsd-verifier, gsd-integration-checker |

## Important Notes

- Use the Question tool for ALL user input (never ask user to type numbers)
- Always show full model IDs (e.g., `opencode/glm-4.7-free`)
- Preserve all other config.json keys when writing (deep merge)
- If config.json is corrupted, back up to `.planning/config.json.bak` and use defaults
