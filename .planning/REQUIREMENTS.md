# Requirements: Model Profiles for gsd-opencode

**Defined:** 2026-01-20
**Core Value:** Flexibility — power users want full control over which models run at each stage

## v1 Requirements

Requirements for model profile management feature.

### Configuration

- [ ] **CONF-01**: User can view current profile and effective model assignments
- [ ] **CONF-02**: Profile selection persists in .planning/config.json across sessions
- [ ] **CONF-03**: Config uses human-readable JSON format
- [ ] **CONF-04**: Invalid profile names are rejected with clear error messages

### Profiles

- [ ] **PROF-01**: Three semantic presets available: quality, balanced, budget
- [ ] **PROF-02**: User can set per-stage model overrides (planning/execution/verification)
- [ ] **PROF-03**: User can edit preset mappings via config file

### Commands

- [ ] **CMD-01**: `/gsd-set-profile <profile>` switches active profile
- [ ] **CMD-02**: `/gsd-settings` provides interactive configuration menu
- [ ] **CMD-03**: Profile changes show confirmation with proposed changes before user confirms

### Agent Integration

- [ ] **AGNT-01**: Profile changes rewrite model: frontmatter in agent files
- [ ] **AGNT-02**: Stage-to-agent mapping covers all 11 GSD agents
- [ ] **AGNT-03**: Missing agent files cause clear error listing what's missing
- [ ] **AGNT-04**: All agents validated before any are modified (batch validation)

### Documentation

- [ ] **DOCS-01**: README explains why frontmatter rewriting is needed (OpenCode limitation)
- [ ] **DOCS-02**: Usage examples for both commands
- [ ] **DOCS-03**: Customization guide for editing presets and overrides
- [ ] **DOCS-04**: Manual testing steps to verify feature works

## v2 Requirements

Deferred to future release.

### Enhanced UX

- **UX-01**: Idempotent rewrites skip unchanged files (reduces git noise)
- **UX-02**: Cost estimation display per profile
- **UX-03**: Model availability checking before applying

### Advanced Configuration

- **ADV-01**: Per-command model overrides (beyond per-stage)
- **ADV-02**: Model aliases for frequently used configurations
- **ADV-03**: Profile inheritance (custom profile extends preset)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-invocation Task model override | OpenCode doesn't support this — tracking #6651 |
| Environment variable overrides | Adds complexity without clear user benefit |
| Remote profile sync | Out of scope for local tool |
| opencode.json as primary mechanism | Workaround explicitly uses agent file rewriting |
| Per-agent (vs per-stage) overrides | Stage abstraction is sufficient; per-agent adds complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONF-01 | Phase 6: Settings Command | Pending |
| CONF-02 | Phase 1: Config Foundation | Pending |
| CONF-03 | Phase 1: Config Foundation | Pending |
| CONF-04 | Phase 1: Config Foundation | Pending |
| PROF-01 | Phase 2: Profile Definitions | Pending |
| PROF-02 | Phase 5: Frontmatter Rewriting | Pending |
| PROF-03 | Phase 2: Profile Definitions | Pending |
| CMD-01 | Phase 3: Set-Profile Command | Pending |
| CMD-02 | Phase 6: Settings Command | Pending |
| CMD-03 | Phase 3: Set-Profile Command | Pending |
| AGNT-01 | Phase 5: Frontmatter Rewriting | Pending |
| AGNT-02 | Phase 4: Agent Discovery | Pending |
| AGNT-03 | Phase 4: Agent Discovery | Pending |
| AGNT-04 | Phase 4: Agent Discovery | Pending |
| DOCS-01 | Phase 7: Documentation | Pending |
| DOCS-02 | Phase 7: Documentation | Pending |
| DOCS-03 | Phase 7: Documentation | Pending |
| DOCS-04 | Phase 7: Documentation | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18 ✓
- Unmapped: 0

---
*Requirements defined: 2026-01-20*
*Last updated: 2026-01-20 after initial definition*
