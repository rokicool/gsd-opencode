# Phase 5: Frontmatter Rewriting - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply profile model selections to agent files by rewriting YAML frontmatter. When a user switches profiles, the `model:` key in each agent file is updated to reflect the profile's per-stage model mappings. This is the mechanism that makes profile changes take effect.

</domain>

<decisions>
## Implementation Decisions

### Model key insertion
- **Always insert model key** — if an agent file has no `model:` key, INSERT one with the profile's model value
- Don't leave agents without model keys after a profile is applied
- This ensures consistent, explicit model assignments across all agents

### Backup and rollback
- **Git is the backup** — no separate .bak files or explicit backup mechanism
- Users can `git checkout` to revert if needed
- Assumes codebase is under version control (reasonable for this use case)

### Dry-run behavior
- **Confirmation is enough** — the existing confirmation workflow in `/gsd-set-profile` shows before/after changes
- No separate `--dry-run` flag needed
- User sees proposed changes before confirming

### Write failure recovery
- **Fail fast + report** — if a file write fails partway through, stop immediately
- Report which agents succeeded and which failed
- User can retry or manually fix
- No automatic rollback attempt (git provides recovery path)

### OpenCode's Discretion
- Key ordering when inserting model key (at top of frontmatter, after name, etc.)
- Exact format of success/failure output messages
- Whether to preserve original frontmatter formatting or normalize it
- File writing strategy (in-place vs temp file + rename)

</decisions>

<specifics>
## Specific Ideas

- Rewriting builds on Phase 4's `validateAllAgents()` which provides pre-parsed frontmatter and bodyStart position
- The agents.md library already handles parsing and validation — this phase is purely about the WRITE operation
- Idempotency: running the same profile twice should produce identical results (success criteria from ROADMAP)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-frontmatter-rewriting*
*Context gathered: 2026-01-21*
