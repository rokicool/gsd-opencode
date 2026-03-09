# Add Agents Mode: Inject `mode: subagent` into Agent Definitions

> **Purpose**: Add `mode: subagent` declaration to all agent definition files in `gsd-opencode/agents/` as a post-migration step.

---

## Context

This is an **additional step** to the migration workflow described in [M-COPY-AND-TRANSLATE.md](./M-COPY-AND-TRANSLATE.md). It runs **after** Step 2 (Translate) and **before** Step 3 (Validate).

### What This Step Does

All agent definition files (`*.md` in `gsd-opencode/agents/`) must include `mode: subagent` in their YAML frontmatter. This declares the agent as a subagent type to OpenCode.

The transformation adds one line after the `description:` field:

```yaml
---
name: gsd-planner
description: Creates executable phase plans...
mode: subagent              # ← This line is added
---
```

### Tool

| Tool | Script | Documentation |
|------|--------|---------------|
| translate-service | `assets/bin/gsd-translate-in-place.js` | `assets/bin/GSD-TRANSLATE-IN-PLACE.md` |

---

## Prerequisites

Before starting, verify:

```bash
# 1. Migration Step 1 (Copy) must be complete
# 2. Migration Step 2 (Translate) must be complete
# 3. Dependencies must be installed
npm install --prefix assets
```

Confirm agent files exist:

```bash
ls gsd-opencode/agents/*.md
```

---

## Step 1: Create the Config File

Create `assets/configs/add-agent-mode.json` with the following structure:

```json
{
  "_description": "Add 'mode: subagent' to all agent definitions in gsd-opencode/agents/",
  "include": ["gsd-opencode/agents/*.md"],
  "exclude": [
    "node_modules/**",
    ".git/**",
    ".translate-backups/**",
    "assets/**"
  ],
  "rules": [
    {
      "pattern": "(description: .+\\r?\\n)",
      "replacement": "$1mode: subagent\\r\\n",
      "description": "Add 'mode: subagent' after description line in YAML frontmatter",
      "isRegex": true
    }
  ]
}
```

**Why this pattern works:**
- Matches the `description:` line and its trailing newline
- Captures it in group `$1`
- Replaces with the captured text + new `mode: subagent` line
- Uses `\r\n` to ensure consistent line endings

---

## Step 2: Preview the Changes

Run in dry-run mode first:

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/add-agent-mode.json --show-diff
```

**What to check in the output:**

- All agent files in `gsd-opencode/agents/` are listed
- Each file shows exactly one replacement: `mode: subagent` added after `description:`
- No files outside `gsd-opencode/agents/` are affected
- No duplicate `mode:` lines are created (if file already has `mode:`, the rule still applies — see warnings below)

---

## Step 3: Apply the Changes

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/add-agent-mode.json --apply
```

---

## Step 4: Verify

Run again in dry-run mode to confirm no changes remain:

```bash
node assets/bin/gsd-translate-in-place.js assets/configs/add-agent-mode.json
```

**Expected output:** 0 changes remaining (all agent files now have `mode: subagent`).

Manually verify a few files:

```bash
head -5 gsd-opencode/agents/gsd-planner.md
head -5 gsd-opencode/agents/gsd-executor.md
```

Each should show:

```yaml
---
name: gsd-<agent-name>
mode: subagent
description: <description text>
```

---

## Warnings and Edge Cases

### Agent Files Already Have `mode:` Field

If an agent file **already contains** `mode: subagent` (or any `mode:` field), this rule will add a **duplicate line**. 

**Before applying**, check for existing `mode:` fields:

```bash
grep -n "^mode:" gsd-opencode/agents/*.md
```

If any files are returned, you have two options:

**Option A: Exclude those files from the rule**

Update the config to exclude files that already have `mode:`:

```json
{
  "exclude": [
    "node_modules/**",
    ".git/**",
    ".translate-backups/**",
    "assets/**",
    "gsd-opencode/agents/gsd-planner.md",
    "gsd-opencode/agents/gsd-executor.md"
  ]
}
```

**Option B: Use a more sophisticated rule**

Replace the rule with one that checks for absence of `mode:` in the frontmatter:

```json
{
  "rules": [
    {
      "pattern": "(^---\\r?\\nname: .+\\r?\\n)(?!.*mode:)(description: .+\\r?\\n)",
      "replacement": "$1$3mode: subagent\\r\\n",
      "description": "Add 'mode: subagent' after description only if not already present",
      "isRegex": true,
      "multiline": true
    }
  ]
}
```

**Note:** The `multiline` flag may not be supported by the translate script. Test first.

### Original Submodule Agent Files

The `original/get-shit-done/agents/` directory also contains agent files. This step **does not touch** those files — they remain unchanged. Only `gsd-opencode/agents/` is modified.

---

## Integration with M-COPY-AND-TRANSLATE.md

Insert this step into the migration workflow as follows:

### Modified Step Sequence

```
Step 1: Copy Files from Submodule         (unchanged)
Step 2: Translate Claude Code Artifacts   (unchanged)
Step 2B: Add Agents Mode                  (NEW - this document)
Step 3: Validate Forbidden Strings        (unchanged)
```

### Updated Final Validation

After completing Step 2B, proceed to Step 3:

```bash
node assets/bin/check-forbidden-strings.js
```

The forbidden strings check now validates that:
- All Claude Code artifacts are translated
- All agent files have proper `mode: subagent` declarations
- No forbidden patterns remain

---

## Final Report Template

When complete, produce this summary:

```markdown
## Add Agents Mode Report

**Date**: YYYY-MM-DD

### Config Created
- File: assets/configs/add-agent-mode.json
- Rule: Add 'mode: subagent' after description line

### Files Modified
- Total agent files processed: N
- Files with mode added: N
- Files skipped (already had mode): N

### Verification
- Dry-run after apply: PASSED (0 changes remaining)
- Manual spot-check: PASSED

### Next Step
Proceed to Step 3: Validate (check-forbidden-strings.js)
```

---

## Error Recovery

If the rule produces incorrect output:

| Problem | Recovery |
|---------|----------|
| Duplicate `mode:` lines | Restore from `.translate-backups/` and use Option A or B above |
| Wrong file modified | Restore from `.translate-backups/` and refine `include` patterns |
| Need to start over | `git checkout -- gsd-opencode/agents/` to reset all changes |

---

## Constraints

- **Scope is** `gsd-opencode/agents/*.md` only — never modify files in `original/`, `assets/`, or other directories
- **Always preview** before applying (`--show-diff`)
- **Always verify** after applying (re-run in dry-run mode)
- **Config file goes in** `assets/configs/` (not `assets/config/`)
- **Check for existing `mode:` fields** before applying to avoid duplicates
