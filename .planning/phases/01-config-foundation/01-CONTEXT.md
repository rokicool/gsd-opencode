# Phase 1: Config Foundation - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish config system with JSON persistence to `.planning/config.json`, validation, and clear error handling. This extends the existing config.json (which has mode/depth/parallelization) to support profile and model settings.

</domain>

<decisions>
## Implementation Decisions

### Config file structure
- OpenCode decides internal structure (nested vs flat)
- Minimal storage — only overrides, code has built-in defaults
- Lenient parsing — warn on unknown keys but continue
- Auto-heal — silently restore missing required keys to defaults

### Validation behavior
- Profile selection is ALWAYS via UI choices (question tool), never freeform text
- Invalid model names: validate against known models, offer interactive fix via choices
- Corrupted JSON: warn and use defaults (don't error out)

### Initialization flow
- Profile config added on first profile command (extends existing config.json)
- First profile command prompts user to choose profile via choices
- If .planning/ doesn't exist: error with "Run /gsd-new-project first"
- Merge behavior — preserve existing config keys, only add/update profile keys

### Manual editing experience
- Pretty-printed JSON (2-space indent)
- Descriptive keys with snake_case: `active_profile`, `planning_stage_model`
- Document in README that JSON doesn't support comments

### OpenCode's Discretion
- Exact nested structure of profile config
- Default values for built-in profiles
- How auto-heal communicates what was restored

</decisions>

<specifics>
## Specific Ideas

- Config should feel consistent with existing config.json keys (mode, depth, parallelization already use snake_case-ish naming)
- Original GSD behavior: if .planning/ missing, tell user to run /gsd-new-project — maintain this pattern

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-config-foundation*
*Context gathered: 2026-01-21*
