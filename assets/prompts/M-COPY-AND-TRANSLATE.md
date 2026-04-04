# Copy and Translate: Sync from Original GSD to OpenCode

> **Purpose**: Copy files from the upstream GSD submodule (`original/get-shit-done/`) into the working folder (`gsd-opencode/`), then translate all Claude Code artifacts to OpenCode equivalents, and validate that no forbidden patterns remain.

---

## Context

This project maintains `gsd-opencode/` as an adapted fork of the upstream `original/get-shit-done/` submodule. The sync workflow has four phases:

1. **Copy** -- pull latest files from the submodule into `gsd-opencode/`
2. **Translate** -- replace Claude Code naming, paths, tools, and commands with OpenCode equivalents
3. **Add Agents Mode** -- inject `mode: subagent` into all agent definition files
4. **Modify Agent Calls** -- replace `task()` calls with `@subagent_type` shorthand syntax
5. **Validate** -- ensure zero forbidden strings remain in the translated files

### Tools

| Tool | Script | Documentation |
|------|--------|---------------|
| copy-service | `assets/bin/gsd-copy-from-original.js` | `assets/bin/GSD-COPY-FROM-ORIGINAL.md` |
| translate-service | `assets/bin/gsd-translate-in-place.js` | `assets/bin/GSD-TRANSLATE-IN-PLACE.md` |
| forbidden-strings-checker | `assets/bin/check-forbidden-strings.js` | `assets/bin/CHECK-FORBIDDEN-STRINGS.md` |

### Critical Rule: Protect OpenCode-Specific Files

**Never overwrite, modify, or delete any file or folder whose name contains `oc-` or `-oc-`.** These are OpenCode-native additions that do not exist in the upstream. The exclude rules in `assets/configs/config.json` (`**/oc-*`, `**/*-oc-*`) enforce this, but you must also verify it manually.

---

## Prerequisites

Before starting, verify these conditions. If any fail, fix them before proceeding.

```bash
# 1. Submodule must be initialized and up to date
git submodule update --init --recursive
cd original/get-shit-done && git fetch --tags && git checkout $(git tag --sort=-creatordate | head -1)

# 2. Dependencies must be installed
npm install --prefix assets
```

Confirm the submodule version (you will need this later for naming config files):

```bash
cd original/get-shit-done && git describe --tags --always && cd ../..
```

Record the version string (e.g., `v1.22.4`). You will reference it as `$VERSION` below.

---

## Step 1: Copy Files from Submodule

### 1a. Preview (dry-run)

```bash
node assets/bin/gsd-copy-from-original.js
```

**What to check in the output:**
- The submodule is detected and initialized
- Number of files with differences is reported
- Any diverged files are listed (files with local modifications)
- Any orphaned files are listed (OpenCode-only files -- these are expected and preserved)

### 1b. Apply

```bash
node assets/bin/gsd-copy-from-original.js --apply
```

### 1c. Verify

After apply, confirm the result:

```bash
node assets/bin/gsd-copy-from-original.js
```

**Expected output**: "All files are up to date" or 0 files with differences.

### 1d. Report

Produce a brief report with:
- Total files copied
- Any diverged files that were overwritten (or skipped)
- Any orphaned files (preserved)
- Confirmation that no `oc-` / `-oc-` files were touched

---

## Step 2: Translate Claude Code Artifacts to OpenCode

The primary config is `assets/configs/config.json`. It contains all translation rules (URLs, paths, commands, tool names, profile names, colors, HTML tags, etc.).

---

## Step 2B: Add Agents Mode

Add `mode: subagent` declaration to all agent definition files. See [M-ADD-AGENTS-MODE.md](./M-ADD-AGENTS-MODE.md) for details.

### 2Ba. Preview

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/add-agent-mode.json --show-diff
```

**What to check:**
- All agent files in `gsd-opencode/agents/` are listed
- Each file shows exactly one replacement: `mode: subagent` added after `description:`
- No duplicate `mode:` lines are created (files with existing `mode:` are skipped)

### 2Bb. Apply

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/add-agent-mode.json --apply
```

### 2Bc. Verify

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/add-agent-mode.json
```

**Expected output**: 0 changes remaining (all agent files have `mode: subagent`).

---

## Step 2C: Modify Agent Calls

Replace `task()` function calls with the OpenCode `@subagent_type` shorthand syntax. The config `assets/configs/remove-task.json` contains regex rules that match the most common `task()` call patterns found in commands, workflows, references, and templates.

**Scope**: Only files in `gsd-opencode/commands/gsd/`, `gsd-opencode/get-shit-done/references/`, `gsd-opencode/get-shit-done/templates/`, and `gsd-opencode/get-shit-done/workflows/`.

**What gets replaced** (examples):

```
# Before (multiline variable prompt)
task(
  prompt=filled_prompt,
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="Research Phase {phase}"
)

# After
@gsd-phase-researcher filled_prompt
```

```
# Before (single-line quoted prompt)
task(prompt="Stack research", subagent_type="gsd-project-researcher", model="{researcher_model}", description="Stack research")

# After
@gsd-project-researcher "Stack research"
```

```
# Before (triple-quoted prompt)
task(
  prompt="""<objective>...""",
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="Plan Phase {phase}"
)

# After
@gsd-planner """<objective>..."""
```

**What does NOT get replaced**: Prose references to `subagent_type=` inside inline code spans (e.g., `` `subagent_type="gsd-executor"` ``) are left untouched -- they are documentation, not function calls.

### 2Ca. Preview

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/remove-task.json --show-diff
```

**What to check:**
- Files affected are only within the scoped directories (commands, references, templates, workflows)
- Each diff shows a `task(...)` call replaced with an `@subagent_type ...` shorthand
- No `oc-` or `-oc-` files appear in the output
- Prose references (inside backticks) are NOT modified
- Verify the extracted prompt value is correct for each replacement (no truncated prompts)

**Common issues to watch for:**
- **Truncated multiline prompts**: Some `task()` calls have massive multi-line prompts (50+ lines). If a replacement looks like it captured only part of the prompt, note it for manual review.
- **Expression prompts**: Prompts using string concatenation (`+`) may only capture the first segment -- verify these replacements look correct.
- **Unmatched calls**: Not every `task()` variant is covered by regex. Complex patterns (deeply indented, extra args in unusual positions) may need manual conversion.

### 2Cb. Apply

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/remove-task.json --apply
```

### 2Cc. Verify

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/remove-task.json
```

**Expected output**: 0 changes remaining (all matching `task()` calls already replaced).

### 2Cd. Manual review of unmatched calls

After apply, search for any remaining `task(` calls with `gsd-` subagent types that were not auto-replaced:

```bash
grep -rn 'subagent_type="gsd-' gsd-opencode/commands/gsd/ gsd-opencode/get-shit-done/references/ gsd-opencode/get-shit-done/templates/ gsd-opencode/get-shit-done/workflows/ || echo "No remaining task() calls"
```

If results are found:
- Check if each is a prose reference (inside backticks or plain text) -- these are correct to leave as-is
- If any are actual `task()` calls that the regex missed, convert them manually following the pattern: `@subagent_type prompt_value`

---

## Step 3: Translate -- Supplemental Rules (If Needed)

### 3a. Preview translations

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/config.json --show-diff
```

**What to check:**
- Number of files affected and total replacements
- Scan the diffs for any unexpected changes (false positives)
- Verify no `oc-` or `-oc-` files appear in the output

### 3b. Apply translations

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/config.json --apply
```

### 3c. Verify translations applied

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/config.json
```

**Expected output**: 0 changes remaining (all patterns already translated).

---

## Step 4: Validate -- Check for Forbidden Strings

```bash
node assets/bin/check-forbidden-strings.js
```

This reads `assets/antipatterns.toml` and scans `gsd-opencode/*.md` for forbidden strings like `Claude`, `~/.claude`, `/gsd:`, `<sub>`, etc.

### If NO violations found

The workflow is complete. Produce a final summary report:

- Files copied in Step 1 (count)
- Files translated in Step 2 (count, total replacements)
- Forbidden strings check: PASSED
- Confirm no `oc-` / `-oc-` files were modified

**Stop here.**

### If violations ARE found

Forbidden strings remain that the base config did not cover. You must create a supplemental config and re-translate:

#### 4a. Create a version-specific config file

File path: `assets/configs/$VERSION.json` (e.g., `assets/configs/v1.22.4.json`)

Structure the config to target only the remaining violations from Step 4:

```json
{
  "_description": "Supplemental translation rules for $VERSION -- fixes remaining forbidden strings",
  "include": ["gsd-opencode/**"],
  "exclude": [
    "node_modules/**",
    ".git/**",
    ".translate-backups/**",
    "**/oc-*",
    "**/*-oc-*"
  ],
  "rules": [
    {
      "pattern": "<the forbidden string found>",
      "replacement": "<the correct OpenCode equivalent>",
      "description": "Fix: <why this was missed>"
    }
  ]
}
```

**Guidelines for writing rules:**
- Examine each violation line in context to determine the correct replacement
- Use `caseSensitive: true` when the pattern is case-specific
- Order rules from most-specific to least-specific (longer patterns first)
- Do not duplicate rules already in `assets/configs/config.json`

#### 4b. Re-run translation with both configs

```bash
# Preview
node assets/bin/gsd-translate-in-place.js assets/configs/config.json assets/configs/$VERSION.json --show-diff

# Apply
node assets/bin/gsd-translate-in-place.js assets/configs/config.json assets/configs/$VERSION.json --apply
```

#### 4c. Re-run forbidden strings check

```bash
node assets/bin/check-forbidden-strings.js
```

#### 4d. Iterate if needed

Repeat steps 4a-4c. **Maximum 3 iterations.** If violations persist after 3 attempts:
- List remaining violations with file paths and line numbers
- Explain why each could not be auto-fixed (may require manual context-aware edits)
- Stop and report to the user for manual resolution

---

## Final Report Template

When the workflow completes (forbidden strings check passes), produce this report:

```
## Sync Report

**Submodule version**: $VERSION
**Date**: YYYY-MM-DD

### Step 1: Copy
- Files copied: N
- Diverged files: N (overwritten / skipped)
- Orphaned files: N (preserved)

### Step 2: Translate  
- Config(s) used: assets/configs/config.json [, assets/configs/$VERSION.json]
- Files modified: N
- Total replacements: N

### Step 2B: Add Agents Mode
- Config used: assets/configs/add-agent-mode.json
- Agent files processed: N
- Files with mode added: N
- Files skipped (already had mode): N

### Step 2C: Modify Agent Calls
- Config used: assets/configs/remove-task.json
- Files modified: N
- Total task() calls replaced: N
- Manual conversions needed: N (list files if any)

### Step 4: Validate
- Forbidden strings check: PASSED
- Iterations required: N

### Protected Files
- oc-/\-oc- files verified untouched: YES
```

---

## Error Recovery

If anything goes wrong at any step:

| Problem | Recovery |
|---------|----------|
| Copy corrupted files | Restore from `.planning/backups/` (auto-created by copy-service) |
| Translation produced wrong output | Restore from `.translate-backups/` (auto-created by translate-service) |
| Need to start over completely | `git checkout -- gsd-opencode/` to reset all changes |

---

## Constraints

- **Never modify** files/folders with `oc-` or `-oc-` in the name
- **Always preview** before applying (both copy and translate)
- **Always verify** after applying (re-run in dry-run mode)
- **Always validate** with the forbidden strings checker before declaring success
- **Config files go in** `assets/configs/` (not `assets/config/`)
- **Translation scope is** `gsd-opencode/**` only -- never translate files in `assets/`, `original/`, or project root
