# GSD Style Rules

These rules apply to ALL files in this repository.

## Language & Tone

**Imperative voice.** "Execute tasks", "Create file" — not "Execution is performed"

**No filler.** Absent: "Let me", "Just", "Simply", "Basically", "I'd be happy to"

**No sycophancy.** Absent: "Great!", "Awesome!", "Excellent!", "I'd love to help"

**Brevity with substance.** Good: "JWT auth with refresh rotation using jose library" Bad: "Phase complete"

## Temporal Language Ban

Never write: "We changed X to Y", "Previously", "No longer", "Instead of"

Always: Describe current state only.

Exception: CHANGELOG.md, git commits (their purpose IS tracking change)

## Anti-Patterns

### Enterprise Patterns (Banned)
- Story points, sprint ceremonies, RACI matrices
- Human dev time estimates (days/weeks)
- Team coordination, knowledge transfer docs

### Generic XML (Banned)
Don't use: `<section>`, `<item>`, `<content>`

Use semantic tags: `<objective>`, `<verification>`, `<action>`, `<process>`

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `execute-phase.md` |
| Commands | `gsd:kebab-case` | `gsd:execute-phase` |
| Step names | snake_case | `name="load_project_state"` |
| Bash variables | CAPS_UNDERSCORES | `PHASE_ARG` |
| Type attributes | colon separator | `type="checkpoint:human-verify"` |

## XML Conventions

XML tags are semantic containers. Use Markdown headers for hierarchy within.

```xml
<!-- DO -->
<objective>
## Primary Goal
Build authentication system

## Success Criteria
- Users can log in
</objective>

<!-- DON'T -->
<section name="objective">
  <subsection name="primary-goal">
    <content>Build authentication</content>
  </subsection>
</section>
```

## @-References

@-references are lazy loading signals — instructions to read, not pre-loaded content.

```
@~/.claude/get-shit-done/workflows/execute-phase.md  # Static (always load)
@.planning/DISCOVERY.md (if exists)                   # Conditional
```

## Commit Format

```
{type}({phase}-{plan}): {description}
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`

Rules:
- One commit per task
- Stage files individually (never `git add .`)
- Include `Co-Authored-By: Claude` line
