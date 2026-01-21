# Phase 2: Profile Definitions - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Three semantic presets exist with editable model-to-stage mappings. Users can switch between quality/balanced/budget profiles, each mapping specific models to planning/execution/verification stages. Users can edit preset definitions by modifying config.

</domain>

<decisions>
## Implementation Decisions

### Model assignments
- Different models per stage within each preset (not same model across all stages)
- Model assignments already defined in PROJECT.md — use those as source of truth:
  - quality: glm-4.7-free (all stages)
  - balanced: glm-4.7-free (planning/verification), minimax-m2.1-free (execution)
  - budget: minimax-m2.1-free (planning/verification), grok-code (execution)
- Agent-to-stage mapping defined in PROJECT.md (11 agents across 3 stages)

### Preset naming & semantics
- Names: quality, balanced, budget — keep as-is
- Semantics: cost-focused (quality = spends more for better results, budget = minimizes cost)
- No user-visible descriptions — name alone is sufficient

### Editability boundaries
- Three presets only — no custom preset creation
- All three presets are editable (user can change model assignments)
- Editing available via: direct JSON editing OR /gsd-settings command (Phase 6)
- No separate "override" concept — users edit the preset's stage mappings directly

### Default behavior
- Default preset selected during /gsd-new-project onboarding (not hardcoded)
- If model unavailable: error and block (no silent fallbacks)
- Presets persist globally with per-project override capability
- Global storage location: TBD by researcher (examine ~/.config/opencode/get-shit-done structure)

### OpenCode's Discretion
- Exact JSON schema structure for preset storage
- How global/project preset merging works
- Validation approach for model names

</decisions>

<specifics>
## Specific Ideas

- During /gsd-new-project, the user picks quality/balanced/budget — presets must exist for this flow
- Power users can hand-edit JSON, but /gsd-settings (Phase 6) provides guided editing
- Researcher should examine ~/.config/opencode/get-shit-done to determine global preset location

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-profile-definitions*
*Context gathered: 2026-01-21*
