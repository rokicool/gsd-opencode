# Translation Mapping: Claude Code → OpenCode

This document maps all transformations from the original Claude Code get-shit-done system to the OpenCode adaptation.

## Project Reference
| Claude Code | OpenCode |
|-------------|----------|
| get-shit-done-cc | gsd-opencode |
| glittercowboy | rokicool |
| https://raw.githubusercontent.com/glittercowboy/get-shit-done | https://raw.githubusercontent.com/rokicool/gsd-opencode |

## Command Names
| Claude Code | OpenCode |
|-------------|----------|
| gsd:new-project | gsd-new-project |
| gsd:plan-phase | gsd-plan-phase |
| gsd:execute-phase | gsd-execute-phase |
| gsd:research-phase | gsd-research-phase |
| gsd:discuss-phase | gsd-discuss-phase |
| gsd:verify-work | gsd-verify-work |
| gsd:debug | gsd-debug |
| gsd:map-codebase | gsd-map-codebase |
| gsd:add-phase | gsd-add-phase |
| gsd:remove-phase | gsd-remove-phase |
| gsd:insert-phase | gsd-insert-phase |
| gsd:new-milestone | gsd-new-milestone |
| gsd:complete-milestone | gsd-complete-milestone |
| gsd:plan-milestone-gaps | gsd-plan-milestone-gaps |
| gsd:audit-milestone | gsd-audit-milestone |
| gsd:progress | gsd-progress |
| gsd:pause-work | gsd-pause-work |
| gsd:resume-work | gsd-resume-work |
| gsd:add-todo | gsd-add-todo |
| gsd:check-todos | gsd-check-todos |
| gsd:list-phase-assumptions | gsd-list-phase-assumptions |
| gsd:whats-new | gsd-whats-new |
| gsd:update | gsd-update |

## Tool Mapping
| Claude Code Tool | OpenCode Tool |
|------------------|---------------|
| Read | read |
| Write | write |
| Edit | edit |
| Bash | bash |
| Glob | glob |
| Grep | grep |
| WebFetch | webfetch |
| WebSearch | utilize webfetch with access to search engines |
| AskUserQuestion | question |
| TodoWrite | todowrite |
| SlashCommand | (invoke via direct /command execution) |
| Task | (invoke via @agent mention) |

## Agent Mapping
| Claude Code Agent | OpenCode Agent |
|-------------------|----------------|
| gsd-planner | gsd-planner (custom) |
| gsd-executor | gsd-executor (custom) |
| gsd-verifier | gsd-verifier (custom) |
| gsd-researcher | gsd-researcher (custom) |
| gsd-phase-researcher | gsd-phase-researcher (custom) |
| gsd-project-researcher | gsd-project-researcher (custom) |
| gsd-debugger | gsd-debugger (custom) |
| gsd-roadmapper | gsd-roadmapper (custom) |
| gsd-plan-checker | gsd-plan-checker (custom) |
| gsd-integration-checker | gsd-integration-checker (custom) |
| gsd-codebase-mapper | gsd-codebase-mapper (custom) |
| gsd-research-synthesizer | gsd-research-synthesizer (custom) |

Note: These are custom OpenCode agents that need to be created in the agents/ directory. OpenCode's built-in agents (Build, Plan, General, Explore) can be referenced where appropriate.

## Path Transformations
| Claude Code | OpenCode |
|-------------|----------|
| ~/.claude/ | ~/.config/opencode/ or .opencode/ |
| ~/.claude/get-shit-done/ | ~/.config/opencode/get-shit-done/ or .opencode/get-shit-done/ |
| ./commands/gsd/ | ./command/gsd/ |
| ./get-shit-done/references/ | ./get-shit-done/references/ |
| ./get-shit-done/templates/ | ./get-shit-done/templates/ |
| ./get-shit-done/workflows/ | ./get-shit-done/workflows/ |
| ./agents/ | ./agents/ |

## Command Replacements
| Claude Code | OpenCode |
|-------------|----------|
| /clear | /new |
| /gsd:subcommand | /gsd-subcommand |

## Tag Syntax
| Claude Code | OpenCode |
|-------------|----------|
| <sub>text</sub> | *text* (single star) |

## Variable Syntax
| Claude Code | OpenCode |
|-------------|----------|
| "All arguments become $ARGUMENTS" | $ARGUMENTS |

## Frontmatter Adjustments

### Command files:
- **name**: Must use `gsd-*` format (no colons)
  - Before: `name: gsd:plan-phase`
  - After: `name: gsd-plan-phase`

### Agent files:
- **tools**: Use OpenCode tool names (read, write, bash, glob, grep, webfetch, question)
- **allowed-tools**: Same as tools
- **mode**: "primary" or "subagent" (OpenCode terminology)

## File Category Counts

### Commands: 22 files
### Agents: 11 files
### References: 7 files
### Templates: 21 files
### Workflows: 12 files
### Total: 73 files to translate

## Special Notes

1. **Frontmatter fields**:
   - Commands use: `name`, `description`, `argument-hint`, `agent`, `allowed-tools`
   - Agents use: `name`, `description`, `mode`, `tools` or `allowed-tools`

2. **Subagent invocation**:
   - Claude Code uses: `Task(prompt="...", subagent_type="agent-name", description="...")`
   - OpenCode uses: Invoke via `@agent-name` in messages or use skill tool

3. **Context file references**:
   - Keep using `@path/to/file.md` syntax (works in OpenCode)

4. **MCP server references**:
   - Original uses: `mcp__context7__*`
   - OpenCode supports MCP, but specific tool names may vary
   - For now, remove or mark as optional

5. **Bash command patterns**:
   - Keep all bash commands as-is (they work in OpenCode)

## Key Terminology Changes

| Claude Code Term | OpenCode Term |
|-----------------|---------------|
| Claude | OpenCode |
| Claude Code | OpenCode |
| AskUserQuestion | question tool |
| subagent_type | mode (primary/subagent) |
| allowed-tools | tools |
