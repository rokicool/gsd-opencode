---
phase: 06-settings-command
plan: 03
subsystem: infra
tags: [installer, markdown, paths, opencode]

# Dependency graph
requires:
  - phase: 06-settings-command
    provides: /gsd-settings and /gsd-set-profile commands with agent frontmatter rewriting
provides:
  - Install-time rewriting of repo-local prompt references (@gsd-opencode/* and gsd-opencode/*)
  - Post-install diagnostic warning when unresolved repo-local tokens remain
affects: [installation, commands, prompts, uat]

# Tech tracking
tech-stack:
  added: [node]
  patterns: ["Install-time prompt content rewriting for portability across repos"]

key-files:
  created: []
  modified: [gsd-opencode/bin/install.js]

key-decisions:
  - "Rewriting is restricted to .md files only, leaving JS/JSON untouched to avoid unintended mutations"
  - "Sanity check warns (non-fatal) instead of failing install to keep installs usable while surfacing regressions"

patterns-established:
  - "Safe rewrite ordering: handle @gsd-opencode/ before plain gsd-opencode/ to prevent double-rewrites"

# Metrics
duration: 3 min
completed: 2026-01-22
---

# Phase 6 Plan 3: Settings Command Summary

**Installer now rewrites repo-local prompt references into install-relative paths, preventing ENOENT crashes when running /gsd-settings in other repos.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T02:27:00Z
- **Completed:** 2026-01-22T02:30:34Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Rewrote `@gsd-opencode/...` and `gsd-opencode/...` tokens during install so installed prompts are portable.
- Preserved legacy `~/.claude/` and `./.claude/` rewrites for backwards compatibility.
- Added a post-install sanity scan (md-only) that warns loudly if repo-local tokens slip through again.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite repo-local @-references during install** - `0038010` (fix)
2. **Task 2: Add post-install sanity check for unresolved path tokens** - `55356e1` (chore)

## Files Created/Modified
- `gsd-opencode/bin/install.js` - Install-time markdown rewrite rules + post-install token scan.

## Decisions Made
- Rewriting is performed only for `.md` files to avoid mutating executable code/config.
- The post-install token scan prints warnings (no non-zero exit) so installs remain usable while still surfacing regressions immediately.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Node.js runtime to run installer verification**

- **Found during:** Task 1 (verification in a fresh repo)
- **Issue:** `node` was not present in the execution environment, so the plan’s verification command could not run.
- **Fix:** Installed Node via Homebrew (`brew install node`).
- **Files modified:** None (environment-only)
- **Verification:** `node -v` succeeded and installer verification steps ran.
- **Committed in:** Not committed (no repo changes).

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to run the plan’s required verification; no product scope change.

## Issues Encountered
- Local verification initially failed due to missing Node.js runtime; resolved by installing Node.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 06 UAT blocker “ENOENT scandir .../gsd-opencode/get-shit-done/lib” should be non-reproducible after reinstall in a non-gsd-opencode repo.
- Ready for Phase 7 (Documentation).

---
*Phase: 06-settings-command*
*Completed: 2026-01-22*
