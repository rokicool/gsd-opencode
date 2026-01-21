# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Meta-Prompting Orchestrator-Agent Framework

**Key Characteristics:**
- Prompt-as-code: Commands, workflows, agents are Markdown files with structured XML that become executable prompts
- Multi-agent orchestration: Thin orchestrator commands spawn specialized subagents with fresh context windows
- Document-driven state: All project state persists as Markdown in `.planning/` directory
- Context engineering: Aggressive budget management (plans target ~50% context, orchestrators ~15%)
- Wave-based parallelism: Pre-computed dependency groups enable parallel subagent execution

## Layers

**Layer 1: Slash Commands**
- Purpose: User entry points defining "what" to do
- Location: `gsd-opencode/command/gsd/*.md`
- Contains: 24 command files with YAML frontmatter + XML sections
- Structure: `<objective>`, `<execution_context>`, `<context>`, `<process>`, `<success_criteria>`
- Depends on: Workflows, templates, references via `@` references
- Used by: User via `/gsd-*` commands in OpenCode
- Key files: `new-project.md`, `plan-phase.md`, `execute-phase.md`, `map-codebase.md`, `help.md`

**Layer 2: Workflows**
- Purpose: Reusable "how" procedures referenced by commands
- Location: `gsd-opencode/get-shit-done/workflows/*.md`
- Contains: 12 workflow files with `<step>` blocks and bash snippets
- Pattern: Named steps with priority, gating, and explicit success criteria
- Depends on: Templates, references, agent definitions
- Used by: Commands via `<execution_context>` `@~/.config/opencode/get-shit-done/workflows/*.md`
- Key files: `execute-phase.md`, `execute-plan.md` (55k lines), `map-codebase.md`, `verify-phase.md`

**Layer 3: Agents**
- Purpose: Specialized subagent prompts spawned for focused tasks
- Location: `gsd-opencode/agents/*.md`
- Contains: 11 agent definitions with `<role>`, `<execution_flow>`, `<philosophy>`
- Pattern: Full prompt with constraints, behaviors, required outputs
- Each agent: Fresh 200k token context, single responsibility, structured return
- Depends on: Loaded workflows/templates/references during execution
- Used by: Orchestrators via `Task(subagent_type="gsd-*")`
- Key files: `gsd-executor.md`, `gsd-planner.md`, `gsd-verifier.md`, `gsd-codebase-mapper.md`

**Layer 4: Templates**
- Purpose: Standardized output document structures
- Location: `gsd-opencode/get-shit-done/templates/*.md`
- Contains: 20 templates including `templates/codebase/` subdirectory
- Pattern: Markdown template with `<template>`, `<guidelines>`, `<evolution>` sections
- Depends on: Nothing (leaf layer)
- Used by: Agents when creating `.planning/` documents
- Key files: `project.md`, `state.md`, `summary.md`, `phase-prompt.md`, `roadmap.md`

**Layer 5: References**
- Purpose: Shared knowledge modules for cross-cutting concerns
- Location: `gsd-opencode/get-shit-done/references/*.md`
- Contains: 7 reference files defining protocols and patterns
- Pattern: Best practices, explicit rules, example formats
- Depends on: Nothing (leaf layer)
- Used by: Commands/workflows via `@` references in `<execution_context>`
- Key files: `checkpoints.md` (29k), `git-integration.md`, `verification-patterns.md`, `tdd.md`

**Layer 6: Project State**
- Purpose: Runtime persistence for active projects
- Location: `.planning/` in user's project directory
- Contains: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json`, `phases/`, `research/`, `codebase/`
- Pattern: File-based state surviving `/new` sessions
- Depends on: Templates define structure
- Used by: All commands read state, agents write updates
- Key patterns: `phases/{N}-{name}/{N}-{M}-PLAN.md`, `phases/{N}-{name}/{N}-{M}-SUMMARY.md`

## Data Flow

**Project Initialization:**
```
User → /gsd-new-project
    → Questioning (inline, iterative)
    → Optional: spawn gsd-project-researcher agents (parallel)
    → Optional: spawn gsd-research-synthesizer
    → Write PROJECT.md, REQUIREMENTS.md
    → Spawn gsd-roadmapper → ROADMAP.md
    → Initialize STATE.md
    → Commit: "docs: initialize project"
```

**Phase Planning:**
```
User → /gsd-plan-phase {N}
    → Load STATE.md, ROADMAP.md
    → Optional: spawn gsd-phase-researcher (discovery)
    → Spawn gsd-planner
        → Read CONTEXT.md (if exists), REQUIREMENTS.md
        → Decompose into 2-3 task plans
        → Assign waves (dependency-based parallelism)
        → Write *-PLAN.md files
    → Spawn gsd-plan-checker
        → Verify against requirements
        → Loop: revise → check until pass
    → Update STATE.md
    → Commit: "docs({phase}): create phase plans"
```

**Phase Execution:**
```
User → /gsd-execute-phase {N}
    → Discover plans, filter incomplete
    → Group by wave (from frontmatter)
    → For each wave:
        → Spawn gsd-executor agents (parallel Task calls)
        → Each executor:
            → Read plan → execute tasks → per-task commits
            → Write SUMMARY.md
        → Orchestrator collects confirmations
        → Handle checkpoints if autonomous: false
    → Spawn gsd-verifier
        → Check must_haves against codebase (not claims)
        → Write VERIFICATION.md with status
    → Route by status:
        - passed → update ROADMAP, STATE, REQUIREMENTS
        - gaps_found → offer /gsd-plan-phase --gaps
        - human_needed → present checklist, await response
    → Commit: "docs({phase}): complete {name} phase"
```

**Codebase Mapping:**
```
User → /gsd-map-codebase
    → Create .planning/codebase/
    → Spawn 4 gsd-codebase-mapper agents (parallel, run_in_background):
        - tech focus → STACK.md, INTEGRATIONS.md
        - arch focus → ARCHITECTURE.md, STRUCTURE.md
        - quality focus → CONVENTIONS.md, TESTING.md
        - concerns focus → CONCERNS.md
    → Each agent writes directly (no context transfer)
    → Orchestrator collects confirmations (file paths + line counts)
    → Commit: "docs: map existing codebase"
```

**State Management:**
- `STATE.md`: Short-term memory (<100 lines), read first in every workflow
- `PROJECT.md`: Vision, requirements, constraints, decisions log
- `ROADMAP.md`: Phase definitions with status/dates
- `REQUIREMENTS.md`: Traceability table (REQ-ID → Phase mapping)
- Per-phase artifacts in `phases/{N}-{name}/`

## Key Abstractions

**Plans as Prompts:**
- Purpose: Executable task specifications that become subagent prompts
- Location: `.planning/phases/{N}-{name}/{N}-{M}-PLAN.md`
- Pattern: YAML frontmatter + `<task>` XML blocks
- Frontmatter: `wave`, `autonomous`, `type`, `depends_on`
- Task structure: `type`, `name`, `files`, `action`, `verify`, `done`

**Waves (Dependency Groups):**
- Purpose: Enable parallel execution of independent plans
- Pattern: Plans with same `wave` value execute simultaneously
- Pre-computed: During /gsd-plan-phase based on `depends_on`
- Used by: execute-phase to spawn parallel Task calls

**Checkpoints:**
- Purpose: Human interaction points during autonomous execution
- Detection: `autonomous: false` in plan frontmatter
- Types: `checkpoint:human-verify`, `checkpoint:decision`, `checkpoint:auth`
- Flow: Agent pauses → returns structured state → orchestrator presents → spawns continuation

**@-References (Context Loading):**
- Purpose: Dynamic file inclusion in prompts
- Zones:
  - `<execution_context>`: Static resources (workflows, templates, references)
  - `<context>`: Dynamic project state (STATE.md, ROADMAP.md, $ARGUMENTS)
- Path rewriting: Installer transforms `~/.claude/` → `~/.config/opencode/`

**Verification Status Routing:**
- Purpose: Gate phase completion on actual codebase state
- Statuses: `passed`, `gaps_found`, `human_needed`
- Routes:
  - `passed` → update roadmap, continue
  - `gaps_found` → `/gsd-plan-phase {N} --gaps` for closure plans
  - `human_needed` → present checklist, await approval

## Entry Points

**User Entry Points:**
- `/gsd-new-project`: `gsd-opencode/command/gsd/new-project.md` - Full initialization
- `/gsd-plan-phase {N}`: `gsd-opencode/command/gsd/plan-phase.md` - Research + plan + verify
- `/gsd-execute-phase {N}`: `gsd-opencode/command/gsd/execute-phase.md` - Wave-based execution
- `/gsd-map-codebase`: `gsd-opencode/command/gsd/map-codebase.md` - Brownfield analysis
- `/gsd-progress`: `gsd-opencode/command/gsd/progress.md` - Status display
- `/gsd-help`: `gsd-opencode/command/gsd/help.md` - Command reference

**Installation Entry Point:**
- `npx gsd-opencode`: `gsd-opencode/bin/install.js` - Copy bundle to OpenCode config
- Flags: `--global` / `--local` / `--config-dir <path>`

**Agent Entry Points (spawned by orchestrators):**
- `gsd-executor`: Execute plans with atomic commits
- `gsd-planner`: Create phase plans with wave assignment
- `gsd-verifier`: Verify phase goals against codebase
- `gsd-codebase-mapper`: Analyze codebase for mapping docs
- `gsd-phase-researcher`: Discovery before planning
- `gsd-plan-checker`: Verify plans against requirements

## Error Handling

**Strategy:** Pre-flight validation + structured failure states

**Command-Level:**
- Prerequisite checks: `[ -f .planning/PROJECT.md ] && exit 1`
- Phase existence validation before execution
- Plan file discovery before wave grouping

**Execution-Level:**
- Subagent returns structured result (success/failure)
- Missing SUMMARY.md → detected by orchestrator
- Ask user: "Continue remaining plans?" or "Stop execution?"

**Verification-Level:**
- `status: gaps_found` → route to gap closure planning
- `status: human_needed` → present checklist, await approval
- Checkpoint failures → ask skip/abort, record partial progress

## Cross-Cutting Concerns

**Logging:** 
- Per-task commit messages: `{type}({phase}-{plan}): {task-name}`
- Phase bundles: `docs({phase}): complete {name} phase`
- Stage banners in command output

**Git Integration:**
- Atomic commits per task (individual file staging)
- Plan metadata commits after task completion
- Phase completion bundles (ROADMAP, STATE, REQUIREMENTS, VERIFICATION)
- Never: `git add .`, `git add -A`, broad directory adds

**Validation:**
- Plans verified by gsd-plan-checker before execution
- Phase goals verified by gsd-verifier after execution
- Human verification via /gsd-verify-work for UAT

---

*Architecture analysis: 2026-01-20*
