---
paths:
  - "get-shit-done/templates/**/*.md"
---

# Template Rules

Rules for editing files in `get-shit-done/templates/`.

## Structure Varies

Templates don't follow a uniform structure. Some patterns:

- Most start with `# [Name] Template` header
- Many include a `<template>` block containing the actual template content
- Some include examples or guidelines sections

## Placeholder Conventions

**Square brackets** for human-fillable placeholders:
```
[Project Name]
[Description]
```

**Curly braces** for variable interpolation:
```
{phase}-{plan}-PLAN.md
.planning/phases/{phase}/
```

## YAML Frontmatter in Template Content

Templates that define output documents often show example frontmatter:

```yaml
---
phase: XX-name
plan: YY
type: execute
---
```

This is content TO BE GENERATED, not frontmatter for the template file itself.

## Key Principle

Templates show structure for generated documents. Match the style of the specific template you're editing.
