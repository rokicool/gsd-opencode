---
name: gsd-set-profile
description: Switch between model profiles with confirmation workflow
tools:
  question: true
---

<role>
You are executing the `/gsd-set-profile` command. Switch the project's active model profile (quality/balanced/budget) with a clear before/after preview and confirmation workflow.

This command reads/writes two files:
- `.planning/config.json` — profile state (active_profile, presets, custom_overrides)
- `opencode.json` — agent model assignments (OpenCode's native config)

Do NOT modify agent .md files. Profile switching updates `opencode.json` in the project root.
</role>

<context>
**Invocation styles:**

1. No args (interactive picker): `/gsd-set-profile`
2. Positional: `/gsd-set-profile quality` or `balanced` or `budget`
3. Flags: `--quality` or `-q`, `--balanced` or `-b`, `--budget` or `-u`

Precedence: Positional > Flags > Interactive picker

**Stage-to-agent mapping (11 agents):**

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker, gsd-set-profile, gsd-settings, gsd-set-model |

**Profile presets:** Defined in `.planning/config.json` (user-configurable via `/gsd-settings`). No hardcoded defaults—presets are discovered dynamically on first run.
</context>

<behavior>

## Step 1: Read config file

Read `.planning/config.json`. Handle these cases:

**Case A: File missing or no `profiles.presets` key**
- Print: `Error: No model presets configured. Run /gsd-settings first to set up your profiles.`
- Stop.

**Case B: File exists with `profiles.presets` key**
- Use as-is

**Also check `opencode.json`:**
- If missing, it will be created when changes are saved
- If exists, it will be merged (preserve non-agent keys)

## Step 2: Compute effective models for current profile

1. Get `currentProfile` = `config.profiles.active_profile` (default: "balanced")
2. Get `preset` = `config.profiles.presets[currentProfile]`
3. Get `overrides` = `config.profiles.custom_overrides[currentProfile]` (may be undefined)
4. Compute effective models:
   - `planning` = overrides?.planning || preset.planning
   - `execution` = overrides?.execution || preset.execution
   - `verification` = overrides?.verification || preset.verification

## Step 3: Display current state

Print:

```
Active profile: {currentProfile}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {current.planning} |
| execution    | {current.execution} |
| verification | {current.verification} |
```

## Step 4: Determine requested profile

**A) Check for positional argument:**
- If user typed `/gsd-set-profile quality` (or balanced/budget), use that as `newProfile`

**B) Check for flags:**
- `--quality` or `-q` → quality
- `--balanced` or `-b` → balanced
- `--budget` or `-u` → budget

**C) Interactive picker (no args/flags):**

Build options dynamically from `config.profiles.presets`:

Use Question tool:

```
header: "Model profile"
question: "Select a profile"
options:
  - label: "Quality"
    description: "{preset.quality.planning} / {preset.quality.execution} / {preset.quality.verification}"
  - label: "Balanced"
    description: "{preset.balanced.planning} / {preset.balanced.execution} / {preset.balanced.verification}"
  - label: "Budget"
    description: "{preset.budget.planning} / {preset.budget.execution} / {preset.budget.verification}"
  - label: "Cancel"
    description: "Exit without changes"
```

(Substitute actual model IDs from `config.profiles.presets` for each profile.)

Input rules:
- OpenCode's Question UI may display a "Type your own answer" option.
- For this command, custom/freeform answers are NOT allowed.
- If the user's selection is not exactly one of the option labels, print an error and re-run the same Question prompt.

If user selects Cancel, print the cancellation message (Step 5) and stop.

**D) Invalid profile handling:**

If an invalid profile name is provided:
- Print: `Unknown profile '{name}'. Valid options: quality, balanced, budget`
- Fall back to interactive picker

## Step 5: Handle edge cases

**If user selected Cancel:**
```
Profile change cancelled. Current profile: {currentProfile}
```
Stop.

**If newProfile === currentProfile:**
```
Profile '{currentProfile}' is already active.
```
Re-print current configuration table and stop.

## Step 5.5: Validate selected models exist in OpenCode

Before writing any files, validate that the effective models for `newProfile` are actually available in the current OpenCode installation.

Run:

```bash
opencode models
```

Parse the output and extract valid model IDs in `provider/model` format.

Validate that all three effective model IDs exist in that list:

- `{new.planning}`
- `{new.execution}`
- `{new.verification}`

If `opencode models` fails, or any model is missing:

Print an error like:

```text
Error: One or more selected models are not available in OpenCode.

Missing:
- {missingModel1}
- {missingModel2}

Run `opencode models` to see what is available, then update presets/overrides via /gsd-settings.
```

Stop. Do NOT write `.planning/config.json` and do NOT update `opencode.json`.

## Step 6: Apply changes

Use the **write tool directly** to update both files. Do NOT use bash, python, or other scripts—use native file writing.

1. **Update .planning/config.json:**

    - Set `config.profiles.active_profile` to `newProfile`
    - Also set `config.model_profile` to `newProfile` (for orchestrators that read this key)
    - Write the config file (preserve all other keys)

2. **Update opencode.json:**

Build agent config from effective stage models for `newProfile`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "gsd-planner": { "model": "{new.planning}" },
    "gsd-plan-checker": { "model": "{new.planning}" },
    "gsd-phase-researcher": { "model": "{new.planning}" },
    "gsd-roadmapper": { "model": "{new.planning}" },
    "gsd-project-researcher": { "model": "{new.planning}" },
    "gsd-research-synthesizer": { "model": "{new.planning}" },
    "gsd-codebase-mapper": { "model": "{new.planning}" },
    "gsd-executor": { "model": "{new.execution}" },
    "gsd-debugger": { "model": "{new.execution}" },
    "gsd-verifier": { "model": "{new.verification}" },
    "gsd-integration-checker": { "model": "{new.verification}" },
    "gsd-set-profile": { "model": "{new.verification}" },
    "gsd-settings": { "model": "{new.verification}" },
    "gsd-set-model": { "model": "{new.verification}" }
  }
}
```

If `opencode.json` already exists, merge the `agent` key (preserve other top-level keys).

3. **Report success:**

```text
✓ Active profile set to: {newProfile}

Current configuration:
| Stage        | Model |
|--------------|-------|
| planning     | {new.planning} |
| execution    | {new.execution} |
| verification | {new.verification} |

Note: OpenCode loads `opencode.json` at startup and does not hot-reload model/agent assignments. Fully quit and relaunch OpenCode to apply this profile change.
```

Important: Do NOT print any tooling transcript (e.g., `python -m json.tool ...`) or a separate `Updated:` file list. The success message above is the complete user-facing output.

</behavior>

<notes>
- Use the Question tool for ALL user input (never ask user to type numbers)
- Always show full model IDs (e.g., `opencode/glm-4.7-free`)
- Preserve all other config.json keys when writing (deep merge)
- Do NOT rewrite agent .md files — only update opencode.json
- If opencode.json doesn't exist, create it
- Overrides are scoped per profile at `profiles.custom_overrides.{profile}.{stage}`
- **Source of truth:** `config.json` stores profiles/presets/overrides; `opencode.json` is **derived** from the effective models
- When regenerating `opencode.json`, read the new profile from `config.json`, compute effective models (preset + overrides), then write the agent mappings
</notes>
