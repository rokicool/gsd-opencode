---
name: gsd-execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only]"
permissions:
   read: true
   write: true
   edit: true
   glob: true
   grep: true
   bash: true
   task: true
   todowrite: true
   question: true
---
<objective>
Execute all plans in a phase using wave-based parallel execution.

Orchestrator stays lean: discover plans, analyze dependencies, group into waves, spawn subagents, collect results. Each subagent loads the full execute-plan context and handles its own plan.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-phase.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS

**Flags:**
- `--gaps-only` — Execute only gap closure plans (plans with `gap_closure: true` in frontmatter). Use after verify-work creates fix plans.

Context files are resolved inside the workflow via `gsd-tools init execute-phase` and per-subagent `<files_to_read>` blocks.
</context>

<process>
Execute the execute-phase workflow from @$HOME/.config/opencode/get-shit-done/workflows/execute-phase.md end-to-end.
Preserve all workflow gates (wave execution, checkpoint handling, verification, state updates, routing).
</process>
