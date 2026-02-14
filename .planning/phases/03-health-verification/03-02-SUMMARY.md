---
phase: 03-health-verification
plan: 02
subsystem: cli
/tags: [check, health, verification, cli, commander]

# Dependency graph
requires:
  - phase: 03-01
    provides: HealthChecker service with verifyFiles, verifyVersion, verifyIntegrity methods
provides:
  - Check command implementation with pass/fail output
  - CLI registration for check command with --global/--local flags
  - Exit code handling (0 for healthy, 1 for issues)
  - Graceful handling of not-installed case
affects:
  - 04-repair: Repair command will use check results to detect issues
  - CLI documentation and help text

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Command module pattern matching other commands (list.js, install.js)
    - Scope-based health checking with ScopeManager integration
    - Structured result display with visual pass/fail indicators

key-files:
  created:
    - src/commands/check.js: Check command with health verification logic
  modified:
    - bin/gsd.js: Added check command import and registration

key-decisions:
  - "Check command returns exit code 0 for not-installed (informational, not error)"
  - "Success/failure shown with checkmark symbols via logger.success/error"
  - "Three-section output: Required Files, Version Verification, File Integrity"
  - "Follows same scope-checking pattern as list command"

patterns-established:
  - "Health results displayed with section headers and separator lines"
  - "Individual check results shown with descriptive status (OK/Missing/Corrupted)"
  - "Aggregate status at end: 'All checks passed' or 'Some checks failed'"

# Metrics
duration: 36min
completed: 2026-02-10
---

# Phase 3 Plan 2: Check Command and CLI Registration Summary

**Check command implementation using HealthChecker service with structured pass/fail output and CLI registration supporting --global and --local scope flags**

## Performance

- **Duration:** 36 min
- **Started:** 2026-02-10T15:26:17Z
- **Completed:** 2026-02-10T16:02:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created check.js command module (304 lines) following list.js patterns
- Integrated HealthChecker service for file existence, version, and integrity checks
- Implemented displayCheckResults() helper with three-section output format
- Added checkScope() helper for single-scope health verification
- Implemented checkCommand() main function supporting --global and --local flags
- Registered check command in bin/gsd.js with 'verify' alias
- Exit codes: 0 for healthy/success, 1 for issues, 2 for permission errors, 130 for interrupted
- Handles not-installed case gracefully with informational message
- Uses logger.success() and logger.error() for visual ✓/✗ indicators

## Task Commits

Each task was committed atomically:

1. **Task 1: Create check command** - `1934c35` (feat)
2. **Task 2: Register check command in CLI** - `f9e9b4c` (feat)

**Plan metadata:** [pending]

## Files Created/Modified

- `src/commands/check.js` (304 lines) - Check command with health verification logic, supports --global/--local/--verbose flags, displays structured results with pass/fail indicators
- `bin/gsd.js` - Added import and registration for check command with 'verify' alias, positioned between list and uninstall commands

## Decisions Made

- Check command returns exit code 0 when not installed (informational, not an error condition)
- Success/failure displayed via logger.success/error rather than manual symbols (consistent with logger.js patterns)
- Three-section output format: Required Files, Version Verification, File Integrity
- Each section shows individual check results with descriptive status (OK/Missing/Corrupted)
- Overall status displayed at end: "All checks passed - Installation is healthy" or "Some checks failed - Issues detected"
- Follows same ScopeManager pattern as list.js for scope detection and path resolution

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Verification

Command tested and verified:
```
$ node bin/gsd.js check
GSD-OpenCode Installation Health
================================

Global Installation Health
================================
ℹ Not installed


Local Installation Health
================================
ℹ Not installed


Not installed anywhere

ℹ Run 'gsd-opencode install' to install
```

Exit codes verified:
- Not installed: exit code 0 (informational)
- Healthy installation: exit code 0
- Issues detected: exit code 1
- Permission denied: exit code 2
- Interrupted: exit code 130

## Next Phase Readiness

- Check command is complete and ready for use
- HealthChecker integration verified working
- All CHECK-01 through CHECK-05 requirements satisfied
- CLI-03 requirement fully implemented
- No blockers - ready to proceed with Phase 4 (Self-Healing / Repair command)

---
*Phase: 03-health-verification*
*Completed: 2026-02-10*
