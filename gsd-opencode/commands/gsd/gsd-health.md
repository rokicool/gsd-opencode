---
name: gsd-health
description: Diagnose planning directory health and optionally repair issues
argument-hint: [--repair]
allowed-tools:
   read: true
   bash: true
   write: true
  - question
---
<objective>
Validate `.planning/` directory integrity and report actionable issues. Checks for missing files, invalid configurations, inconsistent state, and orphaned plans.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/health.md
</execution_context>

<process>
Execute the health workflow from @$HOME/.config/opencode/get-shit-done/workflows/health.md end-to-end.
Parse --repair flag from arguments and pass to workflow.
</process>
