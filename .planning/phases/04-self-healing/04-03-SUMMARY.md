---
phase: 04-self-healing
plan: 03
subsystem: cli

# Dependency graph
requires:
  - phase: 04-self-healing
    provides: "BackupManager and RepairService services"
provides:
  - "CLI repair command for automatic installation repair"
  - "Interactive confirmation before destructive operations"
  - "Progress reporting during repair operations"
  - "Post-repair report with success/failure status"
affects:
  - "CLI command documentation"
  - "User-facing documentation"

# Tech tracking
tech-stack:
  added: [ora (for progress spinner)]
  patterns:
    - "Service layer pattern: RepairService handles business logic, CLI handles UI"
    - "Progress callback pattern for decoupled UI updates"
    - "Two-phase repair: detection -> confirmation -> repair -> report"

key-files:
  created:
    - src/commands/repair.js
  modified:
    - bin/gsd.js

key-decisions:
  - "Repair always requires confirmation (no --force flag per phase decisions)"
  - "Progress shown via ora spinner with percentage completion"
  - "Post-repair report shows detailed status per file with checkmarks"
  - "Backup location displayed after repairs for user reference"
  - "Exit codes: 0 success, 1 repair failures, 2 permission, 130 interrupted"

patterns-established:
  - "Repair command workflow: detect -> summarize -> confirm -> repair -> report"
  - "onProgress callback for decoupled progress updates from UI"
  - "displayRepairResults helper for consistent post-repair formatting"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 4 Plan 3: Repair Command Summary

**CLI repair command with interactive confirmation, progress reporting via ora spinner, and detailed post-repair status display grouped by issue category**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T19:41:55Z
- **Completed:** 2026-02-10T19:44:59Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Repair command with issue detection and formatted summary display
- Interactive confirmation before making any changes
- Progress reporting using ora spinner during repairs
- Post-repair report showing success/failure for each file
- Proper error handling for permission errors and interruptions
- CLI registration with --global and --local options

## Task Commits

Each task was committed atomically:

1. **Task 1: Create repair command with detection and summary display** - `cd29a98` (feat)
2. **Task 2: Implement progress reporting and post-repair display** - `42b5a7b` (feat)
3. **Task 3: Register repair command in CLI and handle errors** - `3909bc8` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified

- `src/commands/repair.js` - Main repair command with detection, confirmation, and repair logic
- `bin/gsd.js` - Added import and command registration for repair

## Decisions Made

- Repair always requires confirmation (no --force flag per phase decisions)
- Progress shown via ora spinner with percentage completion
- Post-repair report shows detailed status per file with ✓/✗ checkmarks
- Backup location displayed after repairs for user reference
- Exit codes: 0 success, 1 repair failures, 2 permission, 130 interrupted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 complete (all 3 plans finished)
- Repair command ready for use
- Phase 5 (Lifecycle Management) can begin

---

## Repair Command Workflow

The repair command follows a clear workflow:

1. **Detection**: Uses RepairService.detectIssues() to find problems
   - Missing files (directories or individual files)
   - Corrupted files (failed integrity checks)
   - Path issues (unreplaced @gsd-opencode/ references in .md files)

2. **Summary Display**: Shows formatted summary by category
   - Count and list for each issue type
   - Total issues count
   - Uses ✗ symbol for issues

3. **Confirmation**: Prompts user to proceed
   - Always requires confirmation (no --force flag)
   - Defaults to false (safe choice)
   - Handles Ctrl+C gracefully

4. **Repair**: Performs repairs with progress
   - Phase 1: Missing files (non-destructive)
   - Phase 2: Corrupted files (backup first)
   - Phase 3: Path issues (backup first)
   - Progress shown via ora spinner with percentage

5. **Report**: Displays post-repair results
   - Success/failure for each file
   - Error messages for failed repairs
   - Summary stats (X succeeded, Y failed)
   - Backup location reference

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All repairs succeeded or no issues found |
| 1 | Some repairs failed |
| 2 | Permission denied (EACCES) |
| 130 | User cancelled (Ctrl+C) |

## Integration with RepairService

The repair command integrates with services:

- **ScopeManager**: Determines installation scope and paths
- **BackupManager**: Creates backups before destructive operations
- **FileOperations**: Handles file copying with path replacement
- **RepairService**: Orchestrates detection and repair logic
- **promptConfirmation**: Interactive user confirmation

---
*Phase: 04-self-healing*
*Completed: 2026-02-10*
