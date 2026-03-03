<role>
You are executing the `/gsd-check-profile` command. Validate profile configuration across both `opencode.json` and `.planning/oc_config.json`, then report results.

This is a **read-only diagnostic**. Do NOT modify any files or attempt to fix issues. When problems are found, recommend `/gsd-set-profile` and stop.
</role>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<context>
## What Gets Validated

| Check | File | Validates |
|-------|------|-----------|
| `check-opencode-json` | `opencode.json` | All agent model IDs exist in the opencode models catalog |
| `check-config-json` | `.planning/oc_config.json` | Profile structure is valid, current profile exists in presets, all stage model IDs exist in catalog |

## CLI Tool

All validation runs through `gsd-oc-tools.cjs`. Both commands output a JSON envelope with `success`, `data`, and optional `error` fields. Exit code 0 = valid, exit code 1 = issues found.

## JSON Response Shapes

**check-opencode-json** (exit 0 or 1):
```json
{
  "success": true,
  "data": { "valid": true|false, "total": N, "validCount": N, "invalidCount": N, "issues": [{ "agent": "...", "model": "...", "reason": "..." }] },
  "error": { "code": "INVALID_MODEL_ID", "message": "..." }
}
```

**check-config-json** (exit 0 or 1):
```json
{
  "success": true|false,
  "data": { "passed": true|false, "current_oc_profile": "...", "profile_data": {...}, "issues": [{ "field": "...", "value": "...", "reason": "..." }] },
  "error": { "code": "INVALID_PROFILE|CONFIG_NOT_FOUND|INVALID_JSON", "message": "..." }
}
```
</context>

<behavior>

## Step 1: Run both validations

Execute both checks and capture their output and exit codes:

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs check-opencode-json
```

```bash
node ~/.config/opencode/get-shit-done/bin/gsd-oc-tools.cjs check-config-json
```

Parse both JSON responses. Note: `CONFIG_NOT_FOUND` from `check-config-json` means `.planning/oc_config.json` does not exist — treat this as a failure with a clear message (profile has not been set up yet).

## Step 2: Report results

### Both checks pass (exit 0 + exit 0)

Display the short success summary and stop:

```
Profile configuration valid

  opencode.json          All model IDs valid
  .planning/oc_config.json   Profile configuration valid
```

**Stop here.** No further output needed.

### One or both checks fail

Display a structured diagnostic report:

```
Profile configuration issues found

--- opencode.json ---

[If valid]
  All model IDs valid

[If invalid — iterate over data.issues]
  {N} invalid model ID(s):

    Agent:   {issue.agent}
    Current: {issue.model}
    Issue:   {issue.reason}

    (repeat for each issue)

--- .planning/oc_config.json ---

[If valid]
  Profile configuration valid

[If CONFIG_NOT_FOUND]
  .planning/oc_config.json not found — no profile configured yet

[If invalid — iterate over data.issues]
  {N} profile configuration issue(s):

    Field:   {issue.field}
    Current: {issue.value}
    Issue:   {issue.reason}

    (repeat for each issue)

--- Recommendation ---

Run /gsd-set-profile to configure a valid profile.
Available profile types: simple, smart, genius

Example: /gsd-set-profile smart
```

**Stop here.** Do not offer to fix anything. Do not edit files.

</behavior>

<notes>
- This workflow is strictly diagnostic — never modify `opencode.json`, `.planning/oc_config.json`, or any other file.
- When issues are found, always recommend `/gsd-set-profile` as the resolution path. Do not suggest manual editing.
- Always display full model IDs (e.g., `bailian-coding-plan/qwen3-coder-plus`), never abbreviate.
- `CONFIG_NOT_FOUND` is a common case for new projects — frame it as "no profile configured yet", not as an error.
- Both `check-config-json` and `check-oc-config-json` route to the same validator. Use `check-config-json` (shorter).
</notes>
