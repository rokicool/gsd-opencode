---
name: gsd-ui-phase
description: Implementation of gsd-ui-phase command
---

<objective>
Create a UI design contract (UI-SPEC.md) for a frontend phase.
Orchestrates gsd-ui-researcher and gsd-ui-checker.
Flow: Validate → Research UI → Verify UI-SPEC → Done
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/ui-phase.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase number: $ARGUMENTS — optional, auto-detects next unplanned phase if omitted.
</context>

<process>
Execute @$HOME/.config/opencode/get-shit-done/workflows/ui-phase.md end-to-end.
Preserve all workflow gates.
</process>
