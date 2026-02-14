# Phase 4: Self-Healing - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI command to automatically repair broken installations. Detects and fixes missing files, corrupted files, and broken path references. Requires Phase 3's check command for detection. Users see what will be repaired before changes are made.

</domain>

<decisions>
## Implementation Decisions

### Repair scope and confirmation
- Confirm for destructive changes only — auto-fix missing files, but require confirmation before overwriting corrupted files
- No --force flag — repair should always show confirmation (destructive enough to require user awareness)
- No --dry-run flag — use the existing check command to preview issues
- All-or-nothing repairs — show summary and fix everything or nothing (no individual fix selection)

### Output format and progress
- Pre-repair summary grouped by issue type: "Missing Files", "Corrupted Files", "Path Issues" with counts and file lists
- Show overall progress only during repairs (e.g., "Repairing 3 of 12 files...") not per-file updates
- Detailed post-repair report listing all repaired files with success/failure status and total counts
- Repair failures grouped at the end, not inline

### Partial failure handling
- Continue with remaining repairs if one fails — attempt to fix everything, report failures at the end
- Return non-zero exit code when any repairs fail (consistent with check command behavior)
- No retry prompt — just report failures and let user decide to re-run command
- Keep successful repairs — partial fix is better than no fix, don't undo good work

### Safety and backup strategy
- Create backup folder maintaining original folder structure
- Move overwritten files to backup folder with date prefix (e.g., `2026-02-10_SKILL.md`)
- Keep last N backups (retain some history for safety)
- No built-in restore command — user can manually copy from backup if needed
- Surgical path replacement — only replace `@gsd-opencode/` references, leave other content untouched

### OpenCode's Discretion
- Exact backup retention count (N value)
- Specific date format for backup file prefixes
- Progress indicator implementation details
- Exact error message wording and formatting
- Exit code values for different failure scenarios

</decisions>

<specifics>
## Specific Ideas

- Backup approach: folder structure mirroring installation with date-prefixed files
- Path replacement must be surgical to preserve any custom edits users made to .md files
- Consistency with existing commands: follow check command's exit code pattern and uninstall's confirmation flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-self-healing*
*Context gathered: 2026-02-10*
