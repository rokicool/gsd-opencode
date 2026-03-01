---
phase: quick-5
plan: 01
subsystem: workflows
tags: [validation, workflow, profile, model-config]
dependency_graph:
  requires: []
  provides: [gsd-oc-check-profile workflow]
  affects: [gsd-oc-tools.cjs]
tech_stack:
  added: []
  patterns: [workflow validation, dual-config checking]
key_files:
  created:
    - gsd-opencode/get-shit-done/workflows/gsd-oc-check-profile.md
  modified: []
decisions: []
metrics:
  started_at: "2026-03-01T04:00:00Z"
  completed_at: "2026-03-01T04:10:00Z"
  duration_minutes: 10
  tasks_completed: 1
  files_created: 1
---

# Phase quick-5 Plan 01: Create Profile Validation Workflow Summary

Quick validation workflow created to check both opencode.json and .planning/config.json for profile/model configuration issues.

## One-liner

Profile validation workflow with dual-config checking and /gsd-set-profile remediation

## What Was Built

Created `gsd-opencode/get-shit-done/workflows/gsd-oc-check-profile.md` — a workflow that:

1. **Checks opencode.json** — Validates all agent model IDs against the opencode models catalog
2. **Checks .planning/config.json** — Validates profile configuration and profile model IDs
3. **Fast success path** — Brief confirmation when both checks pass
4. **Detailed error reporting** — Structured output showing what's wrong and how to fix
5. **Remediation guidance** — Clear /gsd-set-profile recommendation when issues found

## Workflow Structure

### Steps

1. **check_opencode_json** — Run `node gsd-oc-tools.cjs check-opencode-json`, parse JSON output
2. **check_config_json** — Run `node gsd-oc-tools.cjs check-config-json`, parse JSON output
3. **evaluate_results** — Check exit codes from both commands
4. **display_success** — Show "✓ Profile configuration valid" when both pass
5. **display_errors** — Show structured error report with remediation steps when either fails
6. **verbose_output** — Optional detailed logging with --verbose flag

### Validation Commands

```bash
# Check opencode.json model IDs
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs check-opencode-json

# Check .planning/config.json profile configuration
node gsd-opencode/get-shit-done/bin/gsd-oc-tools.cjs check-config-json
```

## Example Output Formats

### Success (both checks pass)

```
✓ Profile configuration valid

  opencode.json:        ✓ All model IDs valid
  .planning/config.json: ✓ Profile configuration valid

All GSD agents are properly configured.
```

### Failure (issues found)

```
✗ Profile configuration issues found

=== opencode.json ===
✗ 7 invalid model ID(s) found:

  Agent: agent.gsd-planner
  Current: ai-coding-plan/qwen3.5-plus
  Issue: Model ID not found in opencode models catalog

=== .planning/config.json ===
✗ 1 invalid profile configuration(s) found:

  Field: profiles.models.planning
  Current: ai-coding-plan/qwen3.5-plus
  Issue: Model ID not found in opencode models catalog

=== How to Fix ===

1. Review the issues above
2. Run /gsd-set-profile <profile> to apply a valid profile
   Available profiles: simple, smart, genius
3. Or manually edit opencode.json / .planning/config.json

Example:
  /gsd-set-profile smart
```

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| gsd-opencode/get-shit-done/workflows/gsd-oc-check-profile.md | Validation workflow | 132 |

## Verification

- [x] Workflow file exists at correct path
- [x] Workflow uses gsd-oc-tools.cjs commands
- [x] Workflow checks both config files
- [x] Workflow provides clear recommendations
- [x] Workflow follows set-profile.md pattern (simple, step-based)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] Workflow file created: gsd-opencode/get-shit-done/workflows/gsd-oc-check-profile.md
- [x] Commit created: c736845

---

*Created: 2026-03-01*  
*Duration: ~10 minutes*  
*Task type: quick*
