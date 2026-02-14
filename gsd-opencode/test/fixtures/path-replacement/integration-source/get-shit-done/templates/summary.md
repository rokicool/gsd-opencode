---
template: summary
description: Summary template for phase completion
version: 1.0.0
used_by:
  - @gsd-opencode/workflows/execute-plan.md
  - @gsd-opencode/workflows/verify-phase.md
related_templates:
  - @gsd-opencode/templates/context.md
  - @gsd-opencode/templates/verification-report.md
references:
  - @gsd-opencode/agents/gsd-executor.md
  - @gsd-opencode/agents/gsd-verifier.md
---

# Summary Template

This template is used to create summary documentation for completed phases and plans.

## Template Structure

The summary template follows a standardized structure defined in @gsd-opencode/templates/context.md.

## Frontmatter

The frontmatter includes references to:
- Used by: @gsd-opencode/workflows/execute-plan.md
- Related: @gsd-opencode/templates/verification-report.md

## Usage

### Basic Usage

```markdown
---
template: summary
phase: 01-foundation
plan: 01-01
---

# Phase 1 Plan 1 Summary

See @gsd-opencode/templates/context.md for context.
```

### With Cross-References

Include references to:
- Agents: @gsd-opencode/agents/gsd-executor.md
- Commands: @gsd-opencode/command/gsd/test.md
- Workflows: @gsd-opencode/workflows/execute-plan.md

## Sections

### Accomplishments

Document what was accomplished, referencing:
- @gsd-opencode/templates/verification-report.md for verification steps
- @gsd-opencode/workflows/verify-phase.md for verification workflow

### Files Created

List files created, such as:
- @gsd-opencode/agents/test-agent/SKILL.md
- @gsd-opencode/command/gsd/test.md
- @gsd-opencode/get-shit-done/templates/summary.md

### Decisions Made

Reference decision templates:
- @gsd-opencode/templates/context.md for context
- @gsd-opencode/get-shit-done/references/planning-config.md for configuration

## Integration

This template integrates with:
- Execution workflow: @gsd-opencode/workflows/execute-plan.md
- Verification workflow: @gsd-opencode/workflows/verify-phase.md
- Agent skills: @gsd-opencode/agents/gsd-executor.md

## Output Format

The output should follow patterns defined in:
- @gsd-opencode/templates/context.md (context formatting)
- @gsd-opencode/get-shit-done/templates/summary.md (this template)
- @gsd-opencode/templates/verification-report.md (verification reports)

## Example Output

```markdown
# Phase 1: Foundation Summary

**Substantive one-liner describing outcome**

## Performance
- **Duration:** 30 min
- **Tasks:** 5

## Accomplishments
- Created agent at @gsd-opencode/agents/test-agent/SKILL.md
- Implemented command at @gsd-opencode/command/gsd/test.md

## Files Created
- @gsd-opencode/agents/test-agent/SKILL.md
- @gsd-opencode/command/gsd/test.md
```

## See Also

- @gsd-opencode/templates/context.md
- @gsd-opencode/templates/verification-report.md
- @gsd-opencode/workflows/execute-plan.md
- @gsd-opencode/agents/gsd-executor.md
