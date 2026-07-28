---
name: gsd-ultraplan-phase
description: "[BETA] Offload plan phase to OpenCode's ultraplan cloud — drafts remotely while terminal stays free, review in browser with inline comments, import back via /gsd-import. OpenCode only."
argument-hint: "[phase-number]"
permissions:
   read: true
   bash: true
   glob: true
   grep: true
---

<objective>
Offload GSD's plan phase to OpenCode's ultraplan cloud infrastructure.

Ultraplan drafts the plan in a remote cloud session while your terminal stays free.
Review and comment on the plan in your browser, then import it back via /gsd-import --from.

⚠ BETA: ultraplan is in research preview. Use /gsd-plan-phase for stable local planning.
Requirements: OpenCode v2.1.91+, claude.ai account, GitHub repository.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/ultraplan-phase.md
@$HOME/.config/opencode/get-shit-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the ultraplan-phase workflow end-to-end.
</process>
