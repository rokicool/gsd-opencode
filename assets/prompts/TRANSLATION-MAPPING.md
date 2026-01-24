# Translation Mapping: Claude Code → OpenCode

## Command Names

| Claude Code | OpenCode |
|-------------|----------|
| gsd:plan-phase | gsd-plan-phase |
| gsd:execute-phase | gsd-execute-phase |
| gsd:research-phase | gsd-research-phase |
| gsd:verify-phase | gsd-verify-phase |
| gsd:discuss-phase | gsd-discuss-phase |
| gsd:new-project | gsd-new-project |
| gsd:new-milestone | gsd-new-milestone |
| gsd:complete-milestone | gsd-complete-milestone |
| gsd:add-phase | gsd-add-phase |
| gsd:insert-phase | gsd-insert-phase |
| gsd:remove-phase | gsd-remove-phase |
| gsd:add-todo | gsd-add-todo |
| gsd:check-todos | gsd-check-todos |
| gsd:debug | gsd-debug |
| gsd:map-codebase | gsd-map-codebase |
| gsd:verify-work | gsd-verify-work |
| gsd:progress | gsd-progress |
| gsd:settings | gsd-settings |
| gsd:set-profile | gsd-set-profile |
| gsd:update | gsd-update |
| gsd:pause-work | gsd-pause-work |
| gsd:resume-work | gsd-resume-work |
| gsd:quick | gsd-quick |
| gsd:whats-new | gsd-whats-new |
| gsd:help | gsd-help |
| gsd:audit-milestone | gsd-audit-milestone |
| gsd:plan-milestone-gaps | gsd-plan-milestone-gaps |
| gsd:list-phase-assumptions | gsd-list-phase-assumptions |

## Tool Mapping

| Claude Code Tool | OpenCode Tool |
|------------------|---------------|
| Read | read |
| Write | write |
| Bash | bash |
| Glob | glob |
| Grep | grep |
| Edit | edit |
| WebFetch | webfetch |
| Task | Use agents directly with @ mentions |
| Patch | patch |
| Skill | skill |
| TodoWrite | todowrite |
| TodoRead | todoread |
| Question | question |

## Agent Mapping

| Claude Code Agent | OpenCode Equivalent |
|-------------------|---------------------|
| gsd-planner | gsd-planner (subagent) |
| gsd-executor | gsd-executor (subagent) |
| gsd-verifier | gsd-verifier (subagent) |
| gsd-researcher | gsd-researcher (subagent) |
| gsd-phase-researcher | gsd-phase-researcher (subagent) |
| gsd-plan-checker | gsd-plan-checker (subagent) |
| gsd-codebase-mapper | gsd-codebase-mapper (subagent) |
| gsd-debugger | gsd-debugger (subagent) |
| gsd-integration-checker | gsd-integration-checker (subagent) |
| gsd-project-researcher | gsd-project-researcher (subagent) |
| gsd-research-synthesizer | gsd-research-synthesizer (subagent) |
| gsd-roadmapper | gsd-roadmapper (subagent) |

## Example of the Custom Agent header:

** Claude Code **

``` yaml
---
name: gsd-project-researcher
description: Researches domain ecosystem before roadmap creation. Produces files in .planning/research/ consumed during roadmap creation. Spawned by /gsd-new-project or /gsd-new-milestone orchestrators.
tools: read, write, bash, grep, glob, webfetch, (optional MCP tool)
color: cyan
---
```

** OpenCode ** 

```yaml
---
name: gsd-project-researcher
description: Researches domain ecosystem before roadmap creation. Produces files in .planning/research/ consumed during roadmap creation. Spawned by /gsd-new-project or /gsd-new-milestone orchestrators.
tools:
  read: true
  write: true
  bash: true
  grep: true
  glob: true
  webfetch: true
  (optional MCP tool): true
color: "#00FFFF"
---
```

## Path Transformations

| Claude Code | OpenCode |
|-------------|----------|
| ~/.claude/ | ~/.config/opencode/ |
| ~/.claude/get-shit-done/ | ~/.config/opencode/get-shit-done/ |
| ./original/get-shit-done/commands/gsd/ | ./gsd-opencode/command/gsd/ |
| ./original/get-shit-done/get-shit-done/references/ | ./gsd-opencode/get-shit-done/references/ |
| ./original/get-shit-done/get-shit-done/templates/ | ./gsd-opencode/get-shit-done/templates/ |
| ./original/get-shit-done/get-shit-done/workflows/ | ./gsd-opencode/get-shit-done/workflows/ |
| ./original/get-shit-done/agents/ | ./gsd-opencode/agents/ |

## Command Replacements

| Claude Code | OpenCode |
|-------------|----------|
| /clear | /new |
| /gsd:command | /gsd-command |

## Tag Syntax

| Claude Code | OpenCode |
|-------------|----------|
| <sub>text</sub> | *text* |

## URL Transformations

| Claude Code | OpenCode |
|-------------|----------|
| https://raw.githubusercontent.com/glittercowboy/get-shit-done | https://raw.githubusercontent.com/rokicool/gsd-opencode |
| https://github.com/glittercowboy/get-shit-done | https://github.com/rokicool/gsd-opencode |

## Project References

| Claude Code | OpenCode |
|-------------|----------|
| get-shit-done-cc | gsd-opencode |
| get-shit-done | get-shit-done (preserved in references as original name) |

## Frontmatter Field Changes

| Claude Code | OpenCode |
|-------------|----------|
| name: gsd:command | name: gsd-command |
| agent: gsd-xxx | agent: gsd-xxx |
| tools: Read, Write, ... | tools: read, write, ... (lowercase) |
| allowed-tools: [Read, Write] | allowed-tools: [read, write] (lowercase) |

## Variable Usage

| Claude Code | OpenCode |
|-------------|----------|
| All arguments | $ARGUMENTS (preserved) |

## Config File

| Claude Code | OpenCode |
|-------------|----------|
| ~/.claude/config.json | ~/.config/opencode/opencode.json or .opencode/opencode.json |
