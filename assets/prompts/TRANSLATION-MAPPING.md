# TRANSLATION MAPPING: Claude Code → OpenCode

This document provides a comprehensive mapping between Claude Code conventions (used by GSD) and OpenCode conventions for translating commands, agents, workflows, and references.

## Table of Contents

1. [Tool Mappings](#tool-mappings)
2. [Agent Mappings](#agent-mappings)
3. [Command Structure Differences](#command-structure-differences)
4. [Path Conversion Rules](#path-conversion-rules)
5. [XML Tag Conversions](#xml-tag-conversions)
6. [Variable Substitution](#variable-substitution)
7. [MCP Server Integration](#mcp-server-integration)
8. [Common Patterns and Examples](#common-patterns-and-examples)
9. [Special Cases and Gotchas](#special-cases-and-gotchas)

---

## Tool Mappings

| Claude Code Tool | OpenCode Tool | Notes | Syntax Differences |
|-----------------|---------------|--------|-------------------|
| `Read` | `read` | Direct mapping - reads file contents | Same parameters: `filePath`, optional `offset`/`limit` |
| `Write` | `write` | Direct mapping - creates/overwrites files | Same parameters: `content`, `filePath` |
| `Bash` | `bash` | Direct mapping - executes shell commands | Same parameters: `command`, optional `description`, `timeout`, `workdir` |
| `Glob` | `glob` | Direct mapping - pattern-based file search | Same parameters: `pattern`, optional `path` |
| `Grep` | `grep` | Direct mapping - regex content search | Same parameters: `pattern`, optional `path`, `include` |
| `Task` | **Task** | Direct mapping - spawns subagents | Same functionality: prompts, subagent_type, description |
| `WebFetch` | `webfetch` | Direct mapping - fetches web content | Same parameters: `url`, `format` (text/markdown/html), `timeout` |
| `Edit` | `edit` | Direct mapping - exact string replacement | Same parameters: `filePath`, `oldString`, `newString`, optional `replaceAll` |
| MCP tools (mcp__*) | **MCP tools** | Direct mapping - same tool names | OpenCode uses same MCP server syntax |
| AskUserQuestion | `question` | Direct mapping - prompts user for input | Both support structured questions with options |
| **MultiEdit** | `multiedit` | Batch edits | OpenCode-specific for multiple simultaneous edits |
| **Patch** | `patch` | Apply diff/patch files | OpenCode-specific for unified patches |

### Tool Behavior Differences

**Read Tool:**
- Claude Code: Returns content with line numbers (cat -n format)
- OpenCode: Returns content with line numbers (cat -n format)
- **Translation:** No changes needed

**Bash Tool:**
- Claude Code: Default timeout 120000ms (2 minutes)
- OpenCode: Default timeout 300000ms (5 minutes) configurable via `provider.options.timeout`
- **Translation:** Adjust timeout mentions if specific to 2 minutes

**Edit Tool:**
- Claude Code: Requires `oldString` to be exact match
- OpenCode: Same requirement, but also supports `replaceAll` for multiple occurrences
- **Translation:** Keep exact match requirement, add note about `replaceAll` if needed

---

## Agent Mappings

### Agent Types

| Claude Code | OpenCode | Notes |
|-------------|-----------|-------|
| `subagent_type` in Task | `mode` in agent config | Different terminology, same concept |
| Agent files in `~/.claude/agents/` or `.claude/agents/` | Agent files in `~/.config/opencode/agents/` or `.opencode/agents/` | Different config directory locations |
| `color` attribute (e.g., `color: green`) | No equivalent | OpenCode doesn't support color customization in agent specs |
| Agent specification via markdown | Agent specification via markdown or JSON | Both support markdown, OpenCode also supports JSON config |

### Agent Specification Structure

**Claude Code Agent Frontmatter:**
```yaml
---
name: gsd:planner
description: Creates executable phase plans with task breakdown...
tools: Read, Write, Bash, Glob, Grep, WebFetch, mcp__context7__*
color: green
---
```

**OpenCode Agent Frontmatter:**
```yaml
---
name: gsd-planner
description: Creates executable phase plans with task breakdown...
mode: subagent
model: anthropic/claude-sonnet-4-5
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
  webfetch: true
---
```

### Key Differences

1. **Naming:**
   - Claude Code: `name: agent-name` (required)
   - OpenCode: `name: agent-name` (required)

2. **Tool Specification:**
   - Claude Code: Comma-separated list `tools: Read, Write, Bash`
   - OpenCode: Object with boolean flags `tools: { read: true, write: true }`

3. **Mode:**
   - Claude Code: Implicit - determined by how agent is invoked
   - OpenCode: Explicit `mode: primary` or `mode: subagent`

4. **MCP Tools:**
   - Claude Code: Listed in tools array `mcp__context7__*`
   - OpenCode: Same syntax supported via wildcard patterns in tools config

### Agent Configuration Options

| Feature | Claude Code | OpenCode | Translation |
|---------|-------------|-----------|-------------|
| **Temperature** | Not available | `temperature: 0.1` | Add to OpenCode agent spec if needed |
| **Max Steps** | Not available | `maxSteps: 10` | Add to limit agentic iterations |
| **Model Override** | Not available | `model: provider/model-id` | Add to OpenCode agent spec |
| **Permissions** | Via `allowed-tools` in commands | Via `permission` object | Convert format |
| **Hidden agents** | Not available | `hidden: true` | Add if agent should be internal-only |

---

## Command Structure Differences

### Frontmatter Comparison

**Claude Code Command:**
```yaml
---
name: gsd:plan-phase
description: Create detailed execution plan for a phase (PLAN.md) with verification loop
argument-hint: "[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---
```

**OpenCode Command:**
```yaml
---
name: gsd-plan-phase
description: Create detailed execution plan for a phase with verification loop
agent: gsd-planner
model: anthropic/claude-sonnet-4-5
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
  webfetch: true
  subtask: true
---
```

### Frontmatter Field Mappings

| Claude Code Field | OpenCode Field | Translation Rule |
|------------------|----------------|-----------------|
| `name: gsd:name` | `name: gsd-name` | Replace colon `:` in the name with `-` |
| `argument-hint` | **N/A** | Not supported, document usage in description |
| `allowed-tools` | `tools` object | Convert array to key-value object |
| `agent: agent-name` | `agent: agent-name` | Same field, reference OpenCode agent |
| `color` | **N/A** | Remove - not supported in OpenCode |
| **(none)** | `model` | Add if specific model needed |
| **(none)** | `subtask` | Add if should always trigger subagent |
| **(none)** | `template` | Use if command defined in JSON instead of markdown |

### Command Naming Conventions

**Claude Code:**
- Syntax: `/gsd:command-name` (colon syntax)
- Location: `~/.claude/commands/gsd/*.md` or `.claude/commands/gsd/*.md`

**OpenCode:**
- Syntax: `/command-name` (no colons)
- Location: `~/.config/opencode/command/gsd/*.md` or `.opencode/command/gsd/*.md`

**Translation Rule:**
```
Claude Code: /gsd:plan-phase
OpenCode:    /gsd-plan-phase
```

Note: OpenCode doesn't support `:` in command names. Replace `:` with `-`.

### Command Directory Structure

**Claude Code:**
```
~/.claude/
  commands/
    gsd/
      new-project.md
      plan-phase.md
      execute-phase.md
```

**OpenCode:**
```
~/.config/opencode/  (or .opencode/)
  command/
    gsd/
      new-project.md
      plan-phase.md
      execute-phase.md
```

---

## Path Conversion Rules

### Config Directory Locations

| Claude Code | OpenCode | Usage |
|-------------|-----------|-------|
| `~/.claude/` (global) | `~/.config/opencode/` (global) | User-wide config |
| `./.claude/` (local) | `./.opencode/` (local) | Project-specific config |

**Translation Rule:**
```
Claude Code: ~/.claude/get-shit-done/
OpenCode:    ~/.config/opencode/gsd/
```

### Path Patterns in Content

**Home directory tilde expansion:**
```
Claude Code: @~/.claude/get-shit-done/workflows/execute-plan.md
OpenCode:    @~/.config/opencode/get-shit-done/workflows/execute-plan.md
```

**Relative paths:** No changes needed for same-level directories.

### Directory Naming Conventions

**Claude Code uses:** `commands/gsd/` (nested structure)

**OpenCode expects:** `command/gsd/` (nested structure)

For GSD translation, use:
```
OpenCode: command/gsd/new-project.md
         command/gsd/plan-phase.md
```

### File Reference Patterns

Both systems use `@filename` syntax for file references in content.

**Claude Code:**
```markdown
<context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</context>
```

**OpenCode:**
```markdown
<context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</context>
```

---

## XML Tag Conversions

### Supported XML Tags

Both Claude Code and OpenCode use XML-style tags for structuring prompts. Most tags work identically.

**Common Tags (No Changes):**
- `<objective>` - Purpose of the task
- `<context>` - Background information
- `<process>` - Step-by-step instructions
- `<step>` - Individual steps with `name` attribute
- `<success_criteria>` - Completion requirements
- `<notes>` - Additional information

### Tag Attribute Differences

**Claude Code:**
```xml
<step name="load_project_state" priority="first">
```

**OpenCode:**
```xml
<step name="load_project_state" priority="first">
```

No translation needed - attributes work the same.

### Special Tag Conversions

**Claude Code Subscript Tag:**
```xml
<sub>/clear first → fresh context window</sub>
```

**OpenCode Markdown Emphasis:**
```markdown
*/clear first → fresh context window*
```

**Translation Rule:** Replace `<sub>` tags with markdown `*` for emphasis.

### Conditional Tags

**Claude Code uses:**
```xml
<if mode="yolo">
  Execute immediately
</if>

<if mode="interactive" OR="custom with gates.execute_next_plan true">
  Ask for confirmation
</if>
```

**OpenCode handles conditionals differently:**
- Conditional logic should be moved to step-based process descriptions
- Use descriptive language instead of XML conditionals

**Translation Rule:** Convert XML conditionals to markdown with conditional language.

---

## Variable Substitution

### Command Arguments

**Claude Code:**
```markdown
<context>
Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)
</context>
```

**OpenCode:**
```markdown
<context>
Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)
</context>
```

**Claude Code:**
```markdown
<context>
  All arguments become the phase description
</context>
```
**OpenCode:**
```markdown
<context>
  `$ARGUMENTS` become the phase description
</context>
```

**No changes needed** - both use `$ARGUMENTS` for all arguments.

### Positional Parameters

**OpenCode supports:**
```markdown
Create a file named $1 in the directory $2 with content: $3
```

**Usage:**
```bash
/command arg1 arg2 arg3
```

**Translation Rule:** Keep `$ARGUMENTS` for bulk passing, or use `$1`, `$2`, etc. for positional parsing.

### Shell Command Injection

**Both support:**
```markdown
Current test results:
!`npm test`
```

**Translation Rule:** No changes needed - syntax is identical.

---

## MCP Server Integration

### MCP Tool References

**Claude Code:**
```yaml
tools: Read, Write, Bash, Glob, Grep, WebFetch, mcp__context7__*
```

**OpenCode:**
```yaml
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
  webfetch: true
  context7_*: true  # MCP server tools
```

### MCP Configuration

**Claude Code MCP Config:** Stored in `~/.claude/claude_desktop_config.json`

**OpenCode MCP Config:** Defined in `opencode.json`

**Claude Code Format:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

**OpenCode Format:**
```json
{
  "mcp": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

**Translation Rule:** Convert `mcpServers` to `mcp`, add `type: "stdio"` for stdio-based servers.

### MCP Tool Wildcards

**Claude Code:**
```yaml
tools: mcp__context7__*
```

**OpenCode:**
```yaml
tools:
  context7_*: true
```

**Translation Rule:** Replace `mcp__prefix__*` with `prefix_*` and use tools object format.

---

## Common Patterns and Examples

### Example 1: Simple Command Translation

**Claude Code (`commands/gsd/help.md`):**
```yaml
---
name: gsd:help
description: Show all available GSD commands and usage guide
argument-hint: [command-name]
allowed-tools:
  - Read
  - Bash
---

<objective>
Provide help information for GSD commands.

User's query: $ARGUMENTS
```

**OpenCode (`command/gsd/help.md`):**
```yaml
---
name: gsd-help
description: Show all available GSD commands and usage guide
tools:
  read: true
  bash: true
---

<objective>
Provide help information for GSD commands.

User's query: $ARGUMENTS
```

### Example 2: Agent Command Translation

**Claude Code (`commands/gsd/plan-phase.md`):**
```yaml
---
name: gsd:plan-phase
description: Create detailed execution plan for a phase (PLAN.md) with verification loop
argument-hint: "[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---

<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase.

Phase number: $ARGUMENTS

Spawn gsd-planner agent.
```

**OpenCode (`command/gsd/plan-phase.md`):**
```yaml
---
name: gsd-plan-phase
description: Create detailed execution plan for a phase (PLAN.md) with verification loop
agent: gsd-planner
subtask: true
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
  webfetch: true
  context7_*: true
---

<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase.

Phase number: $ARGUMENTS

Invoke @gsd-planner agent.
```

### Example 3: Agent Specification Translation

**Claude Code (`agents/gsd-planner.md`):**
```yaml
---
name: gsd-planner
description: Creates executable phase plans with task breakdown, dependency analysis, and goal-backward verification. Spawned by /gsd:plan-phase orchestrator.
tools: Read, Write, Bash, Glob, Grep, WebFetch, mcp__context7__*
color: green
---

<role>
You are a GSD planner. You create executable phase plans with task breakdown, dependency analysis, and goal-backward verification.

You are spawned by:

- `/gsd:plan-phase` orchestrator (standard phase planning)
- `/gsd:plan-phase --gaps` orchestrator (gap closure planning from verification failures)
- `/gsd:plan-phase` orchestrator in revision mode (updating plans based on checker feedback)

Your job: Produce PLAN.md files that Claude executors can implement without interpretation. Plans are prompts, not documents that become prompts.
</role>
```

**OpenCode (`agents/gsd-planner.md`):**
```yaml
---
name: gsd-planner
description: Creates executable phase plans with task breakdown, dependency analysis, and goal-backward verification. Spawned by /gsd-plan-phase orchestrator.
mode: subagent
model: anthropic/claude-sonnet-4-5
tools:
  read: true
  write: true
  bash: true
  glob: true
  grep: true
  webfetch: true
  context7_*: true
---

<role>
You are a GSD planner. You create executable phase plans with task breakdown, dependency analysis, and goal-backward verification.

You are spawned by:

- `/gsd-plan-phase` orchestrator (standard phase planning)
- `/gsd-plan-phase --gaps` orchestrator (gap closure planning from verification failures)
- `/gsd-plan-phase` orchestrator in revision mode (updating plans based on checker feedback)

Your job: Produce PLAN.md files that executors can implement without interpretation. Plans are prompts, not documents that become prompts.
</role>
```

### Example 4: File Reference Path Conversion

**Claude Code:**
```markdown
<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>
```

**OpenCode:**
```markdown
<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>
```

### Example 5: XML Tag Conversion

**Claude Code:**
```xml
<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/gsd:execute-phase {X}

<sub>/clear first → fresh context window</sub>
</offer_next>
```

**OpenCode:**
```markdown
<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/gsd-execute-phase {X}

*/clear first → fresh context window*
</offer_next>
```

### Example 6: Tool Specification Conversion

**Claude Code:**
```yaml
---
tools: Read, Write, Edit, Bash, Glob, Grep, Task, WebFetch
```

**OpenCode:**
```yaml
---
tools:
  read: true
  write: true
  edit: true
  bash: true
  glob: true
  grep: true
  webfetch: true
```

---

## Special Cases and Gotchas

### 1. Colon in Command Names

**Problem:** OpenCode doesn't support `:` in command names.

**Solution:**
```
Claude Code: /gsd:plan-phase
OpenCode:    /gsd-plan-phase
```

Apply this to all command files and references in content.

### 2. Agent Spawning

**Claude Code uses:**
```python
Task(
    prompt=filled_prompt,
    subagent_type="gsd-planner",
    description="Plan Phase {phase}"
)
```

**OpenCode uses:**
```python
# Agent invocation via @ mention
@gsd-planner

# Or via Task tool (if available)
Task(
    prompt=filled_prompt,
    subagent_type="gsd-planner",
    description="Plan Phase {phase}"
)
```

**Translation:** Update agent spawn syntax to use `@agent-name` format or Task tool as appropriate.

### 3. Permission Handling

**Claude Code:** Permissions in `.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(date:*)",
      "Bash(git add:*)"
    ]
  }
}
```

**OpenCode:** Permissions in `opencode.json`:
```json
{
  "permission": {
    "bash": "allow",
    "edit": "ask"
  }
}
```

**Translation:** Convert command-specific allow lists to tool-level permissions.

### 4. Config File Loading

**Claude Code:** Auto-loads from `~/.claude/` and `.claude/`

**OpenCode:** Loads from multiple sources in precedence order:
1. Remote config (`.well-known/opencode`)
2. Global config (`~/.config/opencode/opencode.json`)
3. Custom config (`OPENCODE_CONFIG` env var)
4. Project config (`opencode.json`)
5. `.opencode` directories
6. Inline config (`OPENCODE_CONFIG_CONTENT` env var)

**Translation:** Ensure config files are in correct locations and format.

### 5. Color Attribute Removal

**Claude Code:** Supports `color: green` in agent specs

**OpenCode:** Doesn't support color

**Translation:** Remove `color` attribute from agent frontmatter.

### 6. Subscript Tags

**Claude Code:** Uses `<sub>` for subscript text

**OpenCode:** No special subscript support

**Translation:** Replace `<sub>text</sub>` with markdown `*text*` (emphasis).

### 7. Agent Directory Structure

**Claude Code:**
```
~/.claude/agents/gsd-planner.md
```

**OpenCode:**
```
~/.config/opencode/agents/gsd-planner.md
```

**Translation:** Update directory paths in file references.

### 8. Argument Hints

**Claude Code:** Uses `argument-hint` in frontmatter

**OpenCode:** No equivalent field

**Translation:** Move argument hint information to `description` field.

### 9. Multiple Agent Modes

**Claude Code:** Single agent type, mode determined by invocation

**OpenCode:** Explicit `mode: primary` or `mode: subagent`

**Translation:** Add `mode: subagent` to all GSD agent specs (they're invoked as subagents).

### 10. Template vs Filename-based Commands

**Claude Code:** Always filename-based (command name from `name` field)

**OpenCode:** Supports both filename-based AND JSON template-based

**Translation:** Use filename-based approach (simpler, follows GSD pattern).

### 11. Shell Output Injection

**Both support:** `!`command`` syntax

**Gotcha:** Commands run in project root directory

**Translation:** No changes needed, but be aware of working directory.

### 12. File References with `@`

**Both support:** `@filename` syntax

**Gotcha:** Relative paths are resolved relative to command file location in both systems

**Translation:** Ensure relative paths work from new locations (`.opencode/` instead of `.claude/`).

### 13. MCP Server Tool Patterns

**Claude Code:** `mcp__server__toolname` or `mcp__server__*` wildcard

**OpenCode:** `server_toolname` or `server_*` wildcard (in tools object)

**Translation:** Replace `mcp__` prefix with direct tool names in tools object.

### 14. Default Timeout Differences

**Claude Code Bash:** Default 120000ms (2 minutes)

**OpenCode Bash:** Default 300000ms (5 minutes)

**Translation:** Adjust timeout documentation if specific timeouts are mentioned.

### 15. Agent Orchestration Patterns

**Claude Code:** Uses explicit `Task()` calls with `subagent_type`

**OpenCode:** Uses `@agent-name` mentions OR Task tool

**Translation:** Update orchestrator workflows to use `@agent-name` syntax for clarity.

### 16. Hidden Agents

**Claude Code:** No concept of hidden agents

**OpenCode:** Supports `hidden: true` to hide from `@` autocomplete

**Translation:** Add `hidden: true` to internal-only agents (e.g., gsd-continuation).

### 17. Agent Skills

**Claude Code:** No equivalent

**OpenCode:** Supports `SKILL.md` files loaded via `skill` tool

**Translation:** Convert any agent-embedded reference patterns to skill files if appropriate.

### 18. Custom Tools

**Claude Code:** Limited to built-in tools + MCP

**OpenCode:** Supports custom tools defined in config

**Translation:** Consider extracting repeated patterns into custom tools for cleaner workflows.

### 19. Variable Scope

**Both:** `$ARGUMENTS` in commands is replaced with all user-provided arguments

**Gotcha:** OpenCode also supports `$1`, `$2`, etc. for positional arguments

**Translation:** Can use positional arguments if needed for more complex argument parsing.

### 20. Directory Naming

**Claude Code:** Uses nested `commands/gsd/` structure

**OpenCode:**  Uses nested `command/gsd/` structure

**Translation:** Use `command-name.md` naming pattern in `commands/gsd/` directory.

---

## Translation Checklist

When translating a file from Claude Code to OpenCode:

### Commands
- [ ] Update filename: `command.md` → `command.md`
- [ ] Convert `allowed-tools` array to `tools` object
- [ ] Remove `argument-hint`, move to `description`
- [ ] Remove `color` attribute
- [ ] Replace `:` with `-` in command references
- [ ] Add `subtask: true` if agent invocation needed
- [ ] Update `@` references to new paths
- [ ] Replace `<sub>` tags with `*` emphasis
- [ ] Replace `get-shit-done-cc` with `gsd-opencode`
- [ ] Replace `AskUserQuestion` with `question tool`
- [ ] Replace `https://raw.githubusercontent.com/glittercowboy/get-shit-done` with `https://raw.githubusercontent.com/rokicool/gsd-opencode`
- [ ] Update MCP tool patterns (`mcp__*` → direct names)

### Agents
- [ ] Update location: `.claude/agents/` → `.opencode/agents/`
- [ ] Convert `tools` list to `tools` object
- [ ] Add `mode: subagent` (GSD agents are subagents)
- [ ] Remove `color` attribute
- [ ] Add `model` if specific model needed
- [ ] Update `@` references to new paths
- [ ] Replace `subagent_type="..."` with `@agent-name` in content

### Workflows/Templates/References
- [ ] Update `@` file reference paths
- [ ] Replace `~/.claude/` with `~/.config/opencode/`
- [ ] Replace `.claude/` with `.opencode/`
- [ ] Replace command names: `/gsd:name` → `/gsd-name`
- [ ] Replace `<sub>` tags with `*` emphasis
- [ ] Update agent invocation syntax if present

### Config Files
- [ ] Update MCP config format (`mcpServers` → `mcp`)
- [ ] Convert permissions format if needed
- [ ] Ensure files in correct directory locations
- [ ] Add schema reference: `"$schema": "https://opencode.ai/config.json"`

---

## Quick Reference

### Path Replacements

| Claude Code | OpenCode |
|-------------|-----------|
| `~/.claude/` | `~/.config/opencode/` |
| `./.claude/` | `./.opencode/` |
| `~/.claude/get-shit-done/` | `~/.config/opencode/get-shit-done/` |
| `./.claude/get-shit-done/` | `./.opencode/get-shit-done/` |
| `commands/gsd/` | `command/gsd/` |

### Command Name Replacements

| Claude Code | OpenCode |
|-------------|-----------|
| `/gsd:new-project` | `/gsd-new-project` |
| `/gsd:plan-phase` | `/gsd-plan-phase` |
| `/gsd:execute-phase` | `/gsd-execute-phase` |
| `/gsd:verify-work` | `/gsd-verify-work` |

### Frontmatter Field Replacements

| Claude Code | OpenCode | Action |
|-------------|-----------|--------|
| `allowed-tools: [...]` | `tools: {...}` | Convert array to object |
| `argument-hint: ...` | Move to description | No separate field |
| `color: ...` | **Remove** | Not supported |
| `agent: name` | `agent: name` | Same field |
| **(none)** | `mode: primary/subagent` | Add for agents |
| **(none)** | `model: provider/id` | Add if needed |
| **(none)** | `subtask: true/false` | Add for commands |

### Syntax Replacements

| Claude Code | OpenCode |
|-------------|-----------|
| `<sub>text</sub>` | `*text*` |
| `tools: Read, Write, Bash` | `tools: { read: true, write: true, bash: true }` |
| `mcp__context7__*` | `context7_*: true` |
| `Task(subagent_type="...")` | `@agent-name` or `Task(subagent_type="...")` |

---

## Summary

This mapping document provides comprehensive guidance for translating GSD from Claude Code to OpenCode. Key takeaways:

1. **Structure:** Both systems are similar - commands, agents, workflows, references
2. **Paths:** Update config directory locations (`.claude/` → `.opencode/` or `~/.config/opencode/`)
3. **Commands:** Rename to avoid colons, convert frontmatter format
4. **Agents:** Add explicit mode, convert tool list to object, remove color
5. **Content:** Update file references, replace `<sub>` tags, update command names
6. **MCP:** Update configuration format and tool patterns

By following this mapping, you can systematically translate all GSD components to work with OpenCode while preserving the core functionality and workflow.
