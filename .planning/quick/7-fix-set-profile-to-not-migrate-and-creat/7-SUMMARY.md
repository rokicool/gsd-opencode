---
phase: quick-7
plan: 7
type: execute
tags: [profile-switching, opencode-json-creation, agent-config-sync]
dependency_graph:
  requires: []
  provides: [opencode-json-creation, profile-driven-agent-config]
  affects: [gsd-oc-lib/oc-config.cjs, gsd-oc-commands/set-profile.cjs]
tech_stack:
  added: []
  patterns: [create-or-update, separation-of-concerns]
key_files:
  created: []
  modified:
    - path: gsd-opencode/get-shit-done/bin/gsd-oc-lib/oc-config.cjs
      changes: [create-opencode-json-if-missing]
    - path: gsd-opencode/get-shit-done/bin/gsd-oc-commands/set-profile.cjs
      changes: [remove-existence-check]
decisions:
  - applyProfileToOpencode creates opencode.json with proper structure when missing
  - set-profile always calls applyProfileToOpencode (no existence check)
  - Maintain separation: applyProfileToOpencode handles file operations, set-profile handles workflow
metrics:
  duration: ~1 min
  tasks_completed: 2
  files_modified: 2
  commits: 2
---

# Phase quick-7 Plan 7: Fix set-profile to create opencode.json Summary

**One-liner:** Modified applyProfileToOpencode to create opencode.json with $schema and agent object when missing, and removed existence check from set-profile to always call the function

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update applyProfileToOpencode to create opencode.json if missing | 754528d | oc-config.cjs |
| 2 | Remove opencode.json existence check from set-profile.cjs | b9f5fe9 | set-profile.cjs |

## Changes Made

### oc-config.cjs (modified)

**Changed:**
- Replaced error-return when opencode.json doesn't exist with creation logic
- Creates initial opencode.json structure with `$schema: "https://opencode.ai/config.json"` and empty `agent` object
- Loads and updates existing opencode.json when present
- Ensures agent object exists in both cases (creation and update)

**Lines modified:** ~115-130 (replaced 10 lines with 15 lines)

### set-profile.cjs (modified)

**Changed:**
- Removed `if (fs.existsSync(opencodePath))` conditional check in applyProfileChanges function
- Always call applyProfileToOpencode unconditionally
- Updated comment from "Update opencode.json if exists" to "Update or create opencode.json with profile models"

**Lines modified:** ~234-240 (replaced 7 lines with 5 lines)

## Verification Results

**Task 1 verification:**
```bash
node -e "const code = require('fs').readFileSync('gsd-opencode/get-shit-done/bin/gsd-oc-lib/oc-config.cjs', 'utf8'); const createsFile = code.includes('Create initial opencode.json') && !code.includes('opencode.json not found'); console.log(createsFile ? 'PASS' : 'FAIL')"
# Result: PASS
```

**Task 2 verification:**
```bash
node -e "const code = require('fs').readFileSync('gsd-opencode/get-shit-done/bin/gsd-oc-commands/set-profile.cjs', 'utf8'); console.log(code.includes('applyProfileToOpencode(opencodePath, configPath)') && !code.includes('if (fs.existsSync(opencodePath))') ? 'PASS' : 'FAIL')"
# Result: PASS
```

**Test: Create opencode.json when missing:**
```bash
cd /tmp/test-gsd
echo '{"profiles":{"profile_type":"simple","models":{"planning":"test-model"}}}' > .planning/config.json
rm -f opencode.json
node -e "applyProfileToOpencode(opencodePath, configPath)"
# Result: opencode.json created with $schema and 7 planning agents configured
```

**Test: Update opencode.json when present:**
```bash
cd /tmp/test-gsd
# opencode.json exists from previous test
node -e "applyProfileToOpencode(opencodePath, configPath)"
# Result: opencode.json updated with smart profile (9 agents configured)
```

**Legacy code check:**
```bash
grep -n "LEGACY_PROFILE_MAP|migrationOccurred|oldProfile" set-profile.cjs oc-config.cjs
# Result: No matches - no legacy migration code present
```

## Success Criteria Met

- ✅ set-profile.cjs no longer checks if opencode.json exists before calling applyProfileToOpencode
- ✅ applyProfileToOpencode creates opencode.json when missing
- ✅ applyProfileToOpencode updates opencode.json when present
- ✅ No legacy migration logic reintroduced (LEGACY_PROFILE_MAP, migrationOccurred, oldProfile still absent)
- ✅ Manual test passes: switching profile creates/updates opencode.json correctly

## Deviations from Plan

**None** - Plan executed exactly as written. No bugs found, no missing functionality discovered, no blocking issues encountered.

## Technical Notes

**Create-or-update pattern:** The applyProfileToOpencode function now follows the create-or-update pattern:
1. Check if file exists
2. If not: create with default structure
3. If yes: load and update
4. Apply profile model assignments to agent configurations
5. Write result

This ensures profile switching always produces a valid opencode.json with correct agent model configurations, whether the file existed before or not.

---

*Completed: 2026-03-02T03:08:00Z*
