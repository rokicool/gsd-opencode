---
paths:
  - "get-shit-done/workflows/**/*.md"
---

# Workflow Rules

Rules for editing files in `get-shit-done/workflows/`.

## No Frontmatter

Workflows don't use YAML frontmatter. Content starts immediately.

## Common XML Tags

These tags appear across workflows, but not all workflows use all of them:

- `<purpose>` — What this workflow accomplishes
- `<when_to_use>` — Decision criteria (some workflows use `<trigger>` instead)
- `<required_reading>` — Files to read before starting
- `<process>` — Container for execution steps
- `<step>` — Individual step within process

Some workflows also use domain-specific tags like `<philosophy>`, `<references>`, `<planning_principles>`, `<decimal_phase_numbering>`.

## Step Elements

When using `<step>` elements:
- `name` attribute: snake_case (e.g., `name="load_project_state"`)
- `priority` attribute: Optional ("first", "second")

## Conditional Logic

```xml
<if mode="yolo">
  Content for yolo mode
</if>
```

Conditions reference `.planning/config.json` values.

## Key Principle

Workflows contain detailed execution logic. Commands are thin wrappers that delegate to workflows.

Match the style of the specific workflow you're editing — patterns vary across files.
