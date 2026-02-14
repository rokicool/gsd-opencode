# Phase 1: Core CLI & Installation - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can install GSD-OpenCode and view installation status. Includes: CLI entry point with subcommand routing, install command with global/local scope, list command for installation status, error handling and UX foundation.

</domain>

<decisions>
## Implementation Decisions

### Interactive Behavior
- Interactive prompts show options with default pre-selected (Global highlighted as default)
- Ctrl+C during install cleanly aborts with no side effects — no files created or modified
- If partial/broken installation detected, prompt user: "Repair existing or fresh install?"
- `list` command when nothing installed shows informational message (exit code 0) with install hint

### Error Presentation
- Professional and direct tone for error messages (not overly casual)
- All errors include actionable suggestions for next steps
- Path traversal security errors: clear but not alarming message (e.g., "Path traversal detected. Use absolute or relative paths within allowed directories.")
- `--verbose` mode shows both detailed operation logs AND full stack traces on errors

### Progress Indication
- Progress bar showing percentage during file operations: `[██████░░░░] 60%`
- Show specific filename being processed: "Copying: agents/ro-commit/SKILL.md"
- Atomic operations (temp-then-move) collapsed into single step — don't expose internal mechanics
- Successful completion shows detailed summary: "Installed 12 files (3 directories) to ~/.config/opencode/"

### OpenCode's Discretion
- CLI output styling (colors, emojis, branding details)
- Exact progress bar implementation details
- Specific wording of error messages (within professional tone guideline)
- File copy buffer sizes and performance optimizations

</decisions>

<specifics>
## Specific Ideas

- CLI should feel familiar to developers who use npm, git, or similar tools
- Progress indication should give users confidence that installation is proceeding
- Error messages should feel helpful, not punishing — always suggest what to try next

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-cli-installation*
*Context gathered: 2026-02-09*
