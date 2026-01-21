# Model Profiles for gsd-opencode

## What This Is

Model profile management for gsd-opencode that enables per-stage model selection (planning/execution/verification) through a workaround for OpenCode's lack of per-invocation Task model overrides. When users switch profiles, the system rewrites the `model:` frontmatter in agent definition files to achieve runtime model selection.

## Core Value

Flexibility — power users want full control over which models run at each stage, balancing quality and cost without manual file editing.

## Requirements

### Validated

- ✓ GSD workflow commands exist — existing
- ✓ Agent definition files with YAML frontmatter — existing
- ✓ .planning/config.json for project settings — existing pattern

### Active

- [ ] `/gsd-settings` command for interactive profile management
- [ ] `/gsd-set-profile <profile>` command for quick switching
- [ ] Model profile storage in config.json (model_profile, model_profiles, model_overrides)
- [ ] Agent frontmatter rewriting when profiles change
- [ ] Stage-to-agent mapping (planning/execution/verification)
- [ ] Default profiles using OpenCode Zen free models
- [ ] Per-stage override capability
- [ ] Editable preset mappings
- [ ] Documentation explaining the workaround and usage

### Out of Scope

- Per-invocation Task model override — OpenCode doesn't support this yet (tracking: #6651)
- Global opencode.json as primary mechanism — workaround explicitly uses agent file rewriting
- Claude Code compatibility — this is OpenCode-specific

## Context

**Problem:** Original Claude Code GSD supports `model=` parameter on Task calls for per-agent model selection. OpenCode's Task tool doesn't support this. The only way to control subagent models in OpenCode is via the `model:` key in agent definition frontmatter.

**Workaround:** When users change profiles, rewrite the `model:` frontmatter in `.opencode/agents/gsd-*.md` files. This is idempotent and preserves all other frontmatter keys and body content.

**Upstream tracking:**
- Feature request: https://github.com/anomalyco/opencode/issues/6651#issuecomment-3775560416
- gsd-opencode issue: https://github.com/rokicool/gsd-opencode/issues/44

**Agent-to-stage mapping (11 agents):**

| Stage | Agents |
|-------|--------|
| Planning | gsd-planner, gsd-plan-checker, gsd-phase-researcher, gsd-roadmapper, gsd-project-researcher, gsd-research-synthesizer, gsd-codebase-mapper |
| Execution | gsd-executor, gsd-debugger |
| Verification | gsd-verifier, gsd-integration-checker |

**Default profiles (OpenCode Zen free models):**

| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| quality | opencode/glm-4.7-free | opencode/glm-4.7-free | opencode/glm-4.7-free |
| balanced | opencode/glm-4.7-free | opencode/minimax-m2.1-free | opencode/glm-4.7-free |
| budget | opencode/minimax-m2.1-free | opencode/grok-code | opencode/minimax-m2.1-free |

## Constraints

- **OpenCode limitation**: No per-invocation model override on Task calls
- **File format**: Must parse/preserve YAML frontmatter in markdown files
- **Idempotency**: Rewriting must be safe to run multiple times
- **Merge behavior**: Config updates must merge, not clobber existing settings
- **Fail loudly**: Missing agent files should error with clear message

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rewrite agent frontmatter | Only mechanism available in OpenCode for subagent model control | — Pending |
| Use OpenCode Zen free models as defaults | Zero cost for users, good quality | — Pending |
| Store profiles in .planning/config.json | Project-level config, matches existing GSD patterns | — Pending |
| gsd-codebase-mapper in Planning stage | Mapping happens before execution, is analytical work | — Pending |

---
*Last updated: 2026-01-20 after initialization*
