# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** Multi-agent orchestration system with orchestrator/subagent pattern

**Key Characteristics:**
- Orchestrator/subagent delegation pattern - thin orchestrators spawn specialized agents
- Context engineering via XML-structured prompts and @-reference loading
- Wave-based parallel execution with dependency-aware scheduling
- Atomic git commits per task with structured commit messages
- State management through `.planning/` directory artifacts

## Layers

**Installation Layer:**
- Purpose: Package distribution and installation to OpenCode config directories
- Location: `gsd-opencode/bin/install.js`
- Contains: Node.js installer script with interactive prompts, path replacement logic
- Depends on: Node.js runtime, filesystem access
- Used by: npm/npx execution

**Command Layer:**
- Purpose: User-facing slash command entry points (orchestrators)
- Location: `gsd-opencode/command/gsd/*.md`
- Contains: Command definitions with frontmatter metadata, process flows, routing logic
- Depends on: Agent layer, workflow layer, project state files
- Used by: OpenCode slash command system

**Agent Layer:**
- Purpose: Specialized subagents for execution, planning, verification, debugging
- Location: `gsd-opencode/agents/*.md`
- Contains: Agent definitions with YAML frontmatter (tools, description), execution protocols
- Depends on: Workflow layer, template layer, reference layer
- Used by: Command orchestrators via Task tool

**Workflow Layer:**
- Purpose: Detailed process specifications for complex operations
- Location: `gsd-opencode/get-shit-done/workflows/*.md`
- Contains: Step-by-step execution flows, checkpoint handling, resumption protocols
- Depends on: Template layer, reference layer
- Used by: Commands and agents for complex multi-step operations

**Template Layer:**
- Purpose: Output format specifications for generated artifacts
- Location: `gsd-opencode/get-shit-done/templates/*.md`
- Contains: File templates (PLAN.md, SUMMARY.md, ROADMAP.md, etc.)
- Depends on: None
- Used by: Agents when creating output files

**Reference Layer:**
- Purpose: Domain knowledge and pattern documentation
- Location: `gsd-opencode/get-shit-done/references/*.md`
- Contains: Checkpoint patterns, TDD methodology, git integration, verification patterns
- Depends on: None
- Used by: Agents for context and decision-making

## Data Flow

**Installation Flow:**

1. User runs `npx gsd-opencode`
2. `bin/install.js` prompts for global vs local installation
3. Script copies `agents/`, `command/gsd/`, `get-shit-done/` directories
4. Path replacement transforms `@gsd-opencode/` → `@~/.config/opencode/`
5. VERSION file created in destination

**Command Execution Flow:**

1. User invokes `/gsd-{command}` in OpenCode
2. OpenCode loads command file from `command/gsd/{command}.md`
3. Command orchestrator reads project state from `.planning/STATE.md`
4. Orchestrator spawns subagents via Task tool with inlined context
5. Subagents execute in fresh 200k context windows
6. Results collected, STATE.md updated, commits made

**Phase Execution Flow (Primary):**

1. `/gsd-execute-phase` validates phase directory exists
2. Discovers PLAN.md files, filters completed (have SUMMARY.md)
3. Groups plans by `wave:` frontmatter field
4. For each wave: spawns parallel gsd-executor agents with inlined plan content
5. Each executor: loads project state, executes tasks, commits per task, creates SUMMARY.md
6. Verification agent checks must_haves against actual codebase
7. ROADMAP.md, STATE.md, REQUIREMENTS.md updated

**State Management:**
- STATE.md tracks: current position, accumulated decisions, blockers, session continuity
- ROADMAP.md tracks: phase status, completion dates, requirements mapping
- REQUIREMENTS.md tracks: requirement ID, status, traceability to phases

## Key Abstractions

**Plan (PLAN.md):**
- Purpose: Atomic, executable unit of work with XML-structured tasks
- Examples: `.planning/phases/XX-name/{phase}-{plan}-PLAN.md`
- Pattern: YAML frontmatter + objective + context + tasks + verification + success_criteria
- Key frontmatter: `wave`, `depends_on`, `autonomous`, `must_haves`

**Agent (agent definition):**
- Purpose: Specialized execution context with tool permissions and protocols
- Examples: `gsd-opencode/agents/gsd-executor.md`, `gsd-opencode/agents/gsd-planner.md`
- Pattern: YAML frontmatter (name, description, tools) + role + execution flow + protocols
- Key agents: gsd-executor, gsd-planner, gsd-verifier, gsd-debugger, gsd-phase-researcher

**Command (slash command):**
- Purpose: User-facing orchestrator that coordinates workflow
- Examples: `gsd-opencode/command/gsd/execute-phase.md`
- Pattern: YAML frontmatter (name, description, argument-hint, tools) + objective + process + routing

**Wave:**
- Purpose: Group of independent plans that can execute in parallel
- Pre-computed: Wave numbers assigned during planning phase
- Execution: All plans in wave spawn simultaneously, Task tool blocks until all complete

## Entry Points

**Installation Entry:**
- Location: `gsd-opencode/bin/install.js`
- Triggers: `npx gsd-opencode` or `npm install -g gsd-opencode`
- Responsibilities: Copy files, transform paths, create VERSION file

**Primary Commands:**
- `/gsd-new-project` - Initialize project with questions → research → requirements → roadmap
- `/gsd-discuss-phase` - Gather implementation decisions for a phase
- `/gsd-plan-phase` - Research and create executable plans for a phase
- `/gsd-execute-phase` - Execute all plans in parallel waves with verification
- `/gsd-verify-work` - Manual user acceptance testing
- `/gsd-complete-milestone` - Archive milestone and tag release

**Quick Mode:**
- `/gsd-quick` - Execute ad-hoc task with GSD guarantees but without full planning

## Error Handling

**Strategy:** Layered error handling with checkpoint/resume pattern

**Patterns:**
- **Deviation Rules (Executor):** 4-tier auto-handling
  - Rule 1: Auto-fix bugs (security, correctness)
  - Rule 2: Auto-add missing critical functionality
  - Rule 3: Auto-fix blocking issues (dependencies, configs)
  - Rule 4: Ask user for architectural decisions
- **Checkpoint Protocol:** Agent pauses, returns structured state, fresh agent resumes
- **Verification Gap Loop:** Gaps found → plan fix plans → execute → re-verify until passed
- **Resumption:** Run same command again, completed plans skipped via SUMMARY.md detection

## Cross-Cutting Concerns

**Logging:** Console output with structured markdown formatting, progress indicators

**Validation:** Multi-stage verification
- Plan-level: `must_haves` define observable behaviors and artifacts
- Phase-level: Verifier agent checks must_haves against actual codebase
- User-level: UAT.md templates for manual acceptance testing

**Authentication:** Model profile management
- Profiles: quality, balanced, budget
- Stages: planning, execution, verification
- Configuration: `.planning/config.json` + `opencode.json` generation

**Git Integration:**
- Per-task atomic commits: `{type}({phase}-{plan}): {description}`
- Plan metadata commits: `docs({phase}-{plan}): complete [name] plan`
- Phase completion commits: `docs({phase}): complete {name} phase`
- NEVER use `git add .` - always stage files individually

---

*Architecture analysis: 2026-02-09*
