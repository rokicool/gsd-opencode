# GSD Translation Mapping: Claude Code → OpenCode

This document tracks all tool, agent, and terminology translations from Claude Code format to OpenCode format for the get-shit-done (GSD) system.

**Original Source:** [get-shit-done by TÂCHES](https://github.com/glittercowboy/get-shit-done)
**Translation Target:** gsd-opencode (OpenCode format)

---

## Tool Mappings

| Claude Code Tool | OpenCode Tool | Notes |
|-----------------|---------------|-------|
| `Read` | `read` | Direct equivalent - reads file contents |
| `Write` | `write` | Direct equivalent - creates/overwrites files |
| `Bash` | `bash` | Direct equivalent - executes shell commands |
| `Grep` | `grep` | Direct equivalent - searches file contents |
| `Glob` | `glob` | Direct equivalent - finds files by pattern |
| `Task` | `skill` | Spawns subagents - OpenCode uses skill tool for agent invocation |
| `AskUserQuestion` | `question` | User interaction tool for prompts |
| `WebFetch` | `webfetch` | Direct equivalent - fetches web content |

---

## Agent Mappings

| Claude Code Agent | OpenCode Agent | Type | Notes |
|------------------|---------------|-------|-------|
| `gsd-planner` | `gsd-planner` | subagent | Creates phase plans with task breakdown |
| `gsd-executor` | `gsd-executor` | subagent | Executes phase plans |
| `gsd-verifier` | `gsd-verifier` | subagent | Verifies code against goals |
| `gsd-research-synthesizer` | `gsd-research-synthesizer` | subagent | Synthesizes research outputs |
| `gsd-roadmapper` | `gsd-roadmapper` | subagent | Creates project roadmap |
| `gsd-debugger` | `gsd-debugger` | subagent | Systematic debugging |
| `gsd-codebase-mapper` | `gsd-codebase-mapper` | subagent | Analyzes existing codebase |
| `gsd-project-researcher` | `gsd-project-researcher` | subagent | Parallel domain research |
| `gsd-phase-researcher` | `gsd-phase-researcher` | subagent | Phase-specific research |
| `gsd-plan-checker` | `gsd-plan-checker` | subagent | Validates plan quality |
| `gsd-integration-checker` | `gsd-integration-checker` | subagent | Verifies integration points |

---

## Syntax Translations

| Claude Code Syntax | OpenCode Syntax | Notes |
|------------------|---------------|-------|
| `/gsd:command` | `/gsd-command` | Colon replaced with dash (no colon in command names) |
| `name: gsd:command` | `name: gsd-command` | Command header format |
| `@~/.claude/get-shit-done/` | `@.opencode/get-shit-done/` | Config path |
| `~/.claude/` | `~/.config/opencode/` | Global config path |
| `/clear` | `/new` | Fresh session command |
| `<sub>text</sub>` | `*text*` | Tag/subscript notation |
| `All arguments` | `$ARGUMENTS` | Metaprompt argument variable |

---

## Directory Structure Translations

| Claude Code Path | OpenCode Path | Notes |
|-----------------|---------------|-------|
| `./original/get-shit-done/commands/gsd/` | `./gsd-opencode/command/gsd/` | Singular "command" |
| `./original/get-shit-done/agents/` | `./gsd-opencode/agents/` | Direct equivalent |
| `./original/get-shit-done/get-shit-done/references/` | `./gsd-opencode/get-shit-done/references/` | Direct equivalent |
| `./original/get-shit-done/get-shit-done/templates/` | `./gsd-opencode/get-shit-done/templates/` | Direct equivalent |
| `./original/get-shit-done/get-shit-done/workflows/` | `./gsd-opencode/get-shit-done/workflows/` | Direct equivalent |

---

## Frontmatter Translations

| Claude Code Field | OpenCode Field | Notes |
|------------------|---------------|-------|
| `name:` | `name:` | Same format |
| `description:` | `description:` | Same format |
| `allowed-tools:` | `tools:` | Different field name |
| `color:` | N/A | Agent color not supported in OpenCode |

**Example Translation:**

```yaml
# Claude Code
---
name: gsd:new-project
description: Initialize a new project
allowed-tools:
  - Read
  - Bash
  - Write
---

# OpenCode
---
name: gsd-new-project
description: Initialize a new project
tools:
  - read
  - bash
  - write
---
```

---

## Command Name Translations

All GSD commands use the `/gsd:` prefix in Claude Code. In OpenCode, this becomes `/gsd-` (colon replaced with dash).

| Claude Code | OpenCode |
|-------------|-----------|
| `/gsd:new-project` | `/gsd-new-project` |
| `/gsd:discuss-phase` | `/gsd-discuss-phase` |
| `/gsd:plan-phase` | `/gsd-plan-phase` |
| `/gsd:execute-phase` | `/gsd-execute-phase` |
| `/gsd:verify-work` | `/gsd-verify-work` |
| `/gsd:map-codebase` | `/gsd-map-codebase` |
| `/gsd:complete-milestone` | `/gsd-complete-milestone` |
| `/gsd:new-milestone` | `/gsd-new-milestone` |
| `/gsd:add-phase` | `/gsd-add-phase` |
| `/gsd:insert-phase` | `/gsd-insert-phase` |
| `/gsd:remove-phase` | `/gsd-remove-phase` |
| `/gsd:research-phase` | `/gsd-research-phase` |
| `/gsd:debug` | `/gsd-debug` |
| `/gsd:pause-work` | `/gsd-pause-work` |
| `/gsd:resume-work` | `/gsd-resume-work` |
| `/gsd:progress` | `/gsd-progress` |
| `/gsd:help` | `/gsd-help` |
| `/gsd:whats-new` | `/gsd-whats-new` |
| `/gsd:add-todo` | `/gsd-add-todo` |
| `/gsd:check-todos` | `/gsd-check-todos` |
| `/gsd:list-phase-assumptions` | `/gsd-list-phase-assumptions` |
| `/gsd:audit-milestone` | `/gsd-audit-milestone` |
| `/gsd:plan-milestone-gaps` | `/gsd-plan-milestone-gaps` |
| `/gsd:update` | `/gsd-update` |

---

## Key Translation Decisions

### 1. Command Naming
- **Decision:** Replace colon (`:`) with dash (`-`) in all command names
- **Reasoning:** OpenCode doesn't support colons in command names
- **Impact:** All 21 commands renamed

### 2. Config Paths
- **Decision:** Use `.opencode/` for project-specific and `~/.config/opencode/` for global
- **Reasoning:** OpenCode's standard config directory structure
- **Impact:** All path references updated

### 3. Tool References
- **Decision:** Map all Claude Code tools to OpenCode equivalents
- **Reasoning:** OpenCode has all equivalent tools with same functionality
- **Impact:** All tool calls updated in commands and agents

### 4. Metaprompt Arguments
- **Decision:** Replace "All arguments" with `$ARGUMENTS` variable
- **Reasoning:** OpenCode's standard variable for passing all command arguments
- **Impact:** Command argument handling updated

### 5. Tag Syntax
- **Decision:** Replace `<sub>text</sub>` with `*text*` (single asterisk)
- **Reasoning:** OpenCode's markdown convention for subscript/notation
- **Impact:** All tag occurrences updated

### 6. Fresh Session
- **Decision:** Replace `/clear` with `/new`
- **Reasoning:** OpenCode's equivalent command for starting fresh sessions
- **Impact:** All "clear" references updated

### 7. Agent Invocation
- **Decision:** Use `@agent-name` syntax in OpenCode vs `Task()` in Claude Code
- **Reasoning:** Different agent invocation mechanisms
- **Impact:** Agent spawning logic updated

### 8. File References
- **Decision:** Keep `@filename` syntax (both systems support)
- **Reasoning:** Both systems use same reference syntax
- **Impact:** No changes needed

---

## Preservation Notes

- **Authorship:** TÂCHES (https://github.com/glittercowboy/get-shit-done) preserved as original author
- **Core Logic:** All GSD workflows, prompts, and methodologies preserved unchanged
- **Functionality:** System behavior identical between Claude Code and OpenCode versions
- **Documentation:** Original README and documentation preserved in source

---

## Verification Checklist

- [ ] No forbidden strings in ./gsd-opencode/ ("Claude Code", ~/.claude, /gsd:, etc.)
- [ ] All commands have proper "name: gsd-<command>" headers
- [ ] Tag syntax uses *text* format
- [ ] /clear replaced with /new
- [ ] ~/.claude replaced with ~/.config/opencode or .opencode/
- [ ] Tool names translated to OpenCode equivalents
- [ ] Agent names translated to OpenCode equivalents
- [ ] Directory structure matches OpenCode conventions (singular "command")
- [ ] TRANSLATION-MAPPING.md comprehensive and accurate
