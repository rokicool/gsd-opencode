---
phase: 05-frontmatter-rewriting
plan: 01
subsystem: tooling
tags: [frontmatter, yaml, profiles, opencode, agents]

# Dependency graph
requires:
  - phase: 04-agent-discovery
    provides: validateAllAgents() AgentInfo parsing and validation
provides:
  - Documented frontmatter rewriting pipeline (serializeFrontmatter → rewriteFrontmatter → applyProfile)
  - gsd-set-profile integration to apply profile changes to agent files after confirmation
affects: [05-frontmatter-rewriting, profile-switching, agent-runtime]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Markdown @-referenceable libraries with fail-fast orchestration pseudocode"]

key-files:
  created: []
  modified:
    - gsd-opencode/get-shit-done/lib/agents.md
    - gsd-opencode/agents/gsd-set-profile.md

key-decisions:
  - "Preserve tools: YAML block verbatim during frontmatter rewriting; avoid full YAML serializer"
  - "Profile application validates all agents first, then fail-fast on first write error while reporting partial success"

patterns-established:
  - "Frontmatter rewriting is done by reconstructing YAML with original key order + verbatim tools block"

# Metrics
duration: 2 min
completed: 2026-01-21
---

# Phase 05 Plan 01: Frontmatter Rewriting Summary

**Documented an idempotent frontmatter-rewrite pipeline that applies per-stage model profiles by rewriting `model:` in all 11 agent files.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T18:30:38Z
- **Completed:** 2026-01-21T18:32:58Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Added `serializeFrontmatter()` + `rewriteFrontmatter()` procedures to define safe, preserving frontmatter rewrites (body + tools block preserved).
- Added `applyProfile()` orchestration procedure to validate first, then rewrite stage agents with idempotent modified/unchanged reporting.
- Integrated `/gsd-set-profile` to call `applyProfile()` after confirmation and to report success/failure with recovery guidance.

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontmatter Rewriting Procedures** - `7cf19e0` (feat)
2. **Task 2: Profile Application Orchestration** - `d3f15b4` (feat)
3. **Task 3: Integrate with gsd-set-profile** - `4962075` (feat)

Additional fix during execution:

- `85b6f8a` (fix) — align gsd-set-profile role text with new behavior

**Plan metadata:** (docs commit created after SUMMARY + STATE updates)

## Files Created/Modified

- `gsd-opencode/get-shit-done/lib/agents.md` - Adds pseudocode for serializing and rewriting frontmatter, plus applyProfile orchestration.
- `gsd-opencode/agents/gsd-set-profile.md` - References agents.md and documents calling applyProfile after user confirmation.

## Decisions Made

1. Preserve the `tools:` block by copying verbatim lines from the original file rather than serializing from an object, to avoid unintended YAML formatting diffs.
2. Treat profile application as validate-first + fail-fast-on-write, returning partial success (`succeeded` + `failed`) for recovery and transparency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated gsd-set-profile role text to match new behavior**

- **Found during:** Post-task verification
- **Issue:** Role text still claimed the command did not rewrite agent frontmatter.
- **Fix:** Updated role description to reflect frontmatter rewriting after confirmation.
- **Files modified:** gsd-opencode/agents/gsd-set-profile.md
- **Verification:** `git diff` confirms role line updated; no other behavior text affected.
- **Committed in:** 85b6f8a

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor documentation alignment; no scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready to implement actual command/runtime logic to perform the rewrite in code (this plan documents the procedures and integration points).

---
*Phase: 05-frontmatter-rewriting*
*Completed: 2026-01-21*
