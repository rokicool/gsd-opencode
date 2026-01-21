# Phase 3: Set-Profile Command - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement `/gsd-set-profile` command that switches the active profile with user confirmation. This phase updates config only — agent frontmatter rewriting happens in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Command Invocation
- No args: show current profile, then interactive picker
- With flag: `/gsd-set-profile --quality` or `/gsd-set-profile -q`
- Support both long and short flags: `--quality/-q`, `--balanced/-b`, `--budget/-u`
- Both invocation styles supported (picker + flag shorthand)

### Confirmation Workflow
- Show before/after table: stage → old model → new model
- Always require confirmation (no `--yes` skip flag)
- Three options after preview: Confirm / Edit / Cancel
- "Edit" triggers inline prompts to modify models (not external settings command)

### Output Formatting
- Success: show full summary table of what's now active
- Display full model IDs (e.g., `anthropic/claude-sonnet-4-20250514`)
- Config-only for now — no mention of Phase 5 frontmatter rewriting in output

### Edge Cases
- Already-active profile: silent success, show current state
- Invalid profile flag: fuzzy match suggestion ("did you mean --quality?")
- Missing/empty config.json: auto-initialize with profile defaults
- Corrupted JSON: attempt repair, preserve what's valid

### OpenCode's Discretion
- Table styling (standard vs boxed vs other)
- Exact fuzzy matching algorithm
- Inline edit prompt flow details
- Repair strategy for corrupted config

</decisions>

<specifics>
## Specific Ideas

- Flag style uses `--profile` convention (not positional args)
- Short flags: `-q` (quality), `-b` (balanced), `-u` (budget) — note `-u` not `-b` to avoid conflict

</specifics>

<deferred>
## Deferred Ideas

- Decision update: auto-initialize config with profile defaults if missing (previously required `/gsd-new-project`) — this affects Phase 1/2 config helper behavior

</deferred>

---

*Phase: 03-set-profile-command*
*Context gathered: 2026-01-21*
