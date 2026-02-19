---
command: test
description: Test command for integration testing
category: testing
related:
  - @gsd-opencode/agents/test-agent/SKILL.md
  - @gsd-opencode/workflows/execute-plan.md
  - @gsd-opencode/templates/context.md
implementation:
  - @gsd-opencode/command/gsd/test-impl.js
  - @gsd-opencode/command/gsd/test-utils.js
---

# Test Command

This is a test command used for integration testing of path replacement functionality.

## Syntax

```
gsd test [options]
```

## Description

The test command references various @gsd-opencode/ paths throughout its documentation.

## Related Documentation

### Agents
- Test agent: @gsd-opencode/agents/test-agent/SKILL.md
- Executor agent: @gsd-opencode/agents/gsd-executor.md

### Workflows
- Execution workflow: @gsd-opencode/workflows/execute-plan.md
- Verification workflow: @gsd-opencode/workflows/verify-phase.md

### Templates
- Context template: @gsd-opencode/templates/context.md
- Summary template: @gsd-opencode/templates/summary.md
- Research template: @gsd-opencode/templates/research.md

## Implementation Details

The command implementation uses:
- Core utilities from @gsd-opencode/get-shit-done/templates/
- Helper functions from @gsd-opencode/command/gsd/test-utils.js
- Main logic in @gsd-opencode/command/gsd/test-impl.js

## Examples

### Basic Usage

```bash
# Run test with default options
gsd test

# Run with verbose output
gsd test --verbose
```

### Advanced Usage

```bash
# Test with specific agent
gsd test --agent @gsd-opencode/agents/test-agent/SKILL.md

# Test with custom template
gsd test --template @gsd-opencode/templates/custom.md
```

## See Also

- @gsd-opencode/command/gsd/help.md for general help
- @gsd-opencode/templates/UAT.md for user acceptance testing
- @gsd-opencode/get-shit-done/templates/summary.md for output formatting
