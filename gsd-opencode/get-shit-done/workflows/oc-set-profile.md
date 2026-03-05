
<role>
You are executing the `/gsd-set-profile` command. Switch the project's active model profile (simple/smart/genius) with optional model reuse.

This command reads/writes:
- `.planning/oc_config.json` — source of truth for profile state (profile_type, stage-to-model mapping)
- `opencode.json` — agent model assignments (derived from profile; updated automatically by CLI)
- `opencode.json` — external_directory permissions for reading GSD config folder (added automatically)

Do NOT modify agent .md files. Profile switching only updates these two JSON files.
</role>

<context>
## Invocation

1. **Interactive wizard (no args):** `/gsd-set-profile`
2. **Direct switch (positional arg):** `/gsd-set-profile simple|smart|genius`

## Stage-to-Agent Mapping (11 agents)

| Stage        | Agents |
|--------------|--------|
| Planning     | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution    | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

## Profile Types

| Profile  | Models | Stage assignment |
|----------|--------|-----------------|
| Simple   | 1      | All stages use the same model |
| Smart    | 2      | Planning + Execution share one model; Verification uses a different model |
| Genius   | 3      | Each stage uses a different model |

## Output Format (reused throughout)

When displaying profile state, always use this format:

```
Active profile: **{profile_name}**

| Stage        | Model |
|--------------|-------|
| Planning     | {models.planning} |
| Execution    | {models.execution} |
| Verification | {models.verification} |
```
</context>

<behavior>

## Step 0: Ensure GSD config read permission

Before any profile operations, ensure opencode.json has permission to read the GSD config folder:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs allow-read-config --dry-run
```

Parse the response:
- **`success: true` with `action: "permission_exists"`** — Permission already configured. Continue to Step 1.
- **`success: true` with `action: "add_permission"`** — Permission would be added. Execute without `--dry-run`:

Attempt to switch to the saved profile:
```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs allow-read-config
```

- **`success: false`** — Handle error appropriately.

This ensures gsd-opencode can access workflow files, templates, and configuration from `~/.config/opencode/get-shit-done/`.

## Step 1: Load current profile

Run `get-profile` to read the current state from `.planning/oc_config.json`:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs get-profile
```

Parse the JSON response:

- **`success: true`** — Extract `data` (keyed by profile name) containing `planning`, `execution`, `verification` model IDs. Display the profile using the Output Format. Continue to Step 2.
- **`success: false` with `CONFIG_NOT_FOUND`** — No profile exists yet. Skip display, go directly to Step 2.

## Step 2: Determine target profile

### Path A — Positional argument provided

If the user typed `/gsd-set-profile {type}` where `{type}` is one of `simple`, `smart`, `genius`:

Attempt to switch to the saved profile:
```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile {type}
```

- **`success: true`** — The profile already has saved model assignments. Display the updated configuration using the Output Format. Print: `Use /gsd-set-profile (without parameter) to change models assigned to stages.` **Stop.**
- **`PROFILE_NOT_FOUND` error** — No saved models for this profile type. Fall through to Path B (interactive wizard) with the profile type pre-selected (skip the profile type picker, go straight to Step 3).

### Path B — No argument (interactive wizard)

Prompt the user to choose a profile type using the question tool:

```json
{
  "header": "Profile Type",
  "question": "Select a profile type for model configuration",
  "options": [
    { "label": "Simple", "description": "1 model for all GSD stages (easiest setup)" },
    { "label": "Smart", "description": "2 models: advanced for planning & execution, cheaper for verification" },
    { "label": "Genius", "description": "3 models: different model for each stage" },
    { "label": "Cancel", "description": "Exit without changes" }
  ]
}
```

- If **Cancel** selected: print cancellation message and **stop**.
- If invalid profile name was provided as positional arg: print `Unknown profile type '{name}'. Valid options: simple, smart, genius` and show this picker.

## Step 3: Model selection

Based on the selected profile type, collect model choices. If a current profile exists from Step 1, offer to reuse its models where applicable.

### Simple (1 model)

Ask the user (via question tool) if they want to keep the current model (only if one exists from Step 1).
- **Yes:** Use existing model for all three stages. Go to Step 4.
- **No** (or no current model exists): Load the `gsd-oc-select-model` skill. Select one model for "Simple Profile - All stages".

Assign the selected model to `planning`, `execution`, and `verification`.

### Smart (2 models)

Load the `gsd-oc-select-model` skill, then:

1. Select model for **"Smart Profile - Planning & Execution"** — assign to `planning` and `execution`.
2. Select model for **"Smart Profile - Verification"** — assign to `verification`.

### Genius (3 models)

Load the `gsd-oc-select-model` skill, then:

1. Select model for **"Genius Profile - Planning"** — assign to `planning`.
2. Select model for **"Genius Profile - Execution"** — assign to `execution`.
3. Select model for **"Genius Profile - Verification"** — assign to `verification`.

## Step 4: Apply changes

Using the collected values (`profile_name`, `model_for_planning_stage`, `model_for_execution_stage`, `model_for_verification_stage`), execute:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs set-profile '{profile_name}:{"planning": "{model_for_planning_stage}", "execution": "{model_for_execution_stage}", "verification": "{model_for_verification_stage}"}'
```

Parse the response. On success, the CLI updates both `.planning/oc_config.json` and `opencode.json` (with automatic backup).

## Step 5: Confirm result

Display the updated profile using the Output Format, prefixed with a checkmark:

```
Done! Updated {profile_name} profile:

| Stage        | Model |
|--------------|-------|
| Planning     | {models.planning} |
| Execution    | {models.execution} |
| Verification | {models.verification} |
```

We just updated the `./opencode.json` file. Apply the agent settings you need to **restart your opencode**.

Note: GSD config read permission has been configured to allow access to `~/.config/opencode/get-shit-done/`.

</behavior>

<notes>
- Use the question tool for ALL user input — never prompt via text.
- Always display full model IDs (e.g., `bailian-coding-plan/qwen3-coder-plus`), never abbreviate.
- All file reads/writes go through `gsd-oc-tools.cjs` — do not manually edit JSON files.
- Backups are created automatically by the CLI when writing changes.
- `.planning/oc_config.json` is the source of truth; `opencode.json` is always derived from it.
- The `gsd-oc-select-model` skill handles paginated provider/model browsing — load it via the skill tool when model selection is needed.
</notes>
