# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
[project-root]/
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD workflows (ci.yml, release.yml, validate.yml)
├── .planning/                  # GSD project planning artifacts (generated)
│   └── codebase/               # Codebase analysis documents
├── assets/                     # Development assets
│   ├── bin/                    # Development scripts
│   │   ├── check-forbidden-strings.js
│   │   └── translate-files.js
│   └── prompts/                # Translation prompts for original→opencode conversion
│       └── completed/          # Completed translation prompts
├── gsd-opencode/               # Main package source (npm distribution)
│   ├── agents/                 # Agent definitions (14 agents)
│   ├── bin/                    # Installation script
│   │   └── install.js          # Main installer
│   ├── command/                # Slash command definitions
│   │   └── gsd/                # GSD commands (28 commands)
│   ├── get-shit-done/          # Workflows, templates, references
│   │   ├── references/         # Domain knowledge (10 files)
│   │   ├── templates/          # Output templates (19+ files)
│   │   │   ├── codebase/       # Codebase analysis templates
│   │   │   └── research-project/
│   │   └── workflows/          # Process specifications (13 workflows)
│   └── package.json            # npm package configuration
├── local/                      # Local development version
│   └── gsd-opencode/           # Mirror of gsd-opencode for testing
├── original/                   # Original GSD source (git submodule)
│   └── get-shit-done/          # TÂCHES original implementation
├── CHANGELOG.md                # Version history
├── README.md                   # Project documentation
└── package.json                # Root package.json
```

## Directory Purposes

**`gsd-opencode/`:**
- Purpose: Main npm package source - installed to `~/.config/opencode/` or `./.opencode/`
- Contains: Agent definitions, commands, workflows, templates, references
- Key files: `bin/install.js`, `package.json`

**`gsd-opencode/agents/`:**
- Purpose: Specialized subagent definitions with tool permissions
- Contains: 14 agent markdown files
- Key files: `gsd-executor.md`, `gsd-planner.md`, `gsd-verifier.md`, `gsd-debugger.md`
- Naming pattern: `gsd-{role}.md`

**`gsd-opencode/command/gsd/`:**
- Purpose: User-facing slash command definitions (orchestrators)
- Contains: 28 command markdown files
- Key files: `execute-phase.md`, `plan-phase.md`, `new-project.md`
- Naming pattern: `{command-name}.md` → invoked as `/gsd-{command-name}`

**`gsd-opencode/get-shit-done/workflows/`:**
- Purpose: Detailed process specifications for complex operations
- Contains: 13 workflow markdown files
- Key files: `execute-phase.md`, `execute-plan.md`, `verify-phase.md`
- Naming pattern: `{operation-name}.md`

**`gsd-opencode/get-shit-done/templates/`:**
- Purpose: Output format specifications for generated artifacts
- Contains: 19+ template markdown files
- Key files: `phase-prompt.md`, `summary.md`, `roadmap.md`, `state.md`
- Subdirectories: `codebase/` (7 templates), `research-project/` (5 templates)

**`gsd-opencode/get-shit-done/references/`:**
- Purpose: Domain knowledge and pattern documentation
- Contains: 10 reference markdown files
- Key files: `checkpoints.md`, `verification-patterns.md`, `tdd.md`, `git-integration.md`
- Naming pattern: `{domain-name}.md`

**`original/`:**
- Purpose: Git submodule pointing to original TÂCHES GSD repository
- Contains: Source of truth for GSD system
- Used by: Translation scripts to convert Claude Code format → OpenCode format

**`local/`:**
- Purpose: Local development testing area
- Contains: Mirror of gsd-opencode for testing before npm publish
- Used by: `node bin/install.js --local` installation

**`assets/`:**
- Purpose: Development-time assets and translation tools
- Contains: Translation prompts, helper scripts, terminal graphics
- Not distributed in npm package

## Key File Locations

**Entry Points:**
- `gsd-opencode/bin/install.js`: npm installation entry point
- `gsd-opencode/package.json`: Package configuration, version, bin field

**Core Commands:**
- `gsd-opencode/command/gsd/new-project.md`: Project initialization
- `gsd-opencode/command/gsd/execute-phase.md`: Phase execution orchestrator
- `gsd-opencode/command/gsd/plan-phase.md`: Planning orchestrator

**Core Agents:**
- `gsd-opencode/agents/gsd-executor.md`: Plan execution agent
- `gsd-opencode/agents/gsd-planner.md`: Plan creation agent
- `gsd-opencode/agents/gsd-verifier.md`: Verification agent

**Core Workflows:**
- `gsd-opencode/get-shit-done/workflows/execute-phase.md`: Wave execution details
- `gsd-opencode/get-shit-done/workflows/execute-plan.md`: Single plan execution

**Core Templates:**
- `gsd-opencode/get-shit-done/templates/phase-prompt.md`: PLAN.md format
- `gsd-opencode/get-shit-done/templates/summary.md`: SUMMARY.md format

**Configuration:**
- `gsd-opencode/package.json`: npm package config
- `.planning/config.json`: Per-project GSD settings (generated at runtime)

## Naming Conventions

**Files:**
- Agents: `gsd-{role}.md` (e.g., `gsd-executor.md`, `gsd-planner.md`)
- Commands: `{verb}-{noun}.md` (e.g., `execute-phase.md`, `plan-milestone.md`)
- Workflows: `{operation}.md` (e.g., `execute-phase.md`, `verify-work.md`)
- Templates: `{artifact}.md` (e.g., `summary.md`, `roadmap.md`, `state.md`)
- References: `{domain}.md` (e.g., `checkpoints.md`, `tdd.md`)

**Directories:**
- Lowercase with hyphens: `get-shit-done/`, `execute-phase/`
- Phase directories: `XX-name/` format (e.g., `01-foundation/`, `02-auth/`)

**Generated Planning Files:**
- Plans: `{phase}-{plan}-PLAN.md` (e.g., `01-01-PLAN.md`, `01-02-PLAN.md`)
- Summaries: `{phase}-{plan}-SUMMARY.md`
- Context: `{phase}-CONTEXT.md`
- Research: `{phase}-RESEARCH.md`
- Verification: `{phase}-VERIFICATION.md`
- UAT: `{phase}-UAT.md`

## Where to Add New Code

**New Agent:**
- Implementation: `gsd-opencode/agents/gsd-{role}.md`
- Required: YAML frontmatter with name, description, tools
- After creating: Update installer if needed, test with `--local` install

**New Command:**
- Implementation: `gsd-opencode/command/gsd/{command-name}.md`
- Required: YAML frontmatter with name, description, argument-hint, tools
- After creating: Test with `/gsd-{command-name}` after reinstall

**New Workflow:**
- Implementation: `gsd-opencode/get-shit-done/workflows/{operation}.md`
- Reference from: Command or agent via `@~/.config/opencode/get-shit-done/workflows/{file}.md`

**New Template:**
- Implementation: `gsd-opencode/get-shit-done/templates/{artifact}.md`
- Reference from: Agent or command via `@~/.config/opencode/get-shit-done/templates/{file}.md`

**New Reference Document:**
- Implementation: `gsd-opencode/get-shit-done/references/{domain}.md`
- Reference from: Agent, command, or workflow via `@~/.config/opencode/get-shit-done/references/{file}.md`

**Bug Fix or Enhancement:**
1. Edit file in `gsd-opencode/`
2. Test locally: `cd gsd-opencode && node bin/install.js --local`
3. Verify in fresh OpenCode session
4. Sync to `local/gsd-opencode/` if needed for version control

## Special Directories

**`.planning/`:**
- Purpose: Runtime project state and artifacts
- Generated: Yes, by GSD commands during project lifecycle
- Committed: Optional (config.json `commit_docs` setting)
- Contains: STATE.md, ROADMAP.md, PROJECT.md, REQUIREMENTS.md, phases/, research/, quick/

**`original/` (Git Submodule):**
- Purpose: Reference to original TÂCHES GSD implementation
- Generated: No, managed by git submodule
- Committed: Yes (submodule reference only)
- Update with: `git submodule update --init --recursive`

**`node_modules/`:**
- Purpose: npm dependencies (minimal)
- Generated: Yes, by npm install
- Committed: No (gitignored)
- Contains: Only development dependencies, no runtime deps

---

*Structure analysis: 2026-02-09*
