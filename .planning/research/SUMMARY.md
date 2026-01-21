# Project Research Summary

**Project:** Model Profile Management for gsd-opencode
**Domain:** Developer tool configuration / command-driven model selection
**Researched:** 2026-01-20
**Confidence:** HIGH

## Executive Summary

This feature adds model profile management to gsd-opencode via two new commands: `/gsd-settings` (interactive configuration) and `/gsd-set-profile <profile>` (quick switch). The key technical challenge is surgically updating YAML frontmatter in agent files without corrupting markdown content, while maintaining a clean JSON-based config schema. **This is a net-new feature for OpenCode** — the original Claude Code GSD does not have equivalent functionality.

The recommended approach is straightforward: use `sed` for frontmatter extraction, OpenCode's `edit` tool for surgical YAML modifications, and full-file `write` for JSON config updates. No external YAML libraries are needed since gsd-opencode is purely prompt-driven. Three preset profiles (quality/balanced/budget) with per-stage model overrides (planning/execution/verification) provide the right abstraction layer — intuitive for users while flexible enough for customization.

The primary risks are YAML corruption (line wrapping, special characters) and partial failure across 11 agent files. Both are mitigated by validation-before-write patterns and idempotent operations. The feature is well-scoped: 6-8 hours for MVP, with clear boundaries on what NOT to build (per-command overrides, env vars, cloud sync).

## Key Findings

### Recommended Stack

No new dependencies needed — this feature uses OpenCode's built-in tools exclusively.

**Core approaches:**
- **YAML frontmatter reading:** `sed -n '/^---$/,/^---$/p'` — proven pattern from multiple production repos
- **Frontmatter modification:** OpenCode `edit` tool with exact string matching — surgical, safe, debuggable
- **Config management:** JSON read → mental parse → merge → `write` — matches existing gsd-new-project pattern
- **Interactive prompts:** OpenCode `question` tool — already used in gsd-new-project for mode selection

**Critical version note:** No runtime dependencies means no version concerns. The constraint is OpenCode's tool behavior, which is stable.

### Expected Features

**Must have (table stakes):**
- TS-01: View current settings (display active profile + model assignments)
- TS-02: Quick profile switch via `/gsd-set-profile <name>`
- TS-03: Profile validation with clear errors
- TS-04: Persistence across sessions (config.json)
- TS-05: Human-readable config format
- TS-06: Profile display names with model mappings

**Should have (differentiators):**
- DIFF-01: Semantic preset profiles (quality/balanced/budget)
- DIFF-02: Per-stage model overrides (planning/execution/verification)
- DIFF-05: Agent frontmatter rewriting (single source of truth)

**Defer (v2+):**
- DIFF-03: Interactive profile editor (TUI)
- DIFF-04: Editable preset mappings (power users)
- DIFF-06: Preview/dry-run
- DIFF-07: Cost estimation display

**Explicitly NOT building (anti-features):**
- Per-command `--model` flags
- Environment variable overrides
- Model aliases beyond presets
- Per-agent (vs per-stage) overrides
- Remote profile sync

### Architecture Approach

*Note: ARCHITECTURE.md was not available. Architecture inferred from STACK.md and FEATURES.md.*

Based on research, the architecture follows existing gsd-opencode command patterns:

**Major components:**
1. **Config Schema** — Extended `.planning/config.json` with `model_profile` key and optional `model_profiles` object
2. **`/gsd-set-profile` command** — Thin wrapper: validate profile → update config → apply to agents
3. **`/gsd-settings` command** — Interactive wrapper: display current → prompt for changes → delegate to set-profile logic
4. **Agent Frontmatter Updater** — Core logic: read agent files → extract/modify model key → write back

**Stage-to-agent mapping (from STACK.md):**
| Stage | Agents |
|-------|--------|
| Planning | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

### Critical Pitfalls

1. **Line Width Wrapping Corrupts Values** — Always use `lineWidth: -1` when stringifying YAML. Default 80-char wrapping silently breaks long values. (HIGH severity)

2. **YAML Special Characters in Model Names** — Values like `opencode/glm-4.7-free` could cause issues. Let parser auto-quote, validate after parse. (HIGH severity)

3. **Partial Failure Without Rollback** — Updating 6 of 11 agents then failing leaves inconsistent state. Use batch-validate-then-apply pattern. (MODERATE severity)

4. **Config Overwrite vs Merge** — Shallow object spread clobbers existing settings. Implement deep merge for nested objects. (MODERATE severity)

5. **Non-Idempotent Writes** — Compare content before writing; skip unchanged files to avoid noisy git diffs. (MINOR severity)

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Config Schema & Core Logic
**Rationale:** Foundation before commands — config schema must exist before commands can read/write it
**Delivers:** Extended config.json schema, profile validation function, model-to-stage mapping
**Addresses:** TS-03 (validation), TS-04 (persistence), TS-05 (config format), DIFF-01 (presets)
**Avoids:** Pitfall 5 (deep merge pattern established here)
**Estimated effort:** 2-3 hours

### Phase 2: `/gsd-set-profile` Command
**Rationale:** Quick switch is the core use case; must work before interactive command
**Delivers:** Working `/gsd-set-profile quality|balanced|budget` command
**Addresses:** TS-02 (quick switch), TS-06 (display names)
**Avoids:** Pitfall 4 (config merge), Pitfall 11 (idempotency)
**Estimated effort:** 2 hours

### Phase 3: Agent Frontmatter Rewriting
**Rationale:** Profiles are useless if agents don't reflect them; this connects config to behavior
**Delivers:** Automatic agent model: key updates when profile changes
**Addresses:** DIFF-05 (frontmatter rewriting), DIFF-02 (per-stage overrides)
**Avoids:** Pitfalls 1-3 (YAML corruption), Pitfall 6 (missing file detection), Pitfall 12 (partial failure)
**Estimated effort:** 3-4 hours
**Flag:** Most complex phase — needs careful testing

### Phase 4: `/gsd-settings` Command
**Rationale:** Interactive command builds on working set-profile; adds discoverability
**Delivers:** `/gsd-settings` with current state display and profile selection UI
**Addresses:** TS-01 (view current), DIFF-03 (interactive editor - basic version)
**Estimated effort:** 2 hours

### Phase Ordering Rationale

- **Config before commands:** Commands need the schema to exist
- **set-profile before settings:** Interactive command delegates to quick switch logic
- **Frontmatter before settings:** User should see profile changes take effect before adding interactive wrapper
- **Batch validation pattern:** Phases 1-3 establish patterns that Phase 4 reuses

### Research Flags

**Phases likely needing no additional research:**
- **Phase 1:** Config schema is well-documented; JSON patterns are standard
- **Phase 2:** Command structure matches existing gsd-opencode patterns exactly
- **Phase 4:** Interactive prompts use established `question` tool pattern

**Phase needing attention during implementation:**
- **Phase 3:** While patterns are documented, edge cases in YAML frontmatter require testing. Recommend: build test suite first, implement second.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Approach verified against GitHub production repos; no external deps |
| Features | MEDIUM-HIGH | Table stakes clear; differentiators well-scoped; anti-features defined |
| Architecture | MEDIUM | Inferred from STACK.md and existing command patterns (no ARCHITECTURE.md) |
| Pitfalls | HIGH | Context7 docs + production codebase analysis; specific prevention strategies |

**Overall confidence:** HIGH

### Gaps to Address

1. **Missing ARCHITECTURE.md:** Architecture was inferred from other research. The phase structure above should be validated against actual command patterns.

2. **Agent frontmatter verification:** Need to confirm exact `model:` key format in actual agent files during implementation.

3. **Default profile decision:** Research recommends "balanced" as default; confirm with user.

4. **Testing strategy:** PITFALLS.md includes testing checklist but no test infrastructure exists for gsd-opencode commands. Consider acceptance testing approach.

## Sources

### Primary (HIGH confidence)
- OpenCode edit tool behavior — verified from existing gsd-opencode commands
- gsd-new-project.md — `question` tool pattern, config.json write pattern
- GitHub: pchalasani/claude-code-tools, qdhenry/Claude-Command-Suite — sed frontmatter pattern
- gray-matter README — frontmatter parsing pitfalls (for context, not for use)
- github/docs codebase — `lineWidth: -1` pattern for YAML safety

### Secondary (MEDIUM confidence)
- Claude Code official docs — settings and model configuration patterns (different implementation)
- npm/git config patterns — CLI config command UX expectations

---
*Research completed: 2026-01-20*
*Ready for roadmap: yes*
*Missing: ARCHITECTURE.md (architecture inferred from other sources)*
