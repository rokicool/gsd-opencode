---
paths:
  - "get-shit-done/references/**/*.md"
---

# Reference File Rules

Rules for editing files in `get-shit-done/references/`.

## Outer Container Pattern

References typically use an outer XML container related to the filename:

- `principles.md` → `<principles>...</principles>`
- `checkpoints.md` → `<overview>...</overview>` then `<checkpoint_types>...</checkpoint_types>`
- `plan-format.md` → `<overview>...</overview>` then `<core_principle>...</core_principle>`

Not a strict rule — check the file you're editing.

## Internal Structure

Internal organization varies. Common patterns:
- Semantic sub-containers (`<solo_developer_claude>`, `<plans_are_prompts>`)
- Markdown headers within XML
- Code examples in fenced blocks

## Teaching Patterns

References often teach by contrast:
- Show vague vs. specific examples
- Explain WHY something is problematic
- Provide concrete alternatives

## Key Principle

References explain concepts and patterns loaded by workflows/commands when relevant. Match the style of the specific reference you're editing.
