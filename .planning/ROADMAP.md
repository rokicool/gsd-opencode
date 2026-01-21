# Roadmap: Model Profiles for gsd-opencode

## Overview

This roadmap delivers model profile management for gsd-opencode, enabling per-stage model selection (planning/execution/verification) through agent frontmatter rewriting. The journey progresses from config foundation through command implementation to agent integration, culminating in documentation that explains the workaround and usage patterns.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Config Foundation** - Establish config schema with persistence and validation
- [x] **Phase 2: Profile Definitions** - Define preset profiles and editable mappings
- [x] **Phase 3: Set-Profile Command** - Implement `/gsd-set-profile` for quick switching
- [x] **Phase 4: Agent Discovery** - Validate agent files and stage mappings
- [ ] **Phase 5: Frontmatter Rewriting** - Apply profile changes to agent files
- [ ] **Phase 6: Settings Command** - Implement `/gsd-settings` for interactive configuration
- [ ] **Phase 7: Documentation** - Document workaround, usage, and customization

## Phase Details

### Phase 1: Config Foundation
**Goal**: Config system exists with JSON persistence, validation, and clear error handling
**Depends on**: Nothing (first phase)
**Requirements**: CONF-02, CONF-03, CONF-04
**Success Criteria** (what must be TRUE):
  1. Config changes persist to `.planning/config.json` and survive session restarts
  2. Config file is human-readable JSON that can be manually edited
  3. Invalid profile names produce clear error messages explaining valid options
**Plans**: 2 plans

Plans:
- [x] 01-01: Create config helper module with persistence, validation, and error handling
- [x] 01-02: Seed config.json with profiles schema (gap closure)

### Phase 2: Profile Definitions
**Goal**: Three semantic presets exist with editable model-to-stage mappings
**Depends on**: Phase 1
**Requirements**: PROF-01, PROF-03
**Success Criteria** (what must be TRUE):
  1. Three presets available: quality, balanced, budget
  2. Each preset maps to specific models for planning/execution/verification stages
  3. User can edit preset definitions by modifying config file
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Define presets in config.md and seed config.json with editable mappings
- [x] 02-02-PLAN.md — Gap closure: document config key preservation + close Phase 2 UAT mismatch

### Phase 3: Set-Profile Command
**Goal**: Users can quickly switch profiles with confirmation workflow
**Depends on**: Phase 2
**Requirements**: CMD-01, CMD-03
**Success Criteria** (what must be TRUE):
  1. `/gsd-set-profile quality` (or balanced/budget) switches active profile
  2. Profile change shows proposed changes before user confirms
  3. Confirmation displays which models will be assigned to which stages
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Create set-profile command with confirmation workflow and edge cases
- [x] 03-02-PLAN.md — Gap closure: add positional argument support

### Phase 4: Agent Discovery
**Goal**: System knows all 11 agents, their stage mappings, and validates before modification
**Depends on**: Phase 3
**Requirements**: AGNT-02, AGNT-03, AGNT-04
**Success Criteria** (what must be TRUE):
  1. Stage-to-agent mapping covers all 11 GSD agents correctly
  2. Missing agent files produce clear error listing what's missing
  3. All agents are validated before any are modified (batch validation)
  4. Validation catches malformed frontmatter before attempted modification
**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md — Create agent discovery and validation library (agents.md)

### Phase 5: Frontmatter Rewriting
**Goal**: Profile changes update agent file frontmatter with per-stage overrides
**Depends on**: Phase 4
**Requirements**: AGNT-01, PROF-02
**Success Criteria** (what must be TRUE):
  1. Changing profile rewrites `model:` frontmatter in all agent files
  2. Per-stage overrides apply correct model to each stage's agents
  3. Frontmatter rewriting preserves all other keys and body content
  4. Rewriting is idempotent (safe to run multiple times)
**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — Implement frontmatter rewriting and integrate with gsd-set-profile

### Phase 6: Settings Command
**Goal**: Users can view current settings and interactively manage configuration
**Depends on**: Phase 5
**Requirements**: CMD-02, CONF-01
**Success Criteria** (what must be TRUE):
  1. `/gsd-settings` displays current profile and effective model assignments
  2. Interactive menu allows profile selection and override configuration
  3. Current state clearly shows which model runs for each stage
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Documentation
**Goal**: Feature is documented with usage examples and testing steps
**Depends on**: Phase 6
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04
**Success Criteria** (what must be TRUE):
  1. README explains why frontmatter rewriting is needed (OpenCode limitation)
  2. Usage examples show both `/gsd-set-profile` and `/gsd-settings` commands
  3. Customization guide explains editing presets and per-stage overrides
  4. Manual testing steps allow user to verify feature works end-to-end
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Config Foundation | 2/2 | Complete | 2026-01-21 |
| 2. Profile Definitions | 2/2 | Complete | 2026-01-21 |
| 3. Set-Profile Command | 2/2 | Complete | 2026-01-21 |
| 4. Agent Discovery | 1/1 | Complete | 2026-01-21 |
| 5. Frontmatter Rewriting | 1/1 | Complete | 2026-01-21 |
| 6. Settings Command | 0/TBD | Not started | - |
| 7. Documentation | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-20*
*Depth: comprehensive*
*Coverage: 18/18 requirements mapped*
