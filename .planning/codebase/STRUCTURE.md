# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
gsd-opencode/                           # Repository root
├── .github/                            # GitHub workflows
│   └── workflows/
├── .planning/                          # Planning artifacts for this repo
│   ├── codebase/                       # Codebase mapping docs (you are here)
│   └── research/                       # Research documents
├── assets/                             # Maintainer tooling + static assets
│   ├── bin/                            # Node scripts for repo maintenance
│   │   ├── check-forbidden-strings.js  # Policy enforcement
│   │   └── translate-files.js          # Upstream translation
│   └── prompts/                        # Translation prompts
├── gsd-opencode/                       # NPM package content (installed to OpenCode)
│   ├── .opencode/                      # Repo-local authoring rules
│   │   └── rules/                      # Command authoring conventions
│   ├── agents/                         # Subagent prompt definitions
│   ├── bin/                            # NPM bin entry (installer)
│   ├── command/                        # OpenCode slash commands
│   │   └── gsd/                        # GSD command set
│   └── get-shit-done/                  # Skill resources
│       ├── references/                 # Cross-cutting guidance docs
│       ├── templates/                  # Output document templates
│       │   ├── codebase/               # Templates for .planning/codebase/
│       │   └── research-project/       # Templates for research docs
│       └── workflows/                  # Reusable procedures
├── original/                           # Git submodule mount
│   └── get-shit-done/                  # Upstream TÂCHES source (submodule)
├── CHANGELOG.md                        # Release history
├── README.md                           # User documentation
├── package.json                        # Root tooling deps (assets scripts)
└── .gitmodules                         # Submodule configuration
```

## Directory Purposes

**`gsd-opencode/`** (NPM Package)
- Purpose: Distributable package installed into OpenCode config directories
- Contains: Complete skill bundle (commands, agents, workflows, templates, references)
- Key files: `package.json` (npm metadata), `bin/install.js` (installer entry)
- Install targets: `~/.config/opencode/` (global) or `./.opencode/` (local)

**`gsd-opencode/command/gsd/`**
- Purpose: OpenCode slash command definitions
- Contains: 24 Markdown command files
- Pattern: One file per command, YAML frontmatter + XML sections
- Key files:
  - `new-project.md` - Initialize project (questioning → research → roadmap)
  - `plan-phase.md` - Research + plan + verify a phase
  - `execute-phase.md` - Wave-based parallel execution
  - `map-codebase.md` - Brownfield codebase analysis
  - `help.md` - Command reference display

**`gsd-opencode/agents/`**
- Purpose: Subagent role prompts spawned by orchestrators
- Contains: 11 agent definition files
- Pattern: Full prompt with `<role>`, `<philosophy>`, `<execution_flow>`
- Key files:
  - `gsd-executor.md` (21KB) - Execute plans with atomic commits
  - `gsd-planner.md` (41KB) - Create phase plans
  - `gsd-verifier.md` (22KB) - Verify phase goals
  - `gsd-codebase-mapper.md` (15KB) - Analyze codebase
  - `gsd-debugger.md` (35KB) - Systematic debugging

**`gsd-opencode/get-shit-done/workflows/`**
- Purpose: Reusable "how" procedures referenced by commands
- Contains: 12 workflow files with `<step>` elements
- Pattern: Named steps with priority, bash snippets, explicit gating
- Key files:
  - `execute-plan.md` (55KB) - Full plan execution with checkpoint handling
  - `execute-phase.md` (15KB) - Wave-based orchestration
  - `map-codebase.md` (7KB) - Parallel mapper spawning
  - `verify-phase.md` (18KB) - Goal verification protocol

**`gsd-opencode/get-shit-done/templates/`**
- Purpose: Output document scaffolding for `.planning/` artifacts
- Contains: 20+ templates including `codebase/` and `research-project/` subdirs
- Pattern: `<template>` block + `<guidelines>` + `<evolution>` sections
- Key files:
  - `project.md` - PROJECT.md structure
  - `state.md` - STATE.md (<100 lines memory)
  - `summary.md` - Plan execution summary
  - `roadmap.md` - Phase structure
  - `phase-prompt.md` (17KB) - Subagent task prompt template

**`gsd-opencode/get-shit-done/templates/codebase/`**
- Purpose: Templates for codebase mapping documents
- Contains: 7 template files matching codebase doc types
- Key files: `architecture.md`, `structure.md`, `stack.md`, `conventions.md`, `testing.md`, `integrations.md`, `concerns.md`

**`gsd-opencode/get-shit-done/references/`**
- Purpose: Shared knowledge modules for cross-cutting concerns
- Contains: 7 reference files
- Pattern: Best practices, protocols, examples
- Key files:
  - `checkpoints.md` (29KB) - Checkpoint protocol details
  - `git-integration.md` - Commit conventions
  - `verification-patterns.md` (16KB) - Verification strategies
  - `tdd.md` - Test-driven development patterns

**`gsd-opencode/.opencode/rules/`**
- Purpose: Authoring conventions for maintaining commands
- Contains: Rules for `command/gsd/` structure
- Key files: `commands.md` - Section order, @-reference patterns

**`assets/`**
- Purpose: Maintainer utilities (not installed to user projects)
- Contains: Translation scripts, policy checks, static assets
- Key files:
  - `bin/translate-files.js` - Translate upstream sources
  - `bin/check-forbidden-strings.js` - Enforce antipatterns.toml
  - `antipatterns.toml` - Forbidden string definitions
  - `terminal.svg` - README banner image

**`original/get-shit-done/`**
- Purpose: Git submodule for upstream TÂCHES source
- Contains: Original Claude Code version (reference only)
- Populated by: `git submodule update --init --recursive`
- Config: `.gitmodules`

## Key File Locations

**Entry Points:**
- `gsd-opencode/bin/install.js` - NPM installer CLI
- `gsd-opencode/command/gsd/*.md` - User-invoked commands

**Configuration:**
- `gsd-opencode/package.json` - NPM package config (name, version, bin, files)
- `gsd-opencode/.npmrc` - NPM publishing config
- `package.json` (root) - Tooling dependencies (`@iarna/toml`)
- `.gitmodules` - Submodule configuration

**Core Orchestration:**
- `gsd-opencode/command/gsd/execute-phase.md` - Phase execution orchestrator
- `gsd-opencode/command/gsd/plan-phase.md` - Planning orchestrator
- `gsd-opencode/command/gsd/new-project.md` - Initialization flow

**Heavy Workflows:**
- `gsd-opencode/get-shit-done/workflows/execute-plan.md` - 55KB, full execution logic
- `gsd-opencode/get-shit-done/references/checkpoints.md` - 29KB, checkpoint protocol

**Testing:**
- Not present: No `tests/`, `*.test.*`, or `*.spec.*` files detected
- `package.json` has placeholder: `"test": "echo \"Error: no test specified\" && exit 1"`

## Naming Conventions

**Files:**
- Commands: `gsd-opencode/command/gsd/{command-name}.md` (kebab-case)
- Agents: `gsd-opencode/agents/gsd-{role}.md` (gsd- prefix + kebab-case)
- Workflows: `gsd-opencode/get-shit-done/workflows/{workflow-name}.md` (kebab-case)
- Templates: `gsd-opencode/get-shit-done/templates/{name}.md` (lowercase/kebab-case)
- References: `gsd-opencode/get-shit-done/references/{topic}.md` (kebab-case)
- Repo-level docs: UPPERCASE.md (`CHANGELOG.md`, `README.md`)

**Directories:**
- All kebab-case: `get-shit-done/`, `command/gsd/`, `assets/bin/`
- Collections plural: `agents/`, `templates/`, `workflows/`, `references/`

**Planning Artifacts (user projects):**
- Phase directories: `.planning/phases/{NN}-{phase-name}/` (zero-padded number + kebab-case)
- Plans: `{phase}-{plan}-PLAN.md` (e.g., `01-01-PLAN.md`)
- Summaries: `{phase}-{plan}-SUMMARY.md`
- Verification: `{phase}-VERIFICATION.md`
- Research: `{phase}-RESEARCH.md`
- Context: `{phase}-CONTEXT.md`

## Where to Add New Code

**New Slash Command:**
1. Create: `gsd-opencode/command/gsd/{command-name}.md`
2. Follow structure in `gsd-opencode/.opencode/rules/commands.md`:
   - YAML frontmatter (name, description, argument-hint, tools)
   - `<objective>` - What/why/when
   - `<execution_context>` - @-references to workflows, templates
   - `<context>` - Dynamic content ($ARGUMENTS, project files)
   - `<process>` - Implementation steps
   - `<success_criteria>` - Checklist

**New Agent:**
1. Create: `gsd-opencode/agents/gsd-{role}.md`
2. Include: `<role>`, `<philosophy>`, `<execution_flow>`, tool permissions
3. Reference from commands/workflows: `Task(subagent_type="gsd-{role}")`

**New Workflow:**
1. Create: `gsd-opencode/get-shit-done/workflows/{workflow-name}.md`
2. Use `<step name="..." priority="...">` blocks
3. Reference from commands: `@~/.config/opencode/get-shit-done/workflows/{name}.md`

**New Template:**
1. Create: `gsd-opencode/get-shit-done/templates/{name}.md`
2. Include: `<template>` block, `<guidelines>`, optional `<evolution>`
3. Reference from agents/workflows when writing documents

**New Reference:**
1. Create: `gsd-opencode/get-shit-done/references/{topic}.md`
2. Include reusable guidance, protocols, examples
3. Reference from commands: `@~/.config/opencode/get-shit-done/references/{name}.md`

**Maintainer Utilities:**
1. Scripts: `assets/bin/{script}.js`
2. Config: `assets/{config}.toml`
3. Dependencies: Add to root `package.json`

## Special Directories

**`.planning/` (User Projects)**
- Purpose: Runtime state for active GSD projects
- Generated: Yes, by `/gsd-new-project` and related commands
- Committed: Usually yes (project documentation)
- Contains: `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `config.json`, `phases/`, `research/`, `codebase/`, `todos/`

**`.planning/codebase/` (User Projects)**
- Purpose: Codebase mapping documents for brownfield projects
- Generated: Yes, by `/gsd-map-codebase`
- Committed: Usually yes (reference for planning)
- Contains: 7 docs (`STACK.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `INTEGRATIONS.md`, `CONCERNS.md`)

**`original/get-shit-done/` (This Repo)**
- Purpose: Git submodule for upstream TÂCHES reference
- Generated: Yes, by `git submodule update --init --recursive`
- Committed: Submodule pointer tracked, not contents
- Purpose: Reference for translation, not runtime

**`gsd-opencode/.opencode/` (This Repo)**
- Purpose: Authoring rules for maintaining the package
- Generated: No
- Committed: Yes
- Note: NOT copied to user installations

---

*Structure analysis: 2026-01-20*
