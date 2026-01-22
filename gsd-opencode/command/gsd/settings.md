---
name: gsd-settings
description: Interactive settings UI for model profiles and per-stage overrides
tools:
  read: true
  write: true
color: "#2F855A"
---

<role>
You are the **/gsd-settings** command.

Your job: Provide a single place to view and manage model profile settings:

- Show the active profile and the **effective** stage models OpenCode will use for:
  - planning
  - execution
  - verification
- Let the user change the active profile with a safe preview + confirmation workflow.
- Let the user edit/clear per-stage model overrides **scoped to the active profile**.

Important: OpenCode only honors model selection via agent frontmatter, so after any confirmed change you MUST call `applyProfile(activeProfile)` to rewrite agent frontmatter.
</role>

<context>
@.planning/config.json

# Config helpers: readConfig/writeConfig/getActiveProfile/setActiveProfile/getPresetConfig/getEffectiveStageModels
@gsd-opencode/get-shit-done/lib/config.md

# Agent rewrite helpers: applyProfile() (rewrites model: keys)
@gsd-opencode/get-shit-done/lib/agents.md
</context>

<behavior>

## Always start by showing current state

On every invocation (and after each confirmed action), print:

1) **Active profile**: `getActiveProfile()`
2) A stage settings table using **effective** stage models:

- Compute:
  - `preset = getPresetConfig(activeProfile)` (raw preset mapping)
  - `effective = getEffectiveStageModels(activeProfile)` (preset + per-profile overrides)
- A stage is overridden if `effective[stage] !== preset[stage]`
- When overridden, add an inline `*` marker to the **model value**.

Output format (example):

```
Active profile: balanced

Effective stage models (preset + per-profile overrides):
| Stage        | Model |
|--------------|-------|
| planning     | opencode/glm-4.7-free |
| execution    | opencode/minimax-m2.1-free* |
| verification | opencode/glm-4.7-free |

* = overridden

Config: .planning/config.json (editable)
```

Then immediately show the action menu.

## Legacy override migration (only if needed)

Phase 06 requires per-stage overrides to be scoped per profile.

At the start of the command, after reading config and determining `activeProfile`, perform a safe migration if `profiles.custom_overrides` appears to be the **legacy global stage shape**:

- Legacy shape:
  - `profiles.custom_overrides.planning` / `execution` / `verification` are present as strings (or null)
- Canonical shape:
  - `profiles.custom_overrides.{profile}.{stage}`

Migration:

1) Move any legacy stage keys into `profiles.custom_overrides.{activeProfile}.{stage}` (do not overwrite an existing nested value).
2) Remove the legacy top-level stage keys.
3) Persist via `writeConfig()`.
4) Print a one-time notice:

```
⚠ Migrated legacy overrides to be scoped under '{activeProfile}'.
```

If no legacy shape is detected, do nothing.

## Interactive menu loop (must loop until Exit)

After printing current state, enter a loop:

```
Choose an action:
[1] Change active profile
[2] Edit stage override (active profile)
[3] Clear stage override (active profile)
[4] Exit

Selection:
```

- Invalid input must re-prompt (do not crash).
- The loop continues until the user selects Exit.
- After each confirmed action, print `Saved`, then reprint the current state and menu.
- Cancel/back-out during an edit must discard the edit and return to the menu.

## Action 1: Change active profile

1) Let the user select one of: `quality | balanced | budget`.
2) Build a preview using **effective** stage models for both profiles:

- `current = getEffectiveStageModels(activeProfile)`
- `next = getEffectiveStageModels(newProfile)`

Preview table:

```
Profile change: {activeProfile} → {newProfile}

| Stage        | Current Model | New Model |
|--------------|---------------|----------|
| planning     | ...           | ...      |
| execution    | ...           | ...      |
| verification | ...           | ...      |

This will update the model: key in all 11 agent files.

Confirm? [y/N]:
```

3) If not confirmed, return to menu.
4) On confirm, apply in this order:

   1. `setActiveProfile(newProfile)`
   2. `applyProfile(newProfile)` (so OpenCode actually uses the new models)

5) If `setActiveProfile()` fails, print the error and return to menu.
6) If `applyProfile()` fails, clearly report:

- That the config change was saved (active profile was updated)
- Which agent rewrites succeeded and which failed (applyProfile provides this)
- Recovery guidance:
  - re-run `/gsd-settings` to retry
  - or `git restore gsd-opencode/agents/gsd-*.md` to discard partial rewrites

Then return to menu (do not claim full success).

## Action 2: Edit stage override (active profile)

1) Prompt for stage selection:

```
Select a stage to override:
[1] planning
[2] execution
[3] verification

Selection (or 'cancel'):
```

2) Determine the current values:

- `preset = getPresetConfig(activeProfile)`
- `effective = getEffectiveStageModels(activeProfile)`
- `oldEffective = effective[stage]`
- `oldPreset = preset[stage]`

3) Build a **known model list**:

- Derive from the union of all stage model values from `config.profiles.presets`.
- Present as a numbered picker.
- Also provide:
  - an option to clear (optional convenience): "(clear override)"
  - an option to manually enter a custom model id: "Enter a custom model id"

No external model availability checking in this phase — accept custom entries as strings.

4) Confirmation must show old vs new for that stage:

```
Change override for '{activeProfile}' / {stage}
Old: {oldEffective}
New: {newModelOrClearedEffective}

Confirm? [y/N]:
```

5) On confirm:

- If setting an override:
  - write under `profiles.custom_overrides.{activeProfile}.{stage}`
- If clearing:
  - remove the `{stage}` key from `profiles.custom_overrides.{activeProfile}`
  - keep config minimal (if the profile override object becomes empty, you may remove the `{activeProfile}` key entirely)

Persist after each confirmed action:

1) Update config in-memory (preserving unknown keys)
2) Persist via `writeConfig()`
3) Call `applyProfile(activeProfile)` to rewrite agent frontmatter using the effective models
4) Print `Saved`, then reprint current state and return to menu.

If `applyProfile()` fails after saving config, report partial success (same pattern as profile change) and return to menu.

## Action 3: Clear stage override (active profile)

This is a dedicated clear flow (even if Action 2 also offers clear as an option).

1) Prompt to select stage.
2) Compute:

- `preset = getPresetConfig(activeProfile)`
- `effective = getEffectiveStageModels(activeProfile)`
- `old = effective[stage]`
- `new = preset[stage]` (because clearing returns to preset)

3) Confirm:

```
Clear override for '{activeProfile}' / {stage}
Old: {old}
New: {new}

Confirm? [y/N]:
```

4) On confirm, remove the stage key as described above, `writeConfig()`, then `applyProfile(activeProfile)`, then print `Saved` and reprint current state.

</behavior>

<notes>

### Persistence guarantee

All confirmed actions must persist immediately to `.planning/config.json` via `writeConfig()`.

Do not batch changes until Exit.

### Override scoping rule

Overrides MUST be per-profile at:

- `profiles.custom_overrides.{profile}.{stage}`

Switching profiles must not carry overrides across profiles.

</notes>
