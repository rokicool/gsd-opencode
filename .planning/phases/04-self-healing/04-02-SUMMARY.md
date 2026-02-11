---
phase: 04-self-healing
plan: 02
subsystem: repair
tags: [repair, health-check, backup, file-operations, service-layer]

# Dependency graph
requires:
  - phase: 04-01
    provides: BackupManager for safe backups during repairs
provides:
  - RepairService class for issue detection and repair
  - Two-phase repair strategy (non-destructive then destructive)
  - Progress callback system for CLI feedback
  - Issue categorization (missing, corrupted, path issues)
affects:
  - 04-03
  - repair-command

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Constructor injection for dependencies
    - Two-phase repair strategy with backup safety
    - Progress callback pattern for long operations
    - Continue-on-error for partial failure handling

key-files:
  created:
    - src/services/repair-service.js
  modified: []

key-decisions:
  - Auto-fix missing files without confirmation (non-destructive)
  - Require backup before overwriting corrupted files (destructive)
  - Continue repairs even if individual operations fail
  - Return structured results with per-file success/failure status

patterns-established:
  - "Two-phase repair: Phase 1 fixes missing files, Phase 2 fixes corrupted/path issues with backups"
  - "Progress callbacks: onProgress({ current, total, operation, file }) for CLI feedback"
  - "Partial failure handling: Collect all results, return success=false if any failed"

# Metrics
duration: 7min
completed: 2026-02-10
---

# Phase 4 Plan 2: RepairService Implementation

**RepairService with two-phase repair strategy, backup integration, and progress callbacks for safe installation repairs.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-10T19:29:29Z
- **Completed:** 2026-02-10T19:36:07Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Created RepairService class with comprehensive dependency validation
- Implemented detectIssues() using HealthChecker to categorize problems
- Built repair() with two-phase strategy (non-destructive → destructive)
- Integrated BackupManager for safe backups before overwriting files
- Added progress callback system for real-time CLI feedback
- Implemented generateSummary() for human-readable issue reporting
- Added _getSourcePath() for resolving package source files
- Full JSDoc documentation following service layer patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RepairService class and detectIssues()** - `8bbbfdd` (feat)
2. **Task 2: Implement repair() with backup and progress** - `6e7647f` (feat)
3. **Task 3: Add helper methods** - Included in Task 2 commit

**Plan metadata:** To be committed after summary creation

## Files Created/Modified

- `src/services/repair-service.js` - Complete RepairService class with:
  - Constructor validation for all dependencies
  - detectIssues() - Detect and categorize installation problems
  - repair() - Two-phase repair with backup integration
  - generateSummary() - Human-readable issue summary
  - Progress callbacks for CLI feedback
  - Continue-on-error for partial failure handling

## API Reference

### RepairService

```javascript
const repairService = new RepairService({
  scopeManager,    // ScopeManager instance
  backupManager,   // BackupManager instance
  fileOps,         // FileOperations instance
  logger,          // Logger instance
  expectedVersion  // String for version checks
});
```

### Methods

**detectIssues()** → `{ hasIssues, missingFiles, corruptedFiles, pathIssues, totalIssues }`
- Uses HealthChecker to verify installation
- Categorizes issues by type
- Returns structured issue report

**repair(issues, options)** → `{ success, results, stats }`
- Two-phase repair strategy
- Options: `{ onProgress, onBackup }` callbacks
- Returns detailed results with success/failure per file

**generateSummary(issues)** → `string`
- Formatted output for CLI display
- Groups by category with counts

## Integration Points

### With HealthChecker
- Uses checkAll() for comprehensive health verification
- Parses results to identify missing and corrupted files
- Lazy-loads HealthChecker to avoid circular dependencies

### With BackupManager
- Calls backupFile() before destructive operations
- Receives backupPath in onBackup callback
- Gracefully handles backup failures

### With FileOperations
- Uses _copyFile() for reinstalling files
- Leverages path replacement in .md files
- Handles directory copying for missing directories

## Two-Phase Repair Strategy

**Phase 1: Non-Destructive (Missing Files)**
- No backup needed (files don't exist)
- Auto-repair without confirmation
- Reinstall from package source

**Phase 2: Destructive (Corrupted, Path Issues)**
- Backup first using BackupManager
- Then overwrite/replace
- Track success/failure for each operation

## Progress Callback System

```javascript
onProgress({ current, total, operation, file })
// operation: 'installing' | 'replacing' | 'updating-paths'

onBackup({ file, backupPath })
// Called after successful backup creation
```

## Decisions Made

- **Two-phase repair**: Non-destructive first, then destructive with backup
- **Continue on error**: Don't stop if one repair fails, collect all results
- **Progress callbacks**: Let CLI handle UI, service reports progress
- **Lazy HealthChecker**: Avoid circular dependency issues

## Deviations from Plan

None - plan executed exactly as written.

All planned methods implemented:
- detectIssues() with categorization
- repair() with two-phase strategy
- generateSummary() for CLI output
- _getSourcePath() for source resolution
- _validateRepairResults() for validation

## Issues Encountered

None

## Next Phase Readiness

- RepairService is complete and ready for CLI integration
- Next step: Create repair command that uses RepairService
- Can integrate with existing check command for issue detection preview

---
*Phase: 04-self-healing*
*Completed: 2026-02-10*
