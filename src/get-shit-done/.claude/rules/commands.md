---
paths:
  - "commands/gsd/**/*.md"
---

# Slash Command Rules

Rules for editing files in `commands/gsd/`.

## File Structure

```yaml
---
name: gsd:command-name
description: One-line description
argument-hint: "<required>" or "[optional]"
allowed-tools: [Read, Write, Bash, Glob, Grep, AskUserQuestion]
---
```

## Section Order

1. `<objective>` — What/why/when (always present)
2. `<execution_context>` — @-references to workflows, templates, references
3. `<context>` — Dynamic content: `$ARGUMENTS`, bash output, @file refs
4. `<process>` or `<step>` elements — Implementation steps
5. `<success_criteria>` — Measurable completion checklist

## Core Principle

**Commands are thin wrappers.** Delegate detailed logic to workflows.

Commands answer "what to do", workflows answer "how to do it".

## @-Reference Patterns

```markdown
<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
@~/.claude/get-shit-done/templates/summary.md
@~/.claude/get-shit-done/references/plan-format.md
</execution_context>

<context>
$ARGUMENTS

@.planning/PROJECT.md
@.planning/STATE.md
</context>
```

- `execution_context`: Static resources (workflows, templates, references)
- `context`: Dynamic project state and arguments

## Success Criteria Format

```xml
<success_criteria>
- [ ] Specific, measurable criterion
- [ ] Another verifiable outcome
</success_criteria>
```

Use checkbox format. Each criterion must be objectively verifiable.
