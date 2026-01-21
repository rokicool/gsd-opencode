# Phase 4: Agent Discovery - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

System knows all 11 agents, their stage mappings, and validates before modification. This phase establishes the agent discovery and validation infrastructure that Phase 5 (Frontmatter Rewriting) will use. No actual frontmatter modification happens in this phase.

</domain>

<decisions>
## Implementation Decisions

### Frontmatter requirements
- **Model key is optional** — agents without a `model:` key are valid (they inherit OpenCode's current model selection)
- **Model key is for overriding** — the key exists to customize/override the default behavior, not as a requirement
- **Validation when model key exists:**
  - Must be a non-empty string (not null, not empty string, correct type)
  - Must exist in the `opencode models` command output (live validation)
  - Invalid values produce errors, not warnings

### Model validation approach
- Use `opencode models` command to get the authoritative list of valid model identifiers
- Validate against live list (no caching)
- Error if model value doesn't exist in the list

### OpenCode's Discretion
- Stage-to-agent mapping structure (how to define which agents belong to planning/execution/verification)
- Validation output format (how errors/success are displayed)
- Error collection strategy (fail-fast vs batch all errors)
- How to handle agents that are missing from expected locations

</decisions>

<specifics>
## Specific Ideas

- The 11 GSD agents are already documented in Phase 2 work (stage-to-agent mapping in config.md)
- `opencode models` returns provider/model format (e.g., `opencode/claude-sonnet-4`, `github-copilot/gpt-5`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-agent-discovery*
*Context gathered: 2026-01-21*
