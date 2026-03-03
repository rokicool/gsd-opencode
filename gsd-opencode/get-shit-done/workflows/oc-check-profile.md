<role>
You are executing the `/gsd-check-profile` command. Validate gsd-opencode profile configuration across both `opencode.json` and `.planning/oc_config.json`, then report results.

This is a **read-only diagnostic**. Do NOT modify any files or attempt to fix issues. When problems are found, recommend `/gsd-set-profile` and stop.
</role>

<required_reading>
read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<context>
## What Gets Validated

| Check | File | Validates |
|-------|------|-----------|
| `check-opencode-json` | `opencode.json` | All agent model IDs exist in the opencode models catalog |
| `check-config-json` | `.planning/oc_config.json` | gsd-opencode profile structure is valid, current profile exists in presets, all stage model IDs exist in catalog |

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

Note: When `opencode.json` does not exist, the tool returns exit 1 with `error.code = "CONFIG_NOT_FOUND"`. This is **not** an error for gsd-opencode profile validation — see Step 2 for handling.

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

Parse both JSON responses.

## Step 2: Classify results by severity

### opencode.json classification

| Tool result | Severity | Meaning |
|-------------|----------|---------|
| exit 0, `data.valid = true` | OK | All model IDs valid |
| exit 1, `error.code = "CONFIG_NOT_FOUND"` | WARNING | No `opencode.json` — agents will use the default/current model. This is acceptable. |
| exit 1, `error.code = "INVALID_MODEL_ID"` | ERROR | One or more model IDs are invalid. Must be fixed. |
| exit 1, `error.code = "INVALID_JSON"` | ERROR | File is malformed JSON. Must be fixed. |

### .planning/oc_config.json classification

| Tool result | Severity | Meaning |
|-------------|----------|---------|
| exit 0, `data.passed = true` | OK | gsd-opencode profile configuration valid |
| exit 1, `error.code = "CONFIG_NOT_FOUND"` | ERROR | No gsd-opencode profile configured yet |
| exit 1, `error.code = "INVALID_PROFILE"` | ERROR | gsd-opencode profile structure is invalid |
| exit 1, `error.code = "INVALID_JSON"` | ERROR | File is malformed JSON |

## Step 3: Report results

Determine the overall status:
- **All OK (no ERRORs, no WARNINGs)**: report success
- **WARNINGs only (no ERRORs)**: report success with warnings
- **Any ERRORs**: report errors with fix instructions

---

### All OK — no errors, no warnings

```
gsd-opencode profile: OK

  opencode.json              All model IDs valid
  .planning/oc_config.json   gsd-opencode profile valid
```

**Stop here.**

---

### OK with warnings (opencode.json missing, but oc_config.json is valid)

```
gsd-opencode profile: OK

  opencode.json              Not found (agents will use the default/current model)
  .planning/oc_config.json   gsd-opencode profile valid
```

**Stop here.**

---

### Errors found

Display a structured diagnostic. Use the severity labels (WARNING / ERROR) to make the impact clear.

```
gsd-opencode profile: ERRORS FOUND

--- opencode.json ---

[If OK]
  All model IDs valid

[If WARNING — CONFIG_NOT_FOUND]
  WARNING: opencode.json not found. Agents will use the default/current model.

[If ERROR — INVALID_MODEL_ID — iterate over data.issues]
  ERROR: {N} invalid model ID(s):

    Agent:   {issue.agent}
    Model:   {issue.model}
    Reason:  {issue.reason}

    (repeat for each issue)

[If ERROR — INVALID_JSON]
  ERROR: opencode.json is not valid JSON.

--- .planning/oc_config.json ---

[If OK]
  gsd-opencode profile valid

[If ERROR — CONFIG_NOT_FOUND]
  ERROR: .planning/oc_config.json not found — no gsd-opencode profile configured.

[If ERROR — INVALID_PROFILE — iterate over data.issues]
  ERROR: {N} gsd-opencode profile issue(s):

    Field:   {issue.field}
    Value:   {issue.value}
    Reason:  {issue.reason}

    (repeat for each issue)

[If ERROR — INVALID_JSON]
  ERROR: .planning/oc_config.json is not valid JSON.

--- Fix ---

Run /gsd-set-profile or /gsd-set-profile <simple|smart|genius> to fix gsd-opencode profile configuration.
```

**Stop here.** Do not offer to fix anything. Do not edit files.

</behavior>

<notes>
- This workflow is strictly diagnostic — never modify `opencode.json`, `.planning/oc_config.json`, or any other file.
- When errors are found, always recommend `/gsd-set-profile` or `/gsd-set-profile <simple|smart|genius>` as the resolution path. Do not suggest manual editing.
- Always display full model IDs (e.g., `bailian-coding-plan/qwen3-coder-plus`), never abbreviate.
- Missing `opencode.json` is a WARNING, not an error. The user simply hasn't customized agent models — agents fall back to the default/current model. Do not include it in the "Fix" section.
- Missing `.planning/oc_config.json` IS an error — it means no gsd-opencode profile has been set up.
- Always use the term "gsd-opencode profile" (not just "profile") when referring to the profile system.
- Both `check-config-json` and `check-oc-config-json` route to the same validator. Use `check-config-json` (shorter).
</notes>
