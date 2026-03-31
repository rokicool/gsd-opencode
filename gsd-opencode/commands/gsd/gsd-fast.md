---
name: gsd-fast
description: Execute a trivial task inline — no subagents, no planning overhead
argument-hint: "[task description]"
permissions:
   read: true
   write: true
   edit: true
   bash: true
   grep: true
   glob: true
---

<objective>
Execute a trivial task directly in the current context without spawning subagents
or generating PLAN.md files. For tasks too small to justify planning overhead:
typo fixes, config changes, small refactors, forgotten commits, simple additions.

This is NOT a replacement for /gsd-quick — use /gsd-quick for anything that
needs research, multi-step planning, or verification. /gsd-fast is for tasks
you could describe in one sentence and execute in under 2 minutes.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/fast.md
</execution_context>

<process>
Execute the fast workflow from @$HOME/.config/opencode/get-shit-done/workflows/fast.md end-to-end.
</process>
