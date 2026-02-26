# Feature Request: Add `/gsd-bug` Command for In-Workflow Bug Reporting

## Summary

Add a new GSD command `/gsd-bug` that allows users to file bugs directly from within the GSD workflow, without leaving the OpenCode session.

## Problem Statement

When GSD workflows encounter errors (e.g., agent spawning failures, tool unavailability), users must:
1. Manually document the issue
2. Exit the session
3. Navigate to GitHub
4. Create an issue manually

This creates friction and reduces bug report quality (context is lost).

## Proposed Solution

Add `/gsd-bug` command that:
1. Captures current session context (phase, state, recent errors)
2. Presents a form for bug description
3. Creates a GitHub issue via `gh` CLI
4. Returns the issue URL to the user

## User Experience

```
/gsd-bug

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► REPORT BUG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select bug category:
1. Workflow failure (agent didn't spawn)
2. Tool error (invalid tool)
3. Planning issue (bad output)
4. Execution issue (code error)
5. Other

> [user selects]

Describe the bug:
> [user types description]

Creating issue...

✓ Issue created: https://github.com/rokicool/gsd-opencode/issues/42

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Technical Implementation

### New Files
- `workflows/bug.md` - Bug reporting workflow
- `bin/gsd-tools.cjs bug` - CLI handler

### Changes to Existing Files
- Add `bug` subcommand to CLI
- Add command to help output

### Dependencies
- Uses existing `gh` CLI for GitHub issue creation
- Reuses existing GSD tooling infrastructure

## Acceptance Criteria

- [ ] `/gsd-bug` command is available
- [ ] User can select bug category
- [ ] User can describe the bug
- [ ] Issue is created on GitHub
- [ ] Issue includes relevant context (phase, error, session info)
- [ ] Command works without leaving OpenCode

## Example Issue Format

```markdown
## Bug Report

**Category:** Workflow failure
**GSD Version:** 1.21.0
**Phase:** 1 (plan-phase)

### Description
[User's description]

### Session Context
- Phase: 01-database-auth-foundation
- Command: /gsd-plan-phase 1
- Error: Invalid agent type "gsd-planner"

### Steps to Reproduce
1. Run /gsd-plan-phase 1
2. ...
```
