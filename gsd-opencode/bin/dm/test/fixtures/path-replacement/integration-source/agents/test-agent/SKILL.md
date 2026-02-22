---
name: Test Agent
description: A test agent for integration testing
version: 1.0.0
references:
  - @gsd-opencode/templates/summary.md
  - @gsd-opencode/workflows/execute-plan.md
  - @gsd-opencode/agents/test-agent/config.md
skills:
  - path: @gsd-opencode/agents/test-agent/skills/core.md
    level: expert
  - path: @gsd-opencode/agents/test-agent/skills/advanced.md
    level: intermediate
templates:
  - @gsd-opencode/templates/context.md
  - @gsd-opencode/templates/verification-report.md
---

# Test Agent

This agent is used for integration testing of the GSD-OpenCode package manager.

## Overview

The test agent demonstrates how @gsd-opencode/ references appear in various contexts within SKILL.md files.

## References in Headers

### Using @gsd-opencode/templates/summary.md

The summary template at @gsd-opencode/templates/summary.md provides a standard format.

## References in Lists

- Template files: @gsd-opencode/templates/
- Workflow files: @gsd-opencode/workflows/
- Agent definitions: @gsd-opencode/agents/
- Command documentation: @gsd-opencode/command/

## Code Examples

```javascript
// Reference to workflow
const workflow = '@gsd-opencode/workflows/execute-plan.md';

// Reference to template
const template = '@gsd-opencode/templates/context.md';
```

## Nested References

This agent uses:
- Core skills from @gsd-opencode/agents/test-agent/skills/core.md
- Advanced features from @gsd-opencode/agents/test-agent/skills/advanced.md
- Configuration from @gsd-opencode/agents/test-agent/config.md

## Cross-References

See also:
- @gsd-opencode/aggsd-opencode/templates/context.md for context formatting
- @gsd-opencode/command/gsd/test.md for command usage
- @gsd-opencode/get-shit-done/templates/summary.md for output templates
