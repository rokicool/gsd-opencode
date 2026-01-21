---
phase: 04-agent-discovery
plan: 01
subsystem: lib
tags: [agents, validation, frontmatter, yaml, discovery]

requires:
  - phase: 02-preset-definitions
    provides: Stage-to-agent mapping in config.md
provides:
  - Agent discovery library (agents.md)
  - Path resolution for all 11 GSD agents
  - Frontmatter parsing and validation
  - Model key validation against opencode models
  - Batch validation orchestration for Phase 5
affects: [05-frontmatter-rewriting]

tech-stack:
  added: []
  patterns:
    - "Batch validation pattern (collect all errors before failing)"
    - "Library @-reference pattern (consistent with config.md)"

key-files:
  created:
    - gsd-opencode/get-shit-done/lib/agents.md
  modified: []

key-decisions:
  - "Model key is optional — agents without model: key inherit OpenCode's current model"
  - "Batch error collection instead of fail-fast for better UX"
  - "validateAllAgents() returns either complete AgentInfo[] or all ValidationError[]"

patterns-established:
  - "AgentInfo type: { name, path, frontmatter, bodyStart }"
  - "ValidationError type: { agent, path, errors[] }"

duration: 3 min
completed: 2026-01-21
---

# Phase 4 Plan 1: Agent Discovery Summary

**Agent discovery library with batch validation, frontmatter parsing, and model validation against live opencode models output**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T16:28:37Z
- **Completed:** 2026-01-21T16:31:30Z
- **Tasks:** 3
- **Files created:** 1

## Accomplishments

- Created agents.md library following config.md @-reference pattern
- Defined ALL_GSD_AGENTS constant with exactly 11 agents (excludes gsd-set-profile)
- Implemented batch validation that collects all errors before reporting
- Added model validation against live `opencode models` command output
- Documented Phase 5 consumption pattern with usage examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent Resolution and Existence Validation** - `4257c2d` (feat)
2. **Task 2: Frontmatter Parsing and Model Validation** - `ce6fa2a` (feat)
3. **Task 3: Batch Validation Orchestration** - `2faa747` (feat)

## Files Created/Modified

- `gsd-opencode/get-shit-done/lib/agents.md` - Agent discovery and validation library with 7 procedures

## Decisions Made

1. **Model key is optional** — Agents without a `model:` key are valid and inherit OpenCode's current model selection. The key exists for overriding, not as a requirement.

2. **Batch error collection** — All validation procedures collect errors rather than failing fast, so users see complete error lists.

3. **Type structures** — Defined AgentInfo (success) and ValidationError (failure) types for validateAllAgents() return value.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Agent discovery library complete and ready for Phase 5 consumption
- validateAllAgents() provides pre-validated agent info or comprehensive error list
- All 11 agents defined in ALL_GSD_AGENTS constant
- Frontmatter parsing handles YAML extraction and validation
- No blockers for Phase 5 (Frontmatter Rewriting)

---
*Phase: 04-agent-discovery*
*Completed: 2026-01-21*
